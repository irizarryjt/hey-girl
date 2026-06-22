import { useState } from 'react'
import { guestStats } from '../lib/store.js'

const RSVP = ['pending', 'yes', 'no']

export default function GuestList({ guests, addGuest, updateGuest, removeGuest }) {
  const [name, setName] = useState('')
  const [partySize, setPartySize] = useState(1)
  const stats = guestStats(guests)

  function submit(e) {
    e.preventDefault()
    if (!name.trim()) return
    addGuest({ name: name.trim(), partySize: Number(partySize) || 1 })
    setName('')
    setPartySize(1)
  }

  return (
    <div className="panel">
      <div className="stats">
        <Stat label="Invited" value={stats.invited} />
        <Stat label="Attending" value={stats.attending} tone="good" />
        <Stat label="Declined" value={stats.declined} tone="bad" />
        <Stat label="Pending" value={stats.pending} tone="warn" />
      </div>

      <form className="addguest" onSubmit={submit}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Guest name" />
        <input
          type="number"
          min="1"
          value={partySize}
          onChange={(e) => setPartySize(e.target.value)}
          title="Party size"
        />
        <button type="submit">Add</button>
      </form>

      <ul className="guests">
        {guests.map((g) => (
          <li key={g.id} className="guest">
            <div className="guest-main">
              <input
                className="guest-name"
                value={g.name}
                onChange={(e) => updateGuest(g.id, { name: e.target.value })}
              />
              <div className="guest-meta">
                <label>
                  Party
                  <input
                    type="number"
                    min="1"
                    value={g.partySize}
                    onChange={(e) => updateGuest(g.id, { partySize: Number(e.target.value) || 1 })}
                  />
                </label>
                <select value={g.rsvp} onChange={(e) => updateGuest(g.id, { rsvp: e.target.value })} className={`rsvp ${g.rsvp}`}>
                  {RSVP.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <input
                  className="meal"
                  value={g.meal}
                  placeholder="Meal"
                  onChange={(e) => updateGuest(g.id, { meal: e.target.value })}
                />
              </div>
            </div>
            <input
              className="guest-notes"
              value={g.notes}
              placeholder="Notes (private)"
              onChange={(e) => updateGuest(g.id, { notes: e.target.value })}
            />
            <button className="del" onClick={() => removeGuest(g.id)} title="Remove">×</button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Stat({ label, value, tone }) {
  return (
    <div className={`stat ${tone || ''}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}
