# Proxam: Student Assessment and Career Guidance Platform (Phase 1 MVP)

Mobile-first website for Class 10 to 12 students: free MCQ test, instant result, free career guidance call booking, English and Hindi, and a basic admin panel. Built from the PRD dated 8 Nov 2026.

## Run it in VS Code

You need **Node.js 20 or newer** (`node -v` to check).

1. Make a free database at https://neon.tech (New project, region **Asia Pacific (Singapore)**, closest to India).
2. Neon > **Connect** > copy the **pooled** connection string. Copy the direct one too.
3. In the project folder:

```bash
npm install
cp .env.example .env.local     # then paste DATABASE_URL (pooled) and DATABASE_URL_UNPOOLED (direct) into .env.local
npm run db:setup               # creates the tables, copies your old .data/db.json once, adds starter questions
npm run dev
```

Open http://localhost:3000. Run `npm run db:setup` again after pulling new code: it only adds what is missing.

- **Student login:** any email address. Until an email service is set up, the OTP is shown on screen in a yellow box (dev mode). The mobile number is asked in onboarding (for calls and reminders); siblings can share one.
- **Parent OTP:** same, shown on screen.
- **Admin panel:** http://localhost:3000/admin, password `admin123` (change `ADMIN_PASSWORD` in `.env.local`).
- **Test on phone size:** Chrome DevTools > Toggle device toolbar (Cmd + Shift + M), pick an iPhone or a 360px Android.
- **Reset all data:** in Neon, use **Branches > Reset**, or make a new database, then run `npm run db:setup` again.

## Batches and prices (one-time fee, GST included)

| Batch | Price |
|---|---|
| Class 10 Board | ₹299 |
| Class 11 (PCM, PCB, PCMB, Commerce) | ₹499 |
| Class 12 JEE (Class 11 + 12 syllabus, JEE level tests) | ₹799 |
| Class 12 NEET (Class 11 + 12 syllabus, NEET level tests) | ₹799 |
| Class 12 Boards PCM (Class 12 syllabus, board level tests) | ₹599 |
| Class 12 Boards PCB (Class 12 syllabus, board level tests) | ₹599 |
| Class 12 Commerce | ₹799 |
| Dropper | ₹999 |

Class prices: `PRICES` in `src/lib/config.ts`. Class 12 Science batches: `TRACKS` in `src/lib/batches.ts`. Who can join what: PCM students JEE or Boards PCM, PCB students NEET or Boards PCB, PCMB students any of the four. One batch per student; the admin can move a student between batches (Students > student > Batch). The price charged always comes from the server, never from the browser.

## What is built (PRD Phase 1)

