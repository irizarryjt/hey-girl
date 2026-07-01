// "How I work" / FAQ tab. Holds the welcome info that used to live in the
// chat's first bubble, plus a short guide to each part of the app.
export default function Faq() {
  return (
    <div className="panel faq">
      <div className="faq-welcome">
        <h2>Hey girl — here's how I work 💕</h2>
        <p>
          Congratulations on your engagement! I'm your wedding planning bestie. Ask me about your
          timeline, budget, etiquette, or anything wedding related.
        </p>
      </div>

      <div className="faq-item">
        <h3>Why is everything already filled in?</h3>
        <p>
          Everything starts with <strong>placeholder details</strong> — a sample couple, budget,
          guests, dates, and events — just so you can see how it all works. Update anything in the
          tabs to make it yours; your changes replace the samples.
        </p>
      </div>

      <div className="faq-item">
        <h3>💬 Hey Girl Chat</h3>
        <p>
          Your planning bestie. Ask about your timeline, budget, etiquette, vendors, or anything
          wedding related. I know your details, budget, calendar, and guest counts, so my answers
          are personalized. Tap the <strong>+</strong> to attach a quote, contract, or invoice
          (PDF or Word) and I'll pull out the costs, due dates, and options for you.
        </p>
      </div>

      <div className="faq-item">
        <h3>📅 Calendar</h3>
        <p>
          Your wedding day, your events, and budget payment due dates all show here with
          countdowns. When I suggest a date in chat, you can add it with one tap. Export any event
          (or all of them) as a calendar file to drop into your own calendar app.
        </p>
      </div>

      <div className="faq-item">
        <h3>🎟️ Guests</h3>
        <p>
          Add and track guests with their RSVP status, party size, meal choice, and notes. The
          summary counts at the top update as you go, and I can answer questions about your guest
          list anytime.
        </p>
      </div>

      <div className="faq-item">
        <h3>💰 Budget</h3>
        <p>
          Track each cost with its vendor, estimated and actual amounts, what you've paid, what you
          still owe, and a due date. Ask me money questions and I'll give you a clear breakdown.
        </p>
      </div>

      <div className="faq-item">
        <h3>🎉 Events</h3>
        <p>
          Plan the main events — rehearsal dinner, ceremony, reception, welcome party, brunch — in
          detail: time, venue, dress code, whether each is kid-friendly, and notes. The
          <strong> ceremony</strong>'s date, time, venue, and dress code are shared with the Shared
          Details tab and your guests. Every event with a date shows on your <strong>Calendar</strong>,
          and you can download a calendar invite for each.
        </p>
      </div>

      <div className="faq-item">
        <h3>💐 Bridal Party</h3>
        <p>
          Auto-fills from the <strong>Bridal party role</strong> you set on each guest in the Guests
          tab (maid of honor, best man, flower girl, and so on). Change a role here and it updates the
          guest too.
        </p>
      </div>

      <div className="faq-item">
        <h3>🤝 Vendors</h3>
        <p>
          Keep every vendor in one place — contact info, website, and status. Each vendor links to its
          costs from <strong>Budget</strong> and any matching <strong>Calendar</strong> events, and you
          can import vendors straight from your budget.
        </p>
      </div>

      <div className="faq-item">
        <h3>✅ Decisions</h3>
        <p>
          A checklist for choices the other tabs don't cover — dress, attire, hair, makeup, cake, music,
          and more. Add a link and notes to each, tap <strong>Ask Hey Girl</strong> for tailored help,
          or move an item over to <strong>Vendors</strong> once you've picked someone.
        </p>
      </div>

      <div className="faq-item">
        <h3>🎁 Registry</h3>
        <p>
          Say whether you're having a registry and add your links, or, if you're not, write the note
          guests see when they ask about gifts. You control whether guests can ask if you'd prefer they
          stick to the registry.
        </p>
      </div>

      <div className="faq-item">
        <h3>🌴 Honeymoon</h3>
        <p>
          Plan your getaway — destination, dates, budget, notes, and a checklist (passports, flights,
          insurance, and more) to keep it on track.
        </p>
      </div>

      <div className="faq-item">
        <h3>📋 Shared Details</h3>
        <p>
          The facts about your wedding — names, date, time, venue, dress code, registry, parking,
          hotel block. <strong>This is your "published data"</strong>: it's exactly what guests can
          see through your share link and in Guest View. Anything that isn't in Shared Details stays
          private, so keep this tab up to date.
        </p>
      </div>

      <div className="faq-item">
        <h3>🔗 Share &amp; 👀 Guest View</h3>
        <p>
          Send guests a private link so they can ask me about your wedding instead of texting you.
          Guests only ever see your published data — that's the info from your <strong>Shared
          Details</strong> tab. Your private notes, budget, and full guest list always stay hidden.
          Use <strong>Guest View</strong> to preview exactly what they'll see.
        </p>
      </div>

      <div className="faq-item">
        <h3>Is my information private?</h3>
        <p>
          Yes. Your planning data is tied to your account and saved across your devices. The guest
          experience is a separate, read-only view limited to your published data — the details in
          your <strong>Shared Details</strong> tab.
        </p>
      </div>
    </div>
  )
}
