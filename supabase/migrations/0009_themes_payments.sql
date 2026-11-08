-- =====================================================================
-- 0009 THEMES, PAGE BUILDER, PAYMENT RULES, CUSTOM FIELDS
-- Per-product delivery-charge timing and advance (partial) payment,
-- custom checkout fields, contact form data, email blocks, page sections.
-- =====================================================================

alter table products add column if not exists shipping_mode text not null default 'default'
  check (shipping_mode in ('default', 'prepaid', 'on_delivery'));
alter table products add column if not exists advance_percent numeric(5,2) check (advance_percent is null or (advance_percent >= 0 and advance_percent <= 100));
alter table products add column if not exists advance_optional boolean not null default true;

alter table orders add column if not exists advance_due numeric(12,2) not null default 0;
alter table orders add column if not exists advance_required boolean not null default false;
alter table orders add column if not exists custom_fields jsonb not null default '{}';

alter table contact_messages add column if not exists data jsonb not null default '{}';
alter table email_templates add column if not exists blocks jsonb not null default '[]';
alter table pages add column if not exists sections jsonb not null default '[]';

-- Default appearance, checkout fields and contact form (only if not set yet)
insert into settings (key, value) values
  ('theme', '{"theme":"lumen"}'),
  ('checkout_fields', '{"email":{"show":true,"required":false},"upazila":{"show":true,"required":false},"note":{"show":true},"custom":[]}'),
  ('contact_form', '{"fields":[{"key":"name","label":"Name","type":"text","required":true},{"key":"email","label":"Email","type":"email","required":true},{"key":"phone","label":"Phone","type":"tel","required":false},{"key":"subject","label":"Subject","type":"text","required":false},{"key":"message","label":"Message","type":"textarea","required":true}],"submit_label":"Send message","success_message":"Thanks! We will reply soon."}')
on conflict (key) do nothing;
update settings set value = value || '{"shipping_collect":"on_delivery","default_advance_percent":0}'::jsonb
  where key = 'checkout' and not (value ? 'shipping_collect');

-- Contact form layout is public (needed to render the form)
drop policy if exists "public_settings" on settings;
create policy "public_settings" on settings for select
  using (not is_secret and key in ('store','theme','seo','tracking','checkout','social','checkout_fields','contact_form'));


create or replace function public.quote_order(p jsonb)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  it jsonb;
  qty int;
  prod products%rowtype;
  v_id uuid; v_title text; v_weight int; v_cost numeric; v_compare numeric;
  unit numeric; available int; sale numeric; img text;
  lines jsonb := '[]'; errors jsonb := '[]';
  subtotal numeric := 0; weight int := 0;
  z shipping_zones%rowtype; shipping numeric := 0;
  c coupons%rowtype; c_err text := null; discount numeric := 0; eligible numeric := 0; free_ship boolean := false;
  used int; prior int;
  uid uuid := nullif(p->>'user_id', '')::uuid;
  co jsonb; adv_items numeric := 0; ship_pre boolean := false; adv_req boolean := false; pct numeric; default_pct numeric; ship_collect text; adv numeric := 0;
  v_phone text := nullif(p->>'phone', '');
