# Lumen E-commerce Platform

Next.js 15 + Supabase দিয়ে বানানো বাংলাদেশি ই-কমার্স প্ল্যাটফর্ম। পুরো প্ল্যান: `docs/ecommerce-master-plan.md`।
স্টোরের নাম "Lumen" একটা প্লেসহোল্ডার, `.env.local`-এ `NEXT_PUBLIC_SITE_NAME` বদলালেই নাম বদলে যাবে।

## যা লাগবে (একবারই ইনস্টল করবেন)

1. **Node.js 20 বা তার বেশি**: https://nodejs.org থেকে LTS ভার্সন ইনস্টল করুন।
2. **VS Code** (ঐচ্ছিক, কোড দেখার জন্য): https://code.visualstudio.com
3. একটা **GitHub** অ্যাকাউন্ট (পরে ডিপ্লয়ের জন্য)।

## ধাপ ১: প্রজেক্ট চালু করা

জিপ ফাইলটা আনজিপ করুন, তারপর ফোল্ডারের ভেতরে টার্মিনাল খুলে চালান:

```bash
npm install
```

## ধাপ ২: Supabase প্রজেক্ট বানানো (ফ্রি)

1. https://supabase.com এ গিয়ে GitHub দিয়ে সাইন আপ করুন।
2. **New project** চাপুন। নাম দিন, একটা শক্ত ডাটাবেজ পাসওয়ার্ড দিন (কোথাও লিখে রাখুন), Region হিসেবে **Singapore** বেছে নিন (বাংলাদেশের সবচেয়ে কাছে)। Free plan রাখুন।
3. প্রজেক্ট রেডি হলে বাম পাশে **SQL Editor** খুলুন।
4. `supabase/migrations/` ফোল্ডারের ফাইলগুলো **ক্রমানুসারে** একটা একটা করে চালাবেন:
   - `0001_schema.sql` এর পুরো লেখা কপি করে SQL Editor-এ পেস্ট করুন, **Run** চাপুন। "Success" দেখাবে।
   - তারপর `0002_functions_rls.sql` একইভাবে।
   - তারপর `0003_seed.sql`।
   - পরের ফেজগুলোতে নতুন মাইগ্রেশন ফাইল (0004, 0005...) আসবে, সেগুলোও একইভাবে শুধু নতুনগুলো চালাবেন।
5. বাম পাশে **Project Settings > API** (বা **Data API**) এ যান। সেখান থেকে তিনটা জিনিস কপি করবেন:
   - **Project URL**
   - **anon public** key
   - **service_role** key (এটা গোপন, কাউকে দেবেন না)
6. **Project Settings > General** থেকে **Project ID** কপি করুন।

## ধাপ ৩: `.env.local` ফাইল বানানো

`apps/web/.env.example` ফাইলটা কপি করে একই জায়গায় `apps/web/.env.local` নামে সেভ করুন। তারপর পূরণ করুন:

```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SITE_NAME=আপনার স্টোরের নাম
NEXT_PUBLIC_SUPABASE_URL=ধাপ ২ এর Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=anon public key
SUPABASE_SERVICE_ROLE_KEY=service_role key
SUPABASE_PROJECT_ID=Project ID
ENCRYPTION_KEY=নিচের কমান্ড দিয়ে বানানো কী
```

`ENCRYPTION_KEY` বানাতে টার্মিনালে চালান এবং আউটপুটটা কপি করে বসান:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

বাকি লাইনগুলো (R2, Resend, Gemini ইত্যাদি) এখন ফাঁকা থাকবে, যে ফেজে লাগবে তখন গাইড দেবো।

## ধাপ ৪: চালিয়ে দেখা

```bash
npm run dev
```

ব্রাউজারে খুলুন: http://localhost:3000 (স্টোর) এবং http://localhost:3000/bn (বাংলা)।

## ধাপ ৫: নিজেকে Super Admin বানানো

1. Supabase-এ **Authentication > Users > Add user > Create new user** এ গিয়ে আপনার ইমেল আর পাসওয়ার্ড দিন, **Auto Confirm User** টিক দিন।
2. **SQL Editor** এ নিচেরটা চালান (ইমেল বদলে নিন):

```sql
update profiles set is_staff = true, full_name = 'Owner' where email = 'you@example.com';
insert into user_roles (user_id, role_id)
select p.id, r.id from profiles p, roles r
where p.email = 'you@example.com' and r.name = 'Super Admin';
```

3. http://localhost:3000/admin এ গিয়ে লগইন করুন।

## ধাপ ৬ (ঐচ্ছিক): TypeScript টাইপ জেনারেট

```bash
npx supabase login
cd apps/web && npx supabase gen types typescript --project-id আপনার_PROJECT_ID > types/database.ts
```

এটা করলে কোডে ডাটাবেজের সব টেবিলের অটো-কমপ্লিট পাবেন। না করলেও প্রজেক্ট চলবে।

