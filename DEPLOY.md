# Deploying WAQT to Vercel (no terminal needed)

This is a click-by-click guide to put WAQT online at a real URL you can open on any
device and show to a supermarket. Everything is done in the browser.

**Before you start, you need:**
- Your GitHub repo: `ibrahimismail-IM33/inventory-management` (already has the code).
- Your Supabase project **URL** and **anon public key**
  (Supabase dashboard → **Project Settings → API**).
  > The anon key is *public by design* — it's meant to be shipped in the app and is safe
  > to put in Vercel. Your data is protected by Row-Level Security, not by hiding this key.

---

## Step 1 — Create a Vercel account
1. Go to **https://vercel.com** → **Sign Up**.
2. Choose **Continue with GitHub** and authorize Vercel.

## Step 2 — Import the project
1. On the Vercel dashboard click **Add New… → Project**.
2. Find **inventory-management** in the list → click **Import**.
   (If you don't see it, click **Adjust GitHub App Permissions** and give Vercel access
   to that repo.)

## Step 3 — Configure the project
Vercel auto-detects **Next.js** — leave Framework Preset, Build Command, and Output as-is.
1. **Branch:** by default Vercel deploys the `main`/default branch. Our code is on
   **`claude/expired-date-inventory-analysis-enbc4v`**. Two options:
   - **Easiest:** first merge that branch into your default branch on GitHub (open a Pull
     Request and merge), then Vercel deploys it automatically; **or**
   - In Vercel, after the first deploy, go to **Settings → Git → Production Branch** and set
     it to `claude/expired-date-inventory-analysis-enbc4v`.
2. Expand **Environment Variables** and add these two (from Supabase → Settings → API):

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://YOUR-PROJECT.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon public key |

3. Click **Deploy** and wait ~1–2 minutes.

## Step 4 — Point Supabase auth at your new URL
When the deploy finishes Vercel shows a URL like `https://waqt-xxxx.vercel.app`. Copy it, then:
1. Supabase dashboard → **Authentication → URL Configuration**.
2. Set **Site URL** to your Vercel URL.
3. Under **Redirect URLs**, add `https://waqt-xxxx.vercel.app/**`.
4. **Turn off email confirmation for now** (so sign-up works instantly during the pilot):
   **Authentication → Providers → Email** → disable **Confirm email** → Save.
   *(Turn this back on before real customers use it.)*

## Step 5 — Try it
1. Open your Vercel URL.
2. **Create an account** → you land on **Set up your company** → enter the supermarket name.
3. Add a **Supplier**, then a **Product**.
4. **Receive** a batch with an expiry date.
5. Open **Expiry** — set a product's expiry date in the past when receiving to see it under
   **Expired**, then click **Return** (pick a supplier) or **Scrap**.
6. Open **Returns** — change the status to **credited** and enter a credit amount; the
   **Dashboard** and Returns page show the RM recovered.

---

## Redeploys
Every time new code is pushed to the production branch, Vercel redeploys automatically.
No action needed from you.

## Troubleshooting
- **"Failed to fetch" / login does nothing:** the env vars are missing or wrong. Vercel →
  **Settings → Environment Variables**, fix them, then **Deployments → … → Redeploy**.
- **Sign-up seems stuck at login:** email confirmation is still on — do Step 4.4.
- **Build failed:** check that Vercel is deploying the branch that has the code
  (Step 3.1).
- **Can see the app but no data saves:** confirm the migration
  (`supabase/migrations/0001_waqt_core.sql`) was run in your Supabase SQL editor.
