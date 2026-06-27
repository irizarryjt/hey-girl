// Store backed by Supabase (per-user) when configured, else localStorage.
import { useEffect, useRef, useState } from 'react'
import { supabase, supabaseEnabled } from './supabase.js'

const KEY = 'heygirl.v1'

export const defaultDetails = {
  partner1First: 'Fiancée',
  partner1Last: '',
  partner2First: 'Fiancé',
  partner2Last: '',
  coupleNames: 'Fiancée & Fiancé',
  date: '2026-09-19',
  time: '4:30 PM',
  venueName: 'The Rosewood Barn',
  venueAddress: '1200 Vineyard Ln, Sonoma, CA',
  dressCode: 'Garden formal',
  registryUrl: '',
  parking: 'Free lot on-site, plus valet after 4 PM.',
  hotelBlock: 'Block at the Sonoma Inn under the wedding name.',
  extraNotes: 'Outdoor ceremony, indoor reception. Kid-friendly until 8 PM.',
}

// Build the display name used in headers, the share link, and Hey Girl's context.
// Displays first names only: "First & First".
export function composeCoupleNames(d = {}) {
  const a = (d.partner1First || '').trim()
  const b = (d.partner2First || '').trim()
  return [a, b].filter(Boolean).join(' & ')
}

// Upgrade older saved details (single coupleNames string) to the structured fields.
function migrateDetails(details) {
  if (!details) return defaultDetails
  if (details.partner1First !== undefined || details.partner2First !== undefined) return details
  const parts = String(details.coupleNames || '').split('&').map((s) => s.trim())
  const splitName = (full) => {
    const bits = String(full || '').split(/\s+/).filter(Boolean)
    return { first: bits.shift() || '', last: bits.join(' ') }
  }
  const p1 = splitName(parts[0])
  const p2 = splitName(parts[1])
  return {
    ...details,
    partner1First: p1.first,
    partner1Last: p1.last,
    partner2First: p2.first,
    partner2Last: p2.last,
  }
}

const seedGuests = [
  { id: 'g1', name: 'Jordan Lee', partySize: 2, rsvp: 'yes', meal: 'Chicken', notes: '' },
  { id: 'g2', name: 'Taylor Brooks', partySize: 1, rsvp: 'pending', meal: '', notes: 'College roommate' },
  { id: 'g3', name: 'Morgan Diaz', partySize: 4, rsvp: 'no', meal: '', notes: 'Out of town' },
]

const seedEvents = [
  { id: 'e1', date: '2026-07-10', title: 'Catering tasting', notes: '' },
  { id: 'e2', date: '2026-08-15', title: 'RSVP deadline', notes: 'Chase down stragglers' },
]

export const defaultSettings = { notifyTimeline: false, notifiedDue: {} }

export const defaultBudget = {
  total: 35000,
  items: [
    { id: 'b1', category: 'Venue', vendor: 'The Rosewood Barn', website: 'https://example.com/rosewood-barn', estimated: 12000, actual: 12000, paidAmount: 12000, dueDate: '' },
    { id: 'b2', category: 'Catering', vendor: '', website: '', estimated: 9000, actual: 9000, paidAmount: 2000, dueDate: '2026-08-20' },
    { id: 'b3', category: 'Photography', vendor: '', website: '', estimated: 4500, actual: 2250, paidAmount: 1000, dueDate: '2026-09-01' },
    { id: 'b4', category: 'Flowers', vendor: '', website: '', estimated: 3000, actual: 1200, paidAmount: 0, dueDate: '2026-09-05' },
    { id: 'b5', category: 'Attire', vendor: '', website: '', estimated: 2500, actual: 1800, paidAmount: 1800, dueDate: '' },
  ],
}

// Upgrade older line items that used a boolean `paid` to a numeric `paidAmount`.
function migrateBudget(budget) {
  if (!budget) return defaultBudget
  const items = (budget.items || []).map((it) => {
    if (typeof it.paidAmount === 'number') return it
    const paidAmount = it.paid ? Number(it.actual) || 0 : 0
    const { paid, ...rest } = it
    return { ...rest, paidAmount }
  })
  return { ...budget, items }
}

function freshState() {
  return { details: defaultDetails, guests: seedGuests, budget: defaultBudget, events: seedEvents, settings: defaultSettings }
}

// Normalize/migrate any saved blob (from localStorage or Supabase) into current shape.
function migrateAll(data) {
  const d = data && typeof data === 'object' ? data : {}
  return {
    details: migrateDetails(d.details || defaultDetails),
    guests: Array.isArray(d.guests) ? d.guests : seedGuests,
    budget: migrateBudget(d.budget || defaultBudget),
    events: Array.isArray(d.events) ? d.events : seedEvents,
    settings: { ...defaultSettings, ...(d.settings || {}) },
  }
}

function localLoad() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return migrateAll(JSON.parse(raw))
  } catch {}
  return freshState()
}

function localSave(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {}
}

