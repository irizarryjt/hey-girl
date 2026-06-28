// "How I work" / FAQ tab. Holds the welcome info that used to live in the
// chat's first bubble, plus a short guide to each part of the app.
export default function Faq({ intro }) {
  return (
    <div className="panel faq">
      <div className="faq-welcome">
        <h2>Hey girl — here's how I work 💕</h2>
        <p>
          {intro ||
            "Congratulations on your engagement! I'm your wedding planning bestie. Ask me about your timeline, budget, etiquette, or anything wedding related. Heads up: everything's filled in with placeholder details right now — a sample couple, budget, guests, and dates — just so you can see how it all works. Update anything in the tabs to make it yours."}
        </p>
      </div>

      <div className="faq-item">
        <h3>💬 Hey Girl</h3>
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
        <h3>📋 Shared Details</h3>
        <p>
          The facts about your wedding — names, date, time, venue, dress code, registry, parking,
          hotel block. These power your headers, the guest view, and your share link, so keep them
          up to date.
        </p>
      </div>

      <div className="faq-item">
        <h3>🔗 Share &amp; 👀 Guest View</h3>
        <p>
          Send guests a private link so they can ask me about your wedding instead of texting you.
          Guests only ever see your published details — your private notes, budget, and full guest
          list always stay hidden. Use <strong>Guest View</strong> to preview exactly what they'll
          see.
        </p>
      </div>

      <div className="faq-item">
        <h3>Is my information private?</h3>
        <p>
          Yes. Your planning data is tied to your account and saved across your devices. The guest
          experience is a separate, read-only view limited to the details you choose to publish.
        </p>
      </div>
    </div>
  )
}
