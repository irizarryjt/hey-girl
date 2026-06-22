// Build downloadable .ics (iCalendar) files for wedding events. All events are
// treated as all-day so they drop cleanly onto any calendar app.

function pad(n) {
  return String(n).padStart(2, '0')
}

// 'YYYY-MM-DD' -> 'YYYYMMDD'
function icsDate(str) {
  return String(str).replaceAll('-', '')
}

// Day after the given 'YYYY-MM-DD' (all-day DTEND is exclusive), as 'YYYYMMDD'.
function nextDay(str) {
  const [y, m, d] = String(str).split('-').map(Number)
  const dt = new Date(y, m - 1, d + 1)
  return `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}`
}

function stamp() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function esc(s) {
  return String(s || '').replace(/\\/g, '\\\\').replace(/([,;])/g, '\\$1').replace(/\n/g, '\\n')
}

function slug(s) {
  return String(s || 'event').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'event'
}

function vevent(ev) {
  const uid = `${ev.id || slug(ev.title)}-${ev.date}@heygirl`
  const lines = [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp()}`,
    `DTSTART;VALUE=DATE:${icsDate(ev.date)}`,
    `DTEND;VALUE=DATE:${nextDay(ev.date)}`,
    `SUMMARY:${esc(ev.title)}`,
  ]
  if (ev.notes) lines.push(`DESCRIPTION:${esc(ev.notes)}`)
  lines.push('END:VEVENT')
  return lines.join('\r\n')
}

// Build an iCalendar string from one or more events (those with a date).
export function icsForEvents(events) {
  const dated = (Array.isArray(events) ? events : [events]).filter((e) => e && e.date)
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Hey Girl//Wedding Planner//EN',
    'CALSCALE:GREGORIAN',
    ...dated.map(vevent),
    'END:VCALENDAR',
  ].join('\r\n')
}

// Trigger a browser download of the given ICS text.
export function downloadICS(filename, icsText) {
  const blob = new Blob([icsText], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.ics') ? filename : `${filename}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function eventFilename(ev) {
  return `${slug(ev.title)}.ics`
}
