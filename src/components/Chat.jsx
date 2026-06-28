import { useEffect, useRef, useState } from 'react'
import { askHeyGirl } from '../lib/api.js'
import { showNotification } from '../lib/notify.js'
import { extractFileText } from '../lib/extract.js'
import { icsForEvents, downloadICS, eventFilename } from '../lib/ics.js'

// Hey Girl may append fenced blocks of structured suggestions:
//   ```heygirl:events  [{"date":"2026-08-01","title":"Book florist"}]  ```
//   ```heygirl:budget  [{"category":"Catering","estimated":9000,...}]  ```
//   ```heygirl:invite  add  ```  (guest mode — show a calendar download button)
// We pull those out, hide the raw blocks, and render one-tap buttons.
const EVENTS_RE = /```heygirl:events\s*([\s\S]*?)```/i
const BUDGET_RE = /```heygirl:budget\s*([\s\S]*?)```/i
const INVITE_RE = /```heygirl:invite[\s\S]*?```/i

function parseBlock(text, re, map) {
  const match = text.match(re)
  let items = []
  if (match) {
    try {
      const parsed = JSON.parse(match[1].trim())
      if (Array.isArray(parsed)) items = parsed.map(map).filter(Boolean)
    } catch {}
  }
  return { items, clean: match ? text.replace(re, '') : text }
}

function parseReply(text) {
  let clean = String(text)
  const ev = parseBlock(clean, EVENTS_RE, (e) => (e && e.date && e.title ? { date: String(e.date), title: String(e.title) } : null))
  clean = ev.clean
  const bd = parseBlock(clean, BUDGET_RE, (b) =>
    b && (b.category || b.vendor)
      ? {
          category: String(b.category || b.vendor),
          vendor: b.vendor ? String(b.vendor) : '',
          estimated: Number(b.estimated) || 0,
          dueDate: b.dueDate ? String(b.dueDate) : '',
          website: b.website ? String(b.website) : '',
        }
      : null
  )
  clean = bd.clean
  const invite = INVITE_RE.test(clean)
  if (invite) clean = clean.replace(INVITE_RE, '')
  return { clean: clean.trim(), events: ev.items, budgetItems: bd.items, invite }
}

// Build the wedding-day event (for a guest's calendar download) from public details.
function weddingEvent(details = {}) {
  if (!details.date) return null
  const who = details.coupleNames ? `${details.coupleNames}'s Wedding` : 'The Wedding'
  const location = [details.venueName, details.venueAddress].filter(Boolean).join(', ')
  const notes = [details.time && `Ceremony time: ${details.time}`, details.dressCode && `Dress code: ${details.dressCode}`]
    .filter(Boolean)
    .join(' · ')
  return { id: 'wedding-day', title: who, date: details.date, location, notes }
}

// Render **bold** as dark-rose <strong> and [text](url) as clickable links.
function richText(text) {
  const parts = String(text).split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g)
  return parts.map((part, i) => {
    const bold = part.match(/^\*\*([^*]+)\*\*$/)
    if (bold) return <strong key={i} className="b-strong">{bold[1]}</strong>
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (link && /^https?:\/\//i.test(link[2])) {
      return <a key={i} className="chat-link" href={link[2]} target="_blank" rel="noreferrer">{link[1]}</a>
    }
    return <span key={i}>{part}</span>
  })
}

const TIMELINE_PROMPT =
  'Yes — please give me a recommended timeline with priorities for the months leading up to the wedding, and add the key milestone dates to my calendar.'

