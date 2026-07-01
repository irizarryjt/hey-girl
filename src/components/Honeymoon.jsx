import { useState } from 'react'

export default function Honeymoon({ honeymoon, setHoneymoon }) {
  const [label, setLabel] = useState('')
  const checklist = honeymoon.checklist || []
  const doneCount = checklist.filter((c) => c.done).length

  const updateItem = (id, patch) =>
    setHoneymoon({ checklist: checklist.map((c) => (c.id === id ? { ...c, ...patch } : c)) })
  const removeItem = (id) => setHoneymoon({ checklist: checklist.filter((c) => c.id !== id) })
  const addItem = (e) => {
    e.preventDefault()
    if (!label.trim()) return
    setHoneymoon({ checklist: [...checklist, { id: crypto.randomUUID(), label: label.trim(), done: false }] })
    setLabel('')
  }

  return (
    <div className="panel">
      <p className="hint">Plan your getaway — where you're going, when, the budget, and a checklist to keep it on track.</p>

      <div className="form-grid">
        <label className="full"><span>Destination</span>
          <input value={honeymoon.destination} onChange={(e) => setHoneymoon({ destination: e.target.value })} placeholder="e.g. Amalfi Coast, Italy" />
        </label>
        <label><span>Start date</span>
          <input type="date" value={honeymoon.startDate} onChange={(e) => setHoneymoon({ startDate: e.target.value })} />
        </label>
        <label><span>End date</span>
          <input type="date" value={honeymoon.endDate} onChange={(e) => setHoneymoon({ endDate: e.target.value })} />
        </label>
        <label><span>Budget</span>
          <input type="number" min="0" value={honeymoon.budget} onChange={(e) => setHoneymoon({ budget: Number(e.target.value) || 0 })} placeholder="0" />
        </label>
        <label className="full"><span>Notes</span>
          <textarea rows="3" value={honeymoon.notes} onChange={(e) => setHoneymoon({ notes: e.target.value })} placeholder="Ideas, links, reservations…" />
        </label>
      </div>

      <h3 className="section-title" style={{ marginTop: '18px' }}>Checklist</h3>
      <p className="guest-substat">{doneCount} of {checklist.length} done</p>

      <form className="addguest" onSubmit={addItem}>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Add a to-do (e.g. Book excursions)" />
        <button type="submit">Add</button>
      </form>

      <ul className="decisions">
        {checklist.map((c) => (
          <li key={c.id} className={`decision ${c.done ? 'done' : ''}`}>
            <label className="decision-check">
              <input type="checkbox" checked={!!c.done} onChange={(e) => updateItem(c.id, { done: e.target.checked })} />
              <input className="decision-label" value={c.label} onChange={(e) => updateItem(c.id, { label: e.target.value })} placeholder="To-do" />
            </label>
            <button className="del" onClick={() => { if (window.confirm(`Remove "${c.label || 'this item'}"?`)) removeItem(c.id) }} title="Remove">×</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
