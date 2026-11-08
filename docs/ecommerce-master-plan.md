# E-commerce Platform: Architecture, Plan and Master Prompt

Version 1.0, November 2026. Target market: Bangladesh (BDT, Bangla + English). Budget: 100% free tiers.

---

## 1. Project Overview

A premium, Apple-style e-commerce platform for Bangladesh that supports dropshipping and normal retail. Products can be imported from Temu (via a Chrome extension), AliExpress (official free API) and Alibaba (manual/extension). Customers order, pay with SSLCommerz/bKash or Cash on Delivery, and orders are shipped through Steadfast, Pathao or RedX. Admins manage everything from a full backend with roles, analytics, SEO, marketing, emails and an AI chatbot that always answers from live data.

Core goals:

1. Premium, clean, Apple/iOS-like UI with glass blur, dark and light mode, fully responsive, fast.
2. One-click product import (title, price, gallery, video, variants, sizes, colors, specs, description).
3. Complete e-commerce backend: products, orders, invoices, shipping, customers, coupons, offers, popups, reviews, returns, reports.
4. Bangladeshi payments and couriers.
5. Strong security and role-based access.
6. Strong SEO controllable from the admin.
7. Transactional emails for every important event.
8. Real-time AI chatbot grounded in the database.
9. Zero cost to run in demo stage.

---

## 2. Tech Stack (all free tiers)

| Layer | Choice | Free limits / notes |
|---|---|---|
| Framework | Next.js 15 (App Router), TypeScript, React Server Components | Open source |
| Styling | Tailwind CSS 4, shadcn/ui (customised), Framer Motion | Open source |
| Database | Supabase PostgreSQL | 500 MB DB, 50k monthly active users, pauses after 7 days inactivity |
| Auth | Supabase Auth (email/password, magic link, Google, Facebook, email verification, password reset) | Included |
| Media storage | Cloudflare R2 (S3 compatible) | 10 GB storage, free egress |
| Image optimisation | next/image + Cloudflare Images transform or sharp | Free |
| Hosting | Vercel Hobby (demo) or Cloudflare Pages / Workers via OpenNext (commercial, free) | Vercel Hobby is non-commercial only |
| Email sending | Resend (3,000 emails/month, 100/day) or Brevo (300/day) | Free; needs a domain for best deliverability |
| Email templates | React Email | Open source |
| AI chatbot | Google Gemini API free tier (Gemini Flash) with function calling; fallback Groq free tier | Free with rate limits |
| Search | PostgreSQL full-text search + pg_trgm | Free |
| Background jobs / cron | Supabase pg_cron + Edge Functions, or Vercel Cron | Free |
| Rate limiting / cache | Upstash Redis free tier (10k commands/day) | Free |
| Bot protection | Cloudflare Turnstile | Free |
| Error monitoring | Sentry free tier | Free |
| Validation | Zod | Open source |
| Forms | React Hook Form | Open source |
| Data fetching | TanStack Query (client), Server Actions (mutations) | Open source |
| Charts | Recharts | Open source |
| Rich text editor | Tiptap | Open source |
| PDF invoices | @react-pdf/renderer | Open source |
| i18n | next-intl (Bangla, English) | Open source |
| Payments | SSLCommerz (sandbox free), bKash Tokenized Checkout (sandbox free), Cash on Delivery | Live accounts need merchant approval; per-transaction fees only |
| Couriers | Steadfast, Pathao, RedX merchant APIs | Free accounts, pay per delivery |

---

## 3. System Architecture

```
            ┌──────────────────────────────────────────────┐
            │                Customer Browser               │
            │  Next.js storefront (RSC + client islands)    │
            └───────────────┬──────────────────────────────┘
                            │ HTTPS
┌───────────────────────────▼────────────────────────────────────┐
│                     Next.js App (Vercel / CF)                   │
│  /(store)  storefront pages       /admin  protected dashboard   │
│  /api/*    route handlers         Server Actions (mutations)    │
│  middleware: auth, RBAC, rate limit, security headers, i18n     │
└──────┬───────────┬────────────┬────────────┬───────────┬───────┘
       │           │            │            │           │
┌──────▼─────┐ ┌───▼──────┐ ┌───▼──────┐ ┌───▼──────┐ ┌──▼────────┐
│ Supabase   │ │ R2 media │ │ Resend   │ │ Gemini   │ │ Upstash   │
│ Postgres + │ │ storage  │ │ emails   │ │ chatbot  │ │ Redis     │
│ Auth + RLS │ └──────────┘ └──────────┘ └──────────┘ └───────────┘
└──────┬─────┘
       │ webhooks / server calls
┌──────▼─────────────────────────────────────────────────────────┐
│ External: SSLCommerz, bKash, Steadfast, Pathao, RedX,           │
│ AliExpress Open Platform, GA4, GTM, Meta Pixel + Conversions API│
└────────────────────────────────────────────────────────────────┘

Chrome Extension (Temu/Alibaba importer) ──signed request──> /api/import/ingest
```

