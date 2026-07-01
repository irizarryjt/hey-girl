import { composeCoupleNames } from '../lib/store.js'

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

const NAME_FIELDS = [
  ['partner1First', 'Partner 1 first name'],
  ['partner1Last', 'Partner 1 last name'],
  ['partner2First', 'Partner 2 first name'],
  ['partner2Last', 'Partner 2 last name'],
]

export default function Details({ details, setDetails }) {
  // Update a name field and recompute the display name used across the app.
  function setName(key, value) {
    const next = { ...details, [key]: value }
    next.coupleNames = composeCoupleNames(next)
    setDetails(next)
  }

  return (
    <div className="panel">
      <p className="hint">These details power Hey Girl's answers for both you and your guests. Guests only ever see this info — never your private guest notes.</p>

      <h3 className="section-title">Couple names</h3>
      <p className="hint">Shown across the app as <strong>{composeCoupleNames(details) || '—'}</strong>.</p>
      <div className="form-grid">
        {NAME_FIELDS.map(([key, label]) => (
          <label key={key}>
            <span>{label}</span>
            <input
              type="text"
              value={details[key] || ''}
              onChange={(e) => setName(key, e.target.value)}
            />
          </label>
        ))}
      </div>

      <h3 className="section-title" style={{ marginTop: '20px' }}>Wedding Ceremony details</h3>
      <div className="form-grid">
        {FIELDS.map(([key, label, type]) => (
          <label key={key} className={type === 'textarea' ? 'full' : ''}>
            <span>{label}</span>
            {type === 'textarea' ? (
              <textarea
                value={details[key] || ''}
                onChange={(e) => setDetails({ ...details, [key]: e.target.value })}
                rows={3}
              />
            ) : (
              <input
                type={type || 'text'}
                value={details[key] || ''}
                onChange={(e) => setDetails({ ...details, [key]: e.target.value })}
              />
            )}
          </label>
        ))}
      </div>

      <h3 className="section-title" style={{ marginTop: '20px' }}>Guest permissions</h3>
      <p className="hint">Choose what Hey Girl is allowed to share when guests ask. Both are off by default.</p>
      <label className="ck">
        <input
          type="checkbox"
          checked={!!details.allowSizeInquiry}
          onChange={(e) => setDetails({ ...details, allowSizeInquiry: e.target.checked })}
        />
        Allow guests to inquire about approximate wedding size?
      </label>
      <label className="ck" style={{ marginTop: '10px' }}>
        <input
          type="checkbox"
          checked={!!details.allowStickToRegistryInquiry}
          onChange={(e) => setDetails({ ...details, allowStickToRegistryInquiry: e.target.checked })}
        />
        Allow guests to inquire if the couple prefers that guests stick to the registry items?
      </label>
    </div>
  )
}
