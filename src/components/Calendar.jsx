import { useState } from 'react'
import { icsForEvents, downloadICS, eventFilename } from '../lib/ics.js'

// Parse an ISO date (YYYY-MM-DD) as a local date, avoiding timezone drift.
function parseDate(str) {
  if (!str) return null
  const [y, m, d] = str.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

function startOfToday() {
  const n = new Date()
  return new Date(n.getFullYear(), n.getMonth(), n.getDate())
}

function countdown(str) {
  const d = parseDate(str)
  if (!d) return ''
  const days = Math.round((d - startOfToday()) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days === -1) return 'Yesterday'
  if (days > 1) return `in ${days} days`
  return `${Math.abs(days)} days ago`
}

function fmt(str) {
  const d = parseDate(str)
  if (!d) return 'No date'
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

export default function Calendar({ details, events, addEvent, updateEvent, removeEvent }) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')

  // The wedding day is derived from the Details tab — always present, not editable here.
  const weddingDay = details?.date
    ? { id: '__wedding__', date: details.date, title: `${details.coupleNames || 'The'} wedding 💍`, time: details.time, anchor: true }
    : null

  const all = [...(weddingDay ? [weddingDay] : []), ...events]
  const sorted = all
    .filter((e) => e.date)
    .sort((a, b) => a.date.localeCompare(b.date))
  const undated = events.filter((e) => !e.date)

  function submit(e) {
    e.preventDefault()
    if (!title.trim()) return
    addEvent({ title: title.trim(), date })
    setTitle('')
    setDate('')
  }

  return (
    <div className="panel">
      <p className="hint">
        Your wedding day comes straight from the <strong>Details</strong> tab. Add your own milestones below — or
        when a date comes up in chat, tap <em>Add to calendar</em> and Hey Girl drops it right here.
      </p>

      <form className="add-event" onSubmit={submit}>
        <input
          className="ev-title"
          placeholder="Event (e.g. Book florist)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <button type="submit">Add</button>
      </form>

      <ul className="timeline">
        {sorted.map((e) => (
          <li key={e.id} className={`tl-item ${e.anchor ? 'anchor' : ''}`}>
            <div className="tl-dot" />
            <div className="tl-body">
              {e.anchor ? (
                <div className="tl-title">{e.title}{e.time ? ` · ${e.time}` : ''}</div>
              ) : (
                <input
                  className="tl-title-input"
                  value={e.title}
                  onChange={(ev) => updateEvent(e.id, { title: ev.target.value })}
                />
              )}
              <div className="tl-meta">
                <span>{fmt(e.date)}</span>
                <span className="tl-count">{countdown(e.date)}</span>
              </div>
              {!e.anchor && (
                <input
                  className="tl-notes"
                  placeholder="Notes"
                  value={e.notes || ''}
                  onChange={(ev) => updateEvent(e.id, { notes: ev.target.value })}
                />
              )}
              <button
                type="button"
                className="tl-download"
                onClick={() => downloadICS(eventFilename(e), icsForEvents([e]))}
                title="Download this event (.ics)"
              >
                📥 Add to my calendar
              </button>
            </div>
            {e.anchor ? (
              <span className="tl-lock" title="Set on the Details tab">📋</span>
            ) : (
              <div className="tl-actions">
                <input
                  type="date"
                  value={e.date}
                  onChange={(ev) => updateEvent(e.id, { date: ev.target.value })}
                  title="Change date"
                />
                <button className="del small" onClick={() => removeEvent(e.id)} title="Remove">×</button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {sorted.length > 0 && (
        <button
          type="button"
          className="download-all"
          onClick={() => downloadICS('wedding-calendar.ics', icsForEvents(sorted))}
        >
          📥 Download all events (.ics)
        </button>
      )}

      {undated.length > 0 && (
        <div className="undated">
          <div className="undated-head">Needs a date</div>
          {undated.map((e) => (
            <div className="tl-item flat" key={e.id}>
              <input
                className="tl-title-input"
                value={e.title}
                onChange={(ev) => updateEvent(e.id, { title: ev.target.value })}
              />
              <input type="date" value={e.date} onChange={(ev) => updateEvent(e.id, { date: ev.target.value })} />
              <button className="del small" onClick={() => removeEvent(e.id)} title="Remove">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