## নতুন ফেজের ফাইল যোগ করার নিয়ম

প্রতিটা ফেজের জিপে শুধু নতুন আর বদলানো ফাইল থাকে। জিপ খুলে ভেতরের সবকিছু আপনার প্রজেক্ট ফোল্ডারে কপি করুন, "Replace" চাইলে **Yes to all** দিন। তারপর:

```bash
npm install
```

আর নতুন কোনো `supabase/migrations/*.sql` ফাইল এলে সেটা SQL Editor-এ চালান। কী কী বদলেছে তা `CHANGELOG.md`-তে লেখা থাকবে।

## কমান্ড

| কমান্ড | কাজ |
|---|---|
| `npm run dev` | ডেভেলপমেন্ট সার্ভার |
| `npm run build` | প্রোডাকশন বিল্ড |
| `npm run typecheck` | টাইপ চেক |
| `npm run lint` | কোড চেক |

---

# ফেজ ২ ও ৩ সেটআপ

## ক) নতুন SQL চালান

Supabase **SQL Editor**-এ `supabase/migrations/0004_media_products.sql` চালান।

## খ) Supabase Auth সেটিংস

1. **Authentication > URL Configuration**:
   - **Site URL**: `http://localhost:3000` (লাইভ হলে আপনার ডোমেইন)
   - **Redirect URLs**-এ যোগ করুন: `http://localhost:3000/**` এবং পরে `https://আপনার-ডোমেইন/**`
2. **Authentication > Sign In / Providers > Email**: "Confirm email" চালু রাখুন (নতুন কাস্টমারকে ভেরিফিকেশন ইমেল যাবে)।
3. **Authentication > Multi-Factor**: TOTP (App Authenticator) **Enabled** আছে কিনা দেখুন। স্টাফদের জন্য এটা বাধ্যতামূলক।

নোট: Supabase-এর ফ্রি বিল্ট-ইন ইমেল ঘণ্টায় মাত্র কয়েকটা পাঠাতে পারে। ফেজ ৮-এ Resend (ফ্রি) সংযুক্ত করলে এই সীমা উঠে যাবে। আপাতত টেস্টের জন্য যথেষ্ট।

## গ) প্রথমবার অ্যাডমিনে ঢোকা (2FA)

`/admin` এ লগইন করলে একটা QR কোড আসবে। ফোনে **Google Authenticator** বা **Microsoft Authenticator** অ্যাপ দিয়ে স্ক্যান করুন, অ্যাপে যে ৬ সংখ্যার কোড দেখায় সেটা দিন। এরপর প্রতিবার লগইনে এই কোড চাইবে।

## ঘ) Google লগইন (ফ্রি)

1. https://console.cloud.google.com এ নতুন প্রজেক্ট বানান।
2. **APIs & Services > OAuth consent screen**: External, অ্যাপের নাম ও ইমেল দিন, সেভ করুন।
3. **Credentials > Create credentials > OAuth client ID**: টাইপ **Web application**।
   - **Authorized redirect URIs**: `https://<আপনার-supabase-project-id>.supabase.co/auth/v1/callback`
4. Client ID ও Client Secret কপি করুন।
5. Supabase **Authentication > Sign In / Providers > Google** চালু করে দুটো বসান, Save।

## ঙ) Facebook লগইন (ফ্রি)

1. https://developers.facebook.com > **My Apps > Create App** > "Authenticate and request data from users with Facebook Login"।
2. **Facebook Login > Settings > Valid OAuth Redirect URIs**: `https://<আপনার-supabase-project-id>.supabase.co/auth/v1/callback`
3. **App settings > Basic** থেকে App ID ও App Secret কপি করুন। Privacy Policy URL হিসেবে `https://আপনার-ডোমেইন/pages/privacy-policy` দিন।
4. Supabase **Providers > Facebook** চালু করে বসান।
5. লাইভ করতে অ্যাপকে "Live" মোডে নিতে হবে, তার আগে শুধু আপনি (অ্যাপ অ্যাডমিন) লগইন করতে পারবেন।

## চ) মিডিয়া স্টোরেজ

কিছু না করলেও চলবে: ছবি ও ভিডিও Supabase স্টোরেজে যাবে (১GB ফ্রি, প্রতি ফাইল সর্বোচ্চ ৫০MB)। বেশি জায়গা চাইলে Cloudflare R2 (১০GB ফ্রি):

1. https://dash.cloudflare.com > **R2** > একটা bucket বানান (যেমন `media`)। কার্ড চাইলে দিতে হয়, কিন্তু ১০GB পর্যন্ত চার্জ হয় না।
2. Bucket > **Settings > Public access > R2.dev subdomain** চালু করুন। যে URL দেখায় সেটা `NEXT_PUBLIC_R2_PUBLIC_URL`।
3. Bucket > **Settings > CORS policy** এ এটা বসান:

```json
[{ "AllowedOrigins": ["http://localhost:3000", "https://আপনার-ডোমেইন"], "AllowedMethods": ["PUT", "GET"], "AllowedHeaders": ["*"], "MaxAgeSeconds": 3600 }]
```

4. R2 হোম > **Manage API tokens > Create API token**: Object Read & Write, শুধু এই bucket। Access Key ID ও Secret কপি করুন।
5. `.env.local`-এ `R2_ACCOUNT_ID` (ড্যাশবোর্ডের ডানে দেখায়), `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `NEXT_PUBLIC_R2_PUBLIC_URL` বসান, সার্ভার রিস্টার্ট দিন।

## ছ) বট সুরক্ষা ও রেট লিমিট (ঐচ্ছিক, লাইভের আগে করবেন)

- **Turnstile**: Cloudflare ড্যাশবোর্ড > **Turnstile > Add widget**, ডোমেইনে `localhost` ও আপনার ডোমেইন দিন। Site Key ও Secret Key `.env.local`-এ বসান।
- **Upstash Redis**: https://upstash.com > Create Database (Region: Singapore) > **REST API** সেকশন থেকে URL ও Token কপি করে বসান।

---

# ফেজ ৪ ও ৫ সেটআপ

1. জিপের ফাইল কপি করে Replace দিন, তারপর `npm install`।
2. Supabase **SQL Editor**-এ `supabase/migrations/0005_checkout.sql` চালান।
3. **Settings > store** এর ইমেল ঠিক করুন যাতে নতুন অর্ডারের নোটিফিকেশন আপনার কাছে আসে (SQL Editor-এ):

```sql
update settings set value = jsonb_set(value, '{email}', '"আপনার@ইমেল.com"') where key = 'store';
```

4. টেস্ট করুন: অ্যাডমিনে একটা প্রোডাক্ট বানিয়ে **Published** করুন, স্টোরে গিয়ে **Buy now** চাপুন, জেলা বেছে অর্ডার দিন।

কুপন টেস্ট করতে চাইলে (অ্যাডমিনে কুপন পেজ ফেজ ১০-এ আসবে, আপাতত SQL দিয়ে):

```sql
insert into coupons (code, type, value, min_order, is_active) values ('WELCOME10', 'percentage', 10, 500, true);
```

হোমপেজের বড় ব্যানার স্লাইডার চাইলে (অ্যাডমিন UI পরে আসবে):

```sql
insert into banners (placement, title, subtitle, image_url, link_url) values
('hero', 'শীতের নতুন কালেকশন', 'সব অর্ডারে ক্যাশ অন ডেলিভারি', 'https://ছবির-লিংক.jpg', '/shop');
```

---

# ফেজ ৬ ও ৭ সেটআপ

1. ফাইল কপি করে Replace দিন। Supabase SQL Editor-এ `supabase/migrations/0006_payments_orders.sql` চালান।
2. `.env.local`-এ `CRON_SECRET` বসান (যেকোনো লম্বা র‍্যান্ডম লেখা, `ENCRYPTION_KEY` বানানোর কমান্ড দিয়েই বানাতে পারেন)।
3. সব পেমেন্ট ও কুরিয়ারের কী অ্যাডমিন প্যানেল থেকে বসাবেন, কোডে বা `.env`-এ না। এগুলো ডাটাবেজে এনক্রিপ্ট হয়ে থাকে।

## bKash (টেস্ট মোড ফ্রি)

1. https://developer.bka.sh এ গিয়ে Tokenized Checkout এর **sandbox credentials** দেখুন (ডকুমেন্টেশনে টেস্ট app key, secret, username, password দেওয়া থাকে)।
2. অ্যাডমিন **Payments > bKash**: Sandbox চালু রেখে চারটা তথ্য বসান, "Show bKash at checkout" চালু করে Save।
3. লাইভ করতে bKash মার্চেন্ট অ্যাকাউন্ট লাগবে (ট্রেড লাইসেন্স দিয়ে আবেদন), তারপর লাইভ কী বসিয়ে Sandbox বন্ধ করবেন।

## SSLCommerz (টেস্ট মোড ফ্রি)

1. https://developer.sslcommerz.com/registration/ এ sandbox store খুলুন। ইমেলে Store ID ও Store Password আসবে।
2. অ্যাডমিন **Payments > SSLCommerz**: Sandbox চালু রেখে দুটো বসান, চালু করে Save।
3. SSLCommerz merchant panel-এ IPN URL হিসেবে Payments পেজে দেখানো URL টা দিন।
4. নোট: লোকাল কম্পিউটারে (localhost) SSLCommerz ফেরত আসতে পারে না, তাই পুরো টেস্ট ডিপ্লয় করার পর করবেন।

## কুরিয়ার

অ্যাডমিন **Shipping** পেজে প্রতিটা কুরিয়ারের ঘর আছে। কী বসিয়ে Enabled করলে অর্ডারের পাশে "Send to courier" বাটন আসবে, একসাথে অনেক অর্ডারও পাঠানো যায়।

- **Steadfast**: steadfast.com.bd মার্চেন্ট প্যানেল > API সেকশন থেকে API Key ও Secret Key। Webhook সেকশনে Shipping পেজে দেখানো URL দিন, আর Auth Token হিসেবে আপনার বানানো Webhook token।
- **Pathao**: merchant.pathao.com > Developers API থেকে Client ID ও Secret। Username/password হলো মার্চেন্ট লগইনের ইমেল ও পাসওয়ার্ড। Store ID দিন। Webhook সেকশনে URL ও secret দিন।
- **RedX**: redx.com.bd মার্চেন্ট প্যানেল > Developer API থেকে টোকেন। Webhook URL-এর শেষে `?token=` এর পরে আপনার Webhook token দিন।

প্রথমে প্রতিটা কুরিয়ারে একটা টেস্ট অর্ডার পাঠিয়ে মার্চেন্ট প্যানেলে মিলিয়ে নিন। কুরিয়ার কোম্পানিগুলো মাঝে মাঝে API বদলায়, কোনো এরর এলে এরর মেসেজটা আমাকে পাঠাবেন।

## কুরিয়ার স্ট্যাটাস অটো আপডেট (ফ্রি)

ওয়েবহুক মিস হলে ব্যাকআপ হিসেবে প্রতি ঘণ্টায় স্ট্যাটাস চেক:

1. https://cron-job.org এ ফ্রি অ্যাকাউন্ট খুলুন > **Create cronjob**।
2. URL: `https://আপনার-ডোমেইন/api/cron/couriers`, প্রতি ১ ঘণ্টা।
3. **Advanced > Headers**: `Authorization` = `Bearer আপনার_CRON_SECRET`।