Key principles:

1. All secrets live only on the server (env vars). The browser never sees service keys.
2. Every write goes through a Server Action or route handler that validates input with Zod and checks permissions.
3. Supabase Row Level Security is enabled on every table as a second layer of defence.
4. Prices are always recalculated on the server at checkout; client prices are never trusted.
5. Payment and courier webhooks are verified (signature / validation API) before updating orders.
6. Settings (SEO, tracking IDs, payment and courier credentials, email templates, theme) are stored in the database and editable from the admin, with secrets encrypted at rest (AES-256-GCM using a server key).

---

## 4. Storefront Features (customer side)

Navigation and discovery:

- Home page with hero slider, featured categories, flash sale with countdown, new arrivals, best sellers, trending, recently viewed, brand strip, testimonials, newsletter block. All sections are configurable from the admin (page builder with drag to reorder).
- Mega menu with categories and sub-categories, sticky glass header that blurs on scroll.
- Instant search with autocomplete, typo tolerance, product thumbnails and recent searches.
- Category and search pages with filters (price range, size, color, rating, brand, availability, discount), sorting, grid/list toggle, infinite scroll or pagination.
- Collections (curated lists) and tag pages.

Product page:

- Image gallery with zoom, swipe on mobile, fullscreen lightbox, product video playback inside the gallery.
- Variant selector (size, color with swatches, other options) with per-variant price, stock and image.
- Price, compare-at price, discount badge, savings, stock status, estimated delivery date by district.
- Size guide modal, specifications table, rich description, shipping and return info tabs.
- Ratings and reviews with photos, verified purchase badge, helpful votes, Q&A section.
- Related products, frequently bought together, recently viewed.
- Share buttons, wishlist, compare.
- Sticky "Add to cart" and "Buy now" bar on mobile.

Cart and checkout:

- Slide-over glass cart drawer and full cart page, quantity update, save for later, coupon field, free shipping progress bar.
- Quick Checkout: "Buy Now" opens a modal with the product, variant picker, quantity, address form, shipping method, payment method and order summary. Order is placed without leaving the page.
- Full checkout: guest checkout or login, address book, Bangladesh division/district/upazila/area selectors, delivery charge by zone (inside Dhaka / outside Dhaka / custom zones), payment methods (COD, SSLCommerz, bKash, partial advance for COD), order notes, terms consent.
- Abandoned cart capture (phone/email saved early) for recovery emails.
- Order success page with invoice download and tracking link.

Account:

- Sign up, login, Google and Facebook login, phone number field, email verification, forgot/reset password, change password.
- Dashboard: orders with live status timeline, courier tracking, invoice download, reorder, cancel request (before shipping), return/refund request with photos.
- Address book, wishlist, reviews written, loyalty points and wallet balance, notifications, account deletion (privacy).

Other:

- Dark/light/system theme toggle, Bangla/English language switch, BDT currency.
- Popup offers (entry, exit intent, scroll %, timed), announcement bar, cookie consent.
- AI chatbot bubble on every page.
- Static pages: About, Contact (with form), FAQ, Privacy, Terms, Return policy, Shipping policy, Track order (by order number + phone).
- Blog with categories (for SEO).
- PWA support (installable, offline fallback page).
- Accessibility: keyboard navigation, focus states, alt text, ARIA, reduced motion support.

---

## 5. Admin Panel Features

Dashboard:

- KPI cards: revenue, orders, average order value, new customers, conversion rate, pending orders, low stock count.
- Sales chart with range switcher: today, last 1 day, 7 days, 15 days, 30 days, 3 months, 6 months, 1 year, custom range. Comparison with previous period.
- Order status breakdown, top products, top categories, sales by district, payment method split, recent orders, recent reviews.

Products:

- Create/edit with rich editor, multiple images and videos (drag to reorder), variants (matrix builder for size × color), SKU, barcode, stock per variant, cost price (for profit reports), compare-at price, weight, dimensions.
- Categories (nested), brands, tags, attributes, collections.
- Status: draft, published, scheduled, archived. Bulk edit, bulk delete, bulk price update, CSV import/export, duplicate product.
- Per-product SEO: meta title, description, slug, OG image, canonical, noindex toggle, structured data preview.
- Importer screen: paste URL (AliExpress/Alibaba/Temu), preview the imported data, set markup rules (percentage or fixed, rounding to .99 or nearest 10 BDT), currency conversion rate, then save as draft or publish. Import history log.
- Inventory: stock movements log, low stock alerts, out of stock behaviour.

Orders:

