// Tiny localStorage-backed store. Swap for an API/db in v2.
import { useEffect, useState } from 'react'

const KEY = 'heygirl.v1'

export const defaultDetails = {
  coupleNames: 'Alex & Sam',
  date: '2026-09-19',
  time: '4:30 PM',
  venueName: 'The Rosewood Barn',
  venueAddress: '1200 Vineyard Ln, Sonoma, CA',
  dressCode: 'Garden formal',
  registryUrl: '',
  parking: 'Free lot on-site, plus valet after 4 PM.',
  hotelBlock: 'Block at the Sonoma Inn under "Alex & Sam Wedding".',
  extraNotes: 'Outdoor ceremony, indoor reception. Kid-friendly until 8 PM.',
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

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      // backfill / migrate for users upgrading from an earlier save
      parsed.budget = migrateBudget(parsed.budget)
      if (!Array.isArray(parsed.events)) parsed.events = seedEvents
      parsed.settings = { ...defaultSettings, ...(parsed.settings || {}) }
      return parsed
    }
  } catch {}
  return { details: defaultDetails, guests: seedGuests, budget: defaultBudget, events: seedEvents, settings: defaultSettings }
}

function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {}
}

export function useStore() {
  const [state, setState] = useState(load)

  useEffect(() => save(state), [state])

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
