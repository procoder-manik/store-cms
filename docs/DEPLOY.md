# লাইভে তোলার সম্পূর্ণ গাইড (ফ্রি)

এই গাইড ধরে নিচ্ছে আপনি README.md-র ফেজ ১ থেকে ১৩ পর্যন্ত লোকালি সেটআপ করে টেস্ট করেছেন।

## ১. কোড GitHub-এ রাখুন

1. https://github.com/new এ একটা **Private** রিপোজিটরি বানান।
2. প্রজেক্ট ফোল্ডারে টার্মিনালে:

```bash
git init
git add .
git commit -m "Initial store"
git branch -M main
git remote add origin https://github.com/আপনার-ইউজার/রিপো-নাম.git
git push -u origin main
```

`.env.local` গিটে যাবে না (`.gitignore`-এ আছে), এটাই ঠিক।

## ২. Vercel-এ ডিপ্লয় (ফ্রি)

নোট: Vercel-এর ফ্রি Hobby প্ল্যান শুধু ব্যক্তিগত/নন-কমার্শিয়াল কাজের জন্য। ডেমো ও টেস্টের জন্য ঠিক আছে। আসল বিক্রি শুরু করলে Vercel Pro নিন অথবা নিচের ৩ নম্বর (Cloudflare, কমার্শিয়ালেও ফ্রি) ব্যবহার করুন।

1. https://vercel.com এ GitHub দিয়ে লগইন > **Add New > Project** > আপনার রিপো Import।
2. **Root Directory**: `apps/web` বেছে নিন। Framework: Next.js (অটো)।
3. **Environment Variables**-এ `.env.local`-এর সবগুলো লাইন যোগ করুন (নিচের তালিকা দেখুন)। `NEXT_PUBLIC_SITE_URL` হবে আপনার লাইভ ঠিকানা।
4. **Deploy** চাপুন।
5. **Settings > Domains** থেকে নিজের ডোমেইন যোগ করুন, যে DNS রেকর্ড দেখায় সেটা ডোমেইনের DNS-এ বসান।

## ৩. Cloudflare-এ ডিপ্লয় (কমার্শিয়ালেও ফ্রি)

Cloudflare Workers-এ Next.js চালাতে OpenNext ব্যবহার হয়:

```bash
cd apps/web
npm install -D @opennextjs/cloudflare wrangler
npx opennextjs-cloudflare build
npx wrangler deploy
```

বিস্তারিত ও সর্বশেষ নির্দেশনা: https://opennext.js.org/cloudflare । Environment variables Cloudflare ড্যাশবোর্ডে **Workers > আপনার worker > Settings > Variables**-এ বসাবেন (গোপনগুলো "Encrypt" করে)। ফ্রি প্ল্যানে প্রতিদিন ১ লাখ রিকোয়েস্ট পর্যন্ত চলে। কোনো এরর এলে মেসেজটা আমাকে পাঠাবেন।

## ৪. Environment variables তালিকা