- List with filters (status, payment, date, courier, district), search, bulk actions.
- Order detail: items, customer, addresses, payment info, timeline, internal notes, edit items before shipping.
- Statuses: pending, confirmed, processing, packed, shipped, out for delivery, delivered, cancelled, returned, refunded, failed. Each change can trigger an email.
- Invoice PDF generation and printing, packing slip, shipping label.
- One-click "Send to courier" (Steadfast/Pathao/RedX), stores consignment ID and tracking code, auto status sync via webhook or scheduled polling.
- Manual order creation (phone orders).
- Fraud check flag for COD (repeat cancellation history by phone).
- Returns and refunds management.
- Abandoned carts list with recovery email action.

Customers:

- List, profile, order history, lifetime value, notes, tags, block/unblock, loyalty points adjustment, export.

Marketing:

- Coupons/vouchers: percentage, fixed, free shipping, buy X get Y; min order, max discount, usage limit total and per customer, start/end dates, specific products/categories/customers, first order only.
- Flash sales with countdown, scheduled price changes.
- Popup builder: content, image, coupon, trigger (entry, exit intent, delay, scroll), frequency, target pages, devices, schedule.
- Announcement bar, banners and sliders manager.
- Newsletter subscribers and campaign sending.
- Loyalty points rules, referral codes.

Content:

- Pages (CMS), blog posts, FAQ manager, navigation menu builder, footer builder, homepage section builder.
- Media library: upload images/videos to R2, folders, search, alt text editing, usage tracking, automatic WebP/AVIF thumbnails.

SEO and integrations:

- Global SEO: site title template, default meta, OG defaults, robots.txt editor, sitemap settings, redirects manager (301/302), 404 monitor.
- Verification codes: Google Search Console, Bing, Facebook domain verification.
- Tracking: GA4 measurement ID, GTM container ID, Meta Pixel ID + Conversions API token, TikTok Pixel. Toggle each on or off.
- Schema settings: Organization, logo, social profiles, contact info.

Shipping:

- Zones (inside Dhaka, sub-Dhaka, outside Dhaka, custom by district), rates by weight, free shipping threshold, delivery time estimates.
- Courier accounts: API credentials for Steadfast, Pathao, RedX; default courier; pickup store info.

Payments:

- Enable/disable COD, SSLCommerz, bKash; sandbox/live toggle; credentials; partial advance amount for COD.
- Transaction log with gateway responses.

Emails:

- Template editor per event with variables, test send, enable/disable per event, sender name and address, email logs (sent, failed).

Users and roles:

- Staff users: invite by email, activate/deactivate, force password reset, 2FA (TOTP) required for admins.
- Roles: Super Admin, Admin, Manager, Order Manager, Product Manager, Marketing, Support, Content Editor, plus custom roles.
- Granular permissions per module and action (view, create, edit, delete, export).
- Activity/audit log: who did what and when, with before/after values.

Settings:

- Store info, logo, favicon, currency, timezone, languages, theme colors, maintenance mode, legal pages, social links, contact info, invoice settings (prefix, footer note, VAT/BIN).

Reports:

- Sales, profit (using cost price), products, categories, customers, coupons, taxes, courier performance, refunds. Export CSV/Excel/PDF.

Chatbot:

- Enable/disable, persona and tone, welcome message, extra knowledge (policies, FAQs), conversation history viewer, handoff to human (WhatsApp/Messenger link or admin live reply).

---

## 6. Database Schema (PostgreSQL / Supabase)

All tables have `id uuid primary key default gen_random_uuid()`, `created_at`, `updated_at` timestamps, and RLS enabled.

Identity and access:

- `profiles` (id = auth.users.id, full_name, phone, avatar_url, is_staff, is_blocked, loyalty_points, wallet_balance, locale)
- `roles` (name, description, is_system)
- `permissions` (key such as `orders.update`, module, action)
- `role_permissions` (role_id, permission_id)
- `user_roles` (user_id, role_id)
- `audit_logs` (actor_id, action, entity, entity_id, before jsonb, after jsonb, ip, user_agent)
- `addresses` (user_id, name, phone, division, district, upazila, area, address_line, postcode, is_default)

Catalog:

- `categories` (parent_id, name, slug, description, image, sort_order, seo jsonb, is_active)
- `brands` (name, slug, logo)
- `products` (title, slug, short_description, description_html, brand_id, status, product_type, price, compare_at_price, cost_price, sku, stock, track_inventory, weight, dimensions jsonb, specs jsonb, seo jsonb, source_platform, source_url, source_id, is_featured, published_at, search_vector tsvector)
- `product_categories` (product_id, category_id)
- `product_media` (product_id, type image/video, url, thumbnail_url, alt, sort_order, variant_option_value)
- `product_options` (product_id, name such as Size/Color, sort_order)
- `product_option_values` (option_id, value, swatch_hex, image_url)
- `product_variants` (product_id, sku, option_values jsonb, price, compare_at_price, cost_price, stock, image_url, is_active)
- `inventory_movements` (variant_id, change, reason, reference, actor_id)
- `tags`, `product_tags`
- `collections`, `collection_products`
- `reviews` (product_id, user_id, order_id, rating, title, body, media jsonb, is_verified, status)
- `product_questions` (product_id, user_id, question, answer, status)
- `wishlists` (user_id, product_id)

