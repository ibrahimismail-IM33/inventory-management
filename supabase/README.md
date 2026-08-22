# WAQT — Supabase

The database schema lives in `migrations/`.

## Apply the schema

**Option A — Supabase CLI (recommended for local dev)**
```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

**Option B — SQL editor**
Open the Supabase dashboard → SQL Editor → paste the contents of
`migrations/0001_waqt_core.sql` → Run.

## After applying
1. In the dashboard, go to **Project Settings → API** and copy the Project URL and
   the `anon` public key.
2. In the app root, copy `.env.example` to `.env.local` and fill those two values.
3. Enable **Email** auth under **Authentication → Providers** (email/password).

## Notes
- Every business table has Row-Level Security enabled; a user only sees rows for
  companies they belong to (via `company_members`).
- New companies are created through the `create_company(name)` RPC, which also
  creates the first membership (admin) and a "Main store".
- `0002_*` and later migrations (expiry alert cron job, CSV import helpers) will be
  added as those features land.
