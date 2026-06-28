import { useState } from 'react'
import { guestAccess } from '../lib/api.js'

// Lightweight per-guest gate: name + a password the guest chooses. New names
// claim a record; returning names must use the same password.
export default function GuestGate({ token, coupleNames, onAccess }) {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setMsg('')
    try {
      const { guest } = await guestAccess(token, name.trim(), password)
      onAccess({ name: name.trim(), password, summary: guest })
    } catch (err) {
      setMsg(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">Hey&nbsp;Girl!</div>
        <p className="auth-sub">{coupleNames}'s wedding</p>
        <p className="hint" style={{ textAlign: 'center' }}>
          Enter your name and a password to RSVP and chat with Hey Girl. If you've been here before,
          use the same password to pick up where you left off and edit your RSVP.
        </p>
        <form onSubmit={submit} className="auth-form">
          <label>
            <span>Your name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
          </label>
          <label>
            <span>Password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={4} required />
          </label>
          <button type="submit" className="auth-btn" disabled={busy}>{busy ? 'One sec…' : 'Continue'}</button>
        </form>
        {msg && <p className="auth-msg">{msg}</p>}
      </div>
    </div>
  )
}
