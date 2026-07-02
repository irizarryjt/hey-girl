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

function daysUntil(str) {
  if (!str) return null
  const [y, m, d] = String(str).split('-').map(Number)
  if (!y || !m || !d) return null
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((new Date(y, m - 1, d) - today) / 86400000)
}

function prettyDate(str) {
  if (!str) return ''
  const [y, m, d] = String(str).split('-').map(Number)
  if (!y || !m || !d) return ''
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

export default function Home({ details, stats = {}, budget, onAskHeyGirl, onOpenChat }) {
  const names = details?.coupleNames || 'you two'
  const days = daysUntil(details?.date)
  const dateStr = prettyDate(details?.date)
  const bs = budgetStats(budget)

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

      <h3 className="home-h center">Ask me anything</h3>
      <div className="home-prompts">
        {PROMPTS.map((p) => (
          <button key={p} className="home-prompt" onClick={() => onAskHeyGirl?.(p)}>
            💬 {p}
          </button>
        ))}
      </div>

      <h3 className="home-h">What's in each tab</h3>
      <p className="hint">Tap any tab to see what it does.</p>
      <div className="home-guide faq">
        <TabGuide collapsible />
      </div>
    </div>
  )
}
