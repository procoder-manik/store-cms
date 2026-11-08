-- =====================================================================
-- 0005 CHECKOUT: quote_order (single source of truth for prices,
-- shipping and coupons) and place_order (atomic order creation).
-- Both are called only from server code with the service-role key.
-- =====================================================================

alter table orders add column if not exists access_token text not null default encode(gen_random_bytes(16), 'hex');
create index if not exists orders_access_token_idx on orders (access_token);
create index if not exists coupons_code_upper_idx on coupons (upper(code));

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
      'quantity', qty, 'total', unit * qty, 'track_inventory', prod.track_inventory, 'allow_backorder', prod.allow_backorder
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

  return jsonb_build_object(
    'lines', lines, 'errors', errors,
    'subtotal', subtotal, 'discount', discount, 'shipping', shipping,
    'grand_total', greatest(0, subtotal - discount + shipping),
    'weight_grams', weight,
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
  fraud int; store_email text; cid uuid;
begin
  q := quote_order(p);
  if jsonb_array_length(q->'errors') > 0 then raise exception 'cart_error' using detail = (q->'errors')::text; end if;
  if jsonb_array_length(q->'lines') = 0 then raise exception 'empty_cart'; end if;
  if q->'coupon' is not null and q->'coupon' <> 'null'::jsonb and not (q->'coupon'->>'valid')::boolean then
    raise exception 'coupon_error' using detail = q->'coupon'->>'error';
  end if;

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
    shipping_address, customer_note, source, fraud_score, ip, user_agent
  ) values (
    uid, nullif(p->'customer'->>'email', ''), p->'customer'->>'phone', p->'customer'->>'name', 'pending', 'unpaid',
    coalesce(nullif(p->>'payment_method', ''), 'cod')::payment_method,
    (q->>'subtotal')::numeric, (q->>'discount')::numeric, (q->>'shipping')::numeric, (q->>'grand_total')::numeric,
    case when q->'coupon' is not null and q->'coupon' <> 'null'::jsonb then q->'coupon'->>'code' end,
    nullif(q->'zone'->>'id', '')::uuid,
    p->'address' || jsonb_build_object('name', p->'customer'->>'name', 'phone', p->'customer'->>'phone'),
    nullif(p->>'note', ''), coalesce(nullif(p->>'source', ''), 'web'), least(fraud, 100),
    nullif(p->>'ip', '')::inet, nullif(p->>'user_agent', '')
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

  return jsonb_build_object('id', oid, 'order_number', onum, 'access_token', token, 'grand_total', q->'grand_total');
end $$;

revoke execute on function public.quote_order(jsonb) from public, anon, authenticated;
revoke execute on function public.place_order(jsonb) from public, anon, authenticated;
