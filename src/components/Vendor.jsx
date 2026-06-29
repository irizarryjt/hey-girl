import { useState } from 'react'
import { VENDOR_STATUSES } from '../lib/store.js'

const money = (n) => `$${Math.round(Number(n) || 0).toLocaleString('en-US')}`
const norm = (s) => String(s || '').trim().toLowerCase()

export default function Vendor({ vendors, addVendor, updateVendor, removeVendor, addDecision, onGoToDecisions, budget, events }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('')
  const items = budget?.items || []

  function submit(e) {
    e.preventDefault()
    if (!name.trim()) return
    addVendor({ name: name.trim(), type: type.trim() })
    setName('')
    setType('')
  }

  // Send a vendor back to the Decisions list.
  function moveToDecision(v) {
    if (!window.confirm(`Move "${v.name || 'this vendor'}" back to your Decisions list?\n\nIt will be removed from Vendors and added as a decision (carrying over its website and notes).`)) return
    addDecision({ label: v.name, link: v.website || '', notes: v.notes || '' })
    removeVendor(v.id)
    onGoToDecisions?.()
  }

  // Vendor names that appear in the budget but aren't in the vendor list yet.
  const known = new Set(vendors.map((v) => norm(v.name)))
  const importable = items
    .filter((it) => it.vendor && !known.has(norm(it.vendor)))
    .reduce((acc, it) => {
      const k = norm(it.vendor)
      if (!acc.some((x) => norm(x.name) === k)) acc.push({ name: it.vendor, type: it.category || '', website: it.website || '' })
      return acc
    }, [])

  function importFromBudget() {
    importable.forEach((v) => addVendor({ name: v.name, type: v.type, website: v.website, status: 'Booked' }))
  }

  // Budget cost summary for a vendor (sums matching line items by name).
  function budgetFor(v) {
    const matched = items.filter((it) => norm(it.vendor) === norm(v.name) && norm(v.name))
    if (!matched.length) return null
    const estimated = matched.reduce((n, it) => n + (Number(it.estimated) || 0), 0)
    const actual = matched.reduce((n, it) => n + (Number(it.actual) || 0), 0)
    const paid = matched.reduce((n, it) => n + (Number(it.paidAmount) || 0), 0)
    const due = matched.map((it) => it.dueDate).filter(Boolean).sort()[0] || ''
    return { estimated, actual, paid, owe: Math.max(0, actual - paid), due, count: matched.length }
  }

  // Calendar events that mention the vendor by name.
  function eventsFor(v) {
    const key = norm(v.name)
    if (key.length < 3) return []
    return (events || [])
      .filter((e) => e && e.date && norm(`${e.title} ${e.notes}`).includes(key))
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
  }

  return (
    <div className="panel">
      <p className="hint">
        Your vendors in one place. Cost details and due dates stay in the <strong>Budget</strong> tab and dates in the
        <strong> Calendar</strong> — this tab links to them and holds contact info.
      </p>

      <form className="addguest" onSubmit={submit}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Vendor name" />
        <input value={type} onChange={(e) => setType(e.target.value)} placeholder="Type (e.g. Florist)" />
        <button type="submit">Add</button>
      </form>

      {importable.length > 0 && (
        <button className="add-member" style={{ marginBottom: '12px' }} onClick={importFromBudget}>
          + Import {importable.length} vendor{importable.length > 1 ? 's' : ''} from Budget
        </button>
      )}

      <ul className="guests">
        {vendors.length === 0 && <p className="hint">No vendors yet. Add one above, or import from your budget.</p>}
        {vendors.map((v) => {
          const b = budgetFor(v)
          const evs = eventsFor(v)
          return (
            <li key={v.id} className="guest">
              <div className="guest-main">
                <input className="guest-name" value={v.name} onChange={(e) => updateVendor(v.id, { name: e.target.value })} placeholder="Vendor name" />
                <div className="guest-meta">
                  <input className="meal" value={v.type} onChange={(e) => updateVendor(v.id, { type: e.target.value })} placeholder="Type" />
                  <select className="rsvp" value={v.status} onChange={(e) => updateVendor(v.id, { status: e.target.value })}>
                    {VENDOR_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="guest-details" style={{ borderTop: 'none', paddingTop: '4px' }}>
                <div className="row3">
                  <label className="gd-field"><span>Phone</span><input value={v.phone} onChange={(e) => updateVendor(v.id, { phone: e.target.value })} placeholder="(555) 123-4567" /></label>
                  <label className="gd-field"><span>Email</span><input value={v.email} onChange={(e) => updateVendor(v.id, { email: e.target.value })} placeholder="email@example.com" /></label>
                  <label className="gd-field"><span>Contact</span><input value={v.contact} onChange={(e) => updateVendor(v.id, { contact: e.target.value })} placeholder="Name" /></label>
                </div>
                <label className="gd-field full"><span>Website</span><input value={v.website} onChange={(e) => updateVendor(v.id, { website: e.target.value })} placeholder="https://…" /></label>
                <label className="gd-field full"><span>Notes</span><input value={v.notes} onChange={(e) => updateVendor(v.id, { notes: e.target.value })} placeholder="Notes" /></label>

                {b && (
                  <div className="vendor-link">
                    <span className="detail-label">From Budget</span>
                    <span>Estimated {money(b.estimated)} · Actual {money(b.actual)} · Paid {money(b.paid)} · Owe {money(b.owe)}{b.due ? ` · Due ${b.due}` : ''}</span>
                  </div>
                )}
                {evs.length > 0 && (
                  <div className="vendor-link">
                    <span className="detail-label">On the Calendar</span>
                    <span>{evs.map((e) => `${e.date} — ${e.title}`).join(' · ')}</span>
                  </div>
                )}
                <div className="vendor-actions">
                  {v.website && /^https?:\/\//i.test(v.website) && (
                    <a className="chat-link" href={v.website} target="_blank" rel="noreferrer">Visit website ↗</a>
                  )}
                  <button type="button" className="to-decision" onClick={() => moveToDecision(v)} title="Move back to Decisions">→ Decision</button>
                </div>
              </div>

              <button className="del" onClick={() => { if (window.confirm(`Remove ${v.name || 'this vendor'}?`)) removeVendor(v.id) }} title="Remove">×</button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
