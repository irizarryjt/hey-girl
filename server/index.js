import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import crypto from 'node:crypto'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST_DIR = path.resolve(__dirname, '..', 'dist')

const PORT = process.env.PORT || 8787
const MODEL = process.env.CLAUDE_MODEL || 'claude-opus-4-8'
// Ordered fallback chain, tried in turn when a model is overloaded (529/503).
// Override with a comma-separated FALLBACK_MODELS list; FALLBACK_MODEL (legacy,
// single value) still works. Default: Opus → Sonnet → Haiku.
const FALLBACK_MODELS = (process.env.FALLBACK_MODELS || process.env.FALLBACK_MODEL ||
  'claude-sonnet-4-6,claude-haiku-4-5-20251001')
  .split(',').map((m) => m.trim()).filter(Boolean)
// Full chain (primary first), de-duped.
const MODEL_CHAIN = [MODEL, ...FALLBACK_MODELS].filter((m, i, a) => a.indexOf(m) === i)

// Guests use a cheaper default (Sonnet) since the guest chat is public; couples
// keep the primary model (Opus). Override with GUEST_MODEL.
const GUEST_MODEL = process.env.GUEST_MODEL || 'claude-sonnet-4-6'
const GUEST_CHAIN = [GUEST_MODEL, ...FALLBACK_MODELS].filter((m, i, a) => a.indexOf(m) === i)

// Require a signed-in account for couple chat (default on). Set to 'false' to disable.
const REQUIRE_COUPLE_LOGIN = process.env.REQUIRE_COUPLE_LOGIN !== 'false'

const app = express()
app.set('trust proxy', 1) // Render sits behind a proxy; trust X-Forwarded-For for req.ip
app.use(cors())
app.use(express.json({ limit: '1mb' }))

