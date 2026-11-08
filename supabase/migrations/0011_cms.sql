-- =====================================================================
-- 0011 CMS: custom code, delivery charge switch, code permission
-- =====================================================================

-- Delivery charge can be switched off, flat, or per zone; a product can ship free
alter table products drop constraint if exists products_shipping_mode_check;
alter table products add constraint products_shipping_mode_check check (shipping_mode in ('default', 'prepaid', 'on_delivery', 'free'));
update settings set value = value || '{"shipping_enabled":true,"shipping_method":"zones"}'::jsonb where key = 'checkout' and not (value ? 'shipping_enabled');

-- Custom code (header, body start, footer) for the whole site and for single pages, products, posts and categories
create table if not exists custom_code (
  entity text not null,
  entity_id text not null,
  head text not null default '',
  body_start text not null default '',
  footer text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id) on delete set null,
  primary key (entity, entity_id)
);
alter table custom_code enable row level security;
create policy "public_custom_code" on custom_code for select using (true);
create policy "staff_custom_code" on custom_code for all using (has_permission('code.update')) with check (has_permission('code.update'));

insert into permissions (key, module, action)
select 'code.' || a, 'code', a from unnest(array['view','create','update','delete','export']) a
on conflict do nothing;

drop policy if exists "public_settings" on settings;
create policy "public_settings" on settings for select
  using (not is_secret and key in ('store','theme','seo','tracking','checkout','social','checkout_fields','contact_form','referral','post_types','loyalty','templates','schema_org','custom_code_global'));

insert into settings (key, value) values
  ('templates', '{}'),
  ('schema_org', '{"type":"Store","enabled":true,"search_action":true}')
on conflict (key) do nothing;

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
  z shipping_zones%rowtype; shipping numeric := 0; ship_hidden boolean := false; shipcfg jsonb;
  c coupons%rowtype; c_err text := null; discount numeric := 0; eligible numeric := 0; free_ship boolean := false;
  used int; prior int;
  uid uuid := nullif(p->>'user_id', '')::uuid;
  co jsonb; rf jsonb; ref_cnt int := 0; ref_pct numeric := 0; ref_disc numeric := 0; pts int := 0; pts_disc numeric := 0; base numeric; adv_items numeric := 0; ship_pre boolean := false; adv_req boolean := false; pct numeric; default_pct numeric; ship_collect text; adv numeric := 0;
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

    if prod.track_inventory and not prod.allow_backorder and not prod.preorder and available < qty then
      errors := errors || jsonb_build_object('product_id', prod.id, 'variant_id', v_id, 'error', 'insufficient_stock', 'available', greatest(available, 0));
      continue;
    end if;

    lines := lines || jsonb_build_object(
      'product_id', prod.id, 'variant_id', v_id, 'title', prod.title, 'variant_title', v_title, 'slug', prod.slug,
      'image_url', img, 'sku', prod.sku, 'unit_price', unit, 'compare_at_price', v_compare, 'cost_price', v_cost,
      'quantity', qty, 'total', unit * qty, 'track_inventory', prod.track_inventory, 'allow_backorder', prod.allow_backorder or prod.preorder, 'preorder', prod.preorder,
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

  -- Store-wide delivery rules (Settings > Shipping): off, flat rate, or zones. Products flagged free ship free.
  select value into shipcfg from settings where key = 'checkout';
  if coalesce(shipcfg->>'shipping_enabled', 'true') = 'false' then
    shipping := 0; ship_hidden := true;
  else
    if coalesce(shipcfg->>'shipping_method', 'zones') = 'flat' and jsonb_array_length(lines) > 0 then
      shipping := coalesce(nullif(shipcfg->>'flat_rate', '')::numeric, 0);
      if coalesce(shipcfg->>'flat_free_over', '') <> '' and subtotal >= (shipcfg->>'flat_free_over')::numeric then shipping := 0; end if;
    end if;
    if jsonb_array_length(lines) > 0 and not exists (select 1 from jsonb_array_elements(lines) l where coalesce(l->>'shipping_mode', 'default') <> 'free') then
      shipping := 0;
    end if;
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

  -- Rewards: referral discount (percent per successful referral, capped) and loyalty points
  if uid is not null and coalesce((p->>'use_rewards')::boolean, false) then
    select value into rf from settings where key = 'referral';
    base := greatest(0, subtotal - discount);
    if coalesce((rf->>'enabled')::boolean, false) then
      select count(*) into ref_cnt from referral_rewards where referrer_id = uid and used_order_id is null;
      ref_pct := least(coalesce((rf->>'max_percent')::numeric, 50), ref_cnt * coalesce((rf->>'percent_per_referral')::numeric, 10));
      ref_disc := round(base * ref_pct / 100);
      if (rf->>'max_amount') is not null then ref_disc := least(ref_disc, (rf->>'max_amount')::numeric); end if;
    end if;
    select value into rf from settings where key = 'loyalty';
    if coalesce((rf->>'enabled')::boolean, false) then
      select loyalty_points into pts from profiles where id = uid;
      pts_disc := least(coalesce(pts, 0) * coalesce((rf->>'bdt_per_point')::numeric, 1),
                        round((base - ref_disc) * coalesce((rf->>'max_redeem_percent')::numeric, 30) / 100));
      pts_disc := greatest(0, floor(pts_disc));
      pts := ceil(pts_disc / nullif(coalesce((rf->>'bdt_per_point')::numeric, 1), 0));
    else pts := 0; end if;
    discount := discount + ref_disc + pts_disc;
  end if;

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
    'subtotal', subtotal, 'discount', discount, 'shipping', shipping, 'shipping_hidden', ship_hidden,
    'grand_total', greatest(0, subtotal - discount + shipping),
    'weight_grams', weight,
    'rewards', jsonb_build_object('referral_percent', ref_pct, 'referral_discount', ref_disc, 'referral_available', ref_cnt, 'points_used', coalesce(pts, 0), 'points_discount', pts_disc),
    'advance', jsonb_build_object('amount', adv, 'required', adv_req and adv > 0, 'shipping_prepaid', ship_pre and shipping > 0, 'items_amount', round(adv_items)),
    'zone', case when z.id is null then null else jsonb_build_object('id', z.id, 'name', z.name, 'eta_min', z.eta_min_days, 'eta_max', z.eta_max_days) end,
    'coupon', case when coalesce(p->>'coupon_code', '') = '' then null
      else jsonb_build_object('code', upper(trim(p->>'coupon_code')), 'valid', c_err is null, 'error', c_err, 'free_shipping', free_ship) end
  );
end $$;
revoke execute on function public.quote_order(jsonb) from public, anon, authenticated;
