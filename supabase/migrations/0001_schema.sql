-- =====================================================================
-- 0001 SCHEMA: all tables for the platform. Run once on a fresh project.
-- =====================================================================
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;
create extension if not exists vector with schema extensions;

-- ---------- Enums ----------
create type order_status as enum ('pending','confirmed','processing','packed','shipped',
  'out_for_delivery','delivered','cancelled','returned','refunded','failed');
create type payment_status as enum ('unpaid','pending','paid','partially_paid','failed','refunded');
create type payment_method as enum ('cod','sslcommerz','bkash');
create type product_status as enum ('draft','published','scheduled','archived');
create type source_platform as enum ('manual','temu','aliexpress','alibaba');
create type media_type as enum ('image','video');
create type moderation_status as enum ('pending','approved','rejected');
create type coupon_type as enum ('percentage','fixed','free_shipping','bxgy');

-- ---------- Helper: updated_at ----------
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- =====================================================================
-- IDENTITY & ACCESS
-- =====================================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  avatar_url text,
  is_staff boolean not null default false,
  is_blocked boolean not null default false,
  loyalty_points integer not null default 0,
  wallet_balance numeric(12,2) not null default 0,
  locale text not null default 'en',
  marketing_opt_in boolean not null default false,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on profiles (phone);

create table roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table permissions (
  key text primary key,                -- e.g. orders.update
  module text not null,
  action text not null
);

create table role_permissions (
  role_id uuid references roles(id) on delete cascade,
  permission_key text references permissions(key) on delete cascade,
  primary key (role_id, permission_key)
);

create table user_roles (
  user_id uuid references profiles(id) on delete cascade,
  role_id uuid references roles(id) on delete cascade,
  primary key (user_id, role_id)
);

create table staff_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role_id uuid references roles(id) on delete set null,
  token_hash text not null unique,
  invited_by uuid references profiles(id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references profiles(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  before jsonb,
  after jsonb,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now()
);
create index on audit_logs (entity, entity_id);
create index on audit_logs (created_at desc);

create table addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  label text,
  name text not null,
  phone text not null,
  division text not null,
  district text not null,
  upazila text,
  area text,
  address_line text not null,
  postcode text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on addresses (user_id);

-- =====================================================================
-- CATALOG
-- =====================================================================
create table categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references categories(id) on delete set null,
  name text not null,
  name_bn text,
  slug text not null unique,
  description text,
  image_url text,
  icon text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  seo jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on categories (parent_id);

create table brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  title_bn text,
  slug text not null unique,
  short_description text,
  description_html text,
  brand_id uuid references brands(id) on delete set null,
  status product_status not null default 'draft',
  price numeric(12,2) not null check (price >= 0),
  compare_at_price numeric(12,2) check (compare_at_price is null or compare_at_price >= 0),
  cost_price numeric(12,2),
  sku text unique,
  barcode text,
  stock integer not null default 0,
  track_inventory boolean not null default true,
  allow_backorder boolean not null default false,
  low_stock_threshold integer not null default 5,
  weight_grams integer,
  dimensions jsonb,
  specs jsonb not null default '[]',
  size_guide_html text,
  seo jsonb not null default '{}',
  source_platform source_platform not null default 'manual',
  source_url text,
  source_id text,
  is_featured boolean not null default false,
  rating_avg numeric(3,2) not null default 0,
  rating_count integer not null default 0,
  sold_count integer not null default 0,
  view_count integer not null default 0,
  published_at timestamptz,
  search_vector tsvector,
  embedding extensions.vector(768),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on products (status, published_at desc);
create index on products using gin (search_vector);
create index on products using gin (title gin_trgm_ops);
create index on products (source_platform, source_id);

create table product_categories (
  product_id uuid references products(id) on delete cascade,
  category_id uuid references categories(id) on delete cascade,
  primary key (product_id, category_id)
);
create index on product_categories (category_id);

create table product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  type media_type not null default 'image',
  url text not null,
  thumbnail_url text,
  alt text,
  sort_order integer not null default 0,
  option_value text,                    -- e.g. "Pink" to switch gallery by color
  created_at timestamptz not null default now()
);
create index on product_media (product_id, sort_order);

