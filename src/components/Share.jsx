import { useState } from 'react'
import { buildGuestLink, buildLocalGuestLink } from '../lib/share.js'

export default function Share({ details, shareToken, approxSize }) {
  const [copied, setCopied] = useState(false)
  // Token link when signed in (secure, nothing private in URL); else local fallback.
  const link = shareToken ? buildGuestLink(shareToken) : buildLocalGuestLink(details, approxSize)

  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
    } catch {
      // clipboard may be blocked on http://; fall back to selecting the field
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
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
        <button onClick={copy}>{copied ? 'Copied!' : 'Copy link'}</button>
      </div>

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