Cart and orders:

- `carts` (user_id nullable, session_id, coupon_code, email, phone, last_activity_at, recovered)
- `cart_items` (cart_id, product_id, variant_id, quantity)
- `orders` (order_number, user_id, email, phone, status, payment_status, payment_method, subtotal, discount_total, shipping_total, tax_total, grand_total, currency, coupon_code, shipping_address jsonb, billing_address jsonb, notes, admin_notes, courier, consignment_id, tracking_code, source web/quick_checkout/manual, ip, placed_at)
- `order_items` (order_id, product_id, variant_id, title_snapshot, variant_snapshot, image_snapshot, unit_price, quantity, total)
- `order_status_history` (order_id, from_status, to_status, note, actor_id)
- `payments` (order_id, gateway, transaction_id, amount, status, raw_response jsonb, validated_at)
- `refunds` (order_id, amount, reason, status)
- `returns` (order_id, items jsonb, reason, media jsonb, status)
- `invoices` (order_id, invoice_number, pdf_url)
- `shipments` (order_id, courier, consignment_id, tracking_code, status, cod_amount, charge, raw jsonb)

Marketing:

- `coupons` (code, type, value, min_order, max_discount, usage_limit, per_user_limit, starts_at, ends_at, applies_to jsonb, first_order_only, is_active)
- `coupon_redemptions` (coupon_id, order_id, user_id)
- `flash_sales`, `flash_sale_items`
- `popups` (title, content, image, coupon_id, trigger jsonb, targeting jsonb, frequency, starts_at, ends_at, is_active)
- `banners` (placement, image, link, sort_order, schedule)
- `newsletter_subscribers` (email, status, source)
- `loyalty_transactions`, `referrals`

Content and settings:

- `pages`, `blog_posts`, `blog_categories`, `faqs`, `menus` (jsonb tree)
- `home_sections` (type, config jsonb, sort_order, is_active)
- `media` (key, url, mime, size, width, height, alt, folder, uploaded_by)
- `settings` (key, value jsonb, is_secret) with secret values encrypted
- `redirects` (from_path, to_path, code)
- `shipping_zones` (name, districts text[], rates jsonb, free_over)
- `email_templates` (event, subject, html, is_active)
- `email_logs` (to, event, status, provider_id, error)
- `notifications` (user_id, type, title, body, read_at)

Import:

- `import_jobs` (source_platform, url, status, raw jsonb, product_id, error, actor_id)
- `import_settings` (markup rules, exchange rates)

Chatbot:

- `chat_sessions` (user_id nullable, visitor_id, started_at)
- `chat_messages` (session_id, role, content, tool_calls jsonb)
- `chatbot_knowledge` (title, content, is_active) for policies and custom answers

Useful database functions:

- `has_permission(user_id, permission_key)` used in RLS policies.
- `place_order(payload)` transactional function that locks stock, recalculates totals, applies coupon, creates order and items atomically.
- `sales_summary(from, to, bucket)` for dashboard charts.
- Triggers for `updated_at`, `search_vector`, stock movement logging and audit logging.

---

## 7. Security

1. Supabase RLS on every table. Customers can only read/write their own rows. Staff access is gated by `has_permission()`.
2. Service role key used only in server code. Never prefixed with `NEXT_PUBLIC_`.
3. Admin routes protected in middleware and again in every Server Action (defence in depth).
4. Mandatory TOTP 2FA for staff, session timeout, login attempt limiting and account lockout.
5. Zod validation on every input. Parameterised queries only (Supabase client / RPC).
6. Rate limiting with Upstash on login, signup, checkout, coupon apply, chatbot, contact form, import endpoint.
7. Cloudflare Turnstile on signup, login, checkout (guest), contact form.
8. Security headers: strict Content Security Policy, HSTS, X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
9. CSRF protection (Server Actions are origin checked; route handlers verify origin).
10. HTML sanitisation (DOMPurify / sanitize-html) for product descriptions, reviews, imported content.
11. File upload checks: MIME sniffing, size limits, extension allowlist, random file names, images re-encoded with sharp.
12. Payment security: amounts recalculated server side; SSLCommerz IPN validated with the validation API; bKash payment executed and queried server side; idempotency keys to prevent double processing.
13. Secrets in `settings` encrypted with AES-256-GCM using `ENCRYPTION_KEY` env var.
14. Audit logging for every admin action.
15. Dependency scanning (npm audit, GitHub Dependabot), no unused packages.
16. Chatbot guardrails: read-only tools, no access to other customers' data, order lookup requires order number + phone match, prompt injection resistant system prompt, output length limits.
17. Daily database backups (Supabase free tier has limited backups, so a scheduled `pg_dump` via GitHub Actions to a private repo or R2 is included).

---

## 8. Product Importer

