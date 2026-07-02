import { useState } from 'react'

// Guest front door: turns a pasted guest link or a short wedding code from an
// invitation into the token link that boots the guest experience.
export default function GuestEntry() {
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  // Pull a token (?w=) or legacy hash payload (#w=) out of a pasted link.
  function parseLink(text) {
    try {
      const url = new URL(text.includes('://') ? text : `https://${text}`)
      const token = url.searchParams.get('w')
      if (token) return { token }
      const hash = new URLSearchParams(url.hash.replace(/^#/, ''))
      const payload = hash.get('w')
      if (payload) return { legacy: payload }
    } catch {
      /* not a URL */
    }
    return null
  }

  async function submit(e) {
    e.preventDefault()
    if (busy) return
    const text = value.trim()
    if (!text) return
    setMsg('')

    // Looks like a pasted link (has a slash, dot, or colon)?
    if (/[/.:]/.test(text)) {
      const parsed = parseLink(text)
      if (parsed?.token) {
        window.location.href = `/app/?guest=1&w=${encodeURIComponent(parsed.token)}`
        return
      }
      if (parsed?.legacy) {
        window.location.href = `/app/?guest=1#w=${parsed.legacy}`
        return
      }
      setMsg("Hmm, that doesn't look like a Hey Girl guest link. Double-check what the couple sent you, or try the wedding code from your invitation instead.")
      return
    }

    // Otherwise treat it as a wedding code (e.g. 3F9A-C21B).
    const code = text.toLowerCase().replace(/[^0-9a-z]/g, '')
    setBusy(true)
    try {
      const r = await fetch(`/api/guest-code/${encodeURIComponent(code)}`)
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'No wedding found for that code — double-check it with the couple.')
      window.location.href = `/app/?guest=1&w=${encodeURIComponent(d.token)}`
    } catch (err) {
      setMsg(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">Hey&nbsp;Girl!</div>
        <p className="auth-sub">Guest login</p>
        <p className="hint" style={{ textAlign: 'center' }}>
          Attending a wedding? 💌 Paste the guest link the couple shared, or enter the
          wedding code from your invitation. No account needed.
        </p>
        <form onSubmit={submit} className="auth-form">
          <label>
            <span>Guest link or wedding code</span>
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="e.g. 3F9A-C21B"
              autoFocus
              required
            />
          </label>
          <button type="submit" className="auth-btn" disabled={busy}>
            {busy ? 'One sec…' : 'Find the wedding'}
          </button>
        </form>
        {msg && <p className="auth-msg">{msg}</p>}
        <a className="auth-switch" href="/app/">Planning your own wedding? Couple login</a>
      </div>
    </div>
  )
}
