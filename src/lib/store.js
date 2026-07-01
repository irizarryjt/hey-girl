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
  // Registry
  hasRegistry: true,
  registries: [{ id: 'r1', name: 'Crate & Barrel', url: 'https://www.crateandbarrel.com/gift-registry' }],
  registryMessage: '',
  stickToRegistry: false,
  // Guest-permission toggles (off by default — couple opts in to share)
  allowSizeInquiry: false,
  allowStickToRegistryInquiry: false,
}

// Build the display name used in headers, the share link, and Hey Girl's context.
// Displays first names only: "First & First".
export function composeCoupleNames(d = {}) {
  const a = (d.partner1First || '').trim()
  const b = (d.partner2First || '').trim()
  return [a, b].filter(Boolean).join(' & ')
}

// Upgrade older saved details: structured name fields + registry/permission fields.
function migrateDetails(details) {
  let d = details && typeof details === 'object' ? details : defaultDetails

  // Names: split a legacy "A & B" coupleNames into structured fields.
  if (d.partner1First === undefined && d.partner2First === undefined) {
    const parts = String(d.coupleNames || '').split('&').map((s) => s.trim())
    const splitName = (full) => {
      const bits = String(full || '').split(/\s+/).filter(Boolean)
      return { first: bits.shift() || '', last: bits.join(' ') }
    }
    const p1 = splitName(parts[0])
    const p2 = splitName(parts[1])
    d = { ...d, partner1First: p1.first, partner1Last: p1.last, partner2First: p2.first, partner2Last: p2.last }
  }

  // Registry: normalize links, migrating a legacy single registryUrl into the list.
  let registries = Array.isArray(d.registries)
    ? d.registries.map((r) => ({ id: r.id || crypto.randomUUID(), name: r.name || '', url: r.url || '' }))
    : []
  if (!registries.length && d.registryUrl) registries = [{ id: crypto.randomUUID(), name: '', url: d.registryUrl }]

  return {
    ...d,
    hasRegistry: d.hasRegistry !== false,
    registries,
    registryMessage: d.registryMessage || '',
    stickToRegistry: !!d.stickToRegistry,
    allowSizeInquiry: !!d.allowSizeInquiry,
    allowStickToRegistryInquiry: !!d.allowStickToRegistryInquiry,
  }
}

// A blank registry entry (store/site name + link).
export function emptyRegistry(extra = {}) {
  return { id: crypto.randomUUID(), name: '', url: '', ...extra }
}

// Default set of events a guest can be invited to.
export const defaultInvitedTo = { ceremony: true, reception: true, rehearsal: false, welcome: false, brunch: false }

// Bridal party roles ('' = not in the party). Shared by the Guests + Bridal Party tabs.
export const BRIDAL_ROLES = [
  '', 'Maid of Honor', 'Matron of Honor', 'Best Man', 'Bridesmaid', 'Groomsman',
  'Flower Girl', 'Ring Bearer', 'Usher', 'Officiant', 'Parent of the couple', 'Other',
]

// A blank additional party member (plus-ones / family) with their own contact info.
export function emptyMember(extra = {}) {
  return {
    id: crypto.randomUUID(),
    name: '', email: '', phone: '', address: '', useForMailing: false,
    isChild: false, meal: '', dietary: '', ...extra,
  }
}