begin
  for it in select * from jsonb_array_elements(coalesce(p->'items', '[]')) loop
    qty := greatest(1, least(99, coalesce((it->>'quantity')::int, 1)));
    select * into prod from products
      where id = nullif(it->>'product_id', '')::uuid and status = 'published' and (published_at is null or published_at <= now());
    if not found then
      errors := errors || jsonb_build_object('product_id', it->>'product_id', 'variant_id', it->>'variant_id', 'error', 'unavailable');
      continue;
    end if;

    v_id := nullif(it->>'variant_id', '')::uuid;
    if v_id is not null then
      select pv.price, pv.stock, pv.weight_grams, pv.cost_price, pv.compare_at_price, pv.image_url,
             (select string_agg(value, ' / ') from jsonb_each_text(pv.option_values))
        into unit, available, v_weight, v_cost, v_compare, img, v_title
        from product_variants pv where pv.id = v_id and pv.product_id = prod.id and pv.is_active;
      if not found then
        errors := errors || jsonb_build_object('product_id', prod.id, 'variant_id', v_id, 'error', 'unavailable');
        continue;
      end if;
    else
      if exists (select 1 from product_variants where product_id = prod.id and is_active) then
        errors := errors || jsonb_build_object('product_id', prod.id, 'error', 'choose_variant');
        continue;
      end if;
      unit := prod.price; available := prod.stock; v_weight := null; v_cost := prod.cost_price;
      v_compare := prod.compare_at_price; v_title := null; img := null;
    end if;

    if img is null then
      select url into img from product_media where product_id = prod.id and type = 'image' order by sort_order limit 1;
    end if;

    sale := null;
    select fsi.sale_price into sale
      from flash_sale_items fsi join flash_sales fs on fs.id = fsi.flash_sale_id
      where fs.is_active and now() between fs.starts_at and fs.ends_at and fsi.product_id = prod.id
        and (fsi.variant_id is null or fsi.variant_id = v_id)
        and (fsi.quantity_limit is null or fsi.sold < fsi.quantity_limit)
      order by fsi.sale_price limit 1;
    if sale is not null and sale < unit then
      v_compare := greatest(coalesce(v_compare, 0), unit);
      unit := sale;
    end if;

    if prod.track_inventory and not prod.allow_backorder and available < qty then
      errors := errors || jsonb_build_object('product_id', prod.id, 'variant_id', v_id, 'error', 'insufficient_stock', 'available', greatest(available, 0));
      continue;
    end if;

    lines := lines || jsonb_build_object(
      'product_id', prod.id, 'variant_id', v_id, 'title', prod.title, 'variant_title', v_title, 'slug', prod.slug,
      'image_url', img, 'sku', prod.sku, 'unit_price', unit, 'compare_at_price', v_compare, 'cost_price', v_cost,
      'quantity', qty, 'total', unit * qty, 'track_inventory', prod.track_inventory, 'allow_backorder', prod.allow_backorder,
      'shipping_mode', prod.shipping_mode, 'advance_percent', prod.advance_percent, 'advance_optional', prod.advance_optional
    );
    subtotal := subtotal + unit * qty;
    weight := weight + coalesce(v_weight, prod.weight_grams, 500) * qty;
  end loop;

  -- Shipping zone: first zone listing the district, else the fallback zone (empty district list)
  select * into z from shipping_zones where is_active and (p->>'district') = any(districts) order by sort_order limit 1;
  if not found then
    select * into z from shipping_zones where is_active and cardinality(districts) = 0 order by sort_order limit 1;
  end if;
  if z.id is not null and jsonb_array_length(lines) > 0 then
    shipping := z.base_rate + z.per_kg_rate * greatest(0, ceil(weight / 1000.0) - 1);
    if z.free_over is not null and subtotal >= z.free_over then shipping := 0; end if;
  end if;

  -- Coupon
  if coalesce(p->>'coupon_code', '') <> '' then
    select * into c from coupons where upper(code) = upper(trim(p->>'coupon_code')) and is_active;
    if not found then c_err := 'invalid';
    elsif c.starts_at is not null and c.starts_at > now() then c_err := 'not_started';
    elsif c.ends_at is not null and c.ends_at < now() then c_err := 'expired';
    elsif c.usage_limit is not null and c.used_count >= c.usage_limit then c_err := 'used_up';
    elsif subtotal < c.min_order then c_err := 'min_order';
    else
      if c.per_user_limit is not null and (uid is not null or v_phone is not null) then
        select count(*) into used from coupon_redemptions
          where coupon_id = c.id and ((uid is not null and user_id = uid) or (v_phone is not null and coupon_redemptions.phone = v_phone));
        if used >= c.per_user_limit then c_err := 'already_used'; end if;
      end if;
      if c_err is null and c.first_order_only then
        select count(*) into prior from orders
          where status not in ('cancelled', 'failed') and ((uid is not null and user_id = uid) or (v_phone is not null and orders.phone = v_phone));
        if prior > 0 then c_err := 'first_order_only'; end if;
      end if;
      if c_err is null and c.applies_to ? 'user_ids' and jsonb_array_length(c.applies_to->'user_ids') > 0
         and (uid is null or not (c.applies_to->'user_ids') ? uid::text) then
        c_err := 'not_eligible';
      end if;
    end if;

    if c_err is null then
      select coalesce(sum((l->>'total')::numeric), 0) into eligible
      from jsonb_array_elements(lines) l
      where (not (c.applies_to ? 'product_ids') or jsonb_array_length(c.applies_to->'product_ids') = 0 or (c.applies_to->'product_ids') ? (l->>'product_id'))
        and (not (c.applies_to ? 'category_ids') or jsonb_array_length(c.applies_to->'category_ids') = 0
             or exists (select 1 from product_categories pc where pc.product_id = (l->>'product_id')::uuid
                        and (c.applies_to->'category_ids') ? pc.category_id::text));
      if eligible <= 0 then c_err := 'not_eligible';
      elsif c.type = 'percentage' then discount := round(eligible * c.value / 100);
      elsif c.type = 'fixed' then discount := least(c.value, eligible);
      elsif c.type = 'free_shipping' then free_ship := true;
      else c_err := 'invalid';
      end if;
      if c.max_discount is not null then discount := least(discount, c.max_discount); end if;
    end if;
  end if;
  if free_ship then shipping := 0; end if;

  -- Advance payment: per product percent (or store default) plus delivery charge when it must be paid first
  select value into co from settings where key = 'checkout';
  default_pct := coalesce((co->>'default_advance_percent')::numeric, 0);
  ship_collect := coalesce(co->>'shipping_collect', 'on_delivery');
  for it in select * from jsonb_array_elements(lines) loop
    pct := coalesce(nullif(it->>'advance_percent', '')::numeric, default_pct);
    if pct > 0 then
      adv_items := adv_items + (it->>'total')::numeric * least(pct, 100) / 100;
      if not coalesce((it->>'advance_optional')::boolean, true) then adv_req := true; end if;
    end if;
    if it->>'shipping_mode' = 'prepaid' or (coalesce(it->>'shipping_mode', 'default') = 'default' and ship_collect = 'prepaid') then
      ship_pre := true;
    end if;
  end loop;
  if ship_pre and shipping > 0 then adv_req := true; end if;
  adv := round(adv_items) + case when ship_pre then shipping else 0 end;
  adv := least(adv, greatest(0, subtotal - discount + shipping));

  return jsonb_build_object(
    'lines', lines, 'errors', errors,
    'subtotal', subtotal, 'discount', discount, 'shipping', shipping,
    'grand_total', greatest(0, subtotal - discount + shipping),
    'weight_grams', weight,
    'advance', jsonb_build_object('amount', adv, 'required', adv_req and adv > 0, 'shipping_prepaid', ship_pre and shipping > 0, 'items_amount', round(adv_items)),
    'zone', case when z.id is null then null else jsonb_build_object('id', z.id, 'name', z.name, 'eta_min', z.eta_min_days, 'eta_max', z.eta_max_days) end,
    'coupon', case when coalesce(p->>'coupon_code', '') = '' then null
      else jsonb_build_object('code', upper(trim(p->>'coupon_code')), 'valid', c_err is null, 'error', c_err, 'free_shipping', free_ship) end
  );
