/** The sales page's sections, each given its words (`t`, from content.js). */
import Icon from "../ui/Icon.jsx";
import { PRICE_MONTHLY, TRIAL_DAYS } from "./config.js";

/** The hero's screenshot: the demo's "Today" screen (public/sales), sample data only. */
const SHOT = { src: "/sales/studio-today.webp", width: 1280, height: 800 };

/** A link to the owner: WhatsApp (in a new tab) or an email. Nothing without a contact. */
export function ContactButton({ contact, label, className = "sales-btn sales-btn-ghost" }) {
  if (!contact) return null;
  const external = contact.kind === "whatsapp";
  return (
    <a className={className} href={contact.href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}>
      <span aria-hidden="true" className="sales-btn-icon"><Icon name={external ? "whatsapp" : "mail"} size={17} /></span>
      {label}
    </a>
  );
}

export function Hero({ t, contact }) {
  return (
    <section className="sales-hero" aria-labelledby="sales-title">
      <p className="sales-kicker">{t.kicker}</p>
      <h1 id="sales-title">{t.title}</h1>
      <p className="sales-lead">{t.subtitle}</p>
      <div className="sales-actions">
        <a className="sales-btn sales-btn-gold" href="#demo">{t.tryIt}</a>
        <ContactButton contact={contact} label={t.contact} />
      </div>
      <p className="sales-note">{t.note}</p>
      <figure className="sales-shot">
        <img src={SHOT.src} alt={t.shotAlt} width={SHOT.width} height={SHOT.height} />
      </figure>
    </section>
  );
}

export function Features({ t }) {
  return (
    <section className="sales-section" aria-labelledby="sales-features">
      <h2 id="sales-features">{t.title}</h2>
      <ul className="sales-grid">
        {t.items.map((item) => (
          <li key={item.title} className="sales-card">
            <span className="sales-card-icon" aria-hidden="true"><Icon name={item.icon} size={24} /></span>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Join({ t }) {
  return (
    <section className="sales-section" aria-labelledby="sales-join">
      <h2 id="sales-join">{t.title}</h2>
      <ol className="sales-grid sales-steps">
        {t.steps.map((step, i) => (
          <li key={step.title} className="sales-card">
            <span className="sales-step-number" aria-hidden="true">{i + 1}</span>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Privacy({ t }) {
  return (
    <section className="sales-section" aria-labelledby="sales-privacy">
      <h2 id="sales-privacy">{t.title}</h2>
      <ul className="sales-checks">
        {t.items.map((item) => (
          <li key={item}>
            <span aria-hidden="true"><Icon name="lock" size={17} /></span>
            {item}
          </li>
        ))}
      </ul>
      <p className="sales-more"><a href="#privacy">{t.more}</a></p>
    </section>
  );
}

/** The one plan: the price and the trial once the owner sets them (config.js), and words for them until then. */
export function Price({ t, contact, price = PRICE_MONTHLY, trialDays = TRIAL_DAYS }) {
  return (
    <section className="sales-section" aria-labelledby="sales-price">
      <h2 id="sales-price">{t.title}</h2>
      <div className="sales-price-card">
        <h3>{t.plan}</h3>
        <p className="sales-price">
          {price ? (
            <>
              <span dir="ltr">₪{price}</span> <span className="sales-per">{t.perMonth}</span>
            </>
          ) : (
            t.onRequest
          )}
        </p>
        <p className="sales-trial">{trialDays ? `${trialDays} ${t.trialDays}` : t.trial}</p>
        <ul>
          {t.includes.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <ContactButton contact={contact} label={t.contact} className="sales-btn sales-btn-gold" />
      </div>
    </section>
  );
}

/** The common questions, each one opening in place (details/summary: no script, keyboard and readers included). */
export function Faq({ t }) {
  return (
    <section className="sales-section" aria-labelledby="sales-faq">
      <h2 id="sales-faq">{t.title}</h2>
      <div className="sales-faq">
        {t.items.map((item) => (
          <details key={item.q}>
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
