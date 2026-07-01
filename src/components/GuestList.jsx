import { useState } from 'react'
import { guestStats, partySize, emptyMember, BRIDAL_ROLES } from '../lib/store.js'
import { guestsToCsv, downloadCsv } from '../lib/csv.js'
import SaveButton from './SaveButton.jsx'

const RSVP = ['pending', 'yes', 'no']
const EVENTS = [
  ['ceremony', 'Ceremony'],
  ['reception', 'Reception'],
  ['rehearsal', 'Rehearsal dinner'],
  ['welcome', 'Welcome party'],
  ['brunch', 'Day-after brunch'],
]

export default function GuestList({ guests, addGuest, updateGuest, removeGuest }) {
  const [name, setName] = useState('')
  const [size, setSize] = useState(1)
  const [open, setOpen] = useState({})
  const stats = guestStats(guests)

  function submit(e) {
    e.preventDefault()
    if (!name.trim()) return
    const extra = Math.max(0, (Number(size) || 1) - 1)
    addGuest({ name: name.trim(), party: Array.from({ length: extra }, () => emptyMember()) })
    setName('')
    setSize(1)
  }

  const toggle = (id) => setOpen((o) => ({ ...o, [id]: !o[id] }))

  // Nested party-member helpers
  const updateMember = (g, mid, patch) =>
    updateGuest(g.id, { party: (g.party || []).map((p) => (p.id === mid ? { ...p, ...patch } : p)) })
  const addMember = (g) => updateGuest(g.id, { party: [...(g.party || []), emptyMember()] })
  const removeMember = (g, mid) => updateGuest(g.id, { party: (g.party || []).filter((p) => p.id !== mid) })

  // Single mailing address per household: checking one clears the others.
  const setMailing = (g, who) =>
    updateGuest(g.id, {
      useForMailing: who === 'primary',
      party: (g.party || []).map((p) => ({ ...p, useForMailing: who === p.id })),
    })

  const toggleEvent = (g, key, val) => updateGuest(g.id, { invitedTo: { ...(g.invitedTo || {}), [key]: val } })

  return (
    <div className="panel">
      <div className="stats">
        <Stat label="Invited" value={stats.invited} />
        <Stat label="Attending" value={stats.attending} tone="good" />
        <Stat label="Declined" value={stats.declined} tone="bad" />
        <Stat label="Pending" value={stats.pending} tone="warn" />
      </div>
      <p className="guest-substat">{stats.adults} adults · {stats.kids} kids attending</p>

      <div className="guest-tools">
        <button type="button" className="add-member" onClick={() => downloadCsv('wedding-guest-list.csv', guestsToCsv(guests))}>
          ⬇ Export guest list (CSV)
        </button>
      </div>

      <form className="addguest" onSubmit={submit}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Guest name" />
        <input type="number" min="1" value={size} onChange={(e) => setSize(e.target.value)} title="Party size" />
        <button type="submit">Add</button>
      </form>

      <ul className="guests">
        {guests.map((g) => {
          const isOpen = !!open[g.id]
          return (
            <li key={g.id} className="guest">
              <div className="guest-main">
                <input className="guest-name" value={g.name} onChange={(e) => updateGuest(g.id, { name: e.target.value })} />
                <div className="guest-meta">
                  {g.bridalParty && <span className="badge role">{g.bridalParty}</span>}
                  {g.selfReported && <span className="badge">Self-added</span>}
                  {g.rsvpSubmittedAt && <span className="badge alt">RSVP via link</span>}
                  <span className="party-count">Party of {partySize(g)}</span>
                  <select value={g.rsvp} onChange={(e) => updateGuest(g.id, { rsvp: e.target.value })} className={`rsvp ${g.rsvp}`}>
                    {RSVP.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <input className="meal" value={g.meal} placeholder="Meal" onChange={(e) => updateGuest(g.id, { meal: e.target.value })} />
                </div>
              </div>

              <button className="details-toggle" onClick={() => toggle(g.id)}>
                {isOpen ? '▾ Hide details' : '▸ More details'}
              </button>

              {isOpen && (
                <div className="guest-details">
                  {!g.isChild && (
                    <>
                      <Field label="Email"><input value={g.email} onChange={(e) => updateGuest(g.id, { email: e.target.value })} placeholder="email@example.com" /></Field>
                      <Field label="Phone"><input value={g.phone} onChange={(e) => updateGuest(g.id, { phone: e.target.value })} placeholder="(555) 123-4567" /></Field>
                      <Field label="Mailing address" full>
                        <textarea rows="2" value={g.address} onChange={(e) => updateGuest(g.id, { address: e.target.value })} placeholder="Street, city, state ZIP" />
                      </Field>
                      <label className="ck full">
                        <input type="checkbox" checked={!!g.useForMailing} onChange={() => setMailing(g, 'primary')} />
                        Use this address for mailing physical invitations
                      </label>
                    </>
                  )}

                  <div className="row3">
                    <Field label="Side">
                      <select value={g.side} onChange={(e) => updateGuest(g.id, { side: e.target.value })}>
                        <option value="">—</option>
                        <option value="bride">Bride's</option>
                        <option value="groom">Groom's</option>
                      </select>
                    </Field>
                    <Field label="Relationship">
                      <select value={g.relationship} onChange={(e) => updateGuest(g.id, { relationship: e.target.value })}>
                        <option value="">—</option>
                        <option value="family">Family</option>
                        <option value="friend">Friend</option>
                      </select>
                    </Field>
                    <Field label="Table"><input value={g.table} onChange={(e) => updateGuest(g.id, { table: e.target.value })} placeholder="#" /></Field>
                  </div>

                  <Field label="Bridal party role" full>
                    <select value={g.bridalParty || ''} onChange={(e) => updateGuest(g.id, { bridalParty: e.target.value })}>
                      {BRIDAL_ROLES.map((r) => (
                        <option key={r} value={r}>{r || 'Not in the bridal party'}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Dietary restrictions / allergies" full>
                    <input value={g.dietary} onChange={(e) => updateGuest(g.id, { dietary: e.target.value })} placeholder="e.g. gluten-free, nut allergy" />
                  </Field>

                  <label className="ck"><input type="checkbox" checked={!!g.isChild} onChange={(e) => updateGuest(g.id, { isChild: e.target.checked })} /> This guest is a child</label>
                  <label className="ck"><input type="checkbox" checked={!!g.outOfTown} onChange={(e) => updateGuest(g.id, { outOfTown: e.target.checked })} /> Out of town — needs hotel</label>

                  <div className="detail-group">
                    <div className="detail-label">Invited to</div>
                    <div className="ck-grid">
                      {EVENTS.map(([key, lbl]) => (
                        <label key={key} className="ck">
                          <input type="checkbox" checked={!!g.invitedTo?.[key]} onChange={(e) => toggleEvent(g, key, e.target.checked)} />
                          {lbl}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="detail-group">
                    <div className="detail-label">Party members</div>
                    {(g.party || []).map((m) => (
                      <div key={m.id} className="member">
                        <div className="member-top">
                          <input className="member-name" value={m.name} onChange={(e) => updateMember(g, m.id, { name: e.target.value })} placeholder="Name" />
                          <button className="del small" onClick={() => removeMember(g, m.id)} title="Remove person">×</button>
                        </div>
                        <div className="member-grid">
                          <input value={m.meal} onChange={(e) => updateMember(g, m.id, { meal: e.target.value })} placeholder="Meal" />
                          <input value={m.dietary} onChange={(e) => updateMember(g, m.id, { dietary: e.target.value })} placeholder="Dietary" />
                          {!m.isChild && <input value={m.email} onChange={(e) => updateMember(g, m.id, { email: e.target.value })} placeholder="Email" />}
                          {!m.isChild && <input value={m.phone} onChange={(e) => updateMember(g, m.id, { phone: e.target.value })} placeholder="Phone" />}
                        </div>
                        {!m.isChild && <textarea rows="2" value={m.address} onChange={(e) => updateMember(g, m.id, { address: e.target.value })} placeholder="Mailing address" />}
                        {!m.isChild && <label className="ck"><input type="checkbox" checked={!!m.useForMailing} onChange={() => setMailing(g, m.id)} /> Use this address for mailing invitations</label>}
                        <label className="ck"><input type="checkbox" checked={!!m.isChild} onChange={(e) => updateMember(g, m.id, { isChild: e.target.checked })} /> Child</label>
                      </div>
                    ))}
                    <button className="add-member" onClick={() => addMember(g)}>+ Add person</button>
                  </div>

                  <div className="detail-group">
                    <div className="detail-label">Tracking</div>
                    <label className="ck"><input type="checkbox" checked={!!g.saveTheDateSent} onChange={(e) => updateGuest(g.id, { saveTheDateSent: e.target.checked })} /> Save-the-date sent</label>
                    <label className="ck"><input type="checkbox" checked={!!g.invitationSent} onChange={(e) => updateGuest(g.id, { invitationSent: e.target.checked })} /> Invitation sent</label>
                    <label className="ck"><input type="checkbox" checked={!!g.thankYouSent} onChange={(e) => updateGuest(g.id, { thankYouSent: e.target.checked })} /> Thank-you note sent</label>
                  </div>

                  <div className="detail-group">
                    <div className="detail-label">Gift Received</div>
                    <div className="yn">
                      <button type="button" className={`yn-btn ${g.giftReceived ? 'on' : ''}`} onClick={() => updateGuest(g.id, { giftReceived: true })}>Yes</button>
                      <button type="button" className={`yn-btn ${!g.giftReceived ? 'on' : ''}`} onClick={() => updateGuest(g.id, { giftReceived: false })}>No</button>
                    </div>
                    {g.giftReceived && (
                      <input value={g.gift} onChange={(e) => updateGuest(g.id, { gift: e.target.value })} placeholder="Describe gift" />
                    )}
                  </div>

                  <div className="detail-group">
                    <div className="detail-label">Guest access</div>
                    <p className="hint" style={{ margin: 0 }}>
                      {g.access?.hash
                        ? 'This guest set a password to access their RSVP via the guest link.'
                        : 'No guest password set yet.'}
                      {g.rsvpSubmittedAt ? ` Last RSVP update: ${new Date(g.rsvpSubmittedAt).toLocaleDateString('en-US')}.` : ''}
                    </p>
                    {g.access?.hash && (
                      <button
                        className="add-member"
                        onClick={() => { if (window.confirm(`Reset ${g.name || 'this guest'}'s RSVP password? They'll choose a new one next time they sign in with their name.`)) updateGuest(g.id, { access: null }) }}
                      >
                        Reset password
                      </button>
                    )}
                  </div>

                  <Field label="Notes (private)" full>
                    <input value={g.notes} onChange={(e) => updateGuest(g.id, { notes: e.target.value })} placeholder="Notes" />
                  </Field>
                </div>
              )}

              <div className="entry-save"><SaveButton /></div>
              <button
                className="del"
                onClick={() => { if (window.confirm(`Remove ${g.name || 'this guest'} and their whole party from your list?`)) removeGuest(g.id) }}
                title="Remove"
              >×</button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Field({ label, full, children }) {
  return (
    <label className={`gd-field ${full ? 'full' : ''}`}>
      <span>{label}</span>
      {children}
    </label>
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
