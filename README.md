# 👗 ClosetShare

A mobile-first web app where friends request and lend clothing from each other — with SMS notifications powered by Twilio.

## ✨ Features

- **Browse closets** — see friends' available items in a beautiful grid
- **Request items** — send a request with a note; friend gets an SMS instantly
- **Manage your closet** — add, edit, and toggle availability of your items
- **Approve / decline requests** — requester gets notified via text
- **Invite friends** — by email or shareable link
- **Auth** — sign up, log in, change password (Supabase)
- **Demo mode** — works out of the box without any env vars (uses localStorage + mock data)

---

## 🚀 Quick Start (Demo mode — no setup needed)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with any email + password (6+ chars).

---

## 🔧 Full Setup (Production)

### 1. Supabase (free at supabase.com)

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. Copy your **Project URL** and **anon key** from Project Settings → API

### 2. Twilio SMS (free trial at twilio.com)

1. Sign up at [twilio.com](https://twilio.com) — you get **~$15 free credit** (≈ 1,900 texts)
2. Get a phone number in the Twilio Console
3. Copy your **Account SID**, **Auth Token**, and **phone number**

> **Tip:** For pure testing, [Textbelt](https://textbelt.com/) offers 1 free SMS/day with no signup.

### 3. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your values:

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
```

### 4. Run

```bash
npm run dev
```

---

## 🚢 Deploy to Vercel

```bash
npx vercel
```

Or connect the repo in the [Vercel dashboard](https://vercel.com/new) and add env vars in **Project Settings → Environment Variables**.

---

## 🏗️ Tech Stack

| Layer | Tool | Free tier |
|---|---|---|
| Framework | [Next.js 14](https://nextjs.org) App Router | ✅ Free |
| Auth + DB | [Supabase](https://supabase.com) | ✅ 500MB, 50k MAU |
| SMS | [Twilio](https://twilio.com) | ✅ ~$15 trial credit |
| Styling | [Tailwind CSS](https://tailwindcss.com) | ✅ Free |
| Deploy | [Vercel](https://vercel.com) | ✅ Hobby tier |

---

## 📁 Project Structure

```
closetshare/
├── src/
│   ├── app/
│   │   ├── (auth)/           # login, signup, change-password
│   │   ├── (app)/            # dashboard, my-closet, requests, invite, profile
│   │   └── api/notify/       # POST → sends SMS via Twilio
│   ├── context/AppContext.tsx # state + mock data (replace with Supabase queries)
│   ├── lib/
│   │   ├── supabase/         # client.ts + server.ts
│   │   └── twilio.ts         # sendSMS helper
│   └── types/index.ts
├── supabase/schema.sql        # run in Supabase SQL Editor
└── .env.local.example
```

---

## 🔄 Switching from Demo → Supabase

Each page has the real Supabase calls commented out directly above the demo code. Search for `// ── Real Supabase` to find them all, uncomment, and delete the demo block below.

---

## 💬 SMS Flow

| Event | Who gets the text |
|---|---|
| Request sent | Item owner |
| Request approved | Requester |
| Request declined | Requester |

SMS messages are sent via `POST /api/notify` with `{ to, message }`. Without Twilio env vars, messages are logged to the console instead.
# closetshare
