# Hey Girl 💍 — Wedding Planning PWA

Plan your wedding with **Hey Girl**, an AI planning bestie — and let guests ask her about the details instead of texting you.

## Features (v1)
- **Hey Girl chat** — couple-facing planning assistant with full context (details + guest stats).
- **Guest list / RSVP** — add guests, track yes/no/pending, party size, meals, private notes. Live summary counts.
- **Guest View** — a separate, locked-down Hey Girl persona for guests. Answers only from your *published* details; never exposes budget, notes, or the guest list.
- **Installable PWA** — add to home screen, offline app shell.

## Quick start
```bash
npm install
cp .env.example .env        # add your ANTHROPIC_API_KEY
npm run dev                 # Vite (5173) + proxy (8787) together
```
Open http://localhost:5173. No key yet? It runs in demo mode — the UI and guest list work; chat returns a friendly placeholder until you add a key.

## How the LLM is wired
The browser calls `/api/chat`, which Vite proxies to a small Express server (`server/index.js`). That server holds your `ANTHROPIC_API_KEY` and injects the right system prompt per mode (couple vs. guest). **The API key never reaches the browser** — that's the whole reason for the proxy.

## Project layout
```
server/index.js       Express proxy → Anthropic API (2 personas)
src/App.jsx           Tab shell (Chat / Guests / Details / Guest View)
src/components/       Chat, GuestList, Details
src/lib/store.js      localStorage state + guest stats
src/lib/api.js        fetch wrapper
vite.config.js        React + PWA + /api proxy
```

## Deploying
Run `npm run build` for the static frontend (`dist/`), and host `server/index.js` anywhere it can hold the env var (Render, Railway, Fly, a VPS). Point the frontend's `/api` at the server. See `SPEC.md` for the v2 roadmap (budget tracker, vendors, real DB + auth, shareable guest links).
