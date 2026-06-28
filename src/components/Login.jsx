import { useState } from 'react'
import { signIn, signUp } from '../lib/auth.js'
import { setPendingDetails } from '../lib/store.js'

export default function Login() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [p1First, setP1First] = useState('')
  const [p1Last, setP1Last] = useState('')
  const [p2First, setP2First] = useState('')
  const [p2Last, setP2Last] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (busy) return
    if (mode === 'signup' && password !== confirm) {
      setMsg("Passwords don't match — please re-enter them.")
      return
    }
    setBusy(true)
    setMsg('')
    try {
      const fn = mode === 'signup' ? signUp : signIn
      const { data, error } = await fn(email.trim(), password)
      if (error) {
        setMsg(error.message)
      } else if (mode === 'signup') {
        // Stash the couple's names so they seed the new wedding once it's created.
        const names = {}
        if (p1First.trim()) names.partner1First = p1First.trim()
        if (p1Last.trim()) names.partner1Last = p1Last.trim()
        if (p2First.trim()) names.partner2First = p2First.trim()
        if (p2Last.trim()) names.partner2Last = p2Last.trim()
        setPendingDetails(names)
        if (!data.session) setMsg('Check your email to confirm your account, then sign in.')
      }
      // On success with a session, the auth listener swaps this screen for the app.
    } catch (err) {
      setMsg(err?.message || 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">Hey&nbsp;Girl!</div>
        <p className="auth-sub">{mode === 'signup' ? 'Create your account' : 'Welcome back'}</p>
        <form onSubmit={submit} className="auth-form">
          <label>
            <span>Email</span>
            <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            <span>Password</span>
            <input
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </label>
          {mode === 'signup' && (
            <>
              <label>
                <span>Confirm password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  minLength={6}
                  required
                />
              </label>
              <div className="auth-names">
                <label><span>Your first name</span><input value={p1First} onChange={(e) => setP1First(e.target.value)} autoComplete="given-name" /></label>
                <label><span>Your last name</span><input value={p1Last} onChange={(e) => setP1Last(e.target.value)} autoComplete="family-name" /></label>
                <label><span>Partner's first name</span><input value={p2First} onChange={(e) => setP2First(e.target.value)} /></label>
                <label><span>Partner's last name</span><input value={p2Last} onChange={(e) => setP2Last(e.target.value)} /></label>
              </div>
              <p className="auth-hint">Optional — you can change these anytime in Shared Details. Leave them blank to use a placeholder while you explore Hey Girl.</p>
            </>
          )}
          <button type="submit" className="auth-btn" disabled={busy}>
            {busy ? 'One sec…' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>
        {msg && <p className="auth-msg">{msg}</p>}
        <button
          className="auth-switch"
          onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setMsg(''); setConfirm('') }}
          type="button"
        >
          {mode === 'signup' ? 'Already have an account? Sign in' : 'New here? Create an account'}
        </button>
      </div>
    </div>
  )
}