end $$;

create or replace function public.place_order(p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  q jsonb; l jsonb; oid uuid; onum text; token text; qty int;
  pid uuid; vid uuid; uid uuid := nullif(p->>'user_id', '')::uuid;
  fraud int; store_email text; cid uuid; adv numeric := 0; adv_req boolean := false;
begin
  q := quote_order(p);
  if jsonb_array_length(q->'errors') > 0 then raise exception 'cart_error' using detail = (q->'errors')::text; end if;
  if jsonb_array_length(q->'lines') = 0 then raise exception 'empty_cart'; end if;
  if q->'coupon' is not null and q->'coupon' <> 'null'::jsonb and not (q->'coupon'->>'valid')::boolean then
    raise exception 'coupon_error' using detail = q->'coupon'->>'error';
  end if;

  adv_req := coalesce((q->'advance'->>'required')::boolean, false);
  if adv_req or coalesce((p->>'pay_advance')::boolean, false) then adv := coalesce((q->'advance'->>'amount')::numeric, 0); end if;
  if adv > 0 and coalesce(nullif(p->>'payment_method', ''), 'cod') = 'cod' then raise exception 'advance_needs_online'; end if;

  -- Reserve stock. UPDATE locks the rows, the WHERE clause guarantees no overselling.
  for l in select * from jsonb_array_elements(q->'lines') loop
    qty := (l->>'quantity')::int; pid := (l->>'product_id')::uuid; vid := nullif(l->>'variant_id', '')::uuid;
    if vid is not null then
      update product_variants set stock = stock - qty
        where id = vid and (not (l->>'track_inventory')::boolean or (l->>'allow_backorder')::boolean or stock >= qty);
      if not found then raise exception 'out_of_stock' using detail = l->>'title'; end if;
      update products set stock = (select coalesce(sum(stock), 0) from product_variants where product_id = pid and is_active),
                          sold_count = sold_count + qty where id = pid;
    else
      update products set stock = stock - qty, sold_count = sold_count + qty
        where id = pid and (not track_inventory or allow_backorder or stock >= qty);
      if not found then raise exception 'out_of_stock' using detail = l->>'title'; end if;
    end if;
    update flash_sale_items fsi set sold = sold + qty from flash_sales fs
      where fs.id = fsi.flash_sale_id and fs.is_active and now() between fs.starts_at and fs.ends_at
        and fsi.product_id = pid and (fsi.variant_id is null or fsi.variant_id = vid);
  end loop;

  select count(*) into fraud from orders
    where phone = p->'customer'->>'phone' and status in ('cancelled', 'returned', 'failed') and placed_at > now() - interval '180 days';

  insert into orders (
    user_id, email, phone, customer_name, status, payment_status, payment_method,
    subtotal, discount_total, shipping_total, grand_total, coupon_code, shipping_zone_id,
    shipping_address, customer_note, source, fraud_score, ip, user_agent, advance_due, advance_required, custom_fields
  ) values (
    uid, nullif(p->'customer'->>'email', ''), p->'customer'->>'phone', p->'customer'->>'name', 'pending', 'unpaid',
    coalesce(nullif(p->>'payment_method', ''), 'cod')::payment_method,
    (q->>'subtotal')::numeric, (q->>'discount')::numeric, (q->>'shipping')::numeric, (q->>'grand_total')::numeric,
    case when q->'coupon' is not null and q->'coupon' <> 'null'::jsonb then q->'coupon'->>'code' end,
    nullif(q->'zone'->>'id', '')::uuid,
    p->'address' || jsonb_build_object('name', p->'customer'->>'name', 'phone', p->'customer'->>'phone'),
    nullif(p->>'note', ''), coalesce(nullif(p->>'source', ''), 'web'), least(fraud, 100),
    nullif(p->>'ip', '')::inet, nullif(p->>'user_agent', ''), adv, adv_req, coalesce(p->'custom_fields', '{}'::jsonb)
  ) returning id, order_number, access_token into oid, onum, token;

  insert into order_items (order_id, product_id, variant_id, title, variant_title, image_url, sku, unit_price, cost_price, quantity, total)
  select oid, (x->>'product_id')::uuid, nullif(x->>'variant_id', '')::uuid, x->>'title', x->>'variant_title', x->>'image_url',
         x->>'sku', (x->>'unit_price')::numeric, nullif(x->>'cost_price', '')::numeric, (x->>'quantity')::int, (x->>'total')::numeric
  from jsonb_array_elements(q->'lines') x;

  insert into inventory_movements (product_id, variant_id, change, reason, reference)
  select (x->>'product_id')::uuid, nullif(x->>'variant_id', '')::uuid, -(x->>'quantity')::int, 'order', onum
  from jsonb_array_elements(q->'lines') x;

  if q->'coupon' is not null and q->'coupon' <> 'null'::jsonb then
    select id into cid from coupons where upper(code) = q->'coupon'->>'code';
    insert into coupon_redemptions (coupon_id, order_id, user_id, phone, amount)
    values (cid, oid, uid, p->'customer'->>'phone', (q->>'discount')::numeric);
    update coupons set used_count = used_count + 1 where id = cid;
  end if;

  -- Remember the address for signed-in customers who have none saved yet
  if uid is not null and not exists (select 1 from addresses where user_id = uid) then
    insert into addresses (user_id, name, phone, division, district, upazila, area, address_line, is_default)
    values (uid, p->'customer'->>'name', p->'customer'->>'phone', p->'address'->>'division', p->'address'->>'district',
            nullif(p->'address'->>'upazila', ''), nullif(p->'address'->>'area', ''), p->'address'->>'address_line', true);
  end if;

  -- Clear purchased items from the cart
  if nullif(p->>'cart_id', '') is not null then
    delete from cart_items ci using jsonb_array_elements(q->'lines') x
      where ci.cart_id = (p->>'cart_id')::uuid and ci.product_id = (x->>'product_id')::uuid
        and ci.variant_id is not distinct from nullif(x->>'variant_id', '')::uuid;
    update carts set recovered_order_id = oid where id = (p->>'cart_id')::uuid;
  end if;

  -- Emails (sent by the email worker in Phase 8)
  if nullif(p->'customer'->>'email', '') is not null then
    insert into email_queue (event, to_email, payload) values ('order_placed', p->'customer'->>'email', jsonb_build_object('order_id', oid));
  end if;
  select value->>'email' into store_email from settings where key = 'store';
  if store_email is not null then
    insert into email_queue (event, to_email, payload) values ('admin_new_order', store_email, jsonb_build_object('order_id', oid));
  end if;

  return jsonb_build_object('id', oid, 'order_number', onum, 'access_token', token, 'grand_total', q->'grand_total', 'advance_due', adv);
end $$;

create or replace function public.mark_order_paid(p_order uuid, p_gateway payment_method, p_trx text, p_amount numeric, p_raw jsonb)
returns boolean language plpgsql security definer set search_path = public as $$
declare o orders%rowtype; due numeric;
begin
  select * into o from orders where id = p_order for update;
  if not found then return false; end if;
  if exists (select 1 from payments where gateway = p_gateway and transaction_id = p_trx and status = 'paid') then return true; end if;
  due := case when o.advance_due > 0 and o.paid_amount = 0 then o.advance_due else o.grand_total - o.paid_amount end;
  if p_amount + 0.5 < due then
    raise exception 'amount_mismatch';
  end if;
  update payments set status = 'paid', transaction_id = p_trx, raw_response = p_raw, validated_at = now()
  where id = (select id from payments where order_id = p_order and gateway = p_gateway and status = 'pending' order by created_at desc limit 1);
  if not found then
    insert into payments (order_id, gateway, transaction_id, amount, status, raw_response, validated_at)
    values (p_order, p_gateway, p_trx, p_amount, 'paid', p_raw, now());
  end if;
  update orders set paid_amount = paid_amount + p_amount,
    payment_status = case when o.paid_amount + p_amount >= o.grand_total - 0.5 then 'paid'::payment_status else 'partially_paid'::payment_status end
  where id = p_order;
  if o.status = 'pending' then
    perform set_order_status(p_order, 'confirmed', 'Paid online', null, false);
  end if;
  if o.email is not null then
    insert into email_queue (event, to_email, payload) values ('payment_received', o.email, jsonb_build_object('order_id', p_order));
  end if;
  return true;
end $$;

create or replace function public.set_order_status(p_order uuid, p_status order_status, p_note text, p_actor uuid, p_notify boolean default true)
returns void language plpgsql security definer set search_path = public as $$
declare o orders%rowtype; ev text;
begin
  select * into o from orders where id = p_order for update;
  if not found then raise exception 'not_found'; end if;
  if o.status = p_status then
    if p_note is not null then
      insert into order_status_history (order_id, from_status, to_status, note, actor_id, notify_customer)
      values (p_order, o.status, p_status, p_note, p_actor, false);
    end if;
    return;
  end if;
  update orders set status = p_status where id = p_order;
  -- The trigger wrote a history row; attach note and actor to it
  update order_status_history set note = p_note, actor_id = p_actor, notify_customer = p_notify
  where id = (select max(id) from order_status_history where order_id = p_order);

  if p_status in ('cancelled', 'returned', 'failed') then
    perform restock_order(p_order, case p_status when 'returned' then 'return' when 'failed' then 'payment_failed' else 'cancel' end);
  end if;
  if p_status = 'delivered' and o.payment_status <> 'paid' then
    update orders set payment_status = 'paid', paid_amount = grand_total where id = p_order;
  end if;

  ev := case p_status
    when 'confirmed' then 'order_confirmed' when 'processing' then 'order_processing' when 'packed' then 'order_processing'
    when 'shipped' then 'order_shipped' when 'out_for_delivery' then 'out_for_delivery' when 'delivered' then 'order_delivered'
    when 'cancelled' then 'order_cancelled' when 'refunded' then 'refund_processed' else null end;
  if p_notify and ev is not null and o.email is not null then
    insert into email_queue (event, to_email, payload) values (ev, o.email, jsonb_build_object('order_id', p_order, 'note', p_note));
  end if;
end $$;

create or replace function public.switch_to_cod(p_order uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update orders set payment_method = 'cod', payment_status = 'unpaid', advance_due = 0
  where id = p_order and payment_status in ('failed', 'pending') and status = 'pending' and not advance_required;
end $$;

revoke execute on function public.quote_order(jsonb) from public, anon, authenticated;
revoke execute on function public.place_order(jsonb) from public, anon, authenticated;
revoke execute on function public.mark_order_paid(uuid, payment_method, text, numeric, jsonb) from public, anon, authenticated;
revoke execute on function public.set_order_status(uuid, order_status, text, uuid, boolean) from public, anon, authenticated;
revoke execute on function public.switch_to_cod(uuid) from public, anon, authenticated;
