import { useState } from 'react'

// Tailored Hey Girl prompts, keyed by the decision label.
const PROMPTS = {
  'Wedding dress selected': 'Help me figure out wedding dress styles — ask me about my body type, venue, and the vibe I want, then suggest silhouettes, necklines, and what to ask at the bridal salon.',
  "Partner's attire / suit": "Help me decide on my partner's wedding attire — suit vs tux, color, and how to coordinate it with our formality and color palette.",
  'Hair stylist booked': 'What should I look for and ask when booking a wedding hair stylist, and when should I schedule a trial?',
  'Makeup artist booked': 'Help me choose a wedding makeup artist — what to ask, when to do a trial, and how to describe the look I want.',
  'Cake / dessert chosen': 'Help me plan our wedding cake and desserts — flavors, sizing for our guest count, and good questions for the baker.',
  'First dance song': 'Suggest first dance song ideas — ask about our music taste and the mood we want, then recommend a few and tips for choosing.',
  'Music — DJ or band': 'Help me decide between a DJ and a live band for our wedding, and what to ask when booking either.',
  'Officiant confirmed': 'What should we consider when choosing and confirming a wedding officiant, and what questions should we ask?',
  'Vows written': 'Help me write personal wedding vows — give me a structure and some brainstorming prompts to get started.',
  'Rings purchased': 'Help me shop for wedding rings — metals, styles, sizing, and budget considerations to weigh.',
  'Color palette / theme': 'Help me develop a wedding color scheme. Ask me about our season, venue, and the feel we want, then suggest a few palettes.',
  'Invitations & stationery': 'Help me plan our wedding invitations and stationery — wording, what to include, and the timeline for sending them.',
  'Honeymoon booked': 'Help us plan our honeymoon — ask about our budget, interests, and travel dates, then suggest some destinations.',
  'Transportation arranged': 'Help me plan wedding-day transportation for us and our guests — what to arrange and what to ask providers.',
  'Seating chart': 'Give me a method and tips for building our wedding seating chart, including how to handle tricky placements.',
  'Day-of timeline': 'Help me build a wedding day-of timeline — ask for our ceremony time and key moments, then draft a schedule.',
  'Weather / backup plan': 'Help me create a weather backup plan for our wedding based on our venue and season.',
  'Favors / welcome bags': 'Suggest wedding favor and welcome-bag ideas that fit our style and budget.',
}

function promptFor(d) {
  return d.prompt || PROMPTS[d.label] || `Help me with this wedding decision: "${d.label || 'this'}". What should I consider, and what questions should I be asking?`
}

export default function Decisions({ decisions, addDecision, updateDecision, removeDecision, addVendor, onGoToVendors, onAskHeyGirl }) {
  const [label, setLabel] = useState('')
  const doneCount = decisions.filter((d) => d.done).length

  function submit(e) {
    e.preventDefault()
    if (!label.trim()) return
    addDecision({ label: label.trim() })
    setLabel('')
  }

  // Convert a decision into a vendor (e.g. "Makeup artist" → a vendor record).
  function moveToVendor(d) {
    if (!window.confirm(`Move "${d.label || 'this item'}" to your Vendors list?\n\nIt will be removed from Decisions and added as a vendor (carrying over its link and notes).`)) return
    addVendor({ name: d.label, website: d.link || '', notes: d.notes || '', status: 'Researching' })
    removeDecision(d.id)
    onGoToVendors?.()
  }

  return (
    <div className="panel">
      <p className="hint">
        Track the choices that don't live in another tab — attire, beauty, music, and more. Check things off, drop
        in a link (to the dress, the makeup artist, a song…), and jot notes.
      </p>
      <p className="guest-substat">{doneCount} of {decisions.length} decided</p>

      <form className="addguest" onSubmit={submit}>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Add a decision (e.g. Guest book)" />
        <button type="submit">Add</button>
      </form>

      <ul className="decisions">
        {decisions.map((d) => (
          <li key={d.id} className={`decision ${d.done ? 'done' : ''}`}>
            <label className="decision-check">
              <input type="checkbox" checked={!!d.done} onChange={(e) => updateDecision(d.id, { done: e.target.checked })} />
              <input className="decision-label" value={d.label} onChange={(e) => updateDecision(d.id, { label: e.target.value })} placeholder="Decision" />
            </label>
            <div className="decision-fields">
              <input className="decision-link" value={d.link} onChange={(e) => updateDecision(d.id, { link: e.target.value })} placeholder="Link (https://…)" />
              {d.link && /^https?:\/\//i.test(d.link) && (
                <a className="chat-link" href={d.link} target="_blank" rel="noreferrer">Open ↗</a>
              )}
              <button type="button" className="to-vendor" onClick={() => moveToVendor(d)} title="Move to Vendors">→ Vendor</button>
              <button type="button" className="ask-hg" onClick={() => onAskHeyGirl?.(promptFor(d))} title="Ask Hey Girl for help with this">💬 Ask Hey Girl</button>
            </div>
            <input className="decision-notes" value={d.notes} onChange={(e) => updateDecision(d.id, { notes: e.target.value })} placeholder="Notes" />
            <button className="del" onClick={() => { if (window.confirm(`Remove "${d.label || 'this item'}"?`)) removeDecision(d.id) }} title="Remove">×</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
