-- =====================================================================
-- 0003 SEED: permissions, roles, default settings, zones, content
-- =====================================================================

-- ---------- Permissions (module x action) ----------
insert into permissions (key, module, action)
select m || '.' || a, m, a
from unnest(array['dashboard','products','categories','inventory','orders','customers','reviews',
  'coupons','marketing','content','media','seo','shipping','payments','emails','reports','imports',
  'chatbot','users','roles','settings','audit']) m
cross join unnest(array['view','create','update','delete','export']) a
on conflict do nothing;

-- ---------- Roles ----------
insert into roles (name, description, is_system) values
  ('Super Admin', 'Full access to everything', true),
  ('Admin', 'Everything except roles and audit log', true),
  ('Manager', 'Store operations: catalog, orders, customers, marketing, reports', true),
  ('Order Manager', 'Orders, shipping and customers', true),
  ('Product Manager', 'Products, categories, inventory, media and imports', true),
  ('Marketing', 'Coupons, popups, banners, content and SEO', true),
  ('Support', 'Read orders and customers, answer reviews and chats', true),
  ('Content Editor', 'Pages, blog, FAQ and media', true)
on conflict (name) do nothing;

create or replace function pg_temp.grant_modules(role_name text, modules text[], actions text[])
returns void language sql as $$
  insert into role_permissions (role_id, permission_key)
  select r.id, p.key from roles r, permissions p
  where r.name = role_name and p.module = any(modules) and p.action = any(actions)
  on conflict do nothing;
$$;

select pg_temp.grant_modules('Admin',
  array['dashboard','products','categories','inventory','orders','customers','reviews','coupons','marketing',
        'content','media','seo','shipping','payments','emails','reports','imports','chatbot','users','settings'],
  array['view','create','update','delete','export']);
select pg_temp.grant_modules('Manager',
  array['dashboard','products','categories','inventory','orders','customers','reviews','coupons','marketing',
        'content','media','shipping','reports','imports','chatbot'],
  array['view','create','update','delete','export']);
select pg_temp.grant_modules('Order Manager', array['dashboard','orders','customers','shipping','payments'], array['view','create','update','export']);
select pg_temp.grant_modules('Order Manager', array['products','inventory'], array['view']);
select pg_temp.grant_modules('Product Manager', array['products','categories','inventory','media','imports','reviews'], array['view','create','update','delete','export']);
select pg_temp.grant_modules('Product Manager', array['dashboard'], array['view']);
select pg_temp.grant_modules('Marketing', array['coupons','marketing','content','media','seo'], array['view','create','update','delete','export']);
select pg_temp.grant_modules('Marketing', array['dashboard','products','reports'], array['view']);
select pg_temp.grant_modules('Support', array['orders','customers','products'], array['view']);
select pg_temp.grant_modules('Support', array['reviews','chatbot'], array['view','update']);
select pg_temp.grant_modules('Content Editor', array['content','media'], array['view','create','update','delete']);

-- ---------- Settings ----------
insert into settings (key, value) values
  ('store', '{"name":"Lumen","tagline":"Things you will love, delivered across Bangladesh","email":"support@example.com","phone":"+8801XXXXXXXXX","address":"Dhaka, Bangladesh","currency":"BDT","timezone":"Asia/Dhaka","logo_url":null,"favicon_url":null,"maintenance":false}'),
  ('theme', '{"accent_light":"#0071E3","accent_dark":"#2997FF","default_mode":"system"}'),
  ('seo', '{"title_template":"%s | Lumen","default_title":"Lumen: Online shopping in Bangladesh","default_description":"Shop quality products with cash on delivery across Bangladesh.","og_image":null,"robots_extra":"","verification":{"google":"","bing":"","facebook":""}}'),
  ('tracking', '{"ga4_id":"","gtm_id":"","meta_pixel_id":"","tiktok_pixel_id":"","enabled":false}'),
  ('checkout', '{"guest_checkout":true,"cod_enabled":true,"cod_advance":0,"min_order":0,"terms_required":true,"order_note":true}'),
  ('social', '{"facebook":"","instagram":"","youtube":"","tiktok":"","whatsapp":""}'),
  ('invoice', '{"prefix":"INV-","footer_note":"Thank you for shopping with us.","bin":""}'),
  ('import', '{"usd_to_bdt":122,"cny_to_bdt":17,"cad_to_bdt":88,"markup_percent":60,"markup_fixed":0,"rounding":"nearest_10","default_status":"draft"}'),
  ('chatbot', '{"enabled":true,"name":"Lumi","welcome_en":"Hi! Ask me about products, orders or delivery.","welcome_bn":"হ্যালো! প্রোডাক্ট, অর্ডার বা ডেলিভারি নিয়ে জিজ্ঞেস করুন।","handoff_url":""}'),
  ('loyalty', '{"enabled":false,"points_per_100_bdt":1,"bdt_per_point":1}')
