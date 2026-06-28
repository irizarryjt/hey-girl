import { useEffect, useState } from 'react'
import { supabase, supabaseEnabled } from './supabase.js'

// Tracks the logged-in session. When Supabase isn't configured, reports "ready"
// immediately with no session, so the app runs in local-only mode.
export function useSession() {
  const [session, setSession] = useState(null)
  const [ready, setReady] = useState(!supabaseEnabled)
  // True after a user follows a password-reset email link, so the app can show
  // a "set a new password" form instead of the normal app.
  const [recovery, setRecovery] = useState(false)

  useEffect(() => {
    if (!supabaseEnabled) return
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
    })
    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  return { session, ready, recovery, clearRecovery: () => setRecovery(false) }
}

export function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password })
}

export function signUp(email, password) {
  return supabase.auth.signUp({ email, password })
}

export function signOut() {
  return supabase.auth.signOut()
}

// Email the user a password-reset link that returns them to the app.
export function resetPassword(email) {
  return supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/app/` })
}

// Set a new password for the currently-authenticated (recovery) session.
export function updatePassword(password) {
  return supabase.auth.updateUser({ password })
}