Unified flow: Admin pastes a URL or the Chrome extension sends data → backend detects the platform → normalises to one internal format → admin previews and edits → media downloaded to R2 → product saved as draft or published.

Normalised import format:

```json
{
  "source": "temu | aliexpress | alibaba",
  "sourceUrl": "...",
  "sourceId": "...",
  "title": "...",
  "descriptionHtml": "...",
  "price": 0,
  "compareAtPrice": 0,
  "currency": "USD",
  "images": ["..."],
  "videos": [{ "url": "...", "poster": "..." }],
  "options": [{ "name": "Color", "values": [{ "value": "Pink", "image": "..." }] }],
  "variants": [{ "options": { "Color": "Pink", "Size": "M" }, "price": 0, "stock": 0, "image": "..." }],
  "specs": [{ "label": "Material", "value": "..." }],
  "rating": 0,
  "reviewCount": 0
}
```

Temu (free, via Chrome extension):

- Manifest V3 extension with a content script that runs on `temu.com/*` product pages.
- Reads embedded page data (the JSON state the page ships with, for example `window.rawData` or JSON inside script tags), falling back to DOM parsing.
- Extracts title, price, gallery images, product video URL, SKU matrix (sizes, colors), specs, description images.
- Popup UI shows a preview and a "Send to my store" button.
- Sends data to `/api/import/ingest` with an import token (generated in admin, stored in extension options). The token is hashed in the database, revocable, and rate limited.
- Works because it runs inside the admin's real browser session, so Temu's bot protection does not block it.
- Note: Temu changes its page structure from time to time, so the parser is isolated in one file for easy updating.

AliExpress (free, official API):

- AliExpress Open Platform app (App Key + App Secret), Dropshipping API `aliexpress.ds.product.get` for product details, variants, images and video.
- Server-side request signing (HMAC-SHA256 / MD5 as the platform requires).
- Also supported through the Chrome extension as a fallback.

Alibaba:

- No free public API for buyers, so import is done with the same Chrome extension (content script for alibaba.com product pages).

Pricing rules on import:

- Exchange rate (USD/CNY to BDT) set in admin, optional automatic daily update from a free rate API.
- Markup rules by price range or category, fixed shipping add-on, rounding rule.

Media handling:

- Images and videos are downloaded server side and stored in R2 with generated WebP thumbnails, so the store never depends on the source CDN.

Legal note: imported third-party images and videos are for demo/testing only. Replace with your own content before going public.

---

## 9. Payments and Courier Integrations

Payments (provider pattern, each implements `createPayment`, `verifyPayment`, `handleWebhook`, `refund`):

- Cash on Delivery with optional advance payment for delivery charge.
- SSLCommerz: session init API, success/fail/cancel redirects, IPN listener, validation API check before marking paid. Sandbox credentials are free from the SSLCommerz developer portal.
- bKash Tokenized Checkout: grant token, create payment, execute payment, query payment, refund. Sandbox credentials available from bKash developer portal.
- Nagad can be added later with the same interface.

Couriers (provider pattern, each implements `createConsignment`, `getStatus`, `handleWebhook`, `getRates`):

- Steadfast: create order, bulk create, status by consignment/invoice/tracking, balance, webhook.
- Pathao: OAuth token, stores, cities/zones/areas lookup, create order, price calculation, webhook.
- RedX: create parcel, track parcel, areas lookup, webhook.
- Status mapping table converts each courier's statuses into the store's order statuses, and triggers customer emails.

---

## 10. Email System

Provider: Resend (or Brevo) behind an `EmailProvider` interface. Templates built with React Email, matching the store's clean design, with dark mode friendly styling. Admin can edit subject and content blocks, toggle each event, and send tests. All sends are logged.

Customer emails:

1. Welcome / account created
2. Email verification
3. Password reset
4. Password changed
5. Login from new device (optional)
6. Order placed (with invoice PDF attached or linked)
7. Payment received
8. Payment failed
9. Order confirmed
10. Order packed / processing
11. Order shipped (with tracking link)
12. Out for delivery
13. Order delivered + review request
14. Order cancelled
15. Return request received / approved / rejected
16. Refund processed
17. Abandoned cart reminder (1h and 24h)
18. Back in stock alert
19. Price drop on wishlist item
20. Newsletter subscription confirmation (double opt-in)
21. Coupon / birthday / loyalty points earned
22. Contact form auto reply
23. Account deletion confirmation

Admin/staff emails:

1. New order alert
2. Low stock alert
3. New review / question pending approval
4. Return request received
5. Staff invitation
6. Failed payment or courier sync error
7. Daily sales summary

Free tier note: Resend free allows 100 emails per day. Email sending runs through a queue table so nothing is lost if the daily limit is reached; pending emails are retried by cron.

---

## 11. AI Chatbot

Goal: always accurate, real-time answers with no manual retraining.

How it works:

