-- =====================================================================
-- 0002 FUNCTIONS, TRIGGERS, ROW LEVEL SECURITY
-- =====================================================================

-- ---------- Permission helpers ----------
create or replace function public.is_staff(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_staff and not is_blocked from profiles where id = uid), false);
$$;

create or replace function public.has_permission(perm text, uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from user_roles ur
    join roles r on r.id = ur.role_id
    join profiles p on p.id = ur.user_id
    left join role_permissions rp on rp.role_id = r.id
    where ur.user_id = uid
      and p.is_staff and not p.is_blocked
      and (r.name = 'Super Admin' or rp.permission_key = perm)
  );
$$;

create or replace function public.my_permissions()
returns setof text language sql stable security definer set search_path = public as $$
  select distinct case when r.name = 'Super Admin' then '*' else rp.permission_key end
  from user_roles ur
  join roles r on r.id = ur.role_id
  left join role_permissions rp on rp.role_id = r.id
  where ur.user_id = auth.uid();
$$;

-- ---------- New auth user -> profile ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name, avatar_url, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do nothing;
  insert into email_queue (event, to_email, payload)
  select 'welcome', new.email, jsonb_build_object('name', coalesce(new.raw_user_meta_data->>'full_name', ''))
  where new.email is not null;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Prevent customers from escalating their own privileges via profile updates.
create or replace function public.protect_profile_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not has_permission('users.update') then
    new.is_staff := old.is_staff;
    new.is_blocked := old.is_blocked;
    new.loyalty_points := old.loyalty_points;
    new.wallet_balance := old.wallet_balance;
  end if;
  return new;
end $$;
create trigger trg_protect_profile before update on profiles
  for each row execute function public.protect_profile_columns();

-- ---------- Product search vector ----------
create or replace function public.products_search_vector()
returns trigger language plpgsql as $$
begin
  new.search_vector :=
    setweight(to_tsvector('simple', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.title_bn, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.sku, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(new.short_description, '')), 'C');
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end $$;
create trigger trg_products_search before insert or update on products
  for each row execute function public.products_search_vector();

-- ---------- Review aggregates ----------
create or replace function public.refresh_product_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare pid uuid := coalesce(new.product_id, old.product_id);
begin
  update products p set
    rating_avg = coalesce((select round(avg(rating)::numeric, 2) from reviews where product_id = pid and status = 'approved'), 0),
    rating_count = (select count(*) from reviews where product_id = pid and status = 'approved')
  where p.id = pid;
  return null;
end $$;
create trigger trg_reviews_rating after insert or update or delete on reviews
  for each row execute function public.refresh_product_rating();

-- ---------- Order status history ----------
create or replace function public.log_order_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into order_status_history (order_id, from_status, to_status, actor_id)
    values (new.id, null, new.status, auth.uid());
  elsif new.status is distinct from old.status then
    insert into order_status_history (order_id, from_status, to_status, actor_id)
    values (new.id, old.status, new.status, auth.uid());
    if new.status = 'delivered' then new.delivered_at := now(); end if;
    if new.status = 'cancelled' then new.cancelled_at := now(); end if;
  end if;
  return new;
end $$;
create trigger trg_orders_status_ins after insert on orders
  for each row execute function public.log_order_status();
create trigger trg_orders_status_upd before update on orders
  for each row execute function public.log_order_status();