create table product_options (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0
);

create table product_option_values (
  id uuid primary key default gen_random_uuid(),
  option_id uuid not null references product_options(id) on delete cascade,
  value text not null,
  swatch_hex text,
  image_url text,
  sort_order integer not null default 0
);

create table product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  sku text unique,
  option_values jsonb not null default '{}',   -- {"Color":"Pink","Size":"M"}
  price numeric(12,2) not null check (price >= 0),
  compare_at_price numeric(12,2),
  cost_price numeric(12,2),
  stock integer not null default 0,
  weight_grams integer,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on product_variants (product_id);

create table inventory_movements (
  id bigint generated always as identity primary key,
  product_id uuid references products(id) on delete cascade,
  variant_id uuid references product_variants(id) on delete cascade,
  change integer not null,
  reason text not null,                 -- order, cancel, return, manual, import
  reference text,
  actor_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table tags (id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique);
create table product_tags (
  product_id uuid references products(id) on delete cascade,
  tag_id uuid references tags(id) on delete cascade,
  primary key (product_id, tag_id)
);

create table collections (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  image_url text,
  is_active boolean not null default true,
  seo jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table collection_products (
  collection_id uuid references collections(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  sort_order integer not null default 0,
  primary key (collection_id, product_id)
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  order_id uuid,
  rating smallint not null check (rating between 1 and 5),
  title text,
  body text,
  media jsonb not null default '[]',
  is_verified boolean not null default false,
  helpful_count integer not null default 0,
  status moderation_status not null default 'pending',
  admin_reply text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on reviews (product_id, status);

create table product_questions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  question text not null,
  answer text,
  status moderation_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table wishlists (
  user_id uuid references profiles(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table stock_alerts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  product_id uuid references products(id) on delete cascade,
  variant_id uuid references product_variants(id) on delete cascade,
  notified_at timestamptz,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- CART & ORDERS
-- =====================================================================
create table carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  session_id text unique,
  coupon_code text,
  email text,
  phone text,
  name text,
  last_activity_at timestamptz not null default now(),
  recovery_stage smallint not null default 0,   -- 0 none, 1 sent 1h, 2 sent 24h
  recovered_order_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on carts (user_id);
create index on carts (last_activity_at);

create table cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references carts(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  variant_id uuid references product_variants(id) on delete cascade,
  quantity integer not null check (quantity > 0 and quantity <= 99),
  saved_for_later boolean not null default false,
  created_at timestamptz not null default now(),
  unique (cart_id, product_id, variant_id)
);

create sequence order_number_seq start 100001;

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('ORD-' || nextval('order_number_seq')),
  user_id uuid references profiles(id) on delete set null,
  email text,
  phone text not null,
  customer_name text not null,
  status order_status not null default 'pending',
  payment_status payment_status not null default 'unpaid',
  payment_method payment_method not null default 'cod',
  subtotal numeric(12,2) not null default 0,
  discount_total numeric(12,2) not null default 0,
  shipping_total numeric(12,2) not null default 0,
  tax_total numeric(12,2) not null default 0,
  grand_total numeric(12,2) not null default 0,
  paid_amount numeric(12,2) not null default 0,
  currency text not null default 'BDT',
  coupon_code text,
  shipping_zone_id uuid,
  shipping_address jsonb not null,
  billing_address jsonb,
  customer_note text,
  admin_note text,
  courier text,
  consignment_id text,
  tracking_code text,
  source text not null default 'web',        -- web, quick_checkout, manual, chatbot
  fraud_score smallint not null default 0,
  ip inet,
  user_agent text,
  placed_at timestamptz not null default now(),
  delivered_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on orders (user_id, placed_at desc);
create index on orders (status, placed_at desc);
create index on orders (phone);
create index on orders (placed_at desc);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  variant_id uuid references product_variants(id) on delete set null,
  title text not null,
  variant_title text,
  image_url text,
  sku text,
  unit_price numeric(12,2) not null,
  cost_price numeric(12,2),
  quantity integer not null check (quantity > 0),
  total numeric(12,2) not null,
  created_at timestamptz not null default now()
);
create index on order_items (order_id);
create index on order_items (product_id);

create table order_status_history (
  id bigint generated always as identity primary key,
  order_id uuid not null references orders(id) on delete cascade,
  from_status order_status,
  to_status order_status not null,
  note text,
  notify_customer boolean not null default true,
  actor_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on order_status_history (order_id);

create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  gateway payment_method not null,
  transaction_id text,
  gateway_ref text,
  amount numeric(12,2) not null,
  status payment_status not null default 'pending',
  raw_response jsonb,
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  unique (gateway, transaction_id)
);
create index on payments (order_id);

create table refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  payment_id uuid references payments(id) on delete set null,
  amount numeric(12,2) not null,
  reason text,
  status text not null default 'pending',
  raw jsonb,
  actor_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table returns (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  items jsonb not null,
  reason text not null,
  media jsonb not null default '[]',
  status moderation_status not null default 'pending',
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create sequence invoice_number_seq start 1;
create table invoices (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references orders(id) on delete cascade,
  invoice_number text not null unique default ('INV-' || lpad(nextval('invoice_number_seq')::text, 6, '0')),
  pdf_url text,
  created_at timestamptz not null default now()
);

create table shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  courier text not null,
  consignment_id text,
  tracking_code text,
  status text,
  cod_amount numeric(12,2),
  charge numeric(12,2),
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on shipments (consignment_id);

-- =====================================================================
-- MARKETING
-- =====================================================================
create table coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  type coupon_type not null,
  value numeric(12,2) not null default 0,
  min_order numeric(12,2) not null default 0,
  max_discount numeric(12,2),
  usage_limit integer,
  per_user_limit integer,
  used_count integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  applies_to jsonb not null default '{}',   -- {product_ids:[], category_ids:[], user_ids:[]}
  bxgy jsonb,                               -- {buy_qty, get_qty, get_product_ids}
  first_order_only boolean not null default false,
  is_public boolean not null default false, -- chatbot/popups may show public coupons
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references coupons(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  phone text,
  amount numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create table flash_sales (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create table flash_sale_items (
  flash_sale_id uuid references flash_sales(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  variant_id uuid references product_variants(id) on delete cascade,
  sale_price numeric(12,2) not null,
  quantity_limit integer,
  sold integer not null default 0,
  primary key (flash_sale_id, product_id)
);

create table popups (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  image_url text,
  cta_label text,
  cta_url text,
  coupon_id uuid references coupons(id) on delete set null,
  trigger jsonb not null default '{"type":"delay","value":5}',  -- delay|exit|scroll|entry
  targeting jsonb not null default '{"pages":["*"],"devices":["all"]}',
  frequency text not null default 'once_per_session',
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default false,
  views integer not null default 0,
  clicks integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table banners (
  id uuid primary key default gen_random_uuid(),
  placement text not null,                  -- hero, home_mid, category_top, announcement
  title text,
  subtitle text,
  image_url text,
  mobile_image_url text,
  link_url text,
  sort_order integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  status text not null default 'pending',   -- pending, subscribed, unsubscribed
  token text,
  source text,
  created_at timestamptz not null default now()
);

create table loyalty_transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  points integer not null,
  reason text not null,
  order_id uuid references orders(id) on delete set null,
  created_at timestamptz not null default now()
);

create table referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references profiles(id) on delete cascade,
  code text not null unique,
  referred_user_id uuid references profiles(id) on delete set null,
  rewarded boolean not null default false,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- CONTENT, MEDIA, SETTINGS
-- =====================================================================
create table pages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  content_html text,
  is_published boolean not null default true,
  seo jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table blog_categories (id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique);
create table blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text,
  content_html text,
  cover_url text,
  category_id uuid references blog_categories(id) on delete set null,
  author_id uuid references profiles(id) on delete set null,
  status product_status not null default 'draft',
  published_at timestamptz,
  seo jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  category text,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

create table menus (
  key text primary key,                     -- header, footer_help, footer_company
  items jsonb not null default '[]'
);

create table home_sections (
  id uuid primary key default gen_random_uuid(),
  type text not null,                       -- hero, categories, products, banner, flash_sale, testimonials
  title text,
  config jsonb not null default '{}',
  sort_order integer not null default 0,
  is_active boolean not null default true
);

create table media (
  id uuid primary key default gen_random_uuid(),
  storage_key text not null unique,
  url text not null,
  thumbnail_url text,
  mime text not null,
  size_bytes bigint not null,
  width integer,
  height integer,
  duration_sec numeric,
  alt text,
  folder text not null default 'uploads',
  uploaded_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on media (folder, created_at desc);

create table settings (
  key text primary key,                     -- e.g. store, seo, tracking, payment.sslcommerz
  value jsonb not null default '{}',
  is_secret boolean not null default false, -- secret values stored encrypted in value->>'enc'
  updated_by uuid references profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table redirects (
  id uuid primary key default gen_random_uuid(),
  from_path text not null unique,
  to_path text not null,
  code smallint not null default 301 check (code in (301,302)),
  hits integer not null default 0,
  created_at timestamptz not null default now()
);

create table not_found_logs (
  path text primary key,
  hits integer not null default 1,
  last_seen_at timestamptz not null default now()
);

create table shipping_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  districts text[] not null default '{}',   -- empty = fallback zone
  base_rate numeric(12,2) not null,
  per_kg_rate numeric(12,2) not null default 0,
  free_over numeric(12,2),
  eta_min_days smallint not null default 1,
  eta_max_days smallint not null default 3,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

create table email_templates (
  event text primary key,
  subject text not null,
  heading text,
  body_html text,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table email_queue (
  id bigint generated always as identity primary key,
  event text not null,
  to_email text not null,
  payload jsonb not null default '{}',
  status text not null default 'queued',    -- queued, sent, failed
  attempts smallint not null default 0,
  provider_id text,
  error text,
  send_after timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index on email_queue (status, send_after);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  subject text,
  message text not null,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

-- =====================================================================
-- IMPORT
-- =====================================================================
create table import_tokens (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  token_hash text not null unique,
  created_by uuid references profiles(id) on delete cascade,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table import_jobs (
  id uuid primary key default gen_random_uuid(),
  source_platform source_platform not null,
  url text not null,
  status text not null default 'pending',   -- pending, previewed, imported, failed
  raw jsonb,
  normalized jsonb,
  product_id uuid references products(id) on delete set null,
  error text,
  actor_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- CHATBOT
-- =====================================================================
create table chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  visitor_id text not null,
  locale text,
  handed_off boolean not null default false,
  started_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);
create index on chat_sessions (visitor_id);

create table chat_messages (
  id bigint generated always as identity primary key,
  session_id uuid not null references chat_sessions(id) on delete cascade,
  role text not null check (role in ('user','assistant','tool','staff')),
  content text,
  tool_calls jsonb,
  created_at timestamptz not null default now()
);
create index on chat_messages (session_id, id);

create table chatbot_knowledge (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

-- ---------- updated_at triggers ----------
do $$
declare t text;
begin
  for t in select table_name from information_schema.columns
           where table_schema = 'public' and column_name = 'updated_at'
  loop
    execute format('create trigger trg_%I_updated before update on %I for each row execute function set_updated_at()', t, t);
  end loop;
end $$;