| PRD | Status |
|---|---|
| 7.1 Email OTP signup (mobile in profile), profile, consent | Done. Parent consent is verified by OTP to the parent (DPDP "verifiable consent") |
| 7.2 Test: 24x7, MCQ, timer + auto-submit, autosave, palette, mark for review, rotation, 3 attempts, instructions, submit confirm | Done |
| 7.3 Instant result: score, %, section, subject, topic, accuracy, time per question, strong/weak, level, PDF | Done (PDF uses the browser's Save as PDF) |
| 7.4 Guidance call: CTA after result, date/slot, Google Meet only (Zoom removed), reschedule, cancel, counsellor view + notes | Done. Meeting link is pasted by admin (auto-creation needs API keys, see below) |
| 7.10 Dashboard with next action, score history, upcoming call | Done |
| 7.11 Admin: question bank + CSV bulk upload, student/lead filters + CSV export, call management, funnel | Done (basic) |
| English + Hindi | UI done. Questions are English only until the content team adds Hindi |
| Class 10 stream recommendation (8.2.1) | Done (rule-based, counsellor confirms) |

## Built for crowds (lakhs of students at the same time)

- **Database:** PostgreSQL on Neon. Every page reads only one student's rows or one page (50 rows) of an admin list. Nothing loads "all students".
- **No double anything:** the database itself refuses a second open test, a repeated attempt number, a second active batch, a second seat in the same masterclass, or a call slot over capacity, even when a student double-clicks or 1,000 students click the same slot in the same second.
- **Autosave:** one database query per save (sessions are cached for 30 seconds).
- **Question bank and masterclasses:** cached in memory for a minute (edits show up within a minute on every server).
- **OTP:** limits per email (6 an hour) and per IP (300 an hour), shared by all servers, so bots cannot burn your free email quota.
- **Admin lists:** progress numbers are saved on each student when they change, so admin can sort lakhs of students by "most behind" instantly. The background job refreshes them daily.
- **Background job:** call `/api/cron/reminders` every 5 minutes with header `Authorization: Bearer <CRON_SECRET>` (Vercel Cron or cron-job.org). It sends call reminders, submits tests whose time ran out, and refreshes progress. Safe to run on many servers at once.
- **Measured** on one 2-CPU server: about 750 autosaves and 690 test loads per second with p99 latency under 0.3 s. On Vercel the site adds servers by itself as traffic grows; the database is the part to size. Before a big launch: raise Neon's compute (autoscaling max) and run a load test.

## How the test keeps load low

1. **Start:** 1 request. Server picks a rotated question set and sends questions **without answers**.
2. **During the test:** every tap is saved on the phone (localStorage). Answers are sent to the server **once every 30 seconds**, only if something changed.
3. **Submit:** 1 request. Scoring happens on the server, so the answer key never reaches the browser.
4. **Timer:** the server's end time is the truth. If a student closes the page, the test is auto-submitted the next time they open the site, or by the background job.
5. **One active session:** logging in on a new device logs out the old one.

## Calls: calendar, Meet/Zoom links and SMS reminders

When a student books a call:
1. **Meet or Zoom link** is created automatically (if Google / Zoom is connected).
2. The call goes on **your team's Google Calendar** (title, student, class, score, weak topics, link).
3. The student gets an **SMS**: booking confirmation, then reminders **24 hours, 1 hour and 10 minutes** before. Cancel or reschedule removes the calendar event / Zoom meeting and sends an SMS.
4. Admin > **Calendar** shows every call by week. Admin > **SMS log** shows every message.
5. Students can tap **Add to my calendar** on their dashboard (.ics file).

Nothing connected yet? Everything still works: calls show in Admin > Calendar, you paste links by hand in Admin > Calls (the student gets an SMS when you save a link), and SMS are only logged.

Reminders are checked every minute while the server runs (`src/instrumentation.ts`). On hosting where the server sleeps, call `GET /api/cron/reminders` every 5 minutes with header `Authorization: Bearer <CRON_SECRET>` (free: cron-job.org).

### Connect WhatsApp (link, reminders, cancellations go to the student's WhatsApp)
Uses Meta's own WhatsApp Cloud API. Cost: about ₹0.12 to ₹0.15 per message in India (utility and OTP rates; check Meta's current rate card). One booking = up to 4 messages.
1. Go to https://developers.facebook.com > **My Apps > Create App**, choose the WhatsApp / Business use case, link (or create) your Meta Business account.
2. **WhatsApp > API Setup**: Meta gives you a free **test number**, its **Phone number ID** and a temporary token. Under "To", add and verify up to 5 phone numbers (yours + a test student). Test sends only reach these 5.
3. **Create templates** in WhatsApp Manager (business.facebook.com > WhatsApp Manager > Message templates). Category **Utility**, language **English**, names exactly as below. Add sample values when Meta asks. Approval usually takes minutes to a few hours.
   - `proxam_booked`: `Hi {{1}}, your free Proxam guidance call is booked for {{2}} on {{3}}.` + new line + `Join here: {{4}}` + new line + `Please join 2 minutes early.`
   - `proxam_link`: `Hi {{1}}, here is the link for your Proxam guidance call on {{2}}:` + new line + `{{3}}` + new line + `Please join 2 minutes early.`
   - `proxam_reminder`: `Hi {{1}}, reminder: your Proxam guidance call starts in {{2}} (at {{3}}).` + new line + `Join here: {{4}}` + new line + `See you soon!`
   - `proxam_cancelled`: `Hi {{1}}, your Proxam guidance call on {{2}} has been cancelled.` + new line + `Book a new time here: {{3}}` + new line + `Thank you.`
4. **Permanent token** (the API Setup token dies in 24 hours): business.facebook.com > Settings > **System users** > Add (Admin) > **Assign assets** (your app + WhatsApp account, full control) > **Generate token** with `whatsapp_business_messaging` and `whatsapp_business_management`, expiry **Never**.
5. Put `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_TOKEN` in `.env.local`, restart. Book a test call: the student's WhatsApp gets the Meet link.
6. **To message all students** (not just 5 test numbers): add your own business number in WhatsApp Manager (a number not already used in the WhatsApp app), add a payment method, and complete **Business verification**. New numbers start with a daily limit on how many people you can message first; it grows as you send good messages.

