import { useState } from 'react'
import { signIn, signUp } from '../lib/auth.js'

export default function Login() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setMsg('')
    try {
      const fn = mode === 'signup' ? signUp : signIn
      const { data, error } = await fn(email.trim(), password)
      if (error) {
        setMsg(error.message)
      } else if (mode === 'signup' && !data.session) {
        setMsg('Check your email to confirm your account, then sign in.')
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
          <button type="submit" className="auth-btn" disabled={busy}>
            {busy ? 'One sec…' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>
        {msg && <p className="auth-msg">{msg}</p>}
        <button
          className="auth-switch"
          onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setMsg('') }}
        >
          {mode === 'signup' ? 'Already have an account? Sign in' : 'New here? Create an account'}
        </button>
      </div>
    </div>
  )
}