const seedGuests = [
  {
    id: 'g1', name: 'Jordan Lee', email: 'jordan@example.com', phone: '(555) 200-1010',
    address: '14 Maple St, Austin, TX 78701', useForMailing: true, rsvp: 'yes', meal: 'Chicken',
    dietary: '', isChild: false, side: 'bride', relationship: 'friend', table: '4', outOfTown: false,
    bridalParty: 'Maid of Honor',
    invitedTo: { ceremony: true, reception: true, rehearsal: false, welcome: true, brunch: false },
    saveTheDateSent: true, invitationSent: true, thankYouSent: false, giftReceived: false, gift: '', notes: '',
    party: [
      { id: 'g1p1', name: 'Riley Lee', email: '', phone: '', address: '', useForMailing: false, isChild: false, meal: 'Beef', dietary: 'No nuts' },
    ],
  },
  {
    id: 'g2', name: 'Taylor Brooks', email: '', phone: '', address: '', useForMailing: true,
    rsvp: 'pending', meal: '', dietary: '', isChild: false, side: 'groom', relationship: 'friend',
    table: '', outOfTown: true, invitedTo: { ceremony: true, reception: true, rehearsal: false, welcome: false, brunch: false },
    saveTheDateSent: true, invitationSent: false, thankYouSent: false, giftReceived: false, gift: '', notes: 'College roommate', party: [],
  },
  {
    id: 'g3', name: 'Morgan Diaz', email: '', phone: '', address: '', useForMailing: true,
    rsvp: 'no', meal: '', dietary: '', isChild: false, side: 'bride', relationship: 'family',
    table: '', outOfTown: true, invitedTo: { ceremony: true, reception: true, rehearsal: true, welcome: false, brunch: false },
    saveTheDateSent: true, invitationSent: true, thankYouSent: false, giftReceived: true, gift: 'KitchenAid stand mixer', notes: 'Out of town',
    party: [
      { id: 'g3p1', name: 'Sam Diaz', email: '', phone: '', address: '', useForMailing: false, isChild: false, meal: '', dietary: '' },
      { id: 'g3p2', name: 'Ana Diaz', email: '', phone: '', address: '', useForMailing: false, isChild: true, meal: '', dietary: '' },
      { id: 'g3p3', name: 'Leo Diaz', email: '', phone: '', address: '', useForMailing: false, isChild: true, meal: '', dietary: '' },
    ],
  },
]

export const VENDOR_STATUSES = ['Researching', 'Contacted', 'Booked', 'Declined']

export function emptyVendor(extra = {}) {
  return { id: crypto.randomUUID(), name: '', type: '', status: 'Researching', website: '', phone: '', email: '', contact: '', notes: '', ...extra }
}

const seedVendors = [
  { id: 'v1', name: 'The Rosewood Barn', type: 'Venue', status: 'Booked', website: 'https://example.com/rosewood-barn', phone: '(707) 555-0188', email: 'events@rosewoodbarn.example', contact: 'Dana', notes: 'Ceremony + reception site.' },
]

export function emptyDecision(extra = {}) {
  return { id: crypto.randomUUID(), label: '', done: false, link: '', notes: '', ...extra }
}

// Things couples plan that aren't covered by the other tabs.
const seedDecisions = [
  { id: 'd1', label: 'Wedding dress selected', done: false, link: '', notes: '' },
  { id: 'd2', label: "Partner's attire / suit", done: false, link: '', notes: '' },
  { id: 'd3', label: 'Hair stylist booked', done: false, link: '', notes: '' },
  { id: 'd4', label: 'Makeup artist booked', done: false, link: '', notes: '' },
  { id: 'd5', label: 'Cake / dessert chosen', done: false, link: '', notes: '' },
  { id: 'd6', label: 'First dance song', done: false, link: '', notes: '' },
  { id: 'd7', label: 'Music — DJ or band', done: false, link: '', notes: '' },
  { id: 'd8', label: 'Officiant confirmed', done: false, link: '', notes: '' },
  { id: 'd9', label: 'Vows written', done: false, link: '', notes: '' },
  { id: 'd10', label: 'Rings purchased', done: false, link: '', notes: '' },
  { id: 'd11', label: 'Color palette / theme', done: false, link: '', notes: '' },
  { id: 'd12', label: 'Invitations & stationery', done: false, link: '', notes: '' },
  { id: 'd13', label: 'Honeymoon booked', done: false, link: '', notes: '' },
  { id: 'd14', label: 'Transportation arranged', done: false, link: '', notes: '' },
  { id: 'd15', label: 'Seating chart', done: false, link: '', notes: '' },
  { id: 'd16', label: 'Day-of timeline', done: false, link: '', notes: '' },
  { id: 'd17', label: 'Weather / backup plan', done: false, link: '', notes: '' },
  { id: 'd18', label: 'Favors / welcome bags', done: false, link: '', notes: '' },
]

