import { supabase, supabaseEnabled } from './supabase.js'

export async function askHeyGirl({ mode, messages, details, guestStats, budget, events, guestContext }) {
  const headers = { 'Content-Type': 'application/json' }
  // Couple chat is login-gated server-side; attach the signed-in user's token.
  if (mode !== 'guest' && supabaseEnabled) {
    const { data } = await supabase.auth.getSession()
    const token = data?.session?.access_token
    if (token) headers.Authorization = `Bearer ${token}`
  }
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers,
    body: JSON.stringify({ mode, messages, details, guestStats, budget, events, guestContext }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Request failed')
  }
  return res.json() // { reply, demo? }
}

// Identify a guest by name + a password they choose (claims/verifies their record).
export async function guestAccess(token, name, password) {
  const res = await fetch(`/api/guest/${encodeURIComponent(token)}/access`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, password }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Could not sign you in.')
  return json // { ok, created, guest }
}

// Submit or edit the guest's RSVP (re-verifies name + password server-side).
export async function guestRsvp(token, name, password, rsvp) {
  const res = await fetch(`/api/guest/${encodeURIComponent(token)}/rsvp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, password, rsvp }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Could not save your RSVP.')
  return json // { ok, guest }
}