// --- Simple in-memory per-IP rate limiting -------------------------
// Fixed-window counter per IP. Good enough for a single instance (free tier);
// note it resets on restart and isn't shared across instances.
function makeLimiter({ limit, windowMs, message }) {
  const hits = new Map()
  return (req, res, next) => {
    const ip = req.ip || (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown'
    const now = Date.now()
    let e = hits.get(ip)
    if (!e || now > e.resetAt) { e = { count: 0, resetAt: now + windowMs }; hits.set(ip, e) }
    e.count++
    if (e.count > limit) {
      res.set('Retry-After', String(Math.ceil((e.resetAt - now) / 1000)))
      return res.status(429).json({ error: message || 'Too many requests — please slow down and try again in a moment.' })
    }
    if (hits.size > 5000) for (const [k, v] of hits) if (now > v.resetAt) hits.delete(k)
    next()
  }
}
const chatLimiter = makeLimiter({ limit: 30, windowMs: 60000, message: "Hey Girl's getting a lot of messages right now — give it a minute and try again. 💕" })
const accessLimiter = makeLimiter({ limit: 12, windowMs: 60000, message: 'Too many attempts — please wait a minute and try again.' })
const rsvpLimiter = makeLimiter({ limit: 20, windowMs: 60000, message: 'Too many RSVP attempts — please wait a minute and try again.' })

// --- Optional password gate ----------------------------------------
// If SITE_PASSWORD is set, the whole site (landing, app, and API) is locked
// behind a browser login prompt. Leave it unset for open access (e.g. local dev).
const SITE_PASSWORD = process.env.SITE_PASSWORD
const SITE_USER = process.env.SITE_USER || 'hey'
if (SITE_PASSWORD) {
  app.use((req, res, next) => {
    const header = req.headers.authorization || ''
    const [scheme, encoded] = header.split(' ')
    if (scheme === 'Basic' && encoded) {
      const [user, pass] = Buffer.from(encoded, 'base64').toString().split(':')
      if (user === SITE_USER && pass === SITE_PASSWORD) return next()
    }
    res.set('WWW-Authenticate', 'Basic realm="Hey Girl private preview"')
    return res.status(401).send('This site is in private preview. A password is required.')
  })
  console.log('🔒 Password gate is ON (SITE_PASSWORD set).')
}

const apiKey = process.env.ANTHROPIC_API_KEY
// maxRetries lets the SDK automatically retry transient connection drops
// (e.g. "Premature close"); timeout guards against a hung request.
const client = apiKey ? new Anthropic({ apiKey, maxRetries: 4, timeout: 60000 }) : null

// --- System prompts per persona ---------------------------------

function coupleSystem(details, guestStats, budget, events) {
  const money = (n) => `$${Math.round(Number(n) || 0).toLocaleString('en-US')}`
  const items = budget?.items || []
  const totalEstimated = items.reduce((n, it) => n + (Number(it.estimated) || 0), 0)
  const totalActual = items.reduce((n, it) => n + (Number(it.actual) || 0), 0)
  const totalPaid = items.reduce((n, it) => n + (Number(it.paidAmount) || 0), 0)

  const budgetLines = items
    .map((it) => {
      const estimated = Number(it.estimated) || 0
      const actual = Number(it.actual) || 0
      const paidAmount = Number(it.paidAmount) || 0
      const leftOfEstimate = estimated - actual
      const owe = Math.max(0, actual - paidAmount)
      const payStatus = actual > 0 && owe === 0 ? 'paid in full' : `${money(paidAmount)} paid, ${money(owe)} still owed`
      const web = it.website ? `; website: ${it.website}` : ''
      const due = it.dueDate ? `; payment due ${it.dueDate}` : ''
      return `- ${it.category}${it.vendor ? ` (${it.vendor})` : ''}: estimated ${money(estimated)}, actual ${money(actual)}, ${
        leftOfEstimate >= 0 ? `${money(leftOfEstimate)} left of estimate` : `${money(-leftOfEstimate)} OVER estimate`
      }; ${payStatus}${web}${due}`
    })
    .join('\n')

  const budgetSummary = budget
    ? `Total budget: ${money(budget.total)}
Estimated across all categories: ${money(totalEstimated)}
Actual spent so far: ${money(totalActual)} (paid: ${money(totalPaid)}, outstanding: ${money(totalActual - totalPaid)})
Remaining vs. total budget: ${money((budget.total || 0) - totalActual)}

Line items:
${budgetLines || '(none yet)'}`
    : '(no budget set up yet)'

  const today = new Date().toISOString().slice(0, 10)
  const calendarLines = (events || [])
    .filter((e) => e && e.date && e.title)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .map((e) => `- ${e.date}: ${e.title}${e.notes ? ` (${e.notes})` : ''}`)
    .join('\n')

  const calendarSummary = `Wedding day: ${details?.date || 'not set'}${details?.time ? ` at ${details.time}` : ''}
Other dates on the couple's calendar:
${calendarLines || '(none yet)'}`

  return `You are "Hey Girl", a warm, organized, and proactive wedding-planning assistant and bestie to the couple.
You help with timelines, budgets, etiquette, vendor questions, decor brainstorming, and keeping things on track.
Be encouraging and practical. Keep answers concise unless asked for detail.
When the couple asks ANY budget or money question, use the budget data below and give specific dollar figures, formatted consistently. Start with one short friendly sentence, then a compact labeled breakdown for the relevant line item(s) using this exact structure (one per line, the labels in **bold**):
**Estimated:** $X
**Spent:** $X
**Paid:** $X
**Still owed:** $X
"Still owed" = actual cost minus what's been paid, and it must always be included. If a line item has a payment due date, add a **Due:** line to its breakdown. If the question covers the whole wedding, give these four figures as totals across all items. After the breakdown, ALWAYS add a short line with 1–2 relevant follow-up suggestions or questions tied to what they asked (e.g. for flowers: "Want me to find florists in your range, or set a reminder for the $1,200 balance due Sept 5?"). Keep the whole reply tight.

When the couple asks about the GUEST LIST or RSVPs, answer in the same consistent style: one short sentence, then a compact breakdown with these **bold** labels — **Invited:**, **Attending:**, **Declined:**, **Pending:** (use the guest summary numbers) — and then a short line with 1–2 relevant follow-ups (e.g. "Want me to draft a nudge for the pending guests, or break this down by meal choice?").
When a budget line item includes a vendor website, reference it by linking the vendor name in Markdown (e.g. [The Rosewood Barn](https://...)) whenever you mention that vendor, suggest a payment, or answer a question about them, so the couple can click straight through. Only link websites that appear in the budget data.
Today's date is ${today}.

Here are the wedding details you know about:
${JSON.stringify(details, null, 2)}

Guest list summary:
${JSON.stringify(guestStats, null, 2)}

Budget:
${budgetSummary}

Calendar:
${calendarSummary}

CALENDAR SUGGESTIONS: When your reply recommends doing something by or on a specific date (a deadline, appointment, or milestone), help the couple save it. After your normal conversational reply, append a fenced code block in EXACTLY this format:
\`\`\`heygirl:events
[{"date":"YYYY-MM-DD","title":"Short title"}]
\`\`\`
Rules for this block: only include it when there is at least one concrete calendar date; use real ISO dates (resolve relative dates like "two weeks before the wedding" into an actual date); keep titles under ~6 words; you may include multiple events in the array; never include a date that's already on the calendar above. If your reply involves no specific date, do NOT include the block at all. Write your friendly reply first, then the block.

DOCUMENT EXTRACTION: When the couple shares the text of a document (a vendor quote, contract, proposal, or invoice) and asks you to extract details, read it carefully and pull out: the vendor/company name, prices and total cost, any payment due dates or deposit deadlines, and any package or option choices. Give a clear, concise summary of the key points (use the bold-label style for money where it fits). Then help them save what you found:
- For costs you can turn into budget line items, append a fenced block in EXACTLY this format:
\`\`\`heygirl:budget
[{"category":"Catering","vendor":"Bella Eats","estimated":9000,"dueDate":"YYYY-MM-DD","website":""}]
\`\`\`
Include "estimated" (the price), and "vendor"/"dueDate"/"website" only when the document states them; omit fields you don't know. You may list multiple items.
- For payment due dates or appointments from the document, also use the heygirl:events block described above.
Only use real values found in the document — never invent prices or dates.

If the couple asks something the data doesn't cover, say what you'd need to know and offer to help figure it out.`
}

function guestSystem(details, guestContext = null) {
  // Guests only ever see PUBLIC details. Never private notes/budget/full list.
  const publicDetails = {
    coupleNames: details.coupleNames,
    date: details.date,
    time: details.time,
    venueName: details.venueName,
    venueAddress: details.venueAddress,
    dressCode: details.dressCode,
    parking: details.parking,
    hotelBlock: details.hotelBlock,
    extraNotes: details.extraNotes,
  }
  // Registry (only the curated, opted-in fields reach here).
  const hasRegistry = details.hasRegistry !== false
  publicDetails.hasRegistry = hasRegistry
  if (hasRegistry) {
    if (Array.isArray(details.registries) && details.registries.length) publicDetails.registries = details.registries
    if (details.stickToRegistry !== undefined) publicDetails.prefersRegistryGifts = !!details.stickToRegistry
  } else {
    publicDetails.registryMessage = details.registryMessage || ''
  }
  if (details.approxSize !== undefined) publicDetails.approxGuestCount = details.approxSize
  if (Array.isArray(details.events) && details.events.length) publicDetails.events = details.events

  return `You are "Hey Girl", a friendly wedding concierge answering questions from WEDDING GUESTS on behalf of the couple.
Answer warmly and briefly using ONLY the published wedding details below.
Rules:
- Never reveal or speculate about budget, private planning notes, vendor pricing, or the full guest list.
- If a guest asks about something not in the details, say you don't have that info yet and suggest they reach out to the couple directly.
- Don't make promises on the couple's behalf. You may collect RSVP details (see RSVP below); don't ask for unrelated personal data.

REGISTRY:
- If hasRegistry is true and "registries" are listed, share them when a guest asks where the couple is registered; link each with Markdown using its name (or the URL if unnamed).
- If "prefersRegistryGifts" is present and true, you may gently let guests know the couple would especially love gifts from their registry. If "prefersRegistryGifts" is absent, do NOT comment on whether guests should stick to the registry.
- If hasRegistry is false: if a "registryMessage" is provided, share that message warmly when guests ask about gifts or a registry. If no message is provided, kindly say the couple isn't using a registry and suggest reaching out to them.

WEDDING SIZE: If "approxGuestCount" is present, you may share that approximate number when asked (phrase it loosely, e.g. "around that many guests"). If it is absent, do NOT reveal or guess how many guests are coming — say you don't have that to share and suggest asking the couple.

EVENTS: The "events" list describes the wedding events (name, date, time, venue, dress code, and whether each is kid-friendly). Use it to answer guest questions about the schedule, times, and dress code.

KID-FRIENDLY: If a guest asks whether an event (or the wedding) is kid-friendly, answer from each event's "kidFriendly" flag. If an event isn't marked kid-friendly, gently say it's intended to be adults-only or that they should check with the couple, rather than assuming.

WEATHER: If a guest asks about the weather for an event, do NOT give a forecast. If the event date is more than about two weeks away, you may describe the TYPICAL weather for that venue's location and time of year based on general knowledge (e.g. average temperatures, whether it tends to be rainy/dry), and you MUST clearly caveat that this is typical seasonal weather, not a forecast or prediction. If the event is within about two weeks, tell them a real forecast would be more reliable and suggest checking closer to the date.

CALENDAR INVITE: When the guest asks about WHEN the wedding is (date or time) or WHERE it is (venue or location), answer normally, then — only if a wedding date is known — append a fenced code block in EXACTLY this format at the very end:
\`\`\`heygirl:invite
add
\`\`\`
This signals the app to show the guest a "Add to your calendar" download button. Include the block only for date/time/location questions, and never if there is no date in the details. Write your friendly reply first, then the block.

RSVP: You can help this guest RSVP or update an existing RSVP. When they want to, collect: whether they're attending (yes or no), how many people are in their party (including themselves), meal preference, any dietary needs, and optionally an email or phone for the couple. When you have what they'd like to submit, append a fenced code block at the very end in EXACTLY this format:
\`\`\`heygirl:rsvp
{"attending":"yes","partySize":2,"meal":"Chicken","dietary":"","email":"","phone":"","notes":""}
\`\`\`
Only include fields you actually have; use "attending":"yes" or "no". The app shows the guest a confirmation card to review and submit, so do NOT claim the RSVP is saved — instead invite them to review and tap submit. Write your friendly reply first, then the block.${
    guestContext
      ? `\n\nABOUT THIS GUEST (already identified): ${JSON.stringify(guestContext)}. ${
          guestContext.hasRsvp
            ? "They have already RSVP'd — acknowledge their current response and ask if they'd like to edit it."
            : "They haven't RSVP'd yet — warmly offer to help them RSVP."
        }`
      : ''
  }

Published wedding details:
${JSON.stringify(publicDetails, null, 2)}`
}

// Supabase admin client (service role) — only used to serve guests a public
// subset of a wedding by its share token. Never expose this key to the browser.
const SB_URL = process.env.SUPABASE_URL
const SB_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const sbAdmin = SB_URL && SB_SERVICE_KEY ? createClient(SB_URL, SB_SERVICE_KEY, { auth: { persistSession: false } }) : null

const PUBLIC_DETAIL_KEYS = [
  'coupleNames', 'date', 'time', 'venueName', 'venueAddress',
  'dressCode', 'parking', 'hotelBlock', 'extraNotes',
]
function pickPublicDetails(d = {}) {
  const out = {}
  for (const k of PUBLIC_DETAIL_KEYS) if (d[k]) out[k] = d[k]
  return out
}

// Approximate number of people invited (primary guest + party members each).
function approxWeddingSize(state = {}) {
  const guests = Array.isArray(state.guests) ? state.guests : []
  let n = 0
  for (const g of guests) n += 1 + (Array.isArray(g.party) ? g.party.length : 0)
  return n
}

// Curated, privacy-respecting payload a guest is allowed to see. Registry links
// and the wedding size are only included when the couple has opted in.
function publicGuestPayload(state = {}) {
  const d = state.details || {}
  const out = pickPublicDetails(d)
  const hasRegistry = d.hasRegistry !== false
  out.hasRegistry = hasRegistry
  if (hasRegistry) {
    out.registries = (Array.isArray(d.registries) ? d.registries : [])
      .filter((r) => r && r.url)
      .map((r) => ({ name: r.name || '', url: r.url }))
    if (d.allowStickToRegistryInquiry) out.stickToRegistry = !!d.stickToRegistry
  } else {
    out.registryMessage = d.registryMessage || ''
  }
  if (d.allowSizeInquiry) out.approxSize = approxWeddingSize(state)

  // Main events (so guests can ask about times, dress code, kid-friendliness, weather).
  const wevents = Array.isArray(state.weddingEvents) ? state.weddingEvents : []
  out.events = wevents
    .map((e) => {
      const isCer = e.key === 'ceremony'
      return {
        name: e.name,
        date: isCer ? d.date : e.date,
        time: isCer ? d.time : e.time,
        venue: isCer ? d.venueName : e.venueName,
        dressCode: isCer ? d.dressCode : e.dressCode,
        kidFriendly: !!e.kidFriendly,
      }
    })
    .filter((e) => e.date || e.name)
  return out
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, hasKey: !!apiKey, model: MODEL, modelChain: MODEL_CHAIN, guestModel: GUEST_MODEL, guestModelChain: GUEST_CHAIN, guestSharing: !!sbAdmin })
})