## ইনভয়েস

অর্ডার পেজে Invoice / Packing slip বাটন প্রিন্টের পেজ খোলে, সেখান থেকে **Save as PDF** করলে বাংলা লেখাও ঠিকঠাক আসে। অনেক অর্ডার সিলেক্ট করে একসাথে প্রিন্ট করা যায়।

---

# ফেজ ৮ ও ৯ সেটআপ

এই ফেজে নতুন SQL নেই। শুধু ফাইল কপি করে Replace দিন।

## ইমেল (Resend, ফ্রি: দিনে ১০০, মাসে ৩,০০০)

1. https://resend.com এ সাইন আপ করুন > **API Keys > Create**। কী টা `.env.local`-এ `RESEND_API_KEY`-তে বসান।
2. **Domains > Add domain**: আপনার ডোমেইন দিন, যে DNS রেকর্ড দেখায় সেগুলো ডোমেইনের DNS-এ (যেমন Cloudflare) বসান, Verify করুন। তারপর `EMAIL_FROM="আপনার স্টোর <orders@আপনার-ডোমেইন.com>"`।
   ডোমেইন না থাকলে টেস্টের জন্য `EMAIL_FROM="Store <onboarding@resend.dev>"` দিন, তবে তখন শুধু আপনার নিজের ইমেলেই যাবে।
3. অ্যাডমিন **Emails** পেজে যেকোনো ইমেলের পাশে **Test** চাপলে আপনার ইমেলে নমুনা যাবে। লেখা বদলাতে **Edit**।
4. **Supabase-এর ইমেলও Resend দিয়ে পাঠান** (ভেরিফিকেশন ও পাসওয়ার্ড রিসেটের সীমা উঠে যাবে): Supabase > **Authentication > Emails > SMTP Settings** চালু করুন:
   - Host `smtp.resend.com`, Port `465`, Username `resend`, Password আপনার Resend API key, Sender email আপনার ভেরিফাইড ঠিকানা।

## ইমেল অটো পাঠানো (cron-job.org, ফ্রি)

অর্ডার হলে ইমেল সাথে সাথেই যায়। বাকি সব (রিমাইন্ডার, স্টকে ফেরার খবর, ব্যর্থ ইমেল আবার পাঠানো) এর জন্য আগের মতো আরেকটা cron বানান:

- URL: `https://আপনার-ডোমেইন/api/cron/emails`, প্রতি ১০ মিনিট
- Header: `Authorization` = `Bearer আপনার_CRON_SECRET`

এটা যা করে: কার্টে জিনিস রেখে ১ ঘণ্টা ও ২৪ ঘণ্টা পর রিমাইন্ডার, "Notify me" দেওয়া কাস্টমারদের স্টকে ফেরার ইমেল, আর জমে থাকা ইমেল পাঠানো।

## Chrome এক্সটেনশন দিয়ে Temu / Alibaba থেকে ইম্পোর্ট