- Uses LLM function calling (Gemini Flash free tier). Instead of training, the bot calls read-only tools that query the live database every time, so any new product, deleted product, price change or new coupon is reflected instantly.
- Tools:
  - `search_products(query, category, max_price, in_stock)`
  - `get_product(slug_or_id)` with variants, stock, price, delivery estimate
  - `get_active_offers()` (public coupons, flash sales)
  - `get_shipping_info(district)`
  - `get_policies(topic)` (returns, payments, delivery, warranty from `chatbot_knowledge` and pages)
  - `track_order(order_number, phone)` with verification
  - `add_to_cart(variant_id, qty)` (client side action returned to the widget)
- Optional semantic search: product embeddings stored with pgvector (Gemini embedding API free tier), regenerated automatically by a database trigger + queue whenever a product is created or updated.
- Answers in Bangla or English automatically, shows product cards inside the chat with "Add to cart" and "Buy now" buttons.
- Guardrails: never invents prices or stock, says it does not know when tools return nothing, refuses unrelated or harmful requests, never reveals other customers' data.
- UI: iOS Messages style glass panel, typing indicator, quick reply chips, smooth spring animations, minimise to bubble, conversation saved per visitor.
- Admin: conversation viewer, analytics (top questions, unanswered questions), knowledge entries, on/off toggle, human handoff link.

---

## 12. SEO and Analytics

Technical SEO:

- Server-rendered pages, fast Core Web Vitals (target LCP under 2.5s, CLS under 0.1, INP under 200ms).
- Clean URLs: `/product/[slug]`, `/category/[slug]`, `/blog/[slug]`.
- Dynamic `generateMetadata` for every page from admin-controlled SEO fields with sensible fallbacks.
- Open Graph and Twitter cards, auto-generated OG images.
- XML sitemaps (products, categories, pages, blog) with image entries, split when large; robots.txt editable in admin.
- Canonical tags, hreflang for Bangla/English, pagination handling, noindex for filtered/search pages.
- Structured data combined into one JSON-LD graph per page: Organization, WebSite with SearchAction, BreadcrumbList, Product with Offer, AggregateRating and Review, FAQPage, Article for blog posts.
- Redirect manager and 404 log.
- Image alt text, lazy loading, modern formats.

Analytics and tracking (IDs entered in admin, scripts injected only if set and consent given):

- Google Analytics 4 with full e-commerce events: view_item_list, view_item, add_to_cart, remove_from_cart, begin_checkout, add_shipping_info, add_payment_info, purchase, refund.
- Google Tag Manager with dataLayer pushes for the same events.
- Meta Pixel + Conversions API (server side, deduplicated with event_id).
- TikTok Pixel (optional).
- Search Console and Bing verification meta tags.

---

## 13. Design System (Apple-style premium UI)

Feel: calm, spacious, premium, iOS-like. Glass surfaces, soft depth, smooth motion. Content first.

Typography:

- Latin: "Inter" (variable) as the SF Pro alternative, tight tracking on headings.
- Bangla: "Hind Siliguri" or "Noto Sans Bengali".
- Scale: 12, 14, 16, 18, 22, 28, 36, 48, 64. Headings semibold, body regular, generous line height.

Color tokens (CSS variables, light / dark):

| Token | Light | Dark |
|---|---|---|
| background | #F5F5F7 | #000000 |
| surface | #FFFFFF | #1C1C1E |
| surface-glass | rgba(255,255,255,0.72) | rgba(28,28,30,0.72) |
| text-primary | #1D1D1F | #F5F5F7 |
| text-secondary | #6E6E73 | #A1A1A6 |
| border | rgba(0,0,0,0.08) | rgba(255,255,255,0.10) |
| accent | #0071E3 | #2997FF |
| success | #34C759 | #30D158 |
| warning | #FF9F0A | #FFD60A |
| danger | #FF3B30 | #FF453A |
| sale | #FF375F | #FF375F |

Glass recipe:

- `background: var(--surface-glass); backdrop-filter: saturate(180%) blur(20px); border: 1px solid var(--border);`
- Used for header, cart drawer, modals, quick checkout, chatbot, popups, admin sidebar.

Shape and depth:

- Radius: 12 (inputs), 16 (buttons and small cards), 20 to 24 (product cards), 28 (modals).
- Shadows: very soft, layered (`0 1px 2px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.06)`).

Motion:

- Framer Motion spring transitions (stiffness 300, damping 30), 200 to 350ms, subtle scale on press (0.97), fade and slide for drawers, shared layout animation from product card to quick view. Respects `prefers-reduced-motion`.

Components:

- Product card: large image on soft neutral background, second image on hover, video preview on hover where available, wishlist heart, discount pill, rating, price, quick add and buy now buttons that appear on hover (always visible on mobile).
- Buttons: pill shaped primary (accent), secondary (glass), tertiary (text).
- Inputs: filled style with soft background, floating labels, clear focus ring.
- Segmented controls, iOS toggle switches, bottom sheets on mobile for filters and quick checkout.
- Skeleton loaders everywhere, no layout shift.
- Mobile bottom tab bar (Home, Categories, Search, Cart, Account).

