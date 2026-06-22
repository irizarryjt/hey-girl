import { useEffect, useRef, useState } from 'react'
import { askHeyGirl } from '../lib/api.js'
import { showNotification } from '../lib/notify.js'

// Hey Girl may append a fenced block of suggested calendar dates:
//   ```heygirl:events
//   [{"date":"2026-08-01","title":"Book florist"}]
//   ```
// We pull those out, hide the raw block, and render one-tap "Add" buttons.
const EVENTS_RE = /```heygirl:events\s*([\s\S]*?)```/i

function extractEvents(text) {
  const match = text.match(EVENTS_RE)
  if (!match) return { clean: text, events: [] }
  let events = []
  try {
    const parsed = JSON.parse(match[1].trim())
    if (Array.isArray(parsed)) {
      events = parsed
        .filter((e) => e && e.date && e.title)
        .map((e) => ({ date: String(e.date), title: String(e.title) }))
    }
  } catch {}
  const clean = text.replace(EVENTS_RE, '').trim()
  return { clean, events }
}

// Render simple Markdown: **bold** as dark-rose <strong>, and [text](url) as
// clickable links (used for vendor websites Hey Girl references).
function richText(text) {
  const parts = String(text).split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g)
  return parts.map((part, i) => {
    const bold = part.match(/^\*\*([^*]+)\*\*$/)
    if (bold) return <strong key={i} className="b-strong">{bold[1]}</strong>
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (link && /^https?:\/\//i.test(link[2])) {
      return (
        <a key={i} className="chat-link" href={link[2]} target="_blank" rel="noreferrer">
          {link[1]}
        </a>
      )
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
  suggestions = [],
  intro,
  timelineOffer = false,
  notifyEnabled = false,
  onToggleNotify,
}) {
  const [messages, setMessages] = useState([{ role: 'assistant', content: intro, events: [] }])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [added, setAdded] = useState({})
  const [offerOpen, setOfferOpen] = useState(true)
  const scrollRef = useRef(null)
  const started = messages.length > 1

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, busy])

  async function send(text) {
    const content = (text ?? input).trim()
    if (!content || busy) return
    const next = [...messages, { role: 'user', content }]
    setMessages(next)
    setInput('')
    setBusy(true)
    try {
      // send only the real conversation (skip the canned intro)
      const history = next
        .filter((m, i) => !(i === 0 && m.role === 'assistant'))
        .map((m) => ({ role: m.role, content: m.content }))
      const { reply } = await askHeyGirl({ mode, messages: history, details, guestStats: stats, budget, events })
      const { clean, events: suggested } = extractEvents(reply)
      setMessages((m) => [...m, { role: 'assistant', content: clean, events: suggested }])
      // Push a local notification when Hey Girl returns timeline recommendations.
      if (notifyEnabled && suggested.length > 0) {
        const titles = suggested.map((e) => e.title).slice(0, 3).join(', ')
        showNotification(
          'Hey Girl mapped out your timeline 💍',
          `${suggested.length} date${suggested.length > 1 ? 's' : ''} to add: ${titles}${suggested.length > 3 ? '…' : ''}`
        )
      }
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', content: `Oof — ${e.message}`, events: [] }])
    } finally {
      setBusy(false)
    }
  }

  function add(key, ev) {
    onAddEvent?.(ev)
    setAdded((a) => ({ ...a, [key]: true }))
  }

  return (
    <div className="chat">
      <div className="chat-scroll" ref={scrollRef}>
        {messages.map((m, i) => {
          const prev = messages[i - 1]
          const next = messages[i + 1]
          const cont = prev && prev.role === m.role // continues a run from same sender
          const last = !(next && next.role === m.role) // last bubble in its run → gets the tail
          return (
          <div key={i} className={`msg-row ${cont ? 'tight' : ''}`}>
            <div className={`bubble ${m.role} ${cont ? 'cont' : ''} ${last ? '' : 'no-tail'}`}>{richText(m.content)}</div>
            {m.events && m.events.length > 0 && (
              <div className="ev-suggest">
                {m.events.map((ev, j) => {
                  const key = `${i}-${j}`
                  return (
                    <button
                      key={key}
                      className={`ev-chip ${added[key] ? 'done' : ''}`}
                      disabled={added[key]}
                      onClick={() => add(key, ev)}
                    >
                      {added[key] ? '✓ Added · ' : '📅 Add · '}
                      {ev.title}
                    </button>
                  )
                })}
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
              <button className="offer-yes" onClick={() => { setOfferOpen(false); send(TIMELINE_PROMPT) }}>
                Yes, recommend a timeline
              </button>
              <button className="offer-no" onClick={() => setOfferOpen(false)}>Not now</button>
            </div>
            <label className="notify-toggle">
              <input
                type="checkbox"
                checked={notifyEnabled}
                onChange={(e) => onToggleNotify?.(e.target.checked)}
              />
              <span>🔔 Notify me about timeline tasks</span>
            </label>
          </div>
        )}
        {busy && <div className="bubble assistant typing"><span/><span/><span/></div>}
      </div>

      {suggestions.length > 0 && messages.length <= 1 && (
        <div className="chips">
          {suggestions.map((s) => (
            <button key={s} className="chip" onClick={() => send(s)} disabled={busy}>{s}</button>
          ))}
        </div>
      )}

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
      >
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