1. অ্যাডমিন **Import products > Chrome extension > New import key** চাপুন, কী টা কপি করুন (একবারই দেখাবে)।
2. Chrome-এ `chrome://extensions` খুলুন, ডানে **Developer mode** চালু করুন, **Load unpacked** চেপে প্রজেক্টের `apps/extension` ফোল্ডার দিন।
3. এক্সটেনশনের **Details > Extension options**: Store URL (যেমন `http://localhost:3000` বা আপনার ডোমেইন) আর import key বসিয়ে Save।
4. Temu-তে যেকোনো প্রোডাক্ট পেজ খুলুন, একবার নিচে স্ক্রল করুন যাতে সব লোড হয়, তারপর এক্সটেনশন আইকনে চাপুন। ছবি, ভিডিও, অপশন, ভ্যারিয়েন্টের সংখ্যা দেখাবে। **Send to store** চাপুন।
5. **Review and import** লিংকে গিয়ে কোন ছবি নেবেন, দাম, ক্যাটাগরি ঠিক করে **Import product**। ছবি আর ভিডিও আপনার নিজের স্টোরেজে কপি হয়ে যায়।

দামের নিয়ম (ডলার/ক্যানাডিয়ান ডলারের রেট, কত % লাভ যোগ হবে, রাউন্ডিং) **Import products > Pricing rules** থেকে বদলাবেন।

## AliExpress API (ঐচ্ছিক, ফ্রি)

এক্সটেনশন দিয়ে AliExpress-ও কাজ করে। চাইলে শুধু লিংক পেস্ট করে ইম্পোর্টের জন্য:

1. https://openservice.aliexpress.com এ ডেভেলপার হিসেবে রেজিস্টার করুন, **App Management > Create App** (Dropshipping)। অনুমোদনে ১ থেকে ২ দিন লাগে।
2. App Key ও App Secret নিন। অ্যাপের **Authorization** থেকে আপনার AliExpress অ্যাকাউন্ট অনুমোদন করে Access Token নিন।
3. অ্যাডমিন **Import products > AliExpress API**: তিনটা বসিয়ে চালু করুন।

---

# ফেজ ১০ ও ১১ সেটআপ

1. ফাইল কপি করে Replace দিন, তারপর `npm install` (চার্টের জন্য নতুন প্যাকেজ)।
2. Supabase SQL Editor-এ `supabase/migrations/0007_dashboard.sql` চালান।
3. cron-job.org-এ তৃতীয় একটা কাজ বানান, দিনে একবার (সকাল ৯টা):
   - URL: `https://আপনার-ডোমেইন/api/cron/daily`
   - Header: `Authorization` = `Bearer আপনার_CRON_SECRET`
   এটা প্রতিদিন আপনার স্টোর ইমেলে গতকালের বিক্রির সারাংশ আর স্টক কমে যাওয়া প্রোডাক্টের তালিকা পাঠাবে।

## নতুন অ্যাডমিন পেজ

- **Dashboard**: আয়, অর্ডার, গড় অর্ডার, লাভ, নতুন কাস্টমার; ১ দিন, ৭, ১৫, ৩০ দিন, ৩ মাস, ৬ মাস, ১ বছর বা নিজের তারিখ; আগের সময়ের সাথে তুলনা।
- **Coupons**: শতাংশ, নির্দিষ্ট টাকা বা ফ্রি ডেলিভারি; সর্বনিম্ন অর্ডার, ব্যবহারের সীমা, তারিখ, নির্দিষ্ট ক্যাটাগরি।
- **Marketing**: হোমপেজ ব্যানার স্লাইডার, উপরের ঘোষণা বার, পপআপ অফার, ফ্ল্যাশ সেল, হোমপেজের সেকশন সাজানো, নিউজলেটার।
- **Reviews**: রিভিউ ও প্রশ্ন অনুমোদন, উত্তর দেওয়া।
- **Customers**: সব কাস্টমার, কত টাকার কেনাকাটা, অর্ডার, নোট, পয়েন্ট, ব্লক।
- **Content**: পেজ (About, Privacy ইত্যাদি), ব্লগ, FAQ।
- **Reports**: অর্ডার, বিক্রি হওয়া পণ্য, প্রোডাক্ট, কাস্টমার, কুপন, নিউজলেটারের Excel ফাইল।

---

# ফেজ ১২ ও ১৩ সেটআপ

1. ফাইল কপি করে Replace দিন। SQL Editor-এ `supabase/migrations/0008_seo_chat.sql` চালান।

## SEO