Admin UI: same design language, glass sidebar, clean data tables with sticky headers, command palette (Ctrl/Cmd + K), keyboard shortcuts, toast notifications.

---

## 14. Folder Structure

```
/
├─ apps/
│  ├─ web/                         # Next.js app
│  │  ├─ app/
│  │  │  ├─ [locale]/
│  │  │  │  ├─ (store)/            # home, product, category, cart, checkout, account, pages, blog
│  │  │  │  └─ (auth)/             # login, register, verify, reset
│  │  │  ├─ admin/                 # dashboard and all admin modules
│  │  │  ├─ api/
│  │  │  │  ├─ payments/[gateway]/ # init, ipn, callback
│  │  │  │  ├─ couriers/[courier]/ # webhooks
│  │  │  │  ├─ import/             # url import, extension ingest
│  │  │  │  ├─ chat/               # chatbot streaming endpoint
│  │  │  │  ├─ cron/               # emails queue, courier sync, cart recovery
│  │  │  │  └─ upload/             # signed R2 uploads
│  │  │  ├─ sitemap.ts, robots.ts
│  │  ├─ components/ (ui, store, admin, chat)
│  │  ├─ lib/
│  │  │  ├─ supabase/ (server, client, admin)
│  │  │  ├─ auth/ (rbac, permissions)
│  │  │  ├─ payments/ (cod, sslcommerz, bkash, index)
│  │  │  ├─ couriers/ (steadfast, pathao, redx, index)
│  │  │  ├─ importers/ (temu, aliexpress, alibaba, normalize)
│  │  │  ├─ email/ (provider, templates, queue)
│  │  │  ├─ ai/ (chatbot, tools, prompts)
│  │  │  ├─ seo/ (metadata, jsonld)
│  │  │  ├─ security/ (ratelimit, crypto, sanitize, turnstile)
│  │  │  └─ validators/ (zod schemas)
│  │  ├─ emails/                   # React Email templates
│  │  ├─ messages/ (en.json, bn.json)
│  │  └─ middleware.ts
│  └─ extension/                   # Chrome MV3 importer extension
├─ supabase/
│  ├─ migrations/                  # SQL schema, RLS, functions, triggers, seed
│  └─ functions/                   # edge functions if needed
├─ .env.example
├─ README.md                       # setup guide
└─ docs/ (architecture, api keys guide, deployment)
```

---

## 15. Build Phases

| Phase | Scope | Output |
|---|---|---|
| 1 | Project setup, design system, theme, i18n, layout, Supabase schema, RLS, seed data | Running shell with empty store and DB |
| 2 | Auth (email, Google, Facebook), email verification, account area, roles and permissions, 2FA for staff | Users can sign up, staff can log in |
| 3 | Catalog: products, variants, categories, media library (R2), admin product CRUD | Products manageable and visible |
| 4 | Storefront: home builder, listing, filters, search, product page with gallery and video, reviews, wishlist | Complete browsing experience |
| 5 | Cart, quick checkout modal, full checkout, coupons, shipping zones, COD | Orders can be placed |
| 6 | Payments: SSLCommerz, bKash; order management, invoices PDF, status timeline | Paid orders and invoices |
| 7 | Couriers: Steadfast, Pathao, RedX; tracking; returns and refunds | Shipping workflow |
| 8 | Email system: all templates, queue, logs | Emails for every event |
| 9 | Importer: Chrome extension (Temu, Alibaba), AliExpress API, markup rules | One-click import |
| 10 | Marketing: popups, flash sales, banners, newsletter, loyalty, abandoned cart | Growth tools |
| 11 | Dashboard analytics and reports, audit log | Business insights |
| 12 | SEO system, sitemaps, JSON-LD, GA4, GTM, Pixel + CAPI | Search and tracking ready |
| 13 | AI chatbot with tools and admin viewer | Smart assistant |
| 14 | Security hardening, performance, accessibility, tests, docs, deployment guide | Production ready |

---

## 16. Master Prompt (give this to any AI coding assistant)

Copy everything inside the box, then attach this whole document as context.