// Detailed main wedding events (richer than calendar items). The ceremony's
// shared fields live on `details`, so they populate the Details tab + guest view.
export function emptyWeddingEvent(extra = {}) {
  return { id: crypto.randomUUID(), key: '', name: 'New event', date: '', time: '', endTime: '', venueName: '', venueAddress: '', dressCode: '', kidFriendly: false, guestVisible: false, notes: '', ...extra }
}

const GUEST_VISIBLE_KEYS = ['ceremony', 'reception', 'welcome', 'brunch']

const seedWeddingEvents = [
  { id: 'we1', key: 'rehearsal', name: 'Rehearsal Dinner', date: '2026-09-18', time: '6:00 PM', endTime: '8:30 PM', venueName: 'Sonoma Bistro', venueAddress: '', dressCode: 'Cocktail', kidFriendly: false, guestVisible: false, notes: 'Wedding party + close family.' },
  { id: 'we2', key: 'ceremony', name: 'Wedding Ceremony', date: '', time: '', endTime: '5:00 PM', venueName: '', venueAddress: '', dressCode: '', kidFriendly: true, guestVisible: true, notes: 'Outdoor ceremony in the garden.' },
  { id: 'we3', key: 'reception', name: 'Wedding Reception', date: '2026-09-19', time: '5:30 PM', endTime: '11:00 PM', venueName: 'The Rosewood Barn', venueAddress: '1200 Vineyard Ln, Sonoma, CA', dressCode: 'Garden formal', kidFriendly: true, guestVisible: true, notes: 'Dinner, toasts, and dancing. Kid-friendly until 8 PM.' },
  { id: 'we4', key: 'welcome', name: 'Welcome Party', date: '2026-09-18', time: '8:00 PM', endTime: '', venueName: '', venueAddress: '', dressCode: 'Casual', kidFriendly: true, guestVisible: true, notes: 'Optional — for out-of-town guests.' },
  { id: 'we5', key: 'brunch', name: 'Day-After Brunch', date: '2026-09-20', time: '10:00 AM', endTime: '', venueName: '', venueAddress: '', dressCode: 'Casual', kidFriendly: true, guestVisible: true, notes: '' },
]

export const defaultHoneymoon = {
  destination: '', startDate: '', endDate: '', budget: 0, notes: '',
  checklist: [
    { id: 'hm1', label: 'Passports valid / renewed', done: false },
    { id: 'hm2', label: 'Flights booked', done: false },
    { id: 'hm3', label: 'Accommodation booked', done: false },
    { id: 'hm4', label: 'Travel insurance', done: false },
    { id: 'hm5', label: 'Itinerary / activities planned', done: false },
    { id: 'hm6', label: 'Time off work approved', done: false },
  ],
}

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

// Upgrade guests to the richer shape (contact info, named party members with
// their own contact, dietary, seating, events, etiquette + gift tracking).
function migrateMember(m = {}) {
  return {
    id: m.id || crypto.randomUUID(),
    name: m.name || '', email: m.email || '', phone: m.phone || '', address: m.address || '',
    useForMailing: !!m.useForMailing, isChild: !!m.isChild, meal: m.meal || '', dietary: m.dietary || '',
  }
}