অ্যাডমিন **SEO and tracking > Search engines**:
- হোমপেজের টাইটেল, ডিফল্ট বিবরণ, শেয়ার ইমেজ বসান।
- **Google Search Console** (https://search.google.com/search-console): Add property > URL prefix > আপনার ডোমেইন > **HTML tag** পদ্ধতি বেছে নিন। `content="..."` এর ভেতরের লেখাটুকু কপি করে "Google Search Console code" ঘরে দিয়ে Save করুন, তারপর Search Console-এ Verify চাপুন। এরপর **Sitemaps** মেনুতে `sitemap.xml` জমা দিন।
- Bing Webmaster Tools-এ Search Console থেকে সরাসরি Import করা যায়।

সাইটম্যাপ (`/sitemap.xml`) আর robots.txt অটো তৈরি হয়। প্রোডাক্ট, ব্রেডক্রাম্ব, FAQ, ব্লগের স্কিমা মার্কআপ প্রতিটা পেজে একটা সম্মিলিত JSON-LD হিসেবে অটো যোগ হয়। পুরোনো লিংক বদলালে **Redirects and 404s** ট্যাবে রিডাইরেক্ট দিন, ভাঙা লিংকের তালিকাও ওখানে দেখবেন।

## Google Analytics, Tag Manager, Facebook Pixel (ফ্রি)

**SEO and tracking > Analytics and pixels**-এ আইডিগুলো বসিয়ে "Turn tracking on" চালু করুন:
- **GA4**: https://analytics.google.com > Admin > Data streams > Web > Measurement ID (`G-...`)।
- **Tag Manager** (ঐচ্ছিক): https://tagmanager.google.com > Container ID (`GTM-...`)। GA4 দুবার গোনা এড়াতে GA4 হয় এখানে, নয়তো GTM-এর ভেতরে, একটায় রাখবেন।
- **Facebook Pixel**: https://business.facebook.com/events_manager > Data sources > Pixel ID।
- **Conversions API**: Events Manager > আপনার Pixel > Settings > **Generate access token**। টোকেন "Facebook Conversions API" ঘরে দিন। টেস্টের সময় Test Events ট্যাবের কোডটা "Test event code" ঘরে দিন, টেস্ট শেষে মুছে ফেলবেন।

ভিজিটর কুকি ব্যানারে "Accept" চাপলেই স্ক্রিপ্ট লোড হয়। প্রোডাক্ট দেখা, কার্টে যোগ, চেকআউট শুরু আর কেনাকাটা অটো পাঠানো হয়।

## AI চ্যাটবট (Gemini, ফ্রি)

1. https://aistudio.google.com/apikey এ গিয়ে **Create API key**।
2. `.env.local`-এ `GEMINI_API_KEY=` এর পরে বসান, সার্ভার রিস্টার্ট দিন।
3. অ্যাডমিন **Chatbot**: নাম আর স্বাগত বার্তা দিন, চালু রাখুন। স্টোরের ডান কোণায় চ্যাট বাটন আসবে।

চ্যাটবট প্রতিবার সরাসরি ডাটাবেজ থেকে প্রোডাক্ট, দাম, স্টক, কুপন, ডেলিভারি চার্জ আর অর্ডার স্ট্যাটাস পড়ে উত্তর দেয়, তাই নতুন প্রোডাক্ট বা কুপন যোগ করলে আলাদা করে ট্রেন করতে হয় না। নীতিমালা বা বাড়তি তথ্য "Extra knowledge" অংশে লিখে দিন। বাংলায় প্রশ্ন করলে বাংলায় উত্তর দেয়। ফ্রি প্ল্যানে মিনিটে ও দিনে সীমা আছে, ছোট স্টোরের জন্য যথেষ্ট।

---

# ফেজ ১৪: চূড়ান্ত

এই জিপে পুরো প্রজেক্ট আছে। নতুন SQL নেই।

1. আগের প্রজেক্ট ফোল্ডারের **`.env.local` ফাইলটা আলাদা করে রাখুন**। তারপর পুরো ফোল্ডারটা এই জিপের ফোল্ডার দিয়ে বদলে দিন, `.env.local` আবার `apps/web/`-এ ফিরিয়ে রাখুন।
2. `npm install`
3. `npm test` চালালে মূল লজিকের টেস্ট চলবে, সব সবুজ (passed) আসা উচিত।
4. লাইভে তোলার সম্পূর্ণ গাইড: **`docs/DEPLOY.md`**

এই ফেজে যা যোগ হয়েছে: কঠোর Content Security Policy ও অন্যান্য সিকিউরিটি হেডার, এরর ও লোডিং পেজ, মেইনটেন্যান্স মোড (Admin > Settings), কাস্টমারের অ্যাকাউন্ট ডিলিট, অ্যাপ আইকন ও ইনস্টলযোগ্য ওয়েব অ্যাপ (PWA), অটো টেস্ট, GitHub-এ অটো চেক ও রাতের ডাটাবেজ ব্যাকআপ। টেস্ট চালাতে গিয়ে বাংলা স্লাগের (URL) একটা বাগ ধরা পড়েছিল, সেটা ঠিক করা হয়েছে: আগে বাংলা নামের ক্যাটাগরি বা প্রোডাক্টের URL-এ কার (া, ি ইত্যাদি) বাদ পড়ত।

---

# ফেজ ১৫: থিম, পেজ বিল্ডার, অগ্রিম পেমেন্ট

1. ফাইল কপি করে Replace দিন (নতুন প্যাকেজ নেই, তবে `npm install` দিলে ক্ষতি নেই)।
2. Supabase SQL Editor-এ `supabase/migrations/0009_themes_payments.sql` চালান।
3. সার্ভার রিস্টার্ট দিন (`Ctrl+C`, তারপর `npm run dev`)।

## নতুন অ্যাডমিন পেজ

- **Appearance**: ৮টা থিম (Lumen, Noir, Bloom, Fresh, Volt, Nordic, Street, Playful)। "Apply theme" চাপলে পুরো সাইটের রং, ফন্ট, হেডার, ফুটার, প্রোডাক্ট কার্ড আর চাইলে হোমপেজের ডেমো লেআউট বদলে যায়। ১২টা ব্র্যান্ড কালার টেমপ্লেট বা নিজের রং, ৬টা ব্যাকগ্রাউন্ড টোন, ৬টা ফন্ট, ৩ ধরনের কোণা, ৪টা হেডার, ৪টা ফুটার, ৪টা প্রোডাক্ট কার্ড। **Export design** দিয়ে পুরো ডিজাইন এক ফাইলে সেভ হয়, **Import design** দিয়ে অন্য স্টোরে বসানো যায়।
- **Page builder**: হোমপেজ আর যেকোনো পেজের জন্য ১৫ ধরনের সেকশন, মোট ৪০টা ডিজাইন (৮টা হিরো ডিজাইন সহ)। প্রতিটা ডিজাইনের ছোট ছবি দেখে বেছে নেবেন, ডানে ডেস্কটপ, ল্যাপটপ, ট্যাব আর ফোনের মাপে লাইভ প্রিভিউ।
- **Settings > Checkout**: ডেলিভারি চার্জ আগে নেবেন নাকি ডেলিভারিতে, ডিফল্ট অগ্রিমের %, আর চেকআউটের ঘর (ইমেল, থানা, নোট দেখানো বা বাধ্যতামূলক করা, নিজের ঘর যোগ)।
- **Products > Payment rules**: প্রতিটা প্রোডাক্টে আলাদা নিয়ম (ডেলিভারি চার্জ আগে, অগ্রিম %, কাস্টমার অগ্রিম এড়াতে পারবে কিনা)।
- **Content > Contact form**: যোগাযোগ ফর্মের ঘর নিজে সাজানো (বাংলা ও ইংরেজি লেবেল)। **Content > Messages**-এ সব মেসেজ।
- **Emails**: প্রতিটা ইমেলে বাড়তি ব্লক (শিরোনাম, লেখা, বাটন, ছবি, প্রোডাক্ট)। ইমেলের বাটন আপনার ব্র্যান্ড রঙে।

অগ্রিম পেমেন্ট আর আগে ডেলিভারি চার্জ নেওয়ার জন্য Payments-এ বিকাশ বা SSLCommerz চালু থাকতে হবে।

---

# ফেজ ১৬: রেফারেল, ৩D হিরো, কনটেন্ট সিস্টেম, ইনভয়েস, AI ব্রেইন, যেকোনো সাইট থেকে ইম্পোর্ট

1. ফাইল কপি করে Replace দিন, তারপর `npm install` (নতুন প্যাকেজ: QR কোড)।
2. SQL Editor-এ `supabase/migrations/0010_referrals_content.sql` চালান।
3. Chrome এক্সটেনশন আপডেট: `chrome://extensions` > Lumen Product Importer > Reload।

## নতুন যা আছে

- **রেফারেল ও পয়েন্ট** (Settings): প্রতিটা কাস্টমারের নিজের লিংক। বন্ধুর প্রথম অর্ডার ডেলিভারি হলে প্রতি রেফারেলে ১০% ছাড় (সর্বোচ্চ ৫০%) আর পয়েন্ট। কেনাকাটায় পয়েন্ট জমে, চেকআউটে "আমার রিওয়ার্ড ব্যবহার করুন" চাপলে ছাড়। সব সংখ্যা Settings থেকে বদলানো যায়।
- **প্রি-অর্ডার ও লেবেল** (প্রোডাক্ট এডিটর): স্টক না থাকলেও অর্ডার, সম্ভাব্য পাঠানোর তারিখ। New, Hot, Featured, Best seller, Limited ইত্যাদি লেবেল।
- **প্রোডাক্ট তুলনা** (`/compare`) আর **প্রিন্টযোগ্য ক্যাটালগ** (`/catalog`)।
- **৬টা নতুন ৩D হিরো**: 3D tilt, 3D ring, card stack, gradient mesh, orbit, big type marquee। সব হিরো **Boxed বা Full width**।
- **বাটন স্টাইল** (Appearance): Solid, Gradient, Outline, Soft, Raised 3D, Glow, Glass। নিজের **কালার সেট সেভ**। নতুন থিম **Aurora** আর **Luxe**। সব থিম বাই ডিফল্ট লাইট মোডে।
- **Pages, Posts, Landing pages** (বাম মেনু): WordPress-এর মতো তালিকা, নতুন তৈরি, এডিট, কপি। পোস্টের একাধিক ধরন (Blog, News, Buying guides, Lookbook, নিজের ধরন), ক্যাটাগরি, ট্যাগ, ফিচার ইমেজ, স্টিকি টেবিল অফ কনটেন্ট, পড়ার প্রগ্রেস বার, আগের/পরের ও সম্পর্কিত পোস্ট, পোস্টের ভেতরে প্রোডাক্ট। ল্যান্ডিং পেজে হেডার-ফুটার লুকানো, নিজের CSS আর **HTML কোড** সেকশন।
- **৬টা ইনভয়েস ডিজাইন** (Settings): Classic, Modern, Minimal, Bold, Elegant, Receipt (৮০ মিমি থার্মাল প্রিন্টার)। ব্র্যান্ড রঙ নিজে আসে। **বারকোড** আর **QR কোড** (স্ক্যান করলে ট্র্যাকিং পেজ)।
- **AI চ্যাটবট** (Chatbot): OpenRouter-এর ফ্রি মডেল, একটা ব্যস্ত হলে পরেরটা নিজে চালু হয়। "স্টোর ব্রেইন" প্রতিদিন নিজের স্টোরের ডাটা থেকে আপডেট হয়, আর কথোপকথন থেকে "Teach this answer" দিয়ে শেখানো যায়। ফ্রি কী: https://openrouter.ai/keys , বসাবেন Admin > Chatbot > AI engine-এ।
- **যেকোনো সাইট থেকে ইম্পোর্ট**: Shopify আর WooCommerce স্টোর (সব ভ্যারিয়েন্ট ও ভিডিওসহ), Amazon, Temu, AliExpress, Alibaba, Daraz আর অন্য যেকোনো দোকান।

---

# ফেজ ১৭: CMS গোছানো, SEO, কাস্টম কোড, পেজ টেমপ্লেট

1. ফাইল কপি করে Replace দিন, `npm install` চালান।
2. SQL Editor-এ `supabase/migrations/0011_cms.sql` চালান।
3. সার্ভার রিস্টার্ট দিন।
4. আগের Super Admin ছাড়া অন্য কোনো রোলের স্টাফের কাস্টম কোড লাগলে: Staff and roles > Roles এডিটরে `code` মডিউলের টিক দিন (Super Admin-এ নিজে থেকেই আছে)।

## অ্যাডমিন এখন যেভাবে সাজানো

বাম মেনু WordPress-এর মতো গ্রুপে: **Shop** (Orders, Products, Categories, Brands, Tags, Coupons, Reviews, Import), **Content** (Pages, Posts, Landing pages, Media, FAQ and forms), **Design** (Themes and style, Page builder, Page templates, Menus, Custom code), **Marketing**, **SEO and tracking**, **Settings** (General and checkout, Shipping zones, Payments, Staff, Activity log, Site health)। যেকোনো জায়গা থেকে `Ctrl+K` চেপে পেজ, অর্ডার, প্রোডাক্ট, কাস্টমার খোঁজা যায়।

## মূল নতুন ফিচার

- **ডেলিভারি চার্জ চালু/বন্ধ**: Settings > Checkout and delivery। জোন অনুযায়ী বা ফ্ল্যাট রেট, আগে বা ডেলিভারিতে নেওয়া, আর প্রোডাক্ট ধরে "ফ্রি ডেলিভারি"।
- **SEO**: প্রতিটা পেজে একই SEO বক্স (গুগল প্রিভিউ, কিওয়ার্ড চেক, canonical, noindex/nofollow, সোশ্যাল শেয়ার, স্কিমা জেনারেটর)। Admin > SEO-তে General, Schema, Social, Search Console, Sitemap and robots, Redirects and 404s, Analytics and pixels, SEO audit।
- **কাস্টম কোড**: Design > Custom code (পুরো সাইট, হোম) আর প্রতিটা পেজ, ল্যান্ডিং, পোস্ট, প্রোডাক্ট, ক্যাটাগরির এডিটরে Header, Body, Footer কোড।
- **Page templates** (Design > Page templates): প্রোডাক্ট পেজ, শপ, ব্লগ আর্কাইভ, সিঙ্গেল পোস্ট, লাইভ প্রিভিউসহ।
- **Menus**: হেডার (ড্রপডাউনসহ) আর ফুটার।
- **Brands, Tags**: ব্র্যান্ড বা ট্যাগ ধরে `/shop?brand=...`, `/shop?tag=...`।
- **স্লাগ বদলালে অটো 301 রিডাইরেক্ট** (প্রোডাক্ট, ক্যাটাগরি, পেজ, পোস্ট)।
- **Site health**: লাইভে যাওয়ার আগে কী কী বাকি তার চেকলিস্ট।
