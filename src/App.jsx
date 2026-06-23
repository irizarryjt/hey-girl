import { useState, useEffect } from 'react'
import { useStore, guestStats } from './lib/store.js'
import { getSharedDetails } from './lib/share.js'
import { enableNotifications, showNotification } from './lib/notify.js'

function prettyDate(str) {
  if (!str) return ''
  const [y, m, d] = String(str).split('-').map(Number)
  if (!y || !m || !d) return ''
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}
import Chat from './components/Chat.jsx'
import GuestList from './components/GuestList.jsx'
import Details from './components/Details.jsx'
import Budget from './components/Budget.jsx'
import Calendar from './components/Calendar.jsx'
import Share from './components/Share.jsx'

const TABS = [
  { id: 'chat', label: '💬 Hey Girl' },
  { id: 'calendar', label: '📅 Calendar' },
  { id: 'guests', label: '🎟️ Guests' },
  { id: 'budget', label: '💰 Budget' },
  { id: 'details', label: '📋 Shared Details' },
  { id: 'share', label: '🔗 Share' },
  { id: 'guestmode', label: '👀 Guest View' },
]

// If opened via a shared guest link, render a standalone guest-only experience.
function GuestApp({ details }) {
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">Hey&nbsp;Girl!</span>
          <span className="tagline">{details.coupleNames}'s wedding</span>
        </div>
      </header>
      <main className="content">
        <Chat
          mode="guest"
          details={details}
          intro={`Hi! I'm Hey Girl 💕 Ask me anything about ${details.coupleNames}'s wedding — date, venue, dress code, parking, you name it.`}
          suggestions={['When and where is it?', "What's the dress code?", 'Is there a hotel block?']}
        />
      </main>
    </div>
  )
}

export default function App() {
  const shared = getSharedDetails()
  if (shared) return <GuestApp details={shared} />

  const store = useStore()
  const [tab, setTab] = useState('chat')
  const stats = guestStats(store.guests)

  // When notifications are on, remind about budget balances due within 3 days.
  useEffect(() => {
    if (!store.settings.notifyTimeline) return
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
  }, [store.settings.notifyTimeline, store.budget, store.settings.notifiedDue])

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

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">Hey&nbsp;Girl!</span>
          <span className="tagline">
            {store.details.coupleNames}
            {store.details.date ? ` · ${prettyDate(store.details.date)}` : ''}
          </span>
        </div>
        <a className="back-link" href="/">← back to site</a>
      </header>

      <main className="content">
        {tab === 'chat' && (
          <Chat
            mode="couple"
            details={store.details}
            stats={stats}
            budget={store.budget}
            events={store.events}
            onAddEvent={store.addEvent}
            timelineOffer
            notifyEnabled={store.settings.notifyTimeline}
            onToggleNotify={handleToggleNotify}
            intro="Congratulations on your engagement! I'm your wedding planning bestie. Ask me about your timeline, budget, etiquette, or anything wedding related. Heads up: everything's filled in with placeholder details right now — a sample couple, budget, guests, and dates — just so you can see how it all works. Update anything in the tabs to make it yours."
            suggestions={[
              "What's left in the flowers budget?",
              'When should I send save-the-dates?',
              'What should I be doing 3 months out?',
            ]}
          />
        )}

        {tab === 'calendar' && (
          <Calendar
            details={store.details}
            events={store.events}
            budget={store.budget}
            addEvent={store.addEvent}
            updateEvent={store.updateEvent}
            removeEvent={store.removeEvent}
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

        {tab === 'details' && <Details details={store.details} setDetails={store.setDetails} />}

        {tab === 'share' && <Share details={store.details} />}

        {tab === 'guestmode' && (
          <div className="guestmode-wrap">
            <p className="hint">
              This is what your <strong>guests</strong> see. Hey Girl answers only from your published details —
              private notes, budget, and the guest list stay hidden. Use the <strong>Share</strong> tab to send guests their own link.
            </p>
            <Chat
              mode="guest"
              details={store.details}
              intro={`Hi! I'm Hey Girl 💕 Ask me anything about ${store.details.coupleNames}'s wedding — date, venue, dress code, parking, you name it.`}
              suggestions={['When and where is it?', "What's the dress code?", 'Is there a hotel block?']}
            />
          </div>
        )}
      </main>

      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
