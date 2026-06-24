# Supabase setup for Hey Girl

This gives Hey Girl real accounts: a couple logs in and sees their own saved data
on any device, and guest links show only public info. Do these steps once; then I'll
wire the app code to it and we'll deploy.

## 1. Create the project

1. Go to https://supabase.com and sign up (Sign in with GitHub is easy).
2. Click **New project**.
   - Name: `hey-girl`
   - Database password: generate one and save it somewhere (you won't need it day-to-day).
   - Region: pick the closest to you.
3. Wait ~2 minutes for it to finish provisioning.

## 2. Create the database tables

1. In the left sidebar, open **SQL Editor** → **New query**.
2. Open the file `supabase/schema.sql` in this project, copy ALL of it, paste into the editor.
3. Click **Run**. You should see "Success. No rows returned."
   (This creates the `weddings` table and its security rules.)

## 3. Make testing easy (optional but recommended)

By default Supabase emails a confirmation link on sign-up. To skip that while testing:

1. Sidebar → **Authentication** → **Sign In / Providers** (or **Providers → Email**).
2. Turn **Confirm email** OFF. Save.
   (You can turn it back on before real launch.)

## 4. Copy your keys

Sidebar → **Project Settings** → **API**. You'll need three values:

- **Project URL** — e.g. `https://abcd1234.supabase.co`
- **anon / public key** — a long `eyJ...` string. Safe to expose in the browser.
- **service_role key** — another long `eyJ...` string. **SECRET** — server only, never share or commit.

## 5. Add the keys as environment variables

**Locally** — in `hey-girl/.env`, add (see `.env.example`):

```
VITE_SUPABASE_URL=https://YOURPROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...anon key...
SUPABASE_URL=https://YOURPROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...service_role key...
```

**On Render** — your service → **Environment** → add the same four keys (same values).
The `VITE_` ones are read at build time (browser); the other two are server secrets.

## Important safety notes

- The **anon key** is meant to be public — Row Level Security protects the data, so a
  logged-in user can only read/write their own wedding row.
- The **service_role key** bypasses security and must stay server-side only. It's used
  solely by the guest-link endpoint to return a whitelisted public subset. Never put it
  in a `VITE_` variable or commit it to git.
- `.env` is already gitignored, so your keys won't be pushed.

## What happens next

Once the project exists and the keys are in place, tell me — I'll add the login screen,
move the couple's saved data into Supabase (so it follows them across devices), and switch
the guest link to a secure share-token that serves guests only the public details. The app
keeps working in local-only mode until these keys are set, so adding this won't disrupt
the current site.
