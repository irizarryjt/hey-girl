import TabGuide from './TabGuide.jsx'
import { budgetStats } from '../lib/store.js'

const PROMPTS = [
  'Help me build a day-of timeline',
  'Does the order of events on my calendar seem logical?',
  'What should I be focused on right now?',
  'Help me word our invitations',
  "What's left in my budget?",
]

const money = (n) => `$${Math.round(Number(n) || 0).toLocaleString('en-US')}`

function parseDate(str) {
  if (!str) return null
  const [y, m, d] = String(str).split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}
function startOfToday() {
  const n = new Date()
  return new Date(n.getFullYear(), n.getMonth(), n.getDate())
}
function daysUntil(str) {
  const d = parseDate(str)
  return d ? Math.round((d - startOfToday()) / 86400000) : null
}
function relDays(str) {
  const d = daysUntil(str)
  if (d === 0) return 'today'
  if (d === 1) return 'tomorrow'
  if (d > 1) return `in ${d} days`
  return ''
}
function prettyDate(str) {
  const d = parseDate(str)
  return d ? d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : ''
}
function seasonOf(str) {
  const m = Number(String(str).split('-')[1])
  if (!m) return null
  if (m === 12 || m <= 2) return { label: 'A winter wedding', emoji: '❄️' }
  if (m <= 5) return { label: 'A spring wedding', emoji: '🌸' }
  if (m <= 8) return { label: 'A summer wedding', emoji: '☀️' }
  return { label: 'A fall wedding', emoji: '🍂' }
}

// The next upcoming dated item across events, wedding events, and budget due dates.
function nextMilestone(details, events, weddingEvents, budget) {
  const today = startOfToday()
  const items = []
  ;(events || []).forEach((e) => e.date && items.push({ date: e.date, title: e.title }))
  ;(weddingEvents || []).forEach((e) => {
    const date = e.key === 'ceremony' ? details?.date : e.date
    if (date) items.push({ date, title: e.name })
  })
  ;(budget?.items || []).forEach((it) => it.dueDate && items.push({ date: it.dueDate, title: `${it.category} payment due` }))
  const future = items.filter((i) => { const d = parseDate(i.date); return d && d >= today }).sort((a, b) => a.date.localeCompare(b.date))
  return future[0] || null
}

export default function Home({ details, stats = {}, budget, events, weddingEvents, decisions = [], onAskHeyGirl, onOpenChat, onOpenTab }) {
  const names = details?.coupleNames || 'you two'
  const days = daysUntil(details?.date)
  const dateStr = prettyDate(details?.date)
  const season = seasonOf(details?.date)
  const bs = budgetStats(budget)
  const nextUp = nextMilestone(details, events, weddingEvents, budget)
  const decisionsLeft = decisions.filter((d) => !d.done).length

  const nudges = []
  if (stats.pending > 0) nudges.push({ text: `${stats.pending} guest${stats.pending === 1 ? '' : 's'} still awaiting RSVP`, tab: 'guests' })
  if (bs.remaining < 0) nudges.push({ text: `You're ${money(Math.abs(bs.remaining))} over budget`, tab: 'budget' })
  if (decisionsLeft > 0) nudges.push({ text: `${decisionsLeft} decision${decisionsLeft === 1 ? '' : 's'} still to make`, tab: 'decisions' })

  return (
    <div className="panel home">
      <div className="home-hero">
        <span className="home-eyebrow">💕 Your wedding planning bestie</span>
        <h2>Congratulations, {names}!</h2>

        {days !== null && (
          <div className="home-count">
            {days > 0 ? (
              <>
                <span className="home-count-num">{days}</span>
                <span className="home-count-label">day{days === 1 ? '' : 's'} to go</span>
              </>
            ) : days === 0 ? (
              <span className="home-count-num sm">It's today! 🎉</span>
            ) : (
              <span className="home-count-num sm">Congrats, you're married! 💕</span>
            )}
          </div>
        )}
        {dateStr && <div className="home-date">{dateStr}</div>}
        {season && <div className="home-season">{season.emoji} {season.label} — how lovely!</div>}

        <button className="home-chat-btn" onClick={() => onOpenChat?.()}>💬 Chat with Hey Girl!</button>

        <p>
          I'm <strong>Hey Girl</strong> — your always-on wedding planning bestie. I know your details,
          budget, calendar, guests, and events, so I can help you plan, stay organized, and answer
          questions day or night.
        </p>
      </div>

      <div className="home-glance">
        <div className="glance"><span className="glance-num">{stats.attending || 0}</span><span className="glance-label">attending</span></div>
        <div className="glance"><span className="glance-num">{stats.pending || 0}</span><span className="glance-label">awaiting RSVP</span></div>
        <div className="glance"><span className={`glance-num ${bs.remaining < 0 ? 'bad' : ''}`}>{money(Math.abs(bs.remaining))}</span><span className="glance-label">{bs.remaining < 0 ? 'over budget' : 'budget left'}</span></div>
      </div>

      {nextUp && (
        <button className="home-next" onClick={() => onOpenTab?.('calendar')}>
          📅 <strong>Next up:</strong> {nextUp.title} — {relDays(nextUp.date)}
        </button>
      )}

      {nudges.length > 0 && (
        <div className="home-nudges">
          <div className="home-nudge-title">A few things to look at</div>
          {nudges.map((n) => (
            <button key={n.tab} className="home-nudge" onClick={() => onOpenTab?.(n.tab)}>{n.text} →</button>
          ))}
        </div>
      )}

      <h3 className="home-h center">Ask me anything</h3>
      <div className="home-prompts">
        {PROMPTS.map((p) => (
          <button key={p} className="home-prompt" onClick={() => onAskHeyGirl?.(p)}>💬 {p}</button>
        ))}
      </div>

      <div className="home-links">
        <button className="home-link" onClick={() => onOpenTab?.('guestmode')}>👀 Preview guest view</button>
      </div>

      <h3 className="home-h">What's in each tab</h3>
      <p className="hint">Tap any tab to see what it does.</p>
      <div className="home-guide faq">
        <TabGuide collapsible />
      </div>
    </div>
  )
}
