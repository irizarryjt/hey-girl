import { useState } from 'react'

export default function Decisions({ decisions, addDecision, updateDecision, removeDecision, addVendor, onGoToVendors }) {
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
            </div>
            <input className="decision-notes" value={d.notes} onChange={(e) => updateDecision(d.id, { notes: e.target.value })} placeholder="Notes" />
            <button className="del" onClick={() => { if (window.confirm(`Remove "${d.label || 'this item'}"?`)) removeDecision(d.id) }} title="Remove">×</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
