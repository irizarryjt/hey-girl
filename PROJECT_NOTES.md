# Hey Girl — Project Notes (handoff)

A wedding-planning PWA with an LLM assistant named **Hey Girl**. Couples plan via chat,
budget, calendar, and guest list; guests can ask Hey Girl about the wedding via a
shareable link. Built with React + Vite (frontend) and an Express server that proxies the
Claude API and serves the built site in production.

## How to run locally
```
cd ~/Documents/Projects/hey-girl
npm install
cp .env.example .env     # fill in keys (see below)
npm run dev              # Vite on :5173 + Express proxy on :8787
```
- Landing page: `/`  ·  App: `/app/`

## Architecture
- **Front door:** marketing landing page at `/` (root `index.html`). The React app lives
  at `/app/` (`app/index.html`). Multi-page Vite build (see `vite.config.js`).
- **Server:** `server/index.js` — Express. Holds the Claude API key, exposes `/api/chat`
  (couple + guest personas), `/api/guest/:token` (public subset for guest links),
  `/api/health`, and serves `/dist` in production. Has an optional password gate
  (`SITE_PASSWORD`) and a 529-overload fallback (primary → `FALLBACK_MODEL`).
- **State:** `src/lib/store.js` — Supabase-backed per user when configured, else
  localStorage. Whole app state stored as one JSON blob per wedding row.
- **Key files:** `src/App.jsx` (router: guest link → GuestApp; else CoupleApp with auth),
  components in `src/components/`, libs in `src/lib/`.

## Status (current)
- **Deployed on Render** via GitHub auto-deploy (`render.yaml` blueprint). Push to `main`
  → auto-deploys. Build: `npm install --include=dev && npm run build`; start: `npm start`.
- **Supabase live** — accounts work: a couple logs in and their data persists across
  devices (table `weddings`, RLS by `user_id`, plus table grants to `authenticated`).
  Schema in `supabase/schema.sql`; setup steps in `SUPABASE_SETUP.md`.
  Using the new **publishable** + **secret** API keys.
- **Private preview:** `SITE_PASSWORD` gate is ON. Note: while it's on, guest links are
  also gated — remove `SITE_PASSWORD` to let real guests in (go public).
- **Model:** default `claude-sonnet-4-6` (set via `CLAUDE_MODEL`). Haiku fallback on 529.

## Environment variables
- `ANTHROPIC_API_KEY` (server secret) — Claude API.
- `CLAUDE_MODEL` (default claude-sonnet-4-6), `FALLBACK_MODEL` (default haiku).
- `SITE_PASSWORD` (+ optional `SITE_USER`, default "hey") — private preview gate.
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — browser (publishable key). Build-time.
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — server (secret key) for guest endpoint.
- `.env` is gitignored; `.env.example` lists them all.

## Features built
- Hey Girl chat (couple mode) — knows details, budget, calendar, guest stats; renders
  **bold** in dark rose and Markdown links; serif (Georgia) reply bubbles, texting-style
  tails with grouping.
- Budget tab — line items with vendor + website, estimated/actual/**paid amount**/owe,
  and a **Due date** column. Hey Girl gives a consistent breakdown (Estimated/Spent/Paid/
  Still owed + Due) with follow-up suggestions.
- Calendar tab — wedding day (from Details) + your events + **budget due dates** auto-shown;
  countdowns; per-event and "download all" `.ics` export. Hey Girl can suggest dated
  events (one-tap add) via fenced `heygirl:events` blocks; budget items via `heygirl:budget`.
- Guests tab — RSVP tracking; Hey Girl answers in the same tidy breakdown style.
- Shared Details tab — structured partner first/last name fields; display name is
  **First & First**; powers headers, guest view, share link, landing save-the-date.
- Share tab — secure guest link via share token (`/?guest=1&w=<token>`); server returns
  only public details. Local fallback encodes public details in URL hash.
- Document upload (📎/+ in chat) — extract text from PDF/.docx (pdfjs + mammoth) so Hey
  Girl pulls out vendor, costs, due dates, options, with add-to-budget/calendar buttons.
- Notifications opt-in — on-device reminders for timeline tasks and budget balances due
  within 3 days.
- Auth (Supabase email/password), login screen, sign out, cross-device saved data.

## Roadmap (in SPEC.md)
- Scheduled push notifications (needs backend/accounts — partly there now).
- OCR for scanned documents / image uploads.
- Model tier by plan: Sonnet free / Opus paid (needs billing).
- Vendor manager, per-wedding guest codes, email/SMS RSVP reminders, calendar auto-archive.
- **Durable rate limiting before a wide public launch.** The per-IP limiter on
  `/api/chat`, `/api/guest/:token/access`, and `/rsvp` is in-memory, so it's
  per-instance and resets on restart — fine for the free single-instance setup and
  small tests, but move it to a shared store (e.g. Redis) or a managed WAF/edge
  rate limiter if scaling to multiple instances or opening up broadly.

## Guest RSVP — future hardening (before a large/public deploy)
The guest RSVP flow today is: open link → guest enters name + a self-chosen
password → name-match against the guest list (creates a `selfReported` record if
no match) → RSVP via a confirmation card. Couples can flag/review self-added
guests and reset a guest's password from the Guests tab. Things to add later:
- **Harden guest identity (the name-match weak link).** Anyone with the link can
  type any name, so a guest could claim someone else's name or self-add a fake
  one. Mitigated for now by couple review + low stakes. Before a large deployment,
  strengthen identity — the cleanest option is **email verification / magic code**
  (verify the email the guest provides; doubles as password-less login and
  password reset). This needs email-sending infra (the same SMTP you set up for
  password resets — see DEPLOY.md). Could also add per-guest invite codes.
- **Guest self-serve password reset.** Today only the couple can reset a guest's
  password (Guests tab → Reset password). Add a guest-facing reset, ideally via
  the verified email above, so guests aren't locked out if they forget.
- **Separate `rsvps` table.** RSVPs currently read-modify-write the single wedding
  JSON blob via the service-role server, which has a small clobber window if the
  couple edits at the same instant. For higher RSVP volume, move RSVPs to their own
  Supabase table (anon insert, no read) and reconcile into the guest list — removes
  blob contention and is the cleaner long-term shape.

## Scheduled tasks (in the Claude app, not the codebase)
- A check-in was scheduled re: keeping the landing page as the front door.
- Deploy-help reminder. (These live in the app's Scheduled section.)

## Deploying updates
Push to GitHub → Render auto-deploys:
```
git add -A && git commit -m "..." && git push
```
Render env changes redeploy automatically. `VITE_*` are build-time (need a rebuild);
the others are read at runtime.
