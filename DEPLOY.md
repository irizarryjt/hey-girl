# Deploying Hey Girl to Render (via GitHub)

One Render web service runs everything: the landing page (`/`), the app (`/app/`),
and the Claude proxy (`/api`). Your `ANTHROPIC_API_KEY` lives only on the server.

## 1. Put the code on GitHub

From the project folder (`~/Documents/Projects/hey-girl`):

```
git init                       # if not already a repo
git add -A
git commit -m "Deploy: Hey Girl"
```

Create a new **empty** repo on github.com (no README/license), then:

```
git remote add origin https://github.com/<your-username>/hey-girl.git
git branch -M main
git push -u origin main
```

Confirm `.env` is NOT on GitHub (it's gitignored): your repo should show
`.env.example` but never `.env`.

## 2. Create the Render service

1. Go to https://render.com and sign up (free) — "Sign in with GitHub" is easiest.
2. Click **New + → Blueprint**, pick your `hey-girl` repo. Render reads `render.yaml`
   and proposes a web service named `hey-girl`. Click **Apply**.
   - (No Blueprint? Use **New + → Web Service** instead, then set:
     Build Command `npm install --include=dev && npm run build`,
     Start Command `npm start`.)
3. When prompted for environment variables, set **ANTHROPIC_API_KEY** to your real key.
   (`CLAUDE_MODEL` and `NODE_VERSION` are already set by the blueprint.)
4. Click **Create / Deploy**. First build takes a few minutes.

## 3. Verify

When the deploy finishes, Render gives you a URL like `https://hey-girl.onrender.com`.

- `/` → landing page
- `/app/` → the planner
- `/api/health` → should return `{"ok":true,"hasKey":true,...}` (hasKey:true confirms your key loaded)

## 4. Updating later

Just push to GitHub — Render auto-deploys every push to `main`:

```
git add -A && git commit -m "Update X" && git push
```

## Password reset (Supabase config)

The login screen offers a "Email me a password reset link" button after a failed
sign-in, and shows a "Set a new password" screen when the user returns via that
link. For this to work in production, configure Supabase:

1. **Allowed redirect URL.** In the Supabase dashboard → **Authentication → URL
   Configuration**, add your app's reset return URL to **Redirect URLs**:
   `https://<your-render-url>/app/` (and your custom domain's `/app/` if you add one).
   The reset link bounces if this isn't allowed.
2. **Email sending.** Supabase's built-in email works for testing but is rate-limited.
   For production, set up SMTP under **Authentication → Emails / SMTP** so reset
   (and signup-confirmation) emails actually deliver.
3. The link itself is sent by `resetPassword()` in `src/lib/auth.js` with
   `redirectTo` set to `${location.origin}/app/` — no code change needed when the
   domain changes, but the URL above must be on Supabase's allow-list.

## Notes

- **Free tier sleeps.** After ~15 min idle the service spins down; the next visit
  takes ~30–60s to wake. Fine for testing; upgrade to a paid instance for always-on.
- **Custom domain (optional).** In the service's **Settings → Custom Domains**, add your
  domain and follow Render's DNS instructions. No code changes needed.
- **Taking it down.** You can suspend or delete the service in Render anytime (see below).