function migrateGuest(g = {}) {
  let party = Array.isArray(g.party) ? g.party.map(migrateMember) : []
  // Back-compat: an old numeric partySize becomes (size - 1) blank party members.
  if (!Array.isArray(g.party) && Number(g.partySize) > 1) {
    party = Array.from({ length: Number(g.partySize) - 1 }, () => migrateMember())
  }
  return {
    // Preserve guest-written fields the couple's UI doesn't manage (e.g. access
    // password hash, selfReported, rsvpSubmittedAt) so saves don't wipe them.
    ...g,
    id: g.id || crypto.randomUUID(),
    name: g.name || '',
    email: g.email || '', phone: g.phone || '', address: g.address || '',
    useForMailing: g.useForMailing ?? true,
    rsvp: g.rsvp || 'pending',
    meal: g.meal || '', dietary: g.dietary || '', isChild: !!g.isChild,
    side: g.side || '', relationship: g.relationship || '', table: g.table || '',
    bridalParty: g.bridalParty || '',
    outOfTown: !!g.outOfTown,
    invitedTo: { ...defaultInvitedTo, ...(g.invitedTo || {}) },
    saveTheDateSent: !!g.saveTheDateSent, invitationSent: !!g.invitationSent, thankYouSent: !!g.thankYouSent,
    giftReceived: !!g.giftReceived, gift: g.gift || '',
    notes: g.notes || '',
    party,
  }
}

function migrateGuests(guests) {
  if (!Array.isArray(guests)) return seedGuests
  return guests.map(migrateGuest)
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
  return { details: defaultDetails, guests: seedGuests, budget: defaultBudget, events: seedEvents, settings: defaultSettings, vendors: seedVendors, decisions: seedDecisions, weddingEvents: seedWeddingEvents, honeymoon: defaultHoneymoon }
}

function migrateHoneymoon(h) {
  if (!h || typeof h !== 'object') return defaultHoneymoon
  return {
    ...defaultHoneymoon,
    ...h,
    checklist: Array.isArray(h.checklist) ? h.checklist : defaultHoneymoon.checklist,
  }
}

function migrateVendors(vendors) {
  if (!Array.isArray(vendors)) return seedVendors
  return vendors.map((v) => ({ ...emptyVendor(), ...v, id: v.id || crypto.randomUUID() }))
}
function migrateDecisions(decisions) {
  if (!Array.isArray(decisions)) return seedDecisions
  return decisions.map((d) => ({ ...emptyDecision(), ...d, id: d.id || crypto.randomUUID() }))
}
function migrateWeddingEvents(weddingEvents) {
  if (!Array.isArray(weddingEvents)) return seedWeddingEvents
  return weddingEvents.map((e) => {
    const m = { ...emptyWeddingEvent(), ...e, id: e.id || crypto.randomUUID() }
    if (typeof e.guestVisible !== 'boolean') m.guestVisible = GUEST_VISIBLE_KEYS.includes(e.key)
    return m
  })
}

// Couple names captured at sign-up are stashed here until their wedding row is
// created (which may be on a later sign-in if email confirmation is required).
const PENDING_DETAILS_KEY = 'heygirl.pendingDetails'

export function setPendingDetails(partial) {
  try {
    if (partial && Object.keys(partial).length) localStorage.setItem(PENDING_DETAILS_KEY, JSON.stringify(partial))
  } catch {}
}

function consumePendingDetails() {
  try {
    const raw = localStorage.getItem(PENDING_DETAILS_KEY)
    if (!raw) return null
    localStorage.removeItem(PENDING_DETAILS_KEY)
    return JSON.parse(raw)
  } catch {
    return null
  }
}

// Apply any names captured at sign-up to a brand-new wedding's details, then
// recompute the display "First & First" couple name.
function applyPendingNames(details) {
  const pending = consumePendingDetails()
  if (!pending) return details
  const merged = { ...details, ...pending }
  merged.coupleNames = composeCoupleNames(merged) || details.coupleNames
  return merged
}

