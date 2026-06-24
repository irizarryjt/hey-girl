import { useEffect, useState } from 'react'
import { supabase, supabaseEnabled } from './supabase.js'

// Tracks the logged-in session. When Supabase isn't configured, reports "ready"
// immediately with no session, so the app runs in local-only mode.
export function useSession() {
  const [session, setSession] = useState(null)
  const [ready, setReady] = useState(!supabaseEnabled)

  useEffect(() => {
    if (!supabaseEnabled) return
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  return { session, ready }
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
