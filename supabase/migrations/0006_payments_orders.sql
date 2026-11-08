-- =====================================================================
-- 0006 PAYMENTS, ORDER STATUS, RESTOCK, RETURNS
-- =====================================================================

-- Put stock back for every item of an order (idempotent per order via inventory_movements reason).
create or replace function public.restock_order(p_order uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare it record; onum text;
begin
  select order_number into onum from orders where id = p_order;
  if exists (select 1 from inventory_movements where reference = onum and reason in ('cancel', 'return', 'payment_failed')) then
    return;
  end if;
  for it in select product_id, variant_id, quantity from order_items where order_id = p_order loop
    if it.variant_id is not null then
      update product_variants set stock = stock + it.quantity where id = it.variant_id;
      update products set stock = (select coalesce(sum(stock), 0) from product_variants where product_id = it.product_id and is_active),
                          sold_count = greatest(0, sold_count - it.quantity) where id = it.product_id;
    elsif it.product_id is not null then
      update products set stock = stock + it.quantity, sold_count = greatest(0, sold_count - it.quantity) where id = it.product_id;
    end if;
    insert into inventory_movements (product_id, variant_id, change, reason, reference)
    values (it.product_id, it.variant_id, it.quantity, p_reason, onum);
  end loop;
end $$;

-- Status change with note, actor, optional customer email and automatic restock.
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
  if p_status = 'delivered' and o.payment_method = 'cod' then
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

-- Gateway confirmed the money. Idempotent on (gateway, transaction_id).
create or replace function public.mark_order_paid(p_order uuid, p_gateway payment_method, p_trx text, p_amount numeric, p_raw jsonb)
returns boolean language plpgsql security definer set search_path = public as $$
declare o orders%rowtype;
begin
  select * into o from orders where id = p_order for update;
  if not found then return false; end if;
  if exists (select 1 from payments where gateway = p_gateway and transaction_id = p_trx and status = 'paid') then return true; end if;
  if p_amount + 0.5 < o.grand_total - o.paid_amount then
    raise exception 'amount_mismatch';
  end if;
  update payments set status = 'paid', transaction_id = p_trx, raw_response = p_raw, validated_at = now()
  where id = (select id from payments where order_id = p_order and gateway = p_gateway and status = 'pending' order by created_at desc limit 1);
  if not found then
    insert into payments (order_id, gateway, transaction_id, amount, status, raw_response, validated_at)
    values (p_order, p_gateway, p_trx, p_amount, 'paid', p_raw, now());
  end if;
  update orders set payment_status = 'paid', paid_amount = paid_amount + p_amount where id = p_order;
  if o.status = 'pending' then
    perform set_order_status(p_order, 'confirmed', 'Paid online', null, false);
  end if;
  if o.email is not null then
    insert into email_queue (event, to_email, payload) values ('payment_received', o.email, jsonb_build_object('order_id', p_order));
  end if;
  return true;
end $$;

create or replace function public.mark_payment_failed(p_order uuid, p_gateway payment_method, p_raw jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare o orders%rowtype;
begin
  select * into o from orders where id = p_order for update;
  if not found or o.payment_status = 'paid' then return; end if;
  update payments set status = 'failed', raw_response = p_raw
  where order_id = p_order and gateway = p_gateway and status = 'pending';
  update orders set payment_status = 'failed' where id = p_order;
  if o.email is not null then
    insert into email_queue (event, to_email, payload) values ('payment_failed', o.email, jsonb_build_object('order_id', p_order));
  end if;
end $$;

-- Customers may switch a failed online payment to cash on delivery
create or replace function public.switch_to_cod(p_order uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update orders set payment_method = 'cod', payment_status = 'unpaid'
  where id = p_order and payment_status in ('failed', 'pending') and status = 'pending';
end $$;

alter table returns add column if not exists refund_amount numeric(12,2);

revoke execute on function public.restock_order(uuid, text) from public, anon, authenticated;
revoke execute on function public.set_order_status(uuid, order_status, text, uuid, boolean) from public, anon, authenticated;
revoke execute on function public.mark_order_paid(uuid, payment_method, text, numeric, jsonb) from public, anon, authenticated;
revoke execute on function public.mark_payment_failed(uuid, payment_method, jsonb) from public, anon, authenticated;
revoke execute on function public.switch_to_cod(uuid) from public, anon, authenticated;
