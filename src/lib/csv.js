import { partySize } from './store.js'

// Quote a CSV field (wrap + double internal quotes) when it needs it.
function esc(v) {
  const s = v === undefined || v === null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const yn = (b) => (b ? 'Yes' : 'No')

const COLUMNS = [
  ['Name', (g) => g.name],
  ['Party size', (g) => partySize(g)],
  ['Party members', (g) => (g.party || []).map((m) => m.name).filter(Boolean).join('; ')],
  ['RSVP', (g) => g.rsvp],
  ['Meal', (g) => g.meal],
  ['Dietary', (g) => g.dietary],
  ['Email', (g) => g.email],
  ['Phone', (g) => g.phone],
  ['Mailing address', (g) => g.address],
  ['Side', (g) => g.side],
  ['Relationship', (g) => g.relationship],
  ['Bridal party role', (g) => g.bridalParty],
  ['Table', (g) => g.table],
  ['Out of town', (g) => yn(g.outOfTown)],
  ['Save-the-date sent', (g) => yn(g.saveTheDateSent)],
  ['Invitation sent', (g) => yn(g.invitationSent)],
  ['Thank-you sent', (g) => yn(g.thankYouSent)],
  ['Gift received', (g) => yn(g.giftReceived)],
  ['Gift', (g) => g.gift],
  ['Notes', (g) => g.notes],
]

export function guestsToCsv(guests = []) {
  const header = COLUMNS.map((c) => esc(c[0])).join(',')
  const rows = guests.map((g) => COLUMNS.map((c) => esc(c[1](g))).join(','))
  return [header, ...rows].join('\r\n')
}

export function downloadCsv(filename, text) {
  // Prepend BOM so Excel reads UTF-8 correctly.
  const blob = new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