-- ---------- Dashboard: sales summary ----------
-- bucket: 'hour' | 'day' | 'week' | 'month'. Counts every order except cancelled/failed.
create or replace function public.sales_summary(p_from timestamptz, p_to timestamptz, p_bucket text default 'day')
returns table (bucket timestamptz, orders bigint, revenue numeric, items bigint, profit numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if not has_permission('dashboard.view') then raise exception 'forbidden'; end if;
  if p_bucket not in ('hour','day','week','month') then raise exception 'invalid bucket'; end if;
  return query
  with series as (
    select generate_series(date_trunc(p_bucket, p_from at time zone 'Asia/Dhaka'),
                           date_trunc(p_bucket, p_to at time zone 'Asia/Dhaka'),
                           ('1 ' || p_bucket)::interval) as b
  ), o as (
    select date_trunc(p_bucket, ord.placed_at at time zone 'Asia/Dhaka') as b,
           count(*) as orders,
           sum(ord.grand_total) as revenue
    from orders ord
    where ord.placed_at between p_from and p_to
      and ord.status not in ('cancelled','failed')
    group by 1
  ), i as (
    select date_trunc(p_bucket, ord.placed_at at time zone 'Asia/Dhaka') as b,
           sum(oi.quantity) as items,
           sum(oi.total - coalesce(oi.cost_price, 0) * oi.quantity) as profit
    from orders ord join order_items oi on oi.order_id = ord.id
    where ord.placed_at between p_from and p_to
      and ord.status not in ('cancelled','failed')
    group by 1
  )
  select (s.b at time zone 'Asia/Dhaka')::timestamptz,
         coalesce(o.orders, 0), coalesce(o.revenue, 0),
         coalesce(i.items, 0)::bigint, coalesce(i.profit, 0)
  from series s
  left join o on o.b = s.b
  left join i on i.b = s.b
  order by s.b;
end $$;

-- =====================================================================
-- ROW LEVEL SECURITY
-- Rule of thumb: customers see/modify only their own rows; the public can
-- read published catalog/content; staff need the matching permission.
-- Server code using the service-role key bypasses RLS after its own checks.
-- =====================================================================
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- Staff "manage" policy generator: full access for a module permission.
create or replace function public._staff_policy(tbl text, module text)
returns void language plpgsql as $$
begin
  execute format('create policy "staff_view_%1$s" on %1$I for select using (has_permission(%2$L))', tbl, module || '.view');
  execute format('create policy "staff_insert_%1$s" on %1$I for insert with check (has_permission(%2$L))', tbl, module || '.create');
  execute format('create policy "staff_update_%1$s" on %1$I for update using (has_permission(%2$L))', tbl, module || '.update');
  execute format('create policy "staff_delete_%1$s" on %1$I for delete using (has_permission(%2$L))', tbl, module || '.delete');
end $$;

select _staff_policy(t, m) from (values
  ('profiles','customers'), ('roles','roles'), ('role_permissions','roles'), ('user_roles','users'),
  ('staff_invites','users'), ('audit_logs','audit'), ('addresses','customers'),
  ('categories','categories'), ('brands','products'), ('products','products'),
  ('product_categories','products'), ('product_media','products'), ('product_options','products'),
  ('product_option_values','products'), ('product_variants','products'),
  ('inventory_movements','inventory'), ('tags','products'), ('product_tags','products'),
  ('collections','products'), ('collection_products','products'), ('reviews','reviews'),
  ('product_questions','reviews'), ('stock_alerts','products'), ('carts','orders'), ('cart_items','orders'),
  ('orders','orders'), ('order_items','orders'), ('order_status_history','orders'),
  ('payments','payments'), ('refunds','orders'), ('returns','orders'), ('invoices','orders'),
  ('shipments','orders'), ('coupons','coupons'), ('coupon_redemptions','coupons'),
  ('flash_sales','marketing'), ('flash_sale_items','marketing'), ('popups','marketing'),
  ('banners','marketing'), ('newsletter_subscribers','marketing'), ('loyalty_transactions','customers'),
  ('referrals','customers'), ('pages','content'), ('blog_categories','content'), ('blog_posts','content'),
  ('faqs','content'), ('menus','content'), ('home_sections','content'), ('media','media'),
  ('settings','settings'), ('redirects','seo'), ('not_found_logs','seo'), ('shipping_zones','shipping'),
  ('email_templates','emails'), ('email_queue','emails'), ('contact_messages','customers'),
  ('import_tokens','imports'), ('import_jobs','imports'), ('chat_sessions','chatbot'),
  ('chat_messages','chatbot'), ('chatbot_knowledge','chatbot')
) as x(t, m);

-- permissions catalogue is readable by staff
create policy "staff_read_permissions" on permissions for select using (is_staff());

-- ---------- Customer self-service ----------
create policy "own_profile_read" on profiles for select using (id = auth.uid());
create policy "own_profile_update" on profiles for update using (id = auth.uid());
create policy "own_roles_read" on user_roles for select using (user_id = auth.uid());

create policy "own_addresses" on addresses for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own_wishlist" on wishlists for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own_notifications" on notifications for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own_orders_read" on orders for select using (user_id = auth.uid());
create policy "own_order_items_read" on order_items for select
  using (exists (select 1 from orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "own_order_history_read" on order_status_history for select
  using (exists (select 1 from orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "own_invoices_read" on invoices for select
  using (exists (select 1 from orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "own_returns" on returns for select using (user_id = auth.uid());
create policy "own_loyalty_read" on loyalty_transactions for select using (user_id = auth.uid());
create policy "own_reviews_write" on reviews for insert with check (user_id = auth.uid() and status = 'pending');
create policy "own_questions_write" on product_questions for insert with check (user_id = auth.uid() and status = 'pending');

-- ---------- Public read: catalog & content ----------
create policy "public_categories" on categories for select using (is_active);
create policy "public_brands" on brands for select using (is_active);
create policy "public_products" on products for select
  using (status = 'published' and (published_at is null or published_at <= now()));
create policy "public_product_categories" on product_categories for select
  using (exists (select 1 from products p where p.id = product_id and p.status = 'published'));
create policy "public_product_media" on product_media for select
  using (exists (select 1 from products p where p.id = product_id and p.status = 'published'));
create policy "public_product_options" on product_options for select
  using (exists (select 1 from products p where p.id = product_id and p.status = 'published'));
create policy "public_product_option_values" on product_option_values for select
  using (exists (select 1 from product_options o join products p on p.id = o.product_id
                 where o.id = option_id and p.status = 'published'));
create policy "public_product_variants" on product_variants for select
  using (is_active and exists (select 1 from products p where p.id = product_id and p.status = 'published'));
create policy "public_tags" on tags for select using (true);
create policy "public_product_tags" on product_tags for select using (true);
create policy "public_collections" on collections for select using (is_active);
create policy "public_collection_products" on collection_products for select using (true);
create policy "public_reviews" on reviews for select using (status = 'approved');
create policy "public_questions" on product_questions for select using (status = 'approved');
create policy "public_flash_sales" on flash_sales for select using (is_active and now() between starts_at and ends_at);
create policy "public_flash_sale_items" on flash_sale_items for select
  using (exists (select 1 from flash_sales f where f.id = flash_sale_id and f.is_active and now() between f.starts_at and f.ends_at));
create policy "public_popups" on popups for select
  using (is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now()));
create policy "public_banners" on banners for select
  using (is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now()));
create policy "public_pages" on pages for select using (is_published);
create policy "public_blog_categories" on blog_categories for select using (true);
create policy "public_blog_posts" on blog_posts for select using (status = 'published' and published_at <= now());
create policy "public_faqs" on faqs for select using (is_active);
create policy "public_menus" on menus for select using (true);
create policy "public_home_sections" on home_sections for select using (is_active);
create policy "public_shipping_zones" on shipping_zones for select using (is_active);
-- Only non-secret settings are public (store info, theme, public SEO, tracking IDs)
create policy "public_settings" on settings for select using (not is_secret and key in ('store','theme','seo','tracking','checkout','social'));

-- Anything not covered (carts for guests, orders placement, chat, contact form, newsletter)
-- goes through server actions using the service-role client with validation + rate limits.

-- ---------- Storage hardening ----------
revoke execute on function public._staff_policy(text, text) from public, anon, authenticated;