// Normalize/migrate any saved blob (from localStorage or Supabase) into current shape.
function migrateAll(data) {
  const d = data && typeof data === 'object' ? data : {}
  return {
    details: migrateDetails(d.details || defaultDetails),
    guests: migrateGuests(d.guests),
    budget: migrateBudget(d.budget || defaultBudget),
    events: Array.isArray(d.events) ? d.events : seedEvents,
    settings: { ...defaultSettings, ...(d.settings || {}) },
    vendors: migrateVendors(d.vendors),
    decisions: migrateDecisions(d.decisions),
    weddingEvents: migrateWeddingEvents(d.weddingEvents),
    honeymoon: migrateHoneymoon(d.honeymoon),
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
        seed.details = applyPendingNames(seed.details)
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
      guests: [
        ...s.guests,
        {
          id: crypto.randomUUID(), name: '', email: '', phone: '', address: '', useForMailing: true,
          rsvp: 'pending', meal: '', dietary: '', isChild: false, side: '', relationship: '', table: '',
          bridalParty: '', outOfTown: false, invitedTo: { ...defaultInvitedTo },
          saveTheDateSent: false, invitationSent: false, thankYouSent: false,
          giftReceived: false, gift: '', notes: '', party: [],
          ...guest,
        },
      ],
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

  const addVendor = (vendor = {}) =>
    setState((s) => ({ ...s, vendors: [...(s.vendors || []), emptyVendor(vendor)] }))
  const updateVendor = (id, patch) =>
    setState((s) => ({ ...s, vendors: (s.vendors || []).map((v) => (v.id === id ? { ...v, ...patch } : v)) }))
  const removeVendor = (id) =>
    setState((s) => ({ ...s, vendors: (s.vendors || []).filter((v) => v.id !== id) }))

  const addDecision = (decision = {}) =>
    setState((s) => ({ ...s, decisions: [...(s.decisions || []), emptyDecision(decision)] }))
  const updateDecision = (id, patch) =>
    setState((s) => ({ ...s, decisions: (s.decisions || []).map((d) => (d.id === id ? { ...d, ...patch } : d)) }))
  const removeDecision = (id) =>
    setState((s) => ({ ...s, decisions: (s.decisions || []).filter((d) => d.id !== id) }))

  const setHoneymoon = (patch) =>
    setState((s) => ({ ...s, honeymoon: { ...(s.honeymoon || defaultHoneymoon), ...patch } }))

  const addWeddingEvent = (event = {}) =>
    setState((s) => ({ ...s, weddingEvents: [...(s.weddingEvents || []), emptyWeddingEvent(event)] }))
  const updateWeddingEvent = (id, patch) =>
    setState((s) => ({ ...s, weddingEvents: (s.weddingEvents || []).map((e) => (e.id === id ? { ...e, ...patch } : e)) }))
  const removeWeddingEvent = (id) =>
    setState((s) => ({ ...s, weddingEvents: (s.weddingEvents || []).filter((e) => e.id !== id) }))

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
    addVendor,
    updateVendor,
    removeVendor,
    addDecision,
    updateDecision,
    removeDecision,
    addWeddingEvent,
    updateWeddingEvent,
    removeWeddingEvent,
    setHoneymoon,
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

// Party size = the primary guest + any named/placeholder party members.
export function partySize(g) {
  if (Array.isArray(g?.party)) return 1 + g.party.length
  return Number(g?.partySize) > 0 ? Number(g.partySize) : 1
}

// Adults / kids in a party, from the isChild flags (primary + members).
export function partyAgeBreakdown(g) {
  const members = Array.isArray(g?.party) ? g.party : []
  let adults = g?.isChild ? 0 : 1
  let kids = g?.isChild ? 1 : 0
  for (const m of members) {
    if (m.isChild) kids += 1
    else adults += 1
  }
  return { adults, kids }
}

export function guestStats(guests) {
  const stat = { invited: 0, attending: 0, declined: 0, pending: 0, adults: 0, kids: 0 }
  for (const g of guests) {
    const size = partySize(g)
    const { adults, kids } = partyAgeBreakdown(g)
    stat.invited += size
    if (g.rsvp === 'yes') {
      stat.attending += size
      stat.adults += adults
      stat.kids += kids
    } else if (g.rsvp === 'no') stat.declined += size
    else stat.pending += size
  }
  return stat
}