export function useStore(session) {
  const [state, setState] = useState(() => (supabaseEnabled ? freshState() : localLoad()))
  const [loading, setLoading] = useState(supabaseEnabled)
  const [shareToken, setShareToken] = useState(null)
  const hydrated = useRef(!supabaseEnabled)
  const rowId = useRef(null)

  // Supabase: load (or create) this user's wedding row when they sign in.
  useEffect(() => {
    if (!supabaseEnabled) return
    if (!session) {
      hydrated.current = false
      rowId.current = null
      setShareToken(null)
      setLoading(false)
      return
    }
    let cancel = false
    ;(async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('weddings')
        .select('id, data, share_token')
        .eq('user_id', session.user.id)
        .maybeSingle()
      if (cancel) return
      if (error) console.error('[store] load/select error:', error.message || error)
      if (data) {
        console.log('[store] loaded existing wedding row', data.id)
        rowId.current = data.id
        setShareToken(data.share_token)
        setState(migrateAll(data.data))
      } else {
        console.log('[store] no row found — creating one')
        const seed = freshState()
        const { data: created, error: insErr } = await supabase
          .from('weddings')
          .insert({ user_id: session.user.id, data: seed })
          .select('id, data, share_token')
          .single()
        if (insErr) console.error('[store] insert error:', insErr.message || insErr)
        if (created) {
          rowId.current = created.id
          setShareToken(created.share_token)
          setState(migrateAll(created.data))
        }
      }
      hydrated.current = true
      setLoading(false)
    })()
    return () => {
      cancel = true
    }
  }, [session])

  // Persist changes: debounced upsert to Supabase, or straight to localStorage.
  useEffect(() => {
    if (!hydrated.current) return
    if (supabaseEnabled) {
      if (!rowId.current) return
      const t = setTimeout(async () => {
        const { error } = await supabase
          .from('weddings')
          .update({ data: state, updated_at: new Date().toISOString() })
          .eq('id', rowId.current)
        if (error) console.error('[store] save error:', error.message || error)
        else console.log('[store] saved')
      }, 700)
      return () => clearTimeout(t)
    }
    localSave(state)
  }, [state])

  const setDetails = (details) => setState((s) => ({ ...s, details }))

  const addGuest = (guest) =>
    setState((s) => ({
      ...s,
      guests: [...s.guests, { id: crypto.randomUUID(), rsvp: 'pending', partySize: 1, meal: '', notes: '', ...guest }],
    }))

  const updateGuest = (id, patch) =>
    setState((s) => ({ ...s, guests: s.guests.map((g) => (g.id === id ? { ...g, ...patch } : g)) }))

  const removeGuest = (id) =>
    setState((s) => ({ ...s, guests: s.guests.filter((g) => g.id !== id) }))

  const setBudgetTotal = (total) =>
    setState((s) => ({ ...s, budget: { ...s.budget, total: Number(total) || 0 } }))

  const addBudgetItem = (item = {}) =>
    setState((s) => ({
      ...s,
      budget: {
        ...s.budget,
        items: [
          ...s.budget.items,
          { id: crypto.randomUUID(), category: 'New item', vendor: '', website: '', estimated: 0, actual: 0, paidAmount: 0, dueDate: '', ...item },
        ],
      },
    }))

  const updateBudgetItem = (id, patch) =>
    setState((s) => ({
      ...s,
      budget: { ...s.budget, items: s.budget.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) },
    }))

  const removeBudgetItem = (id) =>
    setState((s) => ({ ...s, budget: { ...s.budget, items: s.budget.items.filter((it) => it.id !== id) } }))

  const addEvent = (event = {}) =>
    setState((s) => ({
      ...s,
      events: [...s.events, { id: crypto.randomUUID(), date: '', title: 'New event', notes: '', ...event }],
    }))

  const updateEvent = (id, patch) =>
    setState((s) => ({ ...s, events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)) }))

  const removeEvent = (id) =>
    setState((s) => ({ ...s, events: s.events.filter((e) => e.id !== id) }))

  const setNotifyTimeline = (on) =>
    setState((s) => ({ ...s, settings: { ...s.settings, notifyTimeline: !!on } }))

  // Remember a due-date reminder we've already shown, so it fires only once.
  const markDueNotified = (key) =>
    setState((s) => ({
      ...s,
      settings: { ...s.settings, notifiedDue: { ...(s.settings.notifiedDue || {}), [key]: true } },
    }))

  return {
    ...state,
    loading,
    shareToken,
    setDetails,
    addGuest,
    updateGuest,
    removeGuest,
    setBudgetTotal,
    addBudgetItem,
    updateBudgetItem,
    removeBudgetItem,
    addEvent,
    updateEvent,
    removeEvent,
    setNotifyTimeline,
    markDueNotified,
  }
}

export function budgetStats(budget) {
  const items = budget?.items || []
  const total = budget?.total || 0
  const estimated = items.reduce((n, it) => n + (Number(it.estimated) || 0), 0)
  const actual = items.reduce((n, it) => n + (Number(it.actual) || 0), 0)
  const paid = items.reduce((n, it) => n + (Number(it.paidAmount) || 0), 0)
  const outstanding = actual - paid
  const remaining = total - actual
  return { total, estimated, actual, paid, outstanding, remaining }
}

export function guestStats(guests) {
  const stat = { invited: 0, attending: 0, declined: 0, pending: 0 }
  for (const g of guests) {
    stat.invited += g.partySize || 1
    if (g.rsvp === 'yes') stat.attending += g.partySize || 1
    else if (g.rsvp === 'no') stat.declined += g.partySize || 1
    else stat.pending += g.partySize || 1
  }
  return stat
}