// Public, read-only: returns ONLY whitelisted wedding details for a share token.
app.get('/api/guest/:token', async (req, res) => {
  if (!sbAdmin) return res.status(503).json({ error: 'Guest sharing isn’t set up yet.' })
  try {
    const { data, error } = await sbAdmin
      .from('weddings')
      .select('data')
      .eq('share_token', req.params.token)
      .maybeSingle()
    if (error) throw error
    if (!data) return res.status(404).json({ error: 'This guest link is invalid or has expired.' })
    res.json({ details: publicGuestPayload(data.data || {}) })
  } catch (err) {
    console.error('Guest fetch error:', err?.message || err)
    res.status(500).json({ error: 'Could not load the wedding info.' })
  }
})

// ---- Guest RSVP (open, name-matched, protected by a guest-chosen password) ----

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex')
  return { salt, hash }
}
function verifyPassword(password, access) {
  if (!access || !access.salt || !access.hash) return false
  const hash = crypto.scryptSync(String(password), access.salt, 64).toString('hex')
  const a = Buffer.from(hash, 'hex')
  const b = Buffer.from(access.hash, 'hex')
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

function newMemberRecord() {
  return { id: crypto.randomUUID(), name: '', email: '', phone: '', address: '', useForMailing: false, isChild: false, meal: '', dietary: '' }
}
function newGuestRecord(name) {
  return {
    id: crypto.randomUUID(), name, email: '', phone: '', address: '', useForMailing: true,
    rsvp: 'pending', meal: '', dietary: '', isChild: false, side: '', relationship: '', table: '',
    outOfTown: false, invitedTo: { ceremony: true, reception: true, rehearsal: false, welcome: false, brunch: false },
    saveTheDateSent: false, invitationSent: false, thankYouSent: false, giftReceived: false, gift: '',
    notes: '', party: [], selfReported: true,
  }
}

// Summary safe to return to a guest about their own record (never the password hash).
function guestSummary(g) {
  return {
    name: g.name || '',
    rsvp: g.rsvp || 'pending',
    partySize: 1 + (Array.isArray(g.party) ? g.party.length : 0),
    meal: g.meal || '',
    dietary: g.dietary || '',
    hasRsvp: (g.rsvp && g.rsvp !== 'pending') || !!g.rsvpSubmittedAt,
  }
}

function applyRsvp(g, rsvp = {}) {
  const att = String(rsvp.attending || '').toLowerCase()
  if (att === 'yes' || att === 'no' || att === 'pending') g.rsvp = att
  if (rsvp.meal !== undefined) g.meal = String(rsvp.meal || '')
  if (rsvp.dietary !== undefined) g.dietary = String(rsvp.dietary || '')
  if (rsvp.email !== undefined) g.email = String(rsvp.email || '')
  if (rsvp.phone !== undefined) g.phone = String(rsvp.phone || '')
  if (rsvp.notes !== undefined) g.notes = String(rsvp.notes || '')
  if (rsvp.partySize !== undefined) {
    const extra = Math.max(0, (Number(rsvp.partySize) || 1) - 1)
    const party = Array.isArray(g.party) ? g.party.slice(0, extra) : []
    while (party.length < extra) party.push(newMemberRecord())
    g.party = party
  }
  g.rsvpSubmittedAt = new Date().toISOString()
}

async function loadRowByToken(token) {
  const { data, error } = await sbAdmin.from('weddings').select('id, data').eq('share_token', token).maybeSingle()
  if (error) throw error
  return data
}
function findGuestByName(guests, name) {
  const key = String(name).trim().toLowerCase()
  return (guests || []).find((g) => String(g.name || '').trim().toLowerCase() === key)
}

// Identify the guest (by name) and set or verify their chosen password.
app.post('/api/guest/:token/access', accessLimiter, async (req, res) => {
  if (!sbAdmin) return res.status(503).json({ error: 'Guest sharing isn’t set up yet.' })
  try {
    const name = String(req.body?.name || '').trim()
    const password = String(req.body?.password || '')
    if (!name || password.length < 4) return res.status(400).json({ error: 'Please enter your name and a password of at least 4 characters.' })

    const row = await loadRowByToken(req.params.token)
    if (!row) return res.status(404).json({ error: 'This guest link is invalid or has expired.' })
    const data = row.data || {}
    const guests = Array.isArray(data.guests) ? data.guests : (data.guests = [])

    let g = findGuestByName(guests, name)
    let created = false
    if (g && g.access?.hash) {
      if (!verifyPassword(password, g.access)) {
        return res.status(401).json({ error: "That password doesn't match the one on file for this name. If you've been here before, use the same password you chose." })
      }
    } else if (g && !g.access) {
      g.access = hashPassword(password) // first time: claim an invited record
      await sbAdmin.from('weddings').update({ data, updated_at: new Date().toISOString() }).eq('id', row.id)
    } else {
      g = newGuestRecord(name)
      g.access = hashPassword(password)
      guests.push(g)
      created = true
      await sbAdmin.from('weddings').update({ data, updated_at: new Date().toISOString() }).eq('id', row.id)
    }
    res.json({ ok: true, created, guest: guestSummary(g) })
  } catch (err) {
    console.error('Guest access error:', err?.message || err)
    res.status(500).json({ error: 'Could not sign you in. Please try again.' })
  }
})

// Submit or edit an RSVP (re-verifies the guest's password).
app.post('/api/guest/:token/rsvp', rsvpLimiter, async (req, res) => {
  if (!sbAdmin) return res.status(503).json({ error: 'Guest sharing isn’t set up yet.' })
  try {
    const name = String(req.body?.name || '').trim()
    const password = String(req.body?.password || '')
    const rsvp = req.body?.rsvp || {}
    if (!name || !password) return res.status(400).json({ error: 'Missing name or password.' })

    const row = await loadRowByToken(req.params.token)
    if (!row) return res.status(404).json({ error: 'This guest link is invalid or has expired.' })
    const data = row.data || {}
    const guests = Array.isArray(data.guests) ? data.guests : []
    const g = findGuestByName(guests, name)
    if (!g || !verifyPassword(password, g.access)) {
      return res.status(401).json({ error: 'We couldn’t verify your access. Please re-enter your name and password.' })
    }
    applyRsvp(g, rsvp)
    await sbAdmin.from('weddings').update({ data, updated_at: new Date().toISOString() }).eq('id', row.id)
    res.json({ ok: true, guest: guestSummary(g) })
  } catch (err) {
    console.error('Guest RSVP error:', err?.message || err)
    res.status(500).json({ error: 'Could not save your RSVP. Please try again.' })
  }
})

app.post('/api/chat', chatLimiter, async (req, res) => {
  try {
    const { mode = 'couple', messages = [], details = {}, guestStats = {}, budget = null, events = [], guestContext = null } = req.body || {}

    if (!client) {
      return res.status(200).json({
        reply:
          "Hey girl! I'm running in demo mode — no ANTHROPIC_API_KEY is set yet. " +
          "Add your key to a .env file (see .env.example) and restart to chat for real. " +
          "Meanwhile, the guest list and details all work.",
        demo: true,
      })
    }

    // Couple chat requires a signed-in account (so it can't be called anonymously
    // once the site-wide SITE_PASSWORD gate is removed). Guests stay open.
    // Only enforced when Supabase auth is configured; toggle off with
    // REQUIRE_COUPLE_LOGIN=false.
    if (mode !== 'guest' && REQUIRE_COUPLE_LOGIN && sbAdmin) {
      const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim()
      if (!token) return res.status(401).json({ error: 'Please sign in to chat with Hey Girl.' })
      const { data: authData, error: authErr } = await sbAdmin.auth.getUser(token)
      if (authErr || !authData?.user) {
        return res.status(401).json({ error: 'Your session has expired — please sign in again.' })
      }
    }

    // Budget is couple-only context; guest mode never receives it.
    const system = mode === 'guest' ? guestSystem(details, guestContext) : coupleSystem(details, guestStats, budget, events)

    const cleaned = messages
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && m.content)
      .map((m) => ({ role: m.role, content: String(m.content) }))

    // Couples get the primary (Opus) chain; guests get the cheaper (Sonnet) chain.
    const chain = mode === 'guest' ? GUEST_CHAIN : MODEL_CHAIN
    // Try each model in the chain; if one is overloaded (529/503), fall through
    // to the next so the user still gets a reply. Any other error stops here.
    let resp
    for (let i = 0; i < chain.length; i++) {
      const model = chain[i]
      try {
        resp = await client.messages.create({ model, max_tokens: 1024, system, messages: cleaned })
        break
      } catch (err) {
        const s = err?.status || err?.statusCode
        const hasNext = i < chain.length - 1
        if ((s === 529 || s === 503) && hasNext) {
          console.warn(`Model ${model} overloaded (${s}); falling back to ${chain[i + 1]}.`)
          continue
        }
        throw err
      }
    }

    const reply = resp.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim()

    res.json({ reply })
  } catch (err) {
    const status = err?.status || err?.statusCode
    const detail = err?.error?.error?.message || err?.message || String(err)
    console.error('Chat error:', status || '', detail)
    let hint = 'Hey Girl hit a snag.'
    if (status === 401) hint = 'API key was rejected (401) — check ANTHROPIC_API_KEY on the server.'
    else if (status === 404) hint = `Model not found (404) — check CLAUDE_MODEL ("${MODEL}").`
    else if (status === 429) hint = 'Rate limited or out of credits (429) — add credits in the Anthropic console.'
    else if (status === 400) hint = `Bad request (400): ${detail}`
    else if (status === 529 || status === 503)
      hint = "Hey Girl's a little overwhelmed right now (the AI service is busy). Give it a moment and try again. 💕"
    res.status(status && status < 500 ? status : 503).json({ error: hint })
  }
})

// --- Serve the built front-end in production -----------------------
// In dev, Vite serves the UI on :5173 and proxies /api here. In production
// (e.g. on Render) this same server serves the built site from /dist.
const hasBuild = fs.existsSync(DIST_DIR)
if (hasBuild) {
  app.use(express.static(DIST_DIR))
  // The app is multi-page: '/' = landing, '/app/' = the React app. Static
  // serving handles both; this fallback covers any /app/* deep paths.
  app.get('/app/*', (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'app', 'index.html'))
  })
  app.get('/', (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(
    `Hey Girl server on http://localhost:${PORT} ` +
      `(key: ${apiKey ? 'set' : 'MISSING'}, frontend: ${hasBuild ? 'serving /dist' : 'dev mode — run Vite separately'})`
  )
})
