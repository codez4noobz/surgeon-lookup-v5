# Setup

## 1. Install dependencies

Open Terminal. Navigate to this folder, then run:

```
npm install
```

## 2. Set up Supabase

1. Go to supabase.com and create a free account
2. Create a new project
3. Go to Project Settings → API
4. Copy "Project URL" and "anon public" key

## 3. Add environment variables

Duplicate the file `.env.local.example` and rename the copy to `.env.local`.

Open `.env.local` and paste your Supabase values:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## 4. Create users in Supabase

In your Supabase dashboard, go to Authentication → Users → Add user.
Create accounts for anyone who needs access.

## 5. Run the app locally

```
npm run dev
```

Open http://localhost:3000 in your browser.

## 6. Deploy to Vercel

1. Push this folder to a GitHub repo
2. Go to vercel.com, import the repo
3. Add your environment variables (same as .env.local) in the Vercel project settings
4. Deploy

---

## What's using mock data right now

The surgeon list is coming from `lib/mock-data.ts`. When you're ready to connect real NPI data, that's the file to replace with a live database query.
