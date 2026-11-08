-- =====================================================================
-- 0007 DASHBOARD AND CUSTOMER ANALYTICS
-- =====================================================================

-- All dashboard numbers for a period in one call. Excludes cancelled/failed orders from revenue.
create or replace function public.dashboard_stats(p_from timestamptz, p_to timestamptz)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  if not has_permission('dashboard.view') then raise exception 'forbidden'; end if;
  with o as (
    select * from orders where placed_at between p_from and p_to
  ), ok as (
    select * from o where status not in ('cancelled', 'failed')
  ), items as (
    select oi.* from order_items oi join ok on ok.id = oi.order_id
  )
  select jsonb_build_object(
    'revenue', coalesce((select sum(grand_total) from ok), 0),
    'orders', (select count(*) from ok),
    'all_orders', (select count(*) from o),
    'aov', coalesce((select round(avg(grand_total)) from ok), 0),
    'items', coalesce((select sum(quantity) from items), 0),
    'profit', coalesce((select sum(total - coalesce(cost_price, 0) * quantity) from items), 0),
    'discounts', coalesce((select sum(discount_total) from ok), 0),
    'new_customers', (select count(*) from profiles where created_at between p_from and p_to and not is_staff),
    'delivered', (select count(*) from o where status = 'delivered'),
    'cancelled', (select count(*) from o where status in ('cancelled', 'returned')),
    'by_status', coalesce((select jsonb_object_agg(status, c) from (select status, count(*) c from o group by status) s), '{}'),
    'by_payment', coalesce((select jsonb_object_agg(payment_method, jsonb_build_object('orders', c, 'revenue', v))
                   from (select payment_method, count(*) c, sum(grand_total) v from ok group by payment_method) s), '{}'),
    'by_source', coalesce((select jsonb_object_agg(source, c) from (select source, count(*) c from ok group by source) s), '{}'),
    'top_products', coalesce((select jsonb_agg(t) from (
        select product_id, max(title) title, sum(quantity) qty, sum(total) revenue from items
        group by product_id order by sum(total) desc limit 8) t), '[]'),
    'top_categories', coalesce((select jsonb_agg(t) from (
        select c.name, sum(i.total) revenue, sum(i.quantity) qty from items i
        join product_categories pc on pc.product_id = i.product_id join categories c on c.id = pc.category_id
        group by c.name order by sum(i.total) desc limit 8) t), '[]'),
    'by_district', coalesce((select jsonb_agg(t) from (
        select shipping_address->>'district' district, count(*) orders, sum(grand_total) revenue from ok
        group by 1 order by count(*) desc limit 10) t), '[]')
  ) into r;
  return r;
end $$;

-- Customer list with lifetime stats (search by name, email or phone)
create or replace function public.customers_overview(p_q text default null, p_limit int default 30, p_offset int default 0)
returns table (id uuid, full_name text, email text, phone text, is_blocked boolean, created_at timestamptz,
               orders bigint, spent numeric, last_order timestamptz, total_count bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not has_permission('customers.view') then raise exception 'forbidden'; end if;
  return query
  with base as (
    select p.* from profiles p
    where not p.is_staff and (p_q is null or p_q = '' or p.full_name ilike '%' || p_q || '%' or p.email ilike '%' || p_q || '%' or p.phone ilike '%' || p_q || '%')
  )
  select b.id, b.full_name, b.email, b.phone, b.is_blocked, b.created_at,
         count(o.id) filter (where o.status not in ('cancelled', 'failed')),
         coalesce(sum(o.grand_total) filter (where o.status not in ('cancelled', 'failed')), 0),
         max(o.placed_at), count(*) over ()
  from base b left join orders o on o.user_id = b.id
  group by b.id, b.full_name, b.email, b.phone, b.is_blocked, b.created_at
  order by max(o.placed_at) desc nulls last, b.created_at desc
  limit p_limit offset p_offset;
end $$;

alter table profiles add column if not exists admin_note text;
