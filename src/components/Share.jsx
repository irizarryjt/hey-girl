import { useState } from 'react'
import { buildGuestLink, buildLocalGuestLink } from '../lib/share.js'

// Short, invitation-friendly wedding code: first 8 chars of the share token,
// shown as XXXX-XXXX. The server resolves it back to the full token.
function weddingCode(token) {
  if (!token || token.length < 8) return null
  return `${token.slice(0, 4)}-${token.slice(4, 8)}`.toUpperCase()
}

export default function Share({ details, shareToken, approxSize }) {
  const [copied, setCopied] = useState('')
  // Token link when signed in (secure, nothing private in URL); else local fallback.
  const link = shareToken ? buildGuestLink(shareToken) : buildLocalGuestLink(details, approxSize)
  const code = weddingCode(shareToken)

  async function copy(text, which) {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // clipboard may be blocked on http://; fall back to selecting the field
    }
    setCopied(which)
    setTimeout(() => setCopied(''), 1800)
  }

  return (
    <div className="panel">
      <h2 className="section-title">Share Hey Girl with your guests</h2>
      <p className="hint">
        Send this link to guests. It opens a guest-only Hey Girl that answers questions about your wedding —
        date, venue, dress code, parking, and more — pulled from your <strong>Details</strong> tab.
        Your budget, private notes, and guest list are never included in the link.
      </p>

      <div className="share-box">
        <input className="share-link" value={link} readOnly onFocus={(e) => e.target.select()} />
        <button onClick={() => copy(link, 'link')}>{copied === 'link' ? 'Copied!' : 'Copy link'}</button>
      </div>

      {code && (
        <>
          <h3 className="section-title" style={{ marginTop: '1.5rem' }}>Your wedding code</h3>
          <p className="hint">
            Putting it on paper? Guests can visit the site, tap <strong>Guest Login</strong>, and enter
            this code instead of typing a long link — perfect for invitations and save-the-dates.
          </p>
          <div className="share-box">
            <input className="share-link" value={code} readOnly onFocus={(e) => e.target.select()} />
            <button onClick={() => copy(code, 'code')}>{copied === 'code' ? 'Copied!' : 'Copy code'}</button>
          </div>
        </>
      )}

      <div className="share-actions">
        <a className="ghost-btn" href={link} target="_blank" rel="noreferrer">Preview guest view ↗</a>
      </div>

      <p className="hint small-note">
        Note: the link points at wherever this app is running. On <code>localhost</code> it only works on your machine —
        deploy the app (see README) to share with guests for real. Update your Details tab and re-copy the link to refresh what guests see.
      </p>
    </div>
  )
}
