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

const money = (n) =>
  `$${Math.round(Number(n) || 0).toLocaleString('en-US')}`

export default function Calendar({ details, events, budget, addEvent, updateEvent, removeEvent }) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')

  // The wedding day is derived from the Details tab — always present, not editable here.
  const weddingDay = details?.date
    ? { id: '__wedding__', date: details.date, title: `${details.coupleNames || 'The'} wedding 💍`, time: details.time, anchor: true }
    : null

  // Payment due dates flow in automatically from the Budget tab (read-only here).
  const payments = (budget?.items || [])
    .filter((it) => it.dueDate)
    .map((it) => {
      const owe = Math.max(0, (Number(it.actual) || 0) - (Number(it.paidAmount) || 0))
      return {
        id: `pay-${it.id}`,
        date: it.dueDate,
        title: `${it.category} payment due`,
        notes: owe > 0 ? `${money(owe)} still owed` : 'Paid in full',
        amount: owe,
        payment: true,
      }
    })

  const all = [...(weddingDay ? [weddingDay] : []), ...events, ...payments]
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
        Your wedding day comes from <strong>Details</strong> and payment due dates flow in from <strong>Budget</strong>,
        automatically. Add your own milestones below — or when a date comes up in chat, tap <em>Add to calendar</em>.
      </p>
      <p className="hint cal-events-note">
        🎉 For the main events that involve your guests — <strong>rehearsal dinner, ceremony, reception, welcome
        party, brunch</strong> — use the <strong>Events</strong> tab, where you can add times, venues, dress codes,
        and download a calendar invite for each.
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
        {sorted.map((e) => {
          const editable = !e.anchor && !e.payment
          return (
            <li key={e.id} className={`tl-item ${e.anchor ? 'anchor' : ''} ${e.payment ? 'payment' : ''}`}>
              <div className="tl-dot" />
              <div className="tl-body">
                {editable ? (
                  <input
                    className="tl-title-input"
                    value={e.title}
                    onChange={(ev) => updateEvent(e.id, { title: ev.target.value })}
                  />
                ) : (
                  <div className="tl-title">
                    {e.title}
                    {e.time ? ` · ${e.time}` : ''}
                    {e.payment && e.amount > 0 ? ` · ${money(e.amount)}` : ''}
                  </div>
                )}
                <div className="tl-meta">
                  <span>{fmt(e.date)}</span>
                  <span className="tl-count">{countdown(e.date)}</span>
                </div>
                {editable && (
                  <input
                    className="tl-notes"
                    placeholder="Notes"
                    value={e.notes || ''}
                    onChange={(ev) => updateEvent(e.id, { notes: ev.target.value })}
                  />
                )}
                {e.payment && <div className="tl-subnote">{e.notes}</div>}
                <button
                  type="button"
                  className="tl-download"
                  onClick={() => downloadICS(eventFilename(e), icsForEvents([e]))}
                  title="Download this event (.ics)"
                >
                  📥 Add to my calendar
                </button>
              </div>
              {e.anchor && <span className="tl-lock" title="Set on the Details tab">📋</span>}
              {e.payment && <span className="tl-lock" title="From the Budget tab">💰</span>}
              {editable && (
                <div className="tl-actions">
                  <input
                    type="date"
                    value={e.date}
                    onChange={(ev) => updateEvent(e.id, { date: ev.target.value })}
                    title="Change date"
                  />
                  <button className="del small" onClick={() => { if (window.confirm(`Delete "${e.title || 'this event'}" from your calendar?`)) removeEvent(e.id) }} title="Remove">×</button>
                </div>
              )}
            </li>
          )
        })}
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
              <button className="del small" onClick={() => { if (window.confirm(`Delete "${e.title || 'this event'}" from your calendar?`)) removeEvent(e.id) }} title="Remove">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