| নাম | কোথা থেকে | বাধ্যতামূলক |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | আপনার লাইভ ঠিকানা, যেমন `https://shop.com` | হ্যাঁ |
| `NEXT_PUBLIC_SITE_NAME` | স্টোরের নাম | হ্যাঁ |
| `ENCRYPTION_KEY` | লোকালে যেটা বানিয়েছেন, হুবহু একই (বদলালে সেভ করা পেমেন্ট/কুরিয়ার কী আর পড়া যাবে না) | হ্যাঁ |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PROJECT_ID` | Supabase > Project Settings > API | হ্যাঁ |
| `CRON_SECRET` | নিজে বানানো লম্বা র‍্যান্ডম লেখা | হ্যাঁ |
| `STAFF_REQUIRE_2FA` | `true` রাখুন | হ্যাঁ |
| `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_DAILY_LIMIT` | Resend | ইমেলের জন্য |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Google AI Studio | চ্যাটবটের জন্য |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `NEXT_PUBLIC_R2_PUBLIC_URL` | Cloudflare R2 | ঐচ্ছিক |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile | লাইভে অবশ্যই |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Upstash | লাইভে অবশ্যই |

পেমেন্ট, কুরিয়ার, AliExpress, Pixel ইত্যাদির কী অ্যাডমিন প্যানেলেই থাকে, এখানে লাগে না।

## ৫. Supabase প্রোডাকশন চেকলিস্ট

- [ ] **Authentication > URL Configuration**: Site URL = লাইভ ঠিকানা, Redirect URLs-এ `https://আপনার-ডোমেইন/**`
- [ ] **Authentication > SMTP**: Resend দিয়ে চালু (README ফেজ ৮)
- [ ] Google ও Facebook OAuth অ্যাপে লাইভ ডোমেইন যোগ, Facebook অ্যাপ **Live** মোডে
- [ ] **Authentication > Attack Protection**: CAPTCHA হিসেবে Turnstile চালু করতে পারেন
- [ ] **Authentication > Multi-Factor**: TOTP Enabled
- [ ] পাসওয়ার্ড নীতি: Authentication > Providers > Email > Minimum password length 8
- [ ] **Database > Backups**: ফ্রি প্ল্যানে সীমিত, তাই নিচের GitHub ব্যাকআপ চালু করুন
- [ ] ফ্রি প্রজেক্ট ৭ দিন কোনো ভিজিট না পেলে পজ হয়; লাইভ স্টোরে নিয়মিত ভিজিট থাকলে সমস্যা নেই, cron-job.org-এর কাজগুলোও প্রজেক্ট সচল রাখে

## ৬. অটো ব্যাকআপ (GitHub Actions, ফ্রি)

1. Supabase > **Project Settings > Database > Connection string > URI** (Session pooler) কপি করুন, `[YOUR-PASSWORD]` জায়গায় ডাটাবেজ পাসওয়ার্ড বসান।
2. GitHub রিপো > **Settings > Secrets and variables > Actions > New repository secret**: নাম `SUPABASE_DB_URL`, মান উপরের URI।
3. **Actions** ট্যাবে "Database backup" > **Run workflow** দিয়ে একবার টেস্ট করুন। এরপর প্রতি রাত ৩টায় অটো চলবে, ব্যাকআপ ৩০ দিন থাকবে (রিপো Private রাখবেন)।

রিস্টোর করতে: `pg_restore --clean --no-owner -d "নতুন-ডাটাবেজ-URI" backup.dump`

## ৭. cron-job.org কাজগুলো (লাইভ ঠিকানা দিয়ে)

| URL | কতক্ষণ পরপর |
|---|---|
| `/api/cron/emails` | ১০ মিনিট |
| `/api/cron/couriers` | ১ ঘণ্টা |
| `/api/cron/daily` | দিনে একবার, সকাল ৯টা |

সবগুলোতে Header: `Authorization` = `Bearer আপনার_CRON_SECRET`।

## ৮. লাইভের আগে শেষ যাচাই

- [ ] Admin > Settings: স্টোরের নাম, ইমেল, ফোন, ঠিকানা, লোগো
- [ ] Admin > Shipping: ডেলিভারি চার্জ ও সময় ঠিক আছে
- [ ] Admin > Payments: বিকাশ/SSLCommerz লাইভ কী, Sandbox বন্ধ
- [ ] Admin > Content: About, Privacy, Terms, Return policy আপনার নিজের লেখা
- [ ] Temu থেকে আনা ডেমো প্রোডাক্টের ছবি/ভিডিও নিজের কনটেন্ট দিয়ে বদলানো (কপিরাইট ঝুঁকি)
- [ ] একটা আসল অর্ডার দিয়ে পুরো পথ টেস্ট: অর্ডার > ইমেল > কনফার্ম > কুরিয়ারে পাঠানো > ইনভয়েস
- [ ] মোবাইলে স্টোর খুলে দেখা, ডার্ক মোডসহ
- [ ] Search Console-এ sitemap জমা
- [ ] `/admin`-এ সব স্টাফের 2FA চালু

## ৯. আপডেট কীভাবে দেবেন

কোড বদলালে `git add . && git commit -m "বিবরণ" && git push` করলেই Vercel/Cloudflare অটো নতুন ভার্সন তুলে দেবে। নতুন SQL মাইগ্রেশন এলে সেটা Supabase SQL Editor-এ চালাতে হবে।
