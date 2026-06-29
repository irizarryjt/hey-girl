import { useState } from 'react'

// For the ceremony, these fields live on `details` (so they also show on the
// Details tab and to guests). Everything else lives on the wedding event itself.
const DETAIL_MAP = { date: 'date', time: 'time', venueName: 'venueName', venueAddress: 'venueAddress', dressCode: 'dressCode' }

export default function Events({ weddingEvents, addWeddingEvent, updateWeddingEvent, removeWeddingEvent, details, setDetails }) {
  const [name, setName] = useState('')

  function submit(e) {
    e.preventDefault()
    if (!name.trim()) return
    addWeddingEvent({ name: name.trim() })
    setName('')
  }

  const isCeremony = (ev) => ev.key === 'ceremony'
  const getVal = (ev, field) =>
    isCeremony(ev) && DETAIL_MAP[field] ? (details[DETAIL_MAP[field]] || '') : (ev[field] || '')
  const setVal = (ev, field, value) => {
    if (isCeremony(ev) && DETAIL_MAP[field]) setDetails({ ...details, [DETAIL_MAP[field]]: value })
    else updateWeddingEvent(ev.id, { [field]: value })
  }

  return (
    <div className="panel">
      <p className="hint">
        Plan each main event in detail — time, place, dress code, and notes. The <strong>Wedding Ceremony</strong>'s
        date, time, venue, and dress code are shared with the <strong>Details</strong> tab and your guests, so editing
        them here updates both.
      </p>

      <form className="addguest" onSubmit={submit}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Add an event (e.g. Bridal shower)" />
        <button type="submit">Add</button>
      </form>

      <div className="events-list">
        {weddingEvents.map((ev) => (
          <div key={ev.id} className="event-card">
            <div className="event-head">
              <input className="event-name" value={ev.name} onChange={(e) => updateWeddingEvent(ev.id, { name: e.target.value })} placeholder="Event name" />
              {isCeremony(ev) && <span className="badge alt">Shared with Details</span>}
              <button className="del small" onClick={() => { if (window.confirm(`Remove "${ev.name || 'this event'}"?`)) removeWeddingEvent(ev.id) }} title="Remove">×</button>
            </div>
            <div className="event-grid">
              <label className="gd-field"><span>Date</span><input type="date" value={getVal(ev, 'date')} onChange={(e) => setVal(ev, 'date', e.target.value)} /></label>
              <label className="gd-field"><span>Start time</span><input value={getVal(ev, 'time')} onChange={(e) => setVal(ev, 'time', e.target.value)} placeholder="e.g. 4:30 PM" /></label>
              <label className="gd-field"><span>End time</span><input value={ev.endTime} onChange={(e) => updateWeddingEvent(ev.id, { endTime: e.target.value })} placeholder="e.g. 11:00 PM" /></label>
              <label className="gd-field"><span>Dress code</span><input value={getVal(ev, 'dressCode')} onChange={(e) => setVal(ev, 'dressCode', e.target.value)} placeholder="e.g. Garden formal" /></label>
            </div>
            <label className="gd-field full"><span>Venue</span><input value={getVal(ev, 'venueName')} onChange={(e) => setVal(ev, 'venueName', e.target.value)} placeholder="Venue name" /></label>
            <label className="gd-field full"><span>Address</span><input value={getVal(ev, 'venueAddress')} onChange={(e) => setVal(ev, 'venueAddress', e.target.value)} placeholder="Street, city, state" /></label>
            <label className="gd-field full"><span>Notes</span><textarea rows="2" value={ev.notes} onChange={(e) => updateWeddingEvent(ev.id, { notes: e.target.value })} placeholder="Anything helpful about this event" /></label>
          </div>
        ))}
      </div>
    </div>
  )
}
