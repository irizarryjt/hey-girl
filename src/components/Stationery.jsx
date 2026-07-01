import { useState } from 'react'
import { STATIONERY_STATUSES, emptyStationeryItem } from '../lib/store.js'
import SaveButton from './SaveButton.jsx'

export default function Stationery({ stationery, setStationery }) {
  const [name, setName] = useState('')
  const items = stationery.items || []
  const sent = items.filter((i) => i.status === 'Sent' || i.status === 'Received').length

  const updateItem = (id, patch) =>
    setStationery({ items: items.map((i) => (i.id === id ? { ...i, ...patch } : i)) })
  const removeItem = (id) => setStationery({ items: items.filter((i) => i.id !== id) })
  const addItem = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setStationery({ items: [...items, emptyStationeryItem({ name: name.trim() })] })
    setName('')
  }

  return (
    <div className="panel">
      <p className="hint">Track every paper piece — save-the-dates, invitations, menus, thank-you cards and more — with status, quantity, vendor, and due dates.</p>
      <p className="guest-substat">{sent} of {items.length} ordered or done</p>

      <label className="gd-field full">
        <span>Invitation wording (draft)</span>
        <textarea rows="4" value={stationery.wording} onChange={(e) => setStationery({ wording: e.target.value })} placeholder="Together with their families, … request the pleasure of your company…" />
      </label>

      <form className="addguest" style={{ marginTop: '14px' }} onSubmit={addItem}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Add a piece (e.g. Table numbers)" />
        <button type="submit">Add</button>
      </form>

      <div className="events-list">
        {items.map((it) => (
          <div key={it.id} className="event-card">
            <div className="event-head">
              <input className="event-name" value={it.name} onChange={(e) => updateItem(it.id, { name: e.target.value })} placeholder="Piece name" />
              <button className="del small" onClick={() => { if (window.confirm(`Remove "${it.name || 'this piece'}"?`)) removeItem(it.id) }} title="Remove">×</button>
            </div>
            <div className="event-grid">
              <label className="gd-field"><span>Status</span>
                <select value={it.status} onChange={(e) => updateItem(it.id, { status: e.target.value })}>
                  {STATIONERY_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="gd-field"><span>Quantity</span>
                <input type="number" min="0" value={it.quantity} onChange={(e) => updateItem(it.id, { quantity: Number(e.target.value) || 0 })} />
              </label>
              <label className="gd-field"><span>Vendor</span>
                <input value={it.vendor} onChange={(e) => updateItem(it.id, { vendor: e.target.value })} placeholder="Source / shop" />
              </label>
              <label className="gd-field"><span>Order by</span>
                <input type="date" value={it.dueDate} onChange={(e) => updateItem(it.id, { dueDate: e.target.value })} />
              </label>
            </div>
            <label className="gd-field full"><span>Link</span>
              <input value={it.link} onChange={(e) => updateItem(it.id, { link: e.target.value })} placeholder="https://…" />
            </label>
            <label className="gd-field full"><span>Notes</span>
              <input value={it.notes} onChange={(e) => updateItem(it.id, { notes: e.target.value })} placeholder="Colors, paper, wording notes…" />
            </label>
            {it.link && /^https?:\/\//i.test(it.link) && (
              <a className="chat-link" href={it.link} target="_blank" rel="noreferrer">Open ↗</a>
            )}
            <div className="entry-save"><SaveButton /></div>
          </div>
        ))}
      </div>
    </div>
  )
}
