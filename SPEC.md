# Hey Girl — Wedding Planning PWA

A progressive web app that helps couples plan their wedding with an LLM assistant named **Hey Girl**, and lets guests ask Hey Girl about wedding details instead of bugging the couple.

## v1 Scope

Three pillars:

1. **Hey Girl chat (couple mode)** — a conversational wedding-planning assistant. The couple can ask about timelines, budgets, etiquette, vendor questions, and brainstorming. Hey Girl has access to the wedding's details and guest list as context.
2. **Guest list / RSVP** — add, edit, and track guests with RSVP status (pending / yes / no), party size, meal choice, and notes. Summary counts at a glance.
3. **Guest Q&A mode** — a separate, read-only persona of Hey Girl that guests use to ask about wedding details (date, venue, time, dress code, registry, parking, hotel block, etc.). It answers only from the wedding's published details and never exposes private planning data.

## Architecture

```
Browser (React + Vite PWA)
   │  fetch /api/chat
   ▼
Express proxy (server/index.js)   ← holds ANTHROPIC_API_KEY
   │  Anthropic Messages API
   ▼
Claude
```

- **Frontend**: React + Vite, installable PWA (manifest + service worker for offline shell).
- **Backend**: a thin Express proxy whose only job is to keep the Anthropic API key server-side and inject the correct system prompt per mode (couple vs. guest). The browser never sees the key.
- **Storage (v1)**: wedding details and guest list persist in the browser via `localStorage` (no backend DB yet). Easy to swap for a real database in v2.

## Hey Girl personas

- **Couple mode**: warm, organized, proactive planning partner. Full context: wedding details + guest list + RSVP stats.
- **Guest mode**: friendly concierge. Context limited to the public wedding details object only. Explicitly instructed never to reveal private notes, budget, or full guest list, and to defer to the couple for anything not in the details.

## Data shapes

```js
weddingDetails = {
  coupleNames, date, time, venueName, venueAddress,
  dressCode, registryUrl, parking, hotelBlock, extraNotes
}

guest = { id, name, partySize, rsvp: 'pending'|'yes'|'no', meal, notes }
```

## Running it

```
npm install
cp .env.example .env   # add your ANTHROPIC_API_KEY
npm run dev            # starts Vite + proxy together
```

## Shipped since v1

Budget tracker (with per-item paid amounts and vendor websites Hey Girl can link), calendar/timeline with ICS export, shareable guest link, chat-to-calendar event suggestions, budget- and calendar-aware Hey Girl, timeline/priority recommendations, and on-device notification opt-in.

## Roadmap

### Scheduled push notifications (when the app is closed)
The current "Notify me about timeline tasks" toggle uses on-device Web Notifications — they fire while the app is open/installed, not when it's fully closed. True scheduled push requires:

1. A backend with persisted couples/accounts (so reminders survive across sessions and devices).
2. The Web Push protocol: register a service-worker `pushManager` subscription, store it server-side with VAPID keys.
3. A scheduler (cron/queue) that, ahead of each calendar milestone, sends a push to the subscription — e.g. "Tasting in 3 days" or "Final headcount due tomorrow."
4. iOS note: web push needs the PWA to be installed to the home screen (A2HS) to deliver.

This pairs naturally with the database + auth work below, since both need a real backend.

### Other ideas
Vendor manager (beyond budget links), real database + auth, per-wedding code for guest links, email/SMS RSVP reminders, and completed-event auto-archiving on the calendar.