on conflict (key) do nothing;

-- Secret settings start empty; filled from Admin > Settings (encrypted).
insert into settings (key, value, is_secret) values
  ('payment.sslcommerz', '{"enabled":false,"sandbox":true}', true),
  ('payment.bkash', '{"enabled":false,"sandbox":true}', true),
  ('courier.steadfast', '{"enabled":false}', true),
  ('courier.pathao', '{"enabled":false,"sandbox":true}', true),
  ('courier.redx', '{"enabled":false,"sandbox":true}', true),
  ('import.aliexpress', '{"enabled":false}', true),
  ('tracking.meta_capi', '{"enabled":false}', true)
on conflict (key) do nothing;

-- ---------- Shipping zones ----------
insert into shipping_zones (name, districts, base_rate, per_kg_rate, free_over, eta_min_days, eta_max_days, sort_order) values
  ('Inside Dhaka', array['Dhaka'], 70, 15, 3000, 1, 2, 1),
  ('Dhaka suburbs', array['Gazipur','Narayanganj','Munshiganj','Manikganj','Narsingdi'], 100, 20, 3000, 2, 3, 2),
  ('Outside Dhaka', array[]::text[], 130, 20, 5000, 3, 5, 3);

-- ---------- Menus ----------
insert into menus (key, items) values
  ('footer_help', '[{"label":"Track order","href":"/track-order"},{"label":"FAQ","href":"/faq"},{"label":"Return policy","href":"/pages/return-policy"},{"label":"Contact","href":"/contact"}]'),
  ('footer_company', '[{"label":"About us","href":"/pages/about"},{"label":"Privacy policy","href":"/pages/privacy-policy"},{"label":"Terms","href":"/pages/terms"},{"label":"Blog","href":"/blog"}]')
on conflict (key) do nothing;

-- ---------- Categories (demo) ----------
insert into categories (name, name_bn, slug, icon, sort_order) values
  ('Home & Living', 'হোম ও লিভিং', 'home-living', 'lamp', 1),
  ('Fashion', 'ফ্যাশন', 'fashion', 'shirt', 2),
  ('Electronics', 'ইলেকট্রনিক্স', 'electronics', 'headphones', 3),
  ('Beauty', 'বিউটি', 'beauty', 'sparkles', 4),
  ('Kids & Toys', 'শিশু ও খেলনা', 'kids-toys', 'baby', 5),
  ('Kitchen', 'কিচেন', 'kitchen', 'cooking-pot', 6),
  ('Sports & Outdoor', 'স্পোর্টস', 'sports-outdoor', 'bike', 7),
  ('Gadgets', 'গ্যাজেট', 'gadgets', 'watch', 8)
on conflict (slug) do nothing;

-- ---------- Home sections ----------
insert into home_sections (type, title, config, sort_order) values
  ('hero', null, '{}', 1),
  ('perks', null, '{}', 2),
  ('categories', 'Shop by category', '{"limit":8}', 3),
  ('flash_sale', 'Flash sale', '{}', 4),
  ('products', 'New arrivals', '{"source":"newest","limit":8}', 5),
  ('products', 'Best sellers', '{"source":"best_selling","limit":8}', 6),
  ('newsletter', 'Get offers first', '{}', 7);

-- ---------- Pages ----------
insert into pages (title, slug, content_html) values
  ('About us', 'about', '<p>Write your story here from Admin &gt; Content &gt; Pages.</p>'),
  ('Privacy policy', 'privacy-policy', '<p>Your privacy policy.</p>'),
  ('Terms and conditions', 'terms', '<p>Your terms.</p>'),
  ('Return policy', 'return-policy', '<p>Items can be returned within 7 days of delivery if unused and in original packaging.</p>'),
  ('Shipping policy', 'shipping-policy', '<p>Inside Dhaka 1 to 2 days, outside Dhaka 3 to 5 days.</p>')
on conflict (slug) do nothing;

insert into faqs (question, answer, category, sort_order) values
  ('How long does delivery take?', 'Inside Dhaka 1 to 2 days, outside Dhaka 3 to 5 days.', 'Delivery', 1),
  ('Do you offer cash on delivery?', 'Yes, everywhere in Bangladesh.', 'Payment', 2),
  ('Can I return a product?', 'Yes, within 7 days of delivery if unused and in original packaging.', 'Returns', 3);

insert into chatbot_knowledge (title, content) values
  ('Delivery', 'Inside Dhaka 1-2 days (70 BDT), Dhaka suburbs 2-3 days (100 BDT), outside Dhaka 3-5 days (130 BDT). Free delivery inside Dhaka over 3000 BDT.'),
  ('Payment', 'Cash on delivery, bKash and cards/mobile banking through SSLCommerz.'),
  ('Returns', '7-day return for unused items in original packaging. Refund within 3-5 working days after inspection.');
