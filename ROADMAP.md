# Hey Girl — Update Roadmap (from July 2026 notes)

Ordering logic: verify what exists → cheap UI wins → self-contained features →
email infra (unlocks a whole cluster) → bridal party & guest-facing growth →
paid tier / image gen (needs billing first). Items marked **[?]** need clarification
(see Open Questions).

## Phase 0 — Quality checks (do first; everything builds on this)
- Test guest links end-to-end
- Test password reset flow works in production
- Confirm guests have separate passwords from couple access **[?]** (bullet may just be describing current behavior)
- Check CSV export works; define what columns/format it should produce
- Remove "Private" label from notes (all notes are private anyway)
- Verify guest chat scrolls up correctly on new messages

## Phase 1 — Quick UI polish (low risk, no backend, batch together)
**Home page:** fix wobbly "Justin & Julia" font (more formal serif); remove "your
wedding planning bestie"; ask-me-anything bubbles wrap into 2–3 columns on wide
screens; larger "Chat with Hey Girl!" button; friendlier description tone.
**Invitations:** remove Minted as the default fill-in.
**Vendors:** clearer description for the "add to vendor" option; link out to vendor
website / payment page.
**Calendar:** event icons deep-link to the specific event, not just the tab **[?]**.
**Chat:** decide fate of "return to site" button **[?]**.

## Phase 2 — Self-contained features (no new infrastructure)
- **Budget:** split a line item into payment phases (e.g., 50% at 30 days out,
  balance day-of) — multiple due dates per item, each showing on the calendar
- **Guests:** CSV import with a downloadable sample template (pairs with the
  Phase 0 export work — define one canonical format for both)
- **Guest list header:** checkbox/legend clarifying how invitations, thank-yous,
  RSVPs, and food restrictions are sent/collected
- **Decisions:** attach PDF/image with preview; "add to budget?" prompt when a
  decision has a cost
- **Day-of timeline & checklists:** role-specific versions (bride / groom /
  bridesmaids); live on the Bridal Party tab rather than home
- More timeline suggestions; out-of-sequence alerts covering all three: timeline
  task order, due dates/events landing after the wedding day, and budget payment
  phases out of order

## Phase 3 — Email infrastructure (one setup, unlocks a cluster)
Set up production SMTP (already required for Supabase password resets — see DEPLOY.md).
Then, in order:
- **Guest email verification / magic codes** (already in SPEC roadmap). This
  *replaces* the "email guests the wedding password" idea — same goal (guests
  don't ask the couple for access), but safer than emailing passwords, and it
  doubles as guest self-serve password reset. Compatibility: no conflict with the
  current name + self-chosen-password flow — ship codes as the primary path for
  guests with an email on file, keep the password flow as fallback for guests
  without one, then phase passwords out.
- Send day-of timelines/checklists to bridal party via email
- Email RSVP reminders (SMS later if worth the Twilio cost **[?]**)

## Phase 4 — Bridal party expansion (needs Phase 3 guest identity)
- Per-role info collection (e.g., pajama size for bridesmaids); bride defines the
  options/questions per role, members fill in their own
- Bridal party members edit their own info via verified guest login; explicit Save
- Keep **separate from RSVP** (your instinct is right — avoids revealing someone is
  a bridesmaid before they've been asked)
- Guests see only name + role; optional "shared description" later

## Phase 5 — Registry & guest website (competitive, guest-facing)
- **Registry builder:** guided setup (basics, price ranges, mix, furnishing a new
  home) — likely its own tab. Note: guest queries like "kitchen items under $100"
  require *structured registry items* (name, category, price, link), not just a
  registry URL — this is the real work here, and a prerequisite for guest registry Q&A.
- **Guest website:** grow the shared-details page into a landing page competing with
  Zola/The Knot; guest Hey Girl chat embedded at the bottom
- **PWA install:** Add-to-Home-Screen install prompt + polished icon ("local
  download") — the PWA already supports A2HS, so this is prompt UI + icon work

## Phase 6 — Paid tier & image gen (needs billing first)
Billing/plans is already a SPEC roadmap item (Sonnet free / Opus paid) — build it
once, gate both model tier and image features on it.
- **Try It Out! tab:** upload a photo, preview makeup/dress/venue with decorations;
  save a limited number of selected images
- Image generation API — compare providers (OpenAI vs. Gemini vs. others) on
  cost/quality for makeup/dress/venue edits before committing
- INSPO / design & vibes tab (save/generate idea photos)
- Registry ↔ Try It Out link: upload a photo, get item suggestions
- Link/equivalent of "Try It Out!" from the Invitations section

## Deferred / decide later
- Daily question or recommendation on home page
- Daily push notifications — needs the Web Push backend from SPEC (service worker
  subscription + VAPID + scheduler); SMS needs a provider + per-message cost
- Day-of alarms offer
- Revisit saving text-message conversation

## Open Questions (remaining)
1. **"Return to site button on chat"** — what's wrong with it today? Remove it,
   restyle it, or change where it goes?
2. **"Icon clickable to specific event"** — which icon, where? Calendar-tab event
   icons, or event mentions elsewhere (home page, chat)?
3. **"Couple provided password for access, then guest provided password per each
   guest entry"** — describing current behavior, or a desired change?
4. **"Clear directions on POST /api/guest/:token/rsvp"** — directions for whom?
   Developer docs, or user-facing error messages?

## Resolved (July 2026)
- **Guest entry flow shipped:** "Guest Login" on the landing nav + couple login
  screen → guest entry page (`/app/?guest=1`) accepting a pasted link or a short
  wedding code (shown on the Share tab, resolved via `GET /api/guest-code/:code`).
- **Bug found & fixed:** guest links pointed at `/`, which serves the static
  landing page — guests never reached the app. Links now point at `/app/`, and
  old links 302-redirect. (This was the likely root cause behind the Phase 0
  "check that guest links work" item.)
- "Local download" = PWA Add-to-Home-Screen install prompt (no app store).
- Out-of-sequence alerts should cover timeline order, dates past the wedding day,
  and budget payment order.
- Guest access: magic codes over emailed passwords (password flow kept as fallback).
- Image gen: compare providers before committing to OpenAI.
