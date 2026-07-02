import TabGuide from './TabGuide.jsx'

const PROMPTS = [
  'Help me build a day-of timeline',
  'Does the order of events on my calendar seem logical?',
  'What should I be focused on right now?',
  'Help me word our invitations',
  "What's left in my budget?",
]

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

export default function Home({ details, onAskHeyGirl }) {
  const names = details?.coupleNames || 'you two'
  const days = daysUntil(details?.date)
  const dateStr = prettyDate(details?.date)

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

        <p>
          I'm <strong>Hey Girl</strong> — your always-on wedding planning bestie. I know your details,
          budget, calendar, guests, and events, so I can help you plan, stay organized, and answer
          questions day or night.
        </p>
      </div>

      <h3 className="home-h">Ask me anything — here are a few ideas</h3>
      <div className="home-prompts">
        {PROMPTS.map((p) => (
          <button key={p} className="home-prompt" onClick={() => onAskHeyGirl?.(p)}>
            💬 {p}
          </button>
        ))}
      </div>

      <h3 className="home-h">What's in each tab</h3>
      <p className="hint">Tap any tab to see what it does.</p>
      <div className="faq">
        <TabGuide collapsible />
      </div>
    </div>
  )
}
