import { useState } from 'react'

// Shared descriptions of each tab — used by the FAQ tab (always expanded) and the
// Home page (collapsible accordions).
const ITEMS = [
  {
    title: '💬 Hey Girl Chat',
    body: (
      <p>
        Your planning bestie. Ask about your timeline, budget, etiquette, vendors, or anything
        wedding related. I know your details, budget, calendar, and guest counts, so my answers
        are personalized. Tap the <strong>+</strong> to attach a quote, contract, or invoice
        (PDF or Word) and I'll pull out the costs, due dates, and options for you.
      </p>
    ),
  },
  {
    title: '📅 Calendar',
    body: (
      <p>
        Your wedding day, your events, and budget payment due dates all show here with countdowns.
        When I suggest a date in chat, you can add it with one tap. Export any event (or all of them)
        as a calendar file to drop into your own calendar app.
      </p>
    ),
  },
  {
    title: '🎉 Events',
    body: (
      <p>
        Plan the main events — rehearsal dinner, ceremony, reception, welcome party, brunch — in
        detail: time, venue, dress code, whether each is kid-friendly, and notes. The
        <strong> ceremony</strong>'s date, time, venue, and dress code are shared with the Shared
        Details tab and your guests. Every event with a date shows on your <strong>Calendar</strong>,
        and you can download a calendar invite for each.
      </p>
    ),
  },
  {
    title: '🎟️ Guests',
    body: (
      <p>
        Add and track guests with RSVP status, party size, meal, dietary needs, contact info, and
        bridal party role. Export the whole list as a CSV, and I can answer questions about your
        guest list anytime.
      </p>
    ),
  },
  {
    title: '💐 Bridal Party',
    body: (
      <p>
        Auto-fills from the <strong>Bridal party role</strong> you set on each guest in the Guests
        tab (maid of honor, best man, flower girl, and so on). Change a role here and it updates the
        guest too. You choose whether to share it with guests.
      </p>
    ),
  },
  {
    title: '💰 Budget',
    body: (
      <p>
        Track each cost with its vendor, estimated and actual amounts, what you've paid, what you
        still owe, and a due date. Ask me money questions and I'll give you a clear breakdown.
      </p>
    ),
  },
  {
    title: '🤝 Vendors',
    body: (
      <p>
        Keep every vendor in one place — contact info, website, and status. Each vendor links to its
        costs from <strong>Budget</strong> and any matching <strong>Calendar</strong> events, and you
        can import vendors straight from your budget.
      </p>
    ),
  },
  {
    title: '✅ Decisions',
    body: (
      <p>
        A checklist for choices the other tabs don't cover — dress, attire, hair, makeup, cake, music,
        and more. Add a link and notes to each, tap <strong>Ask Hey Girl</strong> for tailored help,
        or move an item over to <strong>Vendors</strong> once you've picked someone.
      </p>
    ),
  },
  {
    title: '✉️ Invitations & Stationery',
    body: (
      <p>
        Draft your invitation wording and track every paper piece — save-the-dates, invitations,
        RSVP cards, menus, programs, thank-you cards, and more — with status, quantity, vendor, and
        order-by dates.
      </p>
    ),
  },
  {
    title: '🎁 Registry',
    body: (
      <p>
        Say whether you're having a registry and add your links, or, if you're not, write the note
        guests see when they ask about gifts. You control whether guests can ask if you'd prefer they
        stick to the registry.
      </p>
    ),
  },
  {
    title: '🌴 Honeymoon',
    body: (
      <p>
        Plan your getaway — destination, dates, budget, notes, and a checklist (passports, flights,
        insurance, and more) to keep it on track.
      </p>
    ),
  },
  {
    title: '📋 Shared Details',
    body: (
      <p>
        The facts about your wedding — couple details, hotel block, notes, plus read-only summaries of
        your shared events and bridal party. <strong>This is your "published data"</strong>: it's
        exactly what guests can see through your share link and in Guest View. Anything not here stays
        private.
      </p>
    ),
  },
  {
    title: '🔗 Share & 👀 Guest View',
    body: (
      <p>
        Send guests a private link so they can ask me about your wedding instead of texting you.
        Guests only ever see your published data — that's the info from your <strong>Shared
        Details</strong> tab. Your private notes, budget, and full guest list always stay hidden.
        Use <strong>Guest View</strong> to preview exactly what they'll see.
      </p>
    ),
  },
]

export default function TabGuide({ collapsible = false }) {
  const [open, setOpen] = useState({})

  if (!collapsible) {
    return (
      <>
        {ITEMS.map((it, i) => (
          <div key={i} className="faq-item">
            <h3>{it.title}</h3>
            {it.body}
          </div>
        ))}
      </>
    )
  }

  return (
    <>
      {ITEMS.map((it, i) => (
        <div key={i} className={`faq-item tg ${open[i] ? 'open' : ''}`}>
          <button type="button" className="tg-toggle" onClick={() => setOpen((o) => ({ ...o, [i]: !o[i] }))}>
            <span>{it.title}</span>
            <span className="tg-arrow">{open[i] ? '▾' : '▸'}</span>
          </button>
          {open[i] && <div className="tg-body">{it.body}</div>}
        </div>
      ))}
    </>
  )
}
