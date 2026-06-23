import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import Anthropic from '@anthropic-ai/sdk'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST_DIR = path.resolve(__dirname, '..', 'dist')

const PORT = process.env.PORT || 8787
const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6'
// Used automatically when the primary model is overloaded (529).
const FALLBACK_MODEL = process.env.FALLBACK_MODEL || 'claude-haiku-4-5-20251001'

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
    registryUrl: details.registryUrl,
    parking: details.parking,
    hotelBlock: details.hotelBlock,
    extraNotes: details.extraNotes,
  }
  return `You are "Hey Girl", a friendly wedding concierge answering questions from WEDDING GUESTS on behalf of the couple.
Answer warmly and briefly using ONLY the published wedding details below.
Rules:
- Never reveal or speculate about budget, private planning notes, vendor pricing, or the full guest list.
- If a guest asks about something not in the details, say you don't have that info yet and suggest they reach out to the couple directly.
- Do not collect personal data or make promises on the couple's behalf.

Published wedding details:
${JSON.stringify(publicDetails, null, 2)}`
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, hasKey: !!apiKey, model: MODEL })
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

    // Try the primary model; if it's overloaded (529/503), fall back to an
    // alternate model in a different capacity pool so the couple still gets a reply.
    let resp
    try {
      resp = await client.messages.create({ model: MODEL, max_tokens: 1024, system, messages: cleaned })
    } catch (primaryErr) {
      const s = primaryErr?.status || primaryErr?.statusCode
      if ((s === 529 || s === 503) && FALLBACK_MODEL && FALLBACK_MODEL !== MODEL) {
        console.warn(`Primary model ${MODEL} overloaded (${s}); falling back to ${FALLBACK_MODEL}.`)
        resp = await client.messages.create({ model: FALLBACK_MODEL, max_tokens: 1024, system, messages: cleaned })
      } else {
        throw primaryErr
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
