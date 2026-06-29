import { BRIDAL_ROLES } from '../lib/store.js'

// Display order for roles (most prominent first).
const ROLE_ORDER = BRIDAL_ROLES.filter(Boolean)
const sideLabel = (s) => (s === 'bride' ? "Bride's side" : s === 'groom' ? "Groom's side" : '')

export default function BridalParty({ guests, updateGuest }) {
  const members = (guests || [])
    .filter((g) => g.bridalParty)
    .sort((a, b) => {
      const ia = ROLE_ORDER.indexOf(a.bridalParty)
      const ib = ROLE_ORDER.indexOf(b.bridalParty)
      if (ia !== ib) return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
      return (a.name || '').localeCompare(b.name || '')
    })

  return (
    <div className="panel">
      <p className="hint">
        This fills in automatically from the <strong>Bridal party role</strong> you set on each guest in the
        Guests tab. Change a role here and it updates the guest too.
      </p>
      <p className="guest-substat">{members.length} in the bridal party</p>

      {members.length === 0 ? (
        <p className="hint">No one's assigned yet. Open a guest in the <strong>Guests</strong> tab and choose a bridal party role.</p>
      ) : (
        <ul className="guests">
          {members.map((g) => (
            <li key={g.id} className="guest bp-card">
              <div className="bp-row">
                <div className="bp-name">{g.name || 'Unnamed guest'}</div>
                <select className="bp-role" value={g.bridalParty} onChange={(e) => updateGuest(g.id, { bridalParty: e.target.value })}>
                  {BRIDAL_ROLES.map((r) => (
                    <option key={r} value={r}>{r || 'Remove from party'}</option>
                  ))}
                </select>
              </div>
              <div className="bp-meta">
                {sideLabel(g.side) && <span>{sideLabel(g.side)}</span>}
                <span className={`rsvp-tag ${g.rsvp}`}>RSVP: {g.rsvp}</span>
                {(g.phone || g.email) && <span className="bp-contact">{[g.phone, g.email].filter(Boolean).join(' · ')}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
