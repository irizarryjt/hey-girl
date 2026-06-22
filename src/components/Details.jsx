const FIELDS = [
  ['coupleNames', 'Couple names'],
  ['date', 'Date', 'date'],
  ['time', 'Time'],
  ['venueName', 'Venue name'],
  ['venueAddress', 'Venue address'],
  ['dressCode', 'Dress code'],
  ['registryUrl', 'Registry URL'],
  ['parking', 'Parking'],
  ['hotelBlock', 'Hotel block'],
  ['extraNotes', 'Extra notes (public)', 'textarea'],
]

export default function Details({ details, setDetails }) {
  return (
    <div className="panel">
      <p className="hint">These details power Hey Girl's answers for both you and your guests. Guests only ever see this info — never your private guest notes.</p>
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
    </div>
  )
}