```
You are a senior full-stack engineer and product designer. Build a production-grade,
fully responsive e-commerce platform for Bangladesh exactly as specified in the attached
document "E-commerce Platform: Architecture, Plan and Master Prompt". Follow every section.

STACK (free tiers only): Next.js 15 App Router + TypeScript (strict), Tailwind CSS 4,
shadcn/ui (customised), Framer Motion, Supabase (Postgres, Auth, RLS), Cloudflare R2 for
media, Resend + React Email for emails, Gemini Flash (function calling) for the chatbot,
Upstash Redis for rate limiting, Cloudflare Turnstile, next-intl (bn, en), Recharts,
Tiptap, @react-pdf/renderer, Zod, React Hook Form, TanStack Query.

DESIGN: Apple / iOS premium style. Clean, spacious, glassmorphism (backdrop blur 20px,
saturate 180%), soft layered shadows, large radii, Inter + Hind Siliguri fonts, the exact
color tokens from section 13, dark/light/system themes, spring animations, skeleton
loaders, mobile bottom tab bar, bottom sheets on mobile. Every heading, card, product card,
modal, drawer and form must look premium. No generic templates.

MUST INCLUDE: everything in sections 4 (storefront), 5 (admin), 7 (security), 8 (importer
incl. Chrome MV3 extension for Temu and Alibaba plus AliExpress Open Platform API),
9 (COD, SSLCommerz, bKash; Steadfast, Pathao, RedX), 10 (all listed emails via a queue),
11 (tool-calling chatbot with live DB data, no manual retraining), 12 (SEO, combined
JSON-LD graph, GA4, GTM, Meta Pixel + CAPI). Quick Checkout: "Buy Now" opens a modal to
choose variant, enter address, pick payment and place the order without leaving the page.
Dashboard sales chart ranges: 1 day, 7, 15, 30 days, 3, 6, 12 months, custom.

RULES:
1. Use the database schema in section 6 as SQL migrations with RLS policies, functions
   (has_permission, place_order, sales_summary) and triggers. Include seed data.
2. Never expose secrets to the client. Validate all input with Zod. Recalculate prices
   on the server. Verify all payment and courier webhooks.
3. Use provider interfaces for payments, couriers, email and importers so new providers
   can be added easily.
4. All settings (SEO, tracking IDs, credentials, templates, theme) editable in admin;
   secrets encrypted with AES-256-GCM.
5. Write clean, typed, commented code. No placeholders like "TODO implement". Every
   feature listed must work end to end.
6. Follow the folder structure in section 14 and the build phases in section 15. After
   each phase, make sure the project builds with zero TypeScript and lint errors.
7. Provide .env.example with every variable, and a README with step-by-step setup for
   Supabase, R2, Resend, Google and Facebook OAuth, Gemini, Upstash, Turnstile,
   SSLCommerz sandbox, bKash sandbox, Steadfast, Pathao, RedX, AliExpress Open Platform,
   GA4, GTM, Meta Pixel, Search Console, and deployment to Vercel or Cloudflare.
8. Bangla and English for all customer-facing text. Currency BDT.
9. Accessibility (WCAG AA), Core Web Vitals targets, reduced motion support.

Start with Phase 1. At the end of each phase list what was built and what is next.
```

Phase prompts (use one at a time if the AI has limited context):

- Phase 1: "Set up the monorepo, Next.js app, Tailwind tokens from section 13, theme switcher, next-intl, base layouts (store and admin), and Supabase migrations for the full schema in section 6 with RLS, functions, triggers and seed data."
- Phase 2: "Implement auth per sections 4, 5 and 7: email/password with verification, Google, Facebook, reset password, account pages, staff invitations, roles and permissions UI, TOTP 2FA for staff, middleware protection."
- Phase 3 to 14: "Implement Phase N from section 15 following the matching sections of the document. Keep the design system consistent. Do not break earlier phases."

---

## 17. Free Services Setup Checklist

| Service | What you get | Where |
|---|---|---|
| GitHub | Code repository | github.com |
| Supabase | Database, Auth, URL + anon key + service role key | supabase.com |
| Cloudflare | R2 bucket + access keys, Turnstile site/secret key, optional Pages hosting, domain DNS | dash.cloudflare.com |
| Vercel | Hosting (demo) | vercel.com |
| Resend | Email API key, domain verification | resend.com |
| Google Cloud Console | OAuth client ID/secret for Google login | console.cloud.google.com |
| Meta for Developers | Facebook app ID/secret for login, Pixel ID, CAPI token | developers.facebook.com |
| Google AI Studio | Gemini API key | aistudio.google.com |
| Upstash | Redis REST URL + token | upstash.com |
| SSLCommerz | Sandbox store ID + password | developer.sslcommerz.com |
| bKash | Sandbox app key, secret, username, password | developer.bka.sh |
| Steadfast | API key + secret key | steadfast.com.bd merchant panel |
| Pathao | Client ID, secret, username, password, store ID | merchant.pathao.com |
| RedX | API token | redx.com.bd merchant panel |
| AliExpress Open Platform | App Key + App Secret | openservice.aliexpress.com |
| Google Analytics / Tag Manager / Search Console | Measurement ID, container ID, verification code | analytics.google.com, tagmanager.google.com, search.google.com/search-console |
| Sentry | DSN for error monitoring | sentry.io |

A domain name is the only thing that normally costs money. For the demo, the free `*.vercel.app` or `*.pages.dev` subdomain works, but email deliverability and Facebook login in live mode work best with your own domain.
