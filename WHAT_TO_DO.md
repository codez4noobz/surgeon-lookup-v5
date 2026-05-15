# What you need to do

Your Supabase project is live and seeded with all 22,073 surgeons, 9,529 emails, 3,740 publication profiles, 3,740 payment profiles, and KOL scores for every provider. The app reads live data on every page load.

Two things to do now, plus a repeatable workflow for future data refreshes.

---

## What's already done

- Schema applied to `surgeon-lookup` Supabase project
- 6 tables created with indexes and RLS
- 22K surgeons, 9.5K emails, scores, publications, payments all seeded
- `lib/surgeons.ts` — data access layer
- `app/(app)/dashboard/page.tsx` — live search against real data
- `app/(app)/surgeon/[id]/page.tsx` — server-fetched profile by NPI
- `scripts/seed-supabase.mjs` — one-time bulk seed
- `scripts/sync-supabase.py` — **repeatable sync from research folder → Supabase**
- `package.json` — `npm run seed` and `npm run sync` wired up
- `.gitignore` keeps the 14MB .db file out of git

Verified working: sample query returned 5 Tier 1 surgeons in LA including John Lipham (USC), Tom Demeester, Kamran Samakar, Peter Crookes, and Peyman Benharash (UCLA).

---

## Step 1. Install dependencies

```
cd "/Users/gdoughty/Documents/Claude 2.0/OUTPUTS/Surgeon Lookup Web App/surgeon-lookup"
npm install
```

## Step 2. Run the app

```
npm run dev
```

Open http://localhost:3000. Sign in (Supabase → Authentication → Users → Add user if you haven't).

---

## Repeatable: refreshing data from the research folder

Whenever new surgeons are scraped into:
`/Users/gdoughty/Documents/Claude/OUTPUTS/Surgeon Research/all surgeon research/surgeons.db`

…run one command to push everything into Supabase:

```
npm run sync
```

The sync script:
- Reads every row from `surgeons.db`
- **Upserts** new/changed surgeons into Supabase (by NPI)
- **Deletes** providers that no longer exist in the source
- Diffs emails by (NPI, email) pair so duplicates aren't created
- Reports row counts before/after and a summary of changes

It's idempotent — running it twice in a row produces zero changes the second time. Safe to run any time new data lands.

### One-time setup before your first sync

The sync uses the Supabase **service role** key (the seed script doesn't, but sync needs it to bypass RLS and run DELETEs).

1. Open Supabase Dashboard → Project Settings → API
2. Find **service_role** key, click the eye icon to reveal
3. Open `.env.local` in your project root
4. Add this line (replace the placeholder):

```
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

That's it. From here on, `npm run sync` does everything.

### Sync from a different source file

If your research data lands somewhere else, point at it directly:

```
SOURCE_DB=/path/to/new-surgeons.db npm run sync
```

---

## When you push to Vercel

In Vercel project settings, add the same env vars from `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Do **not** add `SUPABASE_SERVICE_ROLE_KEY` to Vercel — it's only needed locally for the sync script.

---

## If something breaks

- Empty dashboard → not signed in. Sign in via the auth flow.
- "Failed to load" → check browser console; likely an env var typo in `.env.local`.
- Sync errors with "Missing credentials" → add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`.
- Need to start over → re-run `data/schema.sql` in the Supabase SQL Editor (drops + recreates), then `npm run sync`.

## Minor security note

Supabase flagged one optional setting: "Leaked Password Protection" is off. This checks new passwords against HaveIBeenPwned. Enable it in Authentication → Policies if you want. Not blocking.
