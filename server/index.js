import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
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

const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))

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

function guestSystem(details) {
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

  return `You are "Hey Girl", a friendly wedding concierge answering questions from WEDDING GUESTS on behalf of the couple.
Answer warmly and briefly using ONLY the published wedding details below.
Rules:
- Never reveal or speculate about budget, private planning notes, vendor pricing, or the full guest list.
- If a guest asks about something not in the details, say you don't have that info yet and suggest they reach out to the couple directly.
- Do not collect personal data or make promises on the couple's behalf.

REGISTRY:
- If hasRegistry is true and "registries" are listed, share them when a guest asks where the couple is registered; link each with Markdown using its name (or the URL if unnamed).
- If "prefersRegistryGifts" is present and true, you may gently let guests know the couple would especially love gifts from their registry. If "prefersRegistryGifts" is absent, do NOT comment on whether guests should stick to the registry.
- If hasRegistry is false: if a "registryMessage" is provided, share that message warmly when guests ask about gifts or a registry. If no message is provided, kindly say the couple isn't using a registry and suggest reaching out to them.

WEDDING SIZE: If "approxGuestCount" is present, you may share that approximate number when asked (phrase it loosely, e.g. "around that many guests"). If it is absent, do NOT reveal or guess how many guests are coming — say you don't have that to share and suggest asking the couple.

CALENDAR INVITE: When the guest asks about WHEN the wedding is (date or time) or WHERE it is (venue or location), answer normally, then — only if a wedding date is known — append a fenced code block in EXACTLY this format at the very end:
\`\`\`heygirl:invite
add
\`\`\`
This signals the app to show the guest a "Add to your calendar" download button. Include the block only for date/time/location questions, and never if there is no date in the details. Write your friendly reply first, then the block.

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
  return out
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, hasKey: !!apiKey, model: MODEL, modelChain: MODEL_CHAIN, guestSharing: !!sbAdmin })
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

app.post('/api/chat', async (req, res) => {
  try {
    const { mode = 'couple', messages = [], details = {}, guestStats = {}, budget = null, events = [] } = req.body || {}

    if (!client) {
      return res.status(200).json({
        reply:
          "Hey girl! I'm running in demo mode — no ANTHROPIC_API_KEY is set yet. " +
          "Add your key to a .env file (see .env.example) and restart to chat for real. " +
          "Meanwhile, the guest list and details all work.",
        demo: true,
      })
    }

    // Budget is couple-only context; guest mode never receives it.
    const system = mode === 'guest' ? guestSystem(details) : coupleSystem(details, guestStats, budget, events)

    const cleaned = messages
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && m.content)
      .map((m) => ({ role: m.role, content: String(m.content) }))

    // Try each model in the chain; if one is overloaded (529/503), fall through
    // to the next so the couple still gets a reply. Any other error stops here.
    let resp
    for (let i = 0; i < MODEL_CHAIN.length; i++) {
      const model = MODEL_CHAIN[i]
      try {
        resp = await client.messages.create({ model, max_tokens: 1024, system, messages: cleaned })
        break
      } catch (err) {
        const s = err?.status || err?.statusCode
        const hasNext = i < MODEL_CHAIN.length - 1
        if ((s === 529 || s === 503) && hasNext) {
          console.warn(`Model ${model} overloaded (${s}); falling back to ${MODEL_CHAIN[i + 1]}.`)
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
