import { useState, useEffect } from 'react'
import { useStore, guestStats } from './lib/store.js'
import { getSharedToken, getSharedDetails, isGuestEntry } from './lib/share.js'
import { enableNotifications, showNotification } from './lib/notify.js'
import { supabaseEnabled } from './lib/supabase.js'
import { useSession, signOut } from './lib/auth.js'
import Chat from './components/Chat.jsx'
import GuestList from './components/GuestList.jsx'
import BridalParty from './components/BridalParty.jsx'
import Details from './components/Details.jsx'
import Budget from './components/Budget.jsx'
import Calendar from './components/Calendar.jsx'
import Events from './components/Events.jsx'
import Share from './components/Share.jsx'
import Registry from './components/Registry.jsx'
import Honeymoon from './components/Honeymoon.jsx'
import Stationery from './components/Stationery.jsx'
import Vendor from './components/Vendor.jsx'
import Decisions from './components/Decisions.jsx'
import Faq from './components/Faq.jsx'
import Home from './components/Home.jsx'
import Login from './components/Login.jsx'
import GuestGate from './components/GuestGate.jsx'
import GuestEntry from './components/GuestEntry.jsx'

// Tab layout mode: 'phone' (icon-only), 'narrow' (a few tabs + More), 'wide' (all).
function useTabMode() {
  const get = () => {
    if (typeof window === 'undefined') return 'wide'
    if (window.matchMedia('(max-width: 480px)').matches) return 'phone'
    if (window.matchMedia('(min-width: 1000px)').matches) return 'wide'
    return 'narrow'
  }
  const [mode, setMode] = useState(get)
  useEffect(() => {
    const on = () => setMode(get())
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return mode
}

function prettyDate(str) {
  if (!str) return ''
  const [y, m, d] = String(str).split('-').map(Number)
  if (!y || !m || !d) return ''
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

// Welcome bubbles — revealed one at a time in the chat. The "everything's a
// placeholder" explanation now lives in the FAQ tab instead of the first bubble.
const COUPLE_INTRO = [
  'Congratulations on your engagement! 💕',
  "I'm your wedding planning bestie — ask me about your timeline, budget, etiquette, or anything wedding related.",
  'Poke around the tabs and update anything to make it your own!',
]

const TABS = [
  { id: 'chat', label: '💬 Hey Girl Chat', name: 'Hey Girl Chat', short: '💬 Chat', icon: '💬' },
  { id: 'calendar', label: '📅 Calendar', name: 'Calendar', short: '📅 Calendar', icon: '📅' },
  { id: 'events', label: '🎉 Events', name: 'Events', short: '🎉 Events', icon: '🎉' },
  { id: 'guests', label: '🎟️ Guests', name: 'Guests', short: '🎟️ Guests', icon: '🎟️' },
  { id: 'bridalparty', label: '💐 Bridal Party', name: 'Bridal Party', short: '💐 Party', icon: '💐' },
  { id: 'budget', label: '💰 Budget', name: 'Budget', short: '💰 Budget', icon: '💰' },
  { id: 'vendors', label: '🤝 Vendors', name: 'Vendors', short: '🤝 Vendors', icon: '🤝' },
  { id: 'decisions', label: '✅ Decisions', name: 'Decisions', short: '✅ Decisions', icon: '✅' },
  { id: 'stationery', label: '✉️ Invitations', name: 'Invitations & Stationery', short: '✉️ Invites', icon: '✉️' },
  { id: 'details', label: '📋 Shared Details', name: 'Shared Details', short: '📋 Details', icon: '📋' },
  { id: 'registry', label: '🎁 Registry', name: 'Registry', short: '🎁 Registry', icon: '🎁' },
  { id: 'honeymoon', label: '🌴 Honeymoon', name: 'Honeymoon', short: '🌴 Honeymoon', icon: '🌴' },
  { id: 'share', label: '🔗 Share', name: 'Share', short: '🔗 Share', icon: '🔗' },
  { id: 'guestmode', label: '👀 Guest View', name: 'Guest View', short: '👀 Guests', icon: '👀' },
  { id: 'faq', label: '❓ FAQ', name: 'FAQ', short: '❓ FAQ', icon: '❓' },
]

// On phones, only these show in the bottom bar; the rest live under a "•••" tab.
// Priority tabs (in this order) shown in the compact bottom bar; rest go under "•••".
const MOBILE_PRIMARY = ['chat', 'details', 'guests', 'events', 'calendar']

function Splash({ text = 'Loading…' }) {
  return (
    <div className="app">
      <div className="splash">
        <div className="splash-logo">Hey&nbsp;Girl!</div>
        <div className="splash-text">{text}</div>
      </div>
    </div>
  )
}

// Top-level router: guest links bypass auth entirely. A bare ?guest=1 (no
// token) shows the guest entry page — paste a link or enter a wedding code.
export default function App() {
  const token = getSharedToken()
  const legacy = getSharedDetails()
  if (token) return <GuestApp token={token} />
  if (legacy) return <GuestApp initialDetails={legacy} />
  if (isGuestEntry()) return <GuestEntry />
  return <CoupleApp />
}

// Personalized opening line once a guest has identified themselves.
function guestIntro(coupleName, identity) {
  if (!identity) return `Hi! I'm Hey Girl 💕 Ask me anything about ${coupleName}'s wedding — date, venue, dress code, parking, you name it.`
  const s = identity.summary || {}
  const who = identity.name ? `, ${identity.name}` : ''
  if (s.hasRsvp) {
    const status = s.rsvp === 'yes' ? `attending with a party of ${s.partySize}` : s.rsvp === 'no' ? 'not able to make it' : 'recorded'
    return `Hi${who}! 💕 You're already RSVP'd as ${status}. Want to edit your RSVP, or ask me anything about ${coupleName}'s wedding?`
  }
  return `Hi${who}! 💕 I don't have your RSVP yet — want to RSVP now? You can also ask me anything about ${coupleName}'s wedding.`
}

function guestSuggestions(identity) {
  if (!identity) return ['When and where is it?', "What's the dress code?", 'Is there a hotel block?']
  return identity.summary?.hasRsvp
    ? ['Edit my RSVP', "What's the dress code?", 'Where are you registered?']
    : ["I'd like to RSVP", 'When and where is it?', "What's the dress code?"]
}

// Standalone, login-free guest experience. With a token it fetches the public
// details from the server; legacy links pass details in directly.
function GuestApp({ token, initialDetails }) {
  const [details, setDetails] = useState(initialDetails || null)
  const [error, setError] = useState('')
  const [identity, setIdentity] = useState(null) // { name, password, summary }

  useEffect(() => {
    if (initialDetails || !token) return
    let cancel = false
    fetch(`/api/guest/${encodeURIComponent(token)}`)
      .then((r) => (r.ok ? r.json() : r.json().then((e) => Promise.reject(e))))
      .then((d) => !cancel && setDetails(d.details || {}))
      .catch((e) => !cancel && setError(e?.error || 'This guest link is invalid or has expired.'))
    return () => { cancel = true }
  }, [token, initialDetails])

  if (error) return <Splash text={error} />
  if (!details) return <Splash text="Loading the wedding details…" />

  const name = details.coupleNames || 'the'
  // Token links require the guest to identify (name + password) before chatting.
  const needsGate = !!token && !identity

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">Hey&nbsp;Girl!</span>
          <span className="tagline">{name}'s wedding</span>
        </div>
      </header>
      <main className="content">
        {needsGate ? (
          <GuestGate token={token} coupleNames={name} onAccess={setIdentity} />
        ) : (
          <Chat
            mode="guest"
            details={details}
            guestToken={token}
            guestIdentity={identity}
            guestContext={identity?.summary || null}
            onRsvpSubmitted={(guest) => setIdentity((id) => (id ? { ...id, summary: guest } : id))}
            intro={guestIntro(name, identity)}
            suggestions={guestSuggestions(identity)}
          />
        )}
      </main>
    </div>
  )
}

function CoupleApp() {
  const { session, ready, recovery, clearRecovery } = useSession()
  const store = useStore(session)
  // Land on Home after signing in; on refresh, restore the tab they were on.
  const [tab, setTab] = useState(() => {
    try {
      const saved = localStorage.getItem('heygirl.lastTab')
      return TABS.some((t) => t.id === saved) ? saved : 'home'
    } catch {
      return 'home'
    }
  })
  useEffect(() => {
    try { localStorage.setItem('heygirl.lastTab', tab) } catch {}
  }, [tab])
  const [menuOpen, setMenuOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [pendingPrompt, setPendingPrompt] = useState(null)
  const [chatMessages, setChatMessages] = useState([]) // persists chat for the session
  const tabMode = useTabMode()

  // Send a suggested prompt to Hey Girl: stash it, then jump to the chat tab.
  const askHeyGirl = (prompt) => { setPendingPrompt(prompt); setMoreOpen(false); setMenuOpen(false); setTab('chat') }

  // When notifications are on, remind about budget balances due within 3 days.
  useEffect(() => {
    if (!store.settings?.notifyTimeline) return
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const money = (n) => `$${Math.round(Number(n) || 0).toLocaleString('en-US')}`
    for (const it of store.budget?.items || []) {
      if (!it.dueDate) continue
      const owe = Math.max(0, (Number(it.actual) || 0) - (Number(it.paidAmount) || 0))
      if (owe <= 0) continue
      const key = `${it.id}:${it.dueDate}`
      if (store.settings.notifiedDue?.[key]) continue
      const [y, m, d] = it.dueDate.split('-').map(Number)
      if (!y || !m || !d) continue
      const days = Math.round((new Date(y, m - 1, d) - today) / 86400000)
      if (days >= 0 && days <= 3) {
        const when = days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`
        showNotification('Payment due soon 💰', `${it.category}: ${money(owe)} due ${when}.`)
        store.markDueNotified(key)
      }
    }
  }, [store.settings?.notifyTimeline, store.budget, store.settings?.notifiedDue])

  async function handleToggleNotify(wantOn) {
    if (wantOn) {
      const { ok, reason } = await enableNotifications()
      store.setNotifyTimeline(ok)
      if (ok) showNotification('Notifications on 💍', "I'll ping you when I suggest timeline tasks.")
      else if (reason === 'denied')
        alert('Notifications are blocked in your browser settings. Enable them there to get timeline reminders.')
    } else {
      store.setNotifyTimeline(false)
    }
  }

  if (!ready) return <Splash />
  if (supabaseEnabled && recovery) return <Login recoveryMode onRecovered={clearRecovery} />
  if (supabaseEnabled && !session) return <Login />
  if (store.loading) return <Splash text="Loading your wedding…" />

  const stats = guestStats(store.guests)

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-title">
            <span className="logo">Hey&nbsp;Girl!</span>
            <button className="home-btn" onClick={() => setTab('home')} title="Home">🏠 Home</button>
          </div>
          <span className="tagline">
            {store.details.coupleNames}
            {store.details.date ? ` · ${prettyDate(store.details.date)}` : ''}
          </span>
        </div>
        <div className="topbar-actions">
          <a className="back-link" href="/">← site</a>
          {supabaseEnabled && session && (
            <button className="back-link" onClick={() => { try { localStorage.removeItem('heygirl.lastTab') } catch {} ; signOut() }}>Sign out</button>
          )}
        </div>
      </header>

      <div className="subbar">
        <button className="menu-btn" onClick={() => setMenuOpen(true)} aria-label="Open menu">☰</button>
      </div>

      {menuOpen && (
        <>
          <div className="sidebar-backdrop" onClick={() => setMenuOpen(false)} />
          <nav className="sidebar">
            <div className="sidebar-head">
              <span className="sidebar-title">Menu</span>
              <button className="sidebar-close" onClick={() => setMenuOpen(false)} aria-label="Close menu">×</button>
            </div>
            {TABS.map((t) => (
              <button
                key={t.id}
                className={`sidebar-item ${tab === t.id ? 'active' : ''}`}
                onClick={() => { setTab(t.id); setMenuOpen(false) }}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </>
      )}

      <main className="content">
        {tab === 'chat' ? (
          <Chat
            mode="couple"
            details={store.details}
            stats={stats}
            budget={store.budget}
            events={store.events}
            onAddEvent={store.addEvent}
            onAddBudgetItem={store.addBudgetItem}
            timelineOffer
            notifyEnabled={store.settings.notifyTimeline}
            onToggleNotify={handleToggleNotify}
            intro={COUPLE_INTRO}
            messages={chatMessages}
            setMessages={setChatMessages}
            pendingPrompt={pendingPrompt}
            onPromptConsumed={() => setPendingPrompt(null)}
            suggestions={[
              "What's left in the flowers budget?",
              'When should I send save-the-dates?',
              'What should I be doing 3 months out?',
            ]}
          />
        ) : tab === 'home' ? (
          <Home
            details={store.details}
            stats={stats}
            budget={store.budget}
            events={store.events}
            weddingEvents={store.weddingEvents}
            decisions={store.decisions}
            onAskHeyGirl={askHeyGirl}
            onOpenChat={() => setTab('chat')}
            onOpenTab={setTab}
          />
        ) : (
          <>
            {tab !== 'share' && (
              <div className="tab-header">
                <h1>{TABS.find((t) => t.id === tab)?.name}</h1>
              </div>
            )}
            <div className="tab-body">
              {tab === 'calendar' && (
          <Calendar
            details={store.details}
            events={store.events}
            budget={store.budget}
            weddingEvents={store.weddingEvents}
            addEvent={store.addEvent}
            updateEvent={store.updateEvent}
            removeEvent={store.removeEvent}
            onOpenTab={setTab}
          />
        )}

        {tab === 'guests' && (
          <GuestList
            guests={store.guests}
            addGuest={store.addGuest}
            updateGuest={store.updateGuest}
            removeGuest={store.removeGuest}
          />
        )}

        {tab === 'budget' && (
          <Budget
            budget={store.budget}
            setBudgetTotal={store.setBudgetTotal}
            addBudgetItem={store.addBudgetItem}
            updateBudgetItem={store.updateBudgetItem}
            removeBudgetItem={store.removeBudgetItem}
          />
        )}

        {tab === 'events' && (
          <Events
            weddingEvents={store.weddingEvents}
            addWeddingEvent={store.addWeddingEvent}
            updateWeddingEvent={store.updateWeddingEvent}
            removeWeddingEvent={store.removeWeddingEvent}
            details={store.details}
            setDetails={store.setDetails}
          />
        )}

        {tab === 'bridalparty' && <BridalParty guests={store.guests} updateGuest={store.updateGuest} details={store.details} setDetails={store.setDetails} />}

        {tab === 'vendors' && (
          <Vendor
            vendors={store.vendors}
            addVendor={store.addVendor}
            updateVendor={store.updateVendor}
            removeVendor={store.removeVendor}
            addDecision={store.addDecision}
            onGoToDecisions={() => setTab('decisions')}
            budget={store.budget}
            events={store.events}
          />
        )}

        {tab === 'decisions' && (
          <Decisions
            decisions={store.decisions}
            addDecision={store.addDecision}
            updateDecision={store.updateDecision}
            removeDecision={store.removeDecision}
            addVendor={store.addVendor}
            onGoToVendors={() => setTab('vendors')}
            onAskHeyGirl={askHeyGirl}
          />
        )}

        {tab === 'details' && <Details details={store.details} setDetails={store.setDetails} weddingEvents={store.weddingEvents} guests={store.guests} />}

        {tab === 'registry' && <Registry details={store.details} setDetails={store.setDetails} onAskHeyGirl={() => setTab('chat')} />}

        {tab === 'honeymoon' && <Honeymoon honeymoon={store.honeymoon} setHoneymoon={store.setHoneymoon} />}

        {tab === 'stationery' && <Stationery stationery={store.stationery} setStationery={store.setStationery} />}

        {tab === 'share' && <Share details={store.details} shareToken={store.shareToken} approxSize={stats.invited} />}

        {tab === 'faq' && <Faq />}

        {tab === 'guestmode' && (
          <div className="guestmode-wrap">
            <p className="hint">
              This is what your <strong>guests</strong> see. Hey Girl answers only from your published data —
              the info in your <strong>Shared Details</strong> tab. Private notes, budget, and the guest list stay
              hidden. Use the <strong>Share</strong> tab to send guests their own link.
            </p>
            <Chat
              mode="guest"
              details={store.details}
              intro={[
                "Hi! I'm Hey Girl 💕",
                `Ask me anything about ${store.details.coupleNames}'s wedding — date, venue, dress code, parking, whether events are kid-friendly, you name it.`,
              ]}
              suggestions={['When and where is it?', "What's the dress code?", 'Is there a hotel block?']}
            />
          </div>
        )}
            </div>
          </>
        )}
      </main>

      {tabMode !== 'wide' && moreOpen && (
        <>
          <div className="more-backdrop" onClick={() => setMoreOpen(false)} />
          <div className="more-popup">
            {TABS.filter((t) => !MOBILE_PRIMARY.includes(t.id)).map((t) => (
              <button
                key={t.id}
                className={`more-item ${tab === t.id ? 'active' : ''}`}
                onClick={() => { setTab(t.id); setMoreOpen(false) }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </>
      )}

      <nav className="tabbar">
        {tabMode === 'wide'
          ? TABS.map((t) => (
              <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))
          : (
            <>
              {MOBILE_PRIMARY.map((id) => TABS.find((t) => t.id === id)).filter(Boolean).map((t) => (
                <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => { setMoreOpen(false); setTab(t.id) }}>
                  {t.short || t.label}
                </button>
              ))}
              <button className={`tab-more ${!MOBILE_PRIMARY.includes(tab) ? 'active' : ''}`} onClick={() => setMoreOpen((o) => !o)} aria-label="More tabs">
                ••• More
              </button>
            </>
          )}
      </nav>
    </div>
  )
}
