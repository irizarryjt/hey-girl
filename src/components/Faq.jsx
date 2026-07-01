import TabGuide from './TabGuide.jsx'

// "How I work" / FAQ tab: welcome info + a guide to each part of the app.
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

      <TabGuide />

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
