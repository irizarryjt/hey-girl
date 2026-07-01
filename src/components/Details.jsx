import { composeCoupleNames, BRIDAL_ROLES } from '../lib/store.js'

// coupleNames is derived from the name fields, so it's not edited directly here.
const FIELDS = [
  ['date', 'Date', 'date'],
  ['time', 'Time'],
  ['venueName', 'Venue name'],
  ['venueAddress', 'Venue address'],
  ['dressCode', 'Dress code'],
  ['parking', 'Parking'],
  ['hotelBlock', 'Hotel block'],
  ['extraNotes', 'Extra notes (public)', 'textarea'],
]

const ROLE_ORDER = BRIDAL_ROLES.filter(Boolean)

export default function Details({ details, setDetails, weddingEvents = [], guests = [] }) {
  // Update a name field and recompute the display name used across the app.
  function setName(key, value) {
    const next = { ...details, [key]: value }
    next.coupleNames = composeCoupleNames(next)
    setDetails(next)
  }

  // Guest-visible events, with the ceremony's shared fields read from details.
  const sharedEvents = (weddingEvents || [])
    .filter((e) => e.guestVisible)
    .map((e) => {
      const c = e.key === 'ceremony'
      return {
        id: e.id,
        name: e.name,
        date: c ? details.date : e.date,
        time: c ? details.time : e.time,
        venue: c ? details.venueName : e.venueName,
        dressCode: c ? details.dressCode : e.dressCode,
      }
    })

  // Bridal party roster (only relevant when shared).
  const party = (guests || [])
    .filter((g) => g.bridalParty)
    .sort((a, b) => {
      const ia = ROLE_ORDER.indexOf(a.bridalParty)
      const ib = ROLE_ORDER.indexOf(b.bridalParty)
      if (ia !== ib) return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
      return (a.name || '').localeCompare(b.name || '')
    })

  return (
    <div className="panel">
      <p className="hint">These details power Hey Girl's answers for both you and your guests. Guests only ever see this info — never your private guest notes.</p>

      <h3 className="section-title">Couple Details</h3>
      <p className="hint">Shown across the app as <strong>{composeCoupleNames(details) || '—'}</strong>.</p>
      <div className="name-rows">
        <div className="name-row">
          <label><span>Partner 1 first name</span><input value={details.partner1First || ''} onChange={(e) => setName('partner1First', e.target.value)} /></label>
          <label><span>Partner 1 last name</span><input value={details.partner1Last || ''} onChange={(e) => setName('partner1Last', e.target.value)} /></label>
        </div>
        <div className="name-row">
          <label><span>Partner 2 first name</span><input value={details.partner2First || ''} onChange={(e) => setName('partner2First', e.target.value)} /></label>
          <label><span>Partner 2 last name</span><input value={details.partner2Last || ''} onChange={(e) => setName('partner2Last', e.target.value)} /></label>
        </div>
      </div>

      <label className="ck" style={{ marginTop: '12px' }}>
        <input type="checkbox" checked={!!details.shareStory} onChange={(e) => setDetails({ ...details, shareStory: e.target.checked })} />
        Share your story with guests
      </label>
      {details.shareStory && (
        <label className="gd-field full" style={{ marginTop: '8px' }}>
          <span>Your story</span>
          <textarea rows="4" value={details.story || ''} onChange={(e) => setDetails({ ...details, story: e.target.value })} placeholder="How you met, the proposal, anything you'd love to share with guests…" />
        </label>
      )}

      <h3 className="section-title" style={{ marginTop: '20px' }}>Wedding Ceremony details</h3>
      <div className="form-grid">
        {FIELDS.map(([key, label, type]) => (
          <label key={key} className={type === 'textarea' ? 'full' : ''}>
            <span>{label}</span>
            {type === 'textarea' ? (
              <textarea value={details[key] || ''} onChange={(e) => setDetails({ ...details, [key]: e.target.value })} rows={3} />
            ) : (
              <input type={type || 'text'} value={details[key] || ''} onChange={(e) => setDetails({ ...details, [key]: e.target.value })} />
            )}
          </label>
        ))}
      </div>

      <h3 className="section-title" style={{ marginTop: '20px' }}>Events</h3>
      <p className="hint">Auto-filled from the events you've shared with guests on the <strong>Events</strong> tab. Edit them there.</p>
      {sharedEvents.length === 0 ? (
        <p className="hint">No events shared with guests yet. Turn on “Make event visible to guests” on the Events tab.</p>
      ) : (
        <ul className="ro-list">
          {sharedEvents.map((e) => (
            <li key={e.id} className="ro-item">
              <div className="ro-title">{e.name}</div>
              <div className="ro-meta">
                {[e.date, e.time, e.venue, e.dressCode && `Dress: ${e.dressCode}`].filter(Boolean).join(' · ') || 'No details yet'}
              </div>
            </li>
          ))}
        </ul>
      )}

      <h3 className="section-title" style={{ marginTop: '20px' }}>Bridal Party</h3>
      <label className="ck">
        <input type="checkbox" checked={!!details.shareBridalParty} onChange={(e) => setDetails({ ...details, shareBridalParty: e.target.checked })} />
        Share the bridal party's names &amp; roles with guests
      </label>
      {details.shareBridalParty && (
        party.length === 0 ? (
          <p className="hint">No bridal party assigned yet. Set roles on the <strong>Guests</strong> or <strong>Bridal Party</strong> tab.</p>
        ) : (
          <ul className="ro-list">
            {party.map((g) => (
              <li key={g.id} className="ro-item">
                <div className="ro-title">{g.name || 'Unnamed'}</div>
                <div className="ro-meta">{g.bridalParty}</div>
              </li>
            ))}
          </ul>
        )
      )}

      <h3 className="section-title" style={{ marginTop: '20px' }}>Guest permissions</h3>
      <p className="hint">Choose what Hey Girl is allowed to share when guests ask. Both are off by default.</p>
      <label className="ck">
        <input type="checkbox" checked={!!details.allowSizeInquiry} onChange={(e) => setDetails({ ...details, allowSizeInquiry: e.target.checked })} />
        Allow guests to inquire about approximate wedding size?
      </label>
      <label className="ck" style={{ marginTop: '10px' }}>
        <input type="checkbox" checked={!!details.allowStickToRegistryInquiry} onChange={(e) => setDetails({ ...details, allowStickToRegistryInquiry: e.target.checked })} />
        Allow guests to inquire if the couple prefers that guests stick to the registry items?
      </label>
    </div>
  )
}
