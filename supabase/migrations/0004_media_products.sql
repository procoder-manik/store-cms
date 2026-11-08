-- =====================================================================
-- 0004 MEDIA STORAGE + ATOMIC PRODUCT SAVE
-- =====================================================================

-- Public "media" bucket. Used when Cloudflare R2 is not configured.
-- Uploads go through signed URLs created by the server after a permission check.
insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', true, 52428800)
on conflict (id) do nothing;

create policy "media_public_read" on storage.objects for select using (bucket_id = 'media');
create policy "media_staff_write" on storage.objects for insert with check (bucket_id = 'media' and has_permission('media.create'));
create policy "media_staff_delete" on storage.objects for delete using (bucket_id = 'media' and has_permission('media.delete'));

-- Saves a product with categories, media, options, variants and tags in ONE transaction.
-- Variant ids are kept stable so carts keep pointing at the right variant.
create or replace function public.save_product(p jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  pid uuid := nullif(p->>'id', '')::uuid;
  o jsonb; o_ord bigint; new_opt uuid;
  v jsonb; vid uuid;
  t text; tid uuid;
  keep_ids uuid[];
begin
  if pid is null then
    if not has_permission('products.create') then raise exception 'forbidden'; end if;
    insert into products (title, slug, price) values (p->>'title', p->>'slug', coalesce((p->>'price')::numeric, 0))
    returning id into pid;
  elsif not has_permission('products.update') then
    raise exception 'forbidden';
  elsif not exists (select 1 from products where id = pid) then
    raise exception 'not_found';
  end if;

  update products set
    title = p->>'title',
    title_bn = nullif(p->>'title_bn', ''),
    slug = p->>'slug',
    short_description = nullif(p->>'short_description', ''),
    description_html = nullif(p->>'description_html', ''),
    brand_id = nullif(p->>'brand_id', '')::uuid,
    status = (p->>'status')::product_status,
    published_at = nullif(p->>'published_at', '')::timestamptz,
    price = coalesce((p->>'price')::numeric, 0),
    compare_at_price = nullif(p->>'compare_at_price', '')::numeric,
    cost_price = nullif(p->>'cost_price', '')::numeric,
    sku = nullif(p->>'sku', ''),
    barcode = nullif(p->>'barcode', ''),
    stock = coalesce((p->>'stock')::int, 0),
    track_inventory = coalesce((p->>'track_inventory')::boolean, true),
    allow_backorder = coalesce((p->>'allow_backorder')::boolean, false),
    low_stock_threshold = coalesce((p->>'low_stock_threshold')::int, 5),
    weight_grams = nullif(p->>'weight_grams', '')::int,
    specs = coalesce(p->'specs', '[]'),
    size_guide_html = nullif(p->>'size_guide_html', ''),
    seo = coalesce(p->'seo', '{}'),
    is_featured = coalesce((p->>'is_featured')::boolean, false),
    source_platform = coalesce(nullif(p->>'source_platform', '')::source_platform, source_platform),
    source_url = coalesce(nullif(p->>'source_url', ''), source_url),
    source_id = coalesce(nullif(p->>'source_id', ''), source_id)
  where id = pid;

  -- Categories
  delete from product_categories where product_id = pid;
  insert into product_categories (product_id, category_id)
  select pid, x::uuid from jsonb_array_elements_text(coalesce(p->'category_ids', '[]')) x
  on conflict do nothing;

  -- Media (order = array order)
  delete from product_media where product_id = pid;
  insert into product_media (product_id, type, url, thumbnail_url, alt, sort_order, option_value)
  select pid, coalesce(m->>'type', 'image')::media_type, m->>'url', nullif(m->>'thumbnail_url', ''),
         nullif(m->>'alt', ''), (ord - 1)::int, nullif(m->>'option_value', '')
  from jsonb_array_elements(coalesce(p->'media', '[]')) with ordinality as t(m, ord)
  where coalesce(m->>'url', '') <> '';

  -- Options and values
  delete from product_options where product_id = pid;
  for o, o_ord in select * from jsonb_array_elements(coalesce(p->'options', '[]')) with ordinality loop
    insert into product_options (product_id, name, sort_order) values (pid, o->>'name', o_ord - 1) returning id into new_opt;
    insert into product_option_values (option_id, value, swatch_hex, image_url, sort_order)
    select new_opt, val->>'value', nullif(val->>'swatch_hex', ''), nullif(val->>'image_url', ''), (vo - 1)::int
    from jsonb_array_elements(coalesce(o->'values', '[]')) with ordinality as x(val, vo);
  end loop;

  -- Variants: delete removed, update existing, insert new
  select coalesce(array_agg((x->>'id')::uuid), '{}') into keep_ids
  from jsonb_array_elements(coalesce(p->'variants', '[]')) x where coalesce(x->>'id', '') <> '';
  delete from product_variants where product_id = pid and not (id = any(keep_ids));

  for v in select * from jsonb_array_elements(coalesce(p->'variants', '[]')) loop
    vid := nullif(v->>'id', '')::uuid;
    if vid is not null and exists (select 1 from product_variants where id = vid and product_id = pid) then
      update product_variants set
        option_values = coalesce(v->'option_values', '{}'),
        sku = nullif(v->>'sku', ''),
        price = coalesce((v->>'price')::numeric, 0),
        compare_at_price = nullif(v->>'compare_at_price', '')::numeric,
        cost_price = nullif(v->>'cost_price', '')::numeric,
        stock = coalesce((v->>'stock')::int, 0),
        image_url = nullif(v->>'image_url', ''),
        is_active = coalesce((v->>'is_active')::boolean, true)
      where id = vid;
    else
      insert into product_variants (product_id, option_values, sku, price, compare_at_price, cost_price, stock, image_url, is_active)
      values (pid, coalesce(v->'option_values', '{}'), nullif(v->>'sku', ''), coalesce((v->>'price')::numeric, 0),
              nullif(v->>'compare_at_price', '')::numeric, nullif(v->>'cost_price', '')::numeric,
              coalesce((v->>'stock')::int, 0), nullif(v->>'image_url', ''), coalesce((v->>'is_active')::boolean, true));
    end if;
  end loop;

  -- With variants, the product shows the lowest active price and total stock
  if exists (select 1 from product_variants where product_id = pid and is_active) then
    update products set
      price = (select min(price) from product_variants where product_id = pid and is_active),
      compare_at_price = coalesce(compare_at_price, (select max(compare_at_price) from product_variants where product_id = pid and is_active)),
      stock = (select coalesce(sum(stock), 0) from product_variants where product_id = pid and is_active)
    where id = pid;
  end if;

  -- Tags (created on the fly)
  delete from product_tags where product_id = pid;
  for t in select distinct trim(x) from jsonb_array_elements_text(coalesce(p->'tags', '[]')) x where trim(x) <> '' loop
    insert into tags (name, slug) values (t, lower(regexp_replace(t, '\s+', '-', 'g')))
    on conflict (slug) do update set name = excluded.name returning id into tid;
    insert into product_tags (product_id, tag_id) values (pid, tid) on conflict do nothing;
  end loop;

  return pid;
end $$;

revoke execute on function public.save_product(jsonb) from anon;
