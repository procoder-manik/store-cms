# Changelog

## Phase 17: CMS organisation, SEO, custom code, page templates

Run new SQL: `supabase/migrations/0011_cms.sql`. All 11 migrations were run in order on an empty PostgreSQL database without errors.

- Admin menu grouped like WordPress, Ctrl+K quick search, Settings split into tabs, Site health checklist.
- Delivery charge: store-wide switch, zone or flat rate, free-delivery products (tested in SQL).
- SEO: shared SEO panel (preview, keyword checks, canonical, noindex/nofollow, social, schema generator with 8 types) on products, categories, pages, posts, landing pages. Admin SEO in 8 tabs including audit. Site-wide Organization/Store/Website schema from settings. robots.txt route with full override, sitemap switches, more verification tags, more tracking tools (Google Ads, Clarity, Hotjar, Pinterest, Snapchat).
- Custom code (global, home, page, landing, post, product, category) with its own `code` permission.
- Menus, brands, tags, page templates (product, shop, blog, post), blog archive layouts and pagination, post author box and share buttons, product info as tabs or accordion.
- Auto 301 redirect when an address changes; redirects also work on the Bangla site.
- Favicon from settings (route handlers for /icon and /apple-icon).
- Fixed: every missing address returned HTTP 200 (soft 404) because of loading screens on store pages. They now return 404.
- Tests: 29 unit tests, including schema, SEO, templates and code safety.