### Connect SMS (MSG91)
1. Register your company and sender ID on a DLT portal (Jio, Vodafone Idea, Airtel). This is required by TRAI for every business SMS in India.
2. Register these 5 templates on DLT, then add them as **Flow** templates in MSG91 (variables are `##var1##`, `##var2##`, `##var3##`):
   - Booked: `Proxam: Your free guidance call is booked for ##var1## on ##var2##. Join: ##var3##`
   - Link: `Proxam: Your guidance call link for ##var1##: ##var2##`
   - Reminder: `Reminder: Your Proxam guidance call starts in ##var1## (##var2##). Join: ##var3##`
   - Cancelled: `Proxam: Your guidance call on ##var1## is cancelled. Book a new time: ##var2##`
3. Put `SMS_PROVIDER=msg91`, `MSG91_AUTH_KEY` and the 5 template ids in `.env.local`. Restart.
Cost: roughly ₹0.15 to ₹0.30 per SMS (check MSG91's current rates). One booking = up to 4 SMS.

### Connect Google Calendar + Meet (normal Gmail works)
One-time setup, about 10 minutes, free:
1. Go to https://console.cloud.google.com and create a project (name it anything, e.g. Proxam).
2. Search "Google Calendar API" > **Enable**.
3. Open **Google Auth Platform** (older UI: "OAuth consent screen"):
   - **Branding:** app name `Proxam`, your email as support and developer contact.
   - **Audience:** User type **External**. Add your Gmail under **Test users**. Then click **Publish app** so it shows "In production". (If you leave it in "Testing", Google expires the connection every 7 days.)
   - **Data access** (optional): add scope `.../auth/calendar.events`.
4. **Clients** > **Create client** > type **Web application** > under **Authorized redirect URIs** add exactly:
   `http://localhost:3000/api/admin/google/callback`
   (when live, also add `https://YOUR-DOMAIN/api/admin/google/callback` and set `SITE_URL` to that domain).
5. Copy the **Client ID** and **Client secret** into `.env.local`:
   ```
   GOOGLE_OAUTH_CLIENT_ID=...apps.googleusercontent.com
   GOOGLE_OAUTH_CLIENT_SECRET=...
   SITE_URL=http://localhost:3000
   ```
6. Restart `npm run dev`. Open **Admin > Calendar > Connect Google Calendar**, pick your Gmail, click **Allow**. Google will show "Google hasn't verified this app": click **Advanced > Go to Proxam (unsafe)**. This warning is normal for your own private app; only you sign in here.
7. Book a test call as a student with Google Meet. It appears on your Google Calendar with a Meet link, and the student sees the link on their dashboard.

The refresh token is stored encrypted with `AUTH_SECRET`. If you change `AUTH_SECRET`, connect again.

### OR: Google Workspace service account (no button)
1. Google Cloud Console > new project > enable **Google Calendar API**.
2. Create a **service account**, add a JSON key. Copy `client_email` and `private_key` into `.env.local`.
3. Meet links need **Google Workspace**: Admin console > Security > API controls > Domain-wide delegation > add the service account's client ID with scope `https://www.googleapis.com/auth/calendar`. Set `GOOGLE_IMPERSONATE_USER` to the Workspace user whose calendar holds the calls, and `GOOGLE_CALENDAR_ID` to that calendar (or `primary`).
4. Without Workspace (plain Gmail): share the calendar with the service account email ("Make changes to events"). Calls will appear on the calendar, but Google does not allow service accounts to create Meet links, so use Zoom or paste Meet links by hand.

### Connect Zoom
Zoom Marketplace > Develop > Build App > **Server-to-Server OAuth**. Add scope to create meetings (`meeting:write:admin` or `meeting:write:meeting:admin`), activate, and copy Account ID, Client ID and Client Secret into `.env.local`. Free Zoom accounts end meetings after 40 minutes (our calls are 30).

## Login OTP by email (ZeptoMail now, free fallbacks later)

1. zoho.com/zeptomail: sign up (the first 10,000 emails are free, valid 6 months). Add domain `proxam.in` and add the DNS records it shows (SPF, DKIM, bounce CNAME) at the domain registrar. Wait until it says Verified.
2. Also add this TXT record at the registrar: name `_dmarc`, value `v=DMARC1; p=none`.
3. Mail Agents > your agent > SMTP/API: copy the **Send Mail Token** into `ZEPTOMAIL_TOKEN` and the **API URL** into `ZEPTOMAIL_URL` (in `.env.local` and in the hosting settings). Set `MAIL_FROM=otp@proxam.in`.
4. Log in on the site with your own email. Admin > Messages shows every OTP email (code hidden) and any error.
5. When the credit is about to run out: either buy more ZeptoMail credit, or make free Brevo (300 a day) / Resend (100 a day) accounts, verify `proxam.in` there too, and fill `BREVO_API_KEY` / `RESEND_API_KEY`. The site tries the providers in order and moves to the next one if a send fails. No code change.

Keep the email plain (it is): no links or images, the same From address always. That, plus SPF, DKIM and DMARC, keeps it in the inbox.

## Speed and Google (SEO)

- Home (`/` and Hindi `/hi`), the four free-test guides and the privacy page are **static**: built once, served from the CDN, no database. Language choice on `/` is handled in `src/proxy.ts`.
- Logged-in pages need only **2 database round trips** (user, then everything else in parallel). So the distance to the database decides their speed: keep the Neon database in **AWS Singapore (ap-southeast-1)** and the server in the **same city** (Vercel region `sin1`, set in `vercel.json`). Each page talks to the database twice, so server and database must sit together; India to Singapore is crossed only once per page. A US database adds about 0.5 s to every page from India.
- Speed is only real in production mode: `npm run build && npm start`. `npm run dev` is slow on purpose (it compiles pages on first open).
- SEO pieces: title and description per page, canonical links, `hreflang` English/Hindi, `/sitemap.xml`, `/robots.txt`, share image (`src/app/opengraph-image.tsx`), JSON-LD (organisation, FAQs, breadcrumbs), `noindex` on private pages (`next.config.ts`).
- Guides live in `src/lib/guides.ts`. To add one: add an entry there, then copy one of the guide folders in `src/app` and change the slug.
- Before launch: set `SITE_URL` to the real domain, add the site in Google Search Console, put the code in `GOOGLE_SITE_VERIFICATION`, and submit `https://YOUR-DOMAIN/sitemap.xml`.

## Several batches per student
A student can join more than one batch that fits their profile (Class 12 PCM: JEE and Boards PCM; PCMB: any of the four).
- `/batch` shows every option; the ones already joined say "Joined", the rest can be bought.
- The dashboard shows one batch at a time (`users.current_batch`); "My batches" in the sidebar switches. A new batch opens automatically.
- Each batch has its own roadmap, exam date and checkpoint tests (`attempts.batch_key`). Ticked chapters and the diagnostic test are shared.
- Admin student page: list of the student's batches, "Show this batch", "Add one more batch". Move / remove / start date act on the batch shown.
- Known limit: the progress % in admin lists is for the batch open on the student's dashboard.

## Payments (Razorpay)
Batches, the ₹49 extra test and masterclasses are paid with Razorpay Checkout (UPI, cards, netbanking, wallets).
1. The server makes a Razorpay order with the price from our own price table (the browser cannot change it) and saves it in `payment_orders`.
2. Checkout opens. After payment, `/api/pay/verify` checks the signature and only then adds the batch / test / seat (mode `razorpay`, with the payment id).
3. `/api/pay/webhook` does the same if the student closes the tab first. Both together never give the item twice.
4. If a student somehow pays for a second batch, the order is marked `needs_refund` (refund it from the Razorpay dashboard).

Setup: put `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` in Vercel, run `npm run db:setup` once (adds `payment_orders`), redeploy. Start with test keys (`rzp_test_`), switch to live keys after KYC. In Razorpay settings keep payment capture on **Automatic**.
Without keys: demo mode on your laptop, buying closed on the live site.

## Not done yet (be clear about this before launch)

- **SMS, Google Calendar, Zoom:** code is ready (see above) but needs your keys. Untested against the live services until you add them, so do one real test booking first.
- **WhatsApp and email reminders:** not built (SMS only).
- **Question bank:** only a starter set (8 per subject). The PRD needs 5x one test per field, reviewed, with Hindi. Admin > Question bank shows the gap.
- **Test length:** set to 15 to 18 questions so the starter bank can rotate. Raise counts in `src/lib/config.ts` (`FIELDS`) once the bank grows (PRD: 40 to 60).
- **Phase 2 and 3:** Gap and Goal report, ₹499 payment, roadmap, Proxam, alternate-week tests, parent view.
- **Privacy notice:** `/privacy` is a draft. Get it reviewed.

## Where things are

```
src/lib/config.ts        brand name, test blueprints, limits, call slot hours
src/lib/questionBank.ts  starter questions
src/lib/testEngine.ts    rotation, scoring, auto-submit
src/lib/auth.ts          OTP, sessions, admin login
db/schema.sql            database tables and indexes
src/lib/pg.ts            database connection pool
src/lib/store.ts         every read and write to the database
src/lib/adminData.ts     admin lists (paged SQL)
scripts/db-setup.ts      npm run db:setup
src/lib/i18n.ts          all English + Hindi text
src/app/                 pages (mobile first; md: = tablet, lg: = desktop)
src/app/api/             server routes
```