export default function Chat({
  mode,
  details,
  stats,
  budget,
  events,
  onAddEvent,
  onAddBudgetItem,
  suggestions = [],
  intro,
  timelineOffer = false,
  notifyEnabled = false,
  onToggleNotify,
}) {
  // The welcome stays as the first message at the very top of the thread (like a
  // text conversation); it scrolls up out of view as the chat grows. The full
  // welcome also lives permanently in the FAQ tab.
  const [messages, setMessages] = useState(
    intro ? [{ role: 'assistant', content: intro, events: [], budgetItems: [] }] : []
  )
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [added, setAdded] = useState({})
  const [offerOpen, setOfferOpen] = useState(true)
  const scrollRef = useRef(null)
  const fileRef = useRef(null)
  // "Started" = the couple has sent at least one message (works with or without intro).
  const started = messages.some((m) => m.role === 'user')

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, busy])

  // text = what we send to Hey Girl; display = what shows in the bubble (defaults to text)
  async function send(text, display) {
    const content = (text ?? input).trim()
    if (!content || busy) return
    const next = [...messages, { role: 'user', content, display }]
    setMessages(next)
    setInput('')
    setBusy(true)
    try {
      const history = next
        .filter((m, i) => !(i === 0 && m.role === 'assistant'))
        .map((m) => ({ role: m.role, content: m.content }))
      const { reply } = await askHeyGirl({ mode, messages: history, details, guestStats: stats, budget, events })
      const { clean, events: suggested, budgetItems, invite } = parseReply(reply)
      setMessages((m) => [...m, { role: 'assistant', content: clean, events: suggested, budgetItems, invite }])
      if (notifyEnabled && suggested.length > 0) {
        const titles = suggested.map((e) => e.title).slice(0, 3).join(', ')
        showNotification('Hey Girl mapped out your timeline 💍', `${suggested.length} date${suggested.length > 1 ? 's' : ''} to add: ${titles}`)
      }
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', content: `Oof — ${e.message}`, events: [], budgetItems: [] }])
    } finally {
      setBusy(false)
    }
  }

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-uploading the same file
    if (!file || busy) return
    setBusy(true)
    setMessages((m) => [...m, { role: 'user', content: '', display: `📎 Uploaded ${file.name}` }])
    let text
    try {
      text = await extractFileText(file)
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', content: `Oof — ${err.message}`, events: [], budgetItems: [] }])
      setBusy(false)
      return
    }
    setBusy(false)
    const prompt =
      `I uploaded a wedding document (${file.name}). Please extract the pertinent details — vendor, costs, payment due dates, and any package options — summarize them, and suggest budget line items and calendar dates I can add.\n\n--- DOCUMENT TEXT ---\n${text}`
    await send(prompt, `📎 Uploaded ${file.name}`)
  }

  function add(key, fn, payload) {
    fn?.(payload)
    setAdded((a) => ({ ...a, [key]: true }))
  }

  const money = (n) => `$${Math.round(Number(n) || 0).toLocaleString('en-US')}`

  return (
    <div className="chat">
      <div className="chat-scroll" ref={scrollRef}>
        {messages.map((m, i) => {
          const prev = messages[i - 1]
          const next = messages[i + 1]
          const cont = prev && prev.role === m.role
          const last = !(next && next.role === m.role)
          return (
            <div key={i} className={`msg-row ${cont ? 'tight' : ''}`}>
              <div className={`bubble ${m.role} ${cont ? 'cont' : ''} ${last ? '' : 'no-tail'}`}>
                {richText(m.display || m.content)}
              </div>
              {m.events && m.events.length > 0 && (
                <div className="ev-suggest">
                  {m.events.map((ev, j) => {
                    const key = `e${i}-${j}`
                    return (
                      <button key={key} className={`ev-chip ${added[key] ? 'done' : ''}`} disabled={added[key]} onClick={() => add(key, onAddEvent, ev)}>
                        {added[key] ? '✓ Added · ' : '📅 Add · '}{ev.title}
                      </button>
                    )
                  })}
                </div>
              )}
              {m.budgetItems && m.budgetItems.length > 0 && (
                <div className="ev-suggest">
                  {m.budgetItems.map((bi, j) => {
                    const key = `b${i}-${j}`
                    return (
                      <button key={key} className={`ev-chip budget ${added[key] ? 'done' : ''}`} disabled={added[key]} onClick={() => add(key, onAddBudgetItem, bi)}>
                        {added[key] ? '✓ Added · ' : '💰 Add to budget · '}{bi.category}{bi.estimated ? ` (${money(bi.estimated)})` : ''}
                      </button>
                    )
                  })}
                </div>
              )}
              {m.invite && weddingEvent(details) && (
                <div className="ev-suggest">
                  <button
                    className="ev-chip invite"
                    onClick={() => { const ev = weddingEvent(details); downloadICS(eventFilename(ev), icsForEvents(ev)) }}
                  >
                    📅 Add to your calendar
                  </button>
                </div>
              )}
            </div>
          )
        })}
        {timelineOffer && offerOpen && !started && !busy && (
          <div className="msg-row offer-row">
            <div className="bubble assistant">
              Want me to map out a <strong className="b-strong">timeline with priorities</strong> for the months
              ahead? I'll suggest the key milestones and you can drop them on your calendar with a tap.
            </div>
            <div className="offer-actions">
              <button className="offer-yes" onClick={() => { setOfferOpen(false); send(TIMELINE_PROMPT) }}>Yes, recommend a timeline</button>
              <button className="offer-no" onClick={() => setOfferOpen(false)}>Not now</button>
            </div>
            <label className="notify-toggle">
              <input type="checkbox" checked={notifyEnabled} onChange={(e) => onToggleNotify?.(e.target.checked)} />
              <span>🔔 Notify me about timeline tasks</span>
            </label>
          </div>
        )}
        {busy && <div className="bubble assistant typing"><span/><span/><span/></div>}
      </div>

      {suggestions.length > 0 && !started && (
        <div className="chips">
          {suggestions.map((s) => (
            <button key={s} className="chip" onClick={() => send(s)} disabled={busy}>{s}</button>
          ))}
        </div>
      )}

      {mode !== 'guest' && !started && (
        <div className="attach-hint">
          Tip: tap <span className="plus-pill">+</span> to attach a quote, contract, or invoice (PDF or Word) — I'll pull out the costs, due dates, and options.
        </div>
      )}

      <form className="composer" onSubmit={(e) => { e.preventDefault(); send() }}>
        {mode !== 'guest' && (
          <>
            <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,application/pdf" hidden onChange={handleFile} />
            <button
              type="button"
              className="attach-btn"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              title="Attach a quote, contract, or invoice (PDF or Word) for Hey Girl to read"
            >
              +
            </button>
          </>
        )}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={mode === 'guest' ? 'Ask about the wedding…' : 'Ask Hey Girl anything…'}
          disabled={busy}
        />
        <button type="submit" disabled={busy || !input.trim()}>Send</button>
      </form>
    </div>
  )
}
