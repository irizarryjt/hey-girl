import TabGuide from './TabGuide.jsx'

const PROMPTS = [
  'Help me build a day-of timeline',
  'Does the order of events on my calendar seem logical?',
  'What should I be focused on right now?',
  'Help me word our invitations',
  "What's left in my budget?",
]

export default function Home({ details, onAskHeyGirl }) {
  const names = details?.coupleNames || 'you two'
  return (
    <div className="panel home">
      <div className="home-hero">
        <h2>Congratulations, {names}! 💍</h2>
        <p>
          I'm <strong>Hey Girl</strong> — your always-on wedding planning bestie. I know your details,
          budget, calendar, guests, and events, so I can help you plan, stay organized, and answer
          questions day or night. Your guests can even ask me about the wedding through your share link.
        </p>
      </div>

      <h3 className="home-h">Ask me anything — here are a few ideas:</h3>
      <div className="home-prompts">
        {PROMPTS.map((p) => (
          <button key={p} className="home-prompt" onClick={() => onAskHeyGirl?.(p)}>
            💬 {p}
          </button>
        ))}
      </div>

      <h3 className="home-h">What's in each tab</h3>
      <div className="faq">
        <TabGuide />
      </div>
    </div>
  )
}
