/** The sales page's sections, each given its words (`t`, from content.js). */
import { useId, useState } from "react";
import Icon from "../ui/Icon.jsx";
import { PRICE_MONTHLY, TRIAL_DAYS } from "./config.js";

/**
 * Real screenshots of the demo (public/sales), sample clients only; sizes keep the page from jumping. Each has a
 * half-size copy (`small`) that phones and ordinary screens load instead, since none is shown wider than ~600px.
 * Browsers keep /sales/ files for 30 days (vercel.json): a replaced picture needs a new file name.
 */
const SHOTS = {
  summary: { src: "/sales/shot-summary.webp", width: 1280, height: 1124, small: "/sales/shot-summary-720.webp", smallWidth: 720 },
  how: { src: "/sales/shot-how.webp", width: 1040, height: 558, small: "/sales/shot-how-560.webp", smallWidth: 560 },
  today: { src: "/sales/shot-today.webp", width: 1400, height: 874, small: "/sales/shot-today-720.webp", smallWidth: 720 },
};
/** How wide a screenshot is shown: the column's width on a phone, at most ~600px beside the text on a computer. */
const SHOT_SIZES = "(max-width: 959px) 92vw, 600px";

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

/** A screenshot in a browser window's frame. */
function Shot({ shot, alt, lazy = true, className = "" }) {
  return (
    <figure className={`sales-frame ${className}`.trim()}>
      <span className="sales-frame-bar" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <img
        src={shot.src}
        srcSet={`${shot.small} ${shot.smallWidth}w, ${shot.src} ${shot.width}w`}
        sizes={SHOT_SIZES}
        alt={alt}
        width={shot.width}
        height={shot.height}
        loading={lazy ? "lazy" : undefined}
        decoding="async"
      />
    </figure>
  );
}

const shekels = (n) => `₪${n.toLocaleString("en-US")}`;

export function Hero({ t, contact, price = PRICE_MONTHLY, trialDays = TRIAL_DAYS }) {
  const facts = [trialDays && `${trialDays} ${t.trialDays}`, price && `${shekels(price)} ${t.perMonth}`, t.personal].filter(Boolean);
  return (
    <section className="sales-hero" aria-labelledby="sales-title">
      <div className="sales-wrap sales-hero-grid">
        <div className="sales-hero-text">
          <p className="sales-kicker">{t.kicker}</p>
          <h1 id="sales-title">{t.title}</h1>
          <p className="sales-lead">{t.subtitle}</p>
          <div className="sales-actions">
            <a className="sales-btn sales-btn-gold" href="#demo">{t.tryIt}</a>
            <ContactButton contact={contact} label={t.contact} />
          </div>
          <ul className="sales-facts">
            {facts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        </div>
        {/* lazy like the others: the page is drawn into every address, and an app address must not fetch it (the
            hero's background, not this, is the first screen's largest element) */}
        <Shot shot={SHOTS.summary} alt={t.shotAlt} className="sales-hero-shot" />
      </div>
    </section>
  );
}

/** A titled section with an optional line under the title. */
function Section({ id, title, text, children, className = "" }) {
  return (
    <section className={`sales-section ${className}`.trim()} aria-labelledby={id}>
      <div className="sales-wrap">
        <h2 id={id}>{title}</h2>
        {text && <p className="sales-section-lead">{text}</p>}
        {children}
      </div>
    </section>
  );
}

/** Cards with an icon, a title and a line. */
function Cards({ items, className = "" }) {
  return (
    <ul className={`sales-grid ${className}`.trim()}>
      {items.map((item) => (
        <li key={item.title} className="sales-card">
          <span className="sales-card-icon" aria-hidden="true"><Icon name={item.icon} size={24} /></span>
          <h3>{item.title}</h3>
          <p>{item.text}</p>
        </li>
      ))}
    </ul>
  );
}

export function Pillars({ t }) {
  return (
    <Section id="sales-pillars" title={t.title} text={t.text}>
      <Cards items={t.items} className="sales-grid-3" />
    </Section>
  );
}

/** The open demo: the page's main way to see the Studio before getting in touch. */
export function DemoBand({ t }) {
  return (
    <section className="sales-band" aria-labelledby="sales-demo">
      <div className="sales-wrap sales-band-inner">
        <div>
          <h2 id="sales-demo">{t.title}</h2>
          <p>{t.text}</p>
        </div>
        <a className="sales-btn sales-btn-gold" href="#demo">{t.cta}</a>
      </div>
    </section>
  );
}

/** A feature told beside its screenshot: a kicker, a title, the words, and what it gives. */
function Showcase({ id, t, children, flip = false, list }) {
  return (
    <section className="sales-section" aria-labelledby={id}>
      <div className={`sales-wrap sales-showcase${flip ? " sales-showcase-flip" : ""}`}>
        <div className="sales-showcase-text">
          <p className="sales-kicker">{t.kicker}</p>
          <h2 id={id}>{t.title}</h2>
          <p className="sales-section-lead">{t.text}</p>
          {list}
        </div>
        <div className="sales-showcase-media">{children}</div>
      </div>
    </section>
  );
}

export function MapShowcase({ t }) {
  return (
    <Showcase
      id="sales-map"
      t={t}
      list={
        <ul className="sales-points">
          {t.points.map((point) => (
            <li key={point}>
              <span aria-hidden="true"><Icon name="check" size={16} /></span>
              {point}
            </li>
          ))}
        </ul>
      }
    >
      <div className="sales-stack">
        <Shot shot={SHOTS.summary} alt={t.shotAlt} />
        <Shot shot={SHOTS.how} alt={t.howAlt} className="sales-stack-top" />
      </div>
    </Showcase>
  );
}

export function CareShowcase({ t }) {
  return (
    <Showcase
      id="sales-care"
      t={t}
      flip
      list={
        <>
          <ul className="sales-care">
            {t.items.map((item) => (
              <li key={item.title}>
                <span className="sales-card-icon" aria-hidden="true"><Icon name={item.icon} size={20} /></span>
                <span>
                  <b>{item.title}</b>
                  {item.text}
                </span>
              </li>
            ))}
          </ul>
          <p className="sales-note">{t.note}</p>
        </>
      }
    >
      <Shot shot={SHOTS.today} alt={t.shotAlt} />
    </Showcase>
  );
}

/**
 * How many extra sessions a month pay for the subscription: a scenario the visitor sets, not a promise.
 * Hidden until there is a price.
 */
export function Worth({ t, price = PRICE_MONTHLY }) {
  const [fee, setFee] = useState(300);
  const [sessions, setSessions] = useState(1);
  const feeId = useId();
  const sessionsId = useId();
  if (!price) return null;
  const safeFee = Number.isFinite(fee) && fee > 0 ? fee : 0;
  const income = safeFee * sessions;
  const after = income - price;
  const needed = safeFee > 0 ? Math.ceil(price / safeFee) : null;
  const covered = needed === null ? "" : needed <= 1 ? t.coveredOne : t.coveredMany.replace("{n}", String(needed));
  return (
    <Section id="sales-worth" title={t.title} text={t.text}>
      <div className="sales-worth">
        <div className="sales-worth-inputs">
          <label htmlFor={feeId}>{t.priceLabel}</label>
          <input
            id={feeId}
            type="number"
            inputMode="numeric"
            min="0"
            max="5000"
            step="10"
            value={Number.isFinite(fee) ? fee : ""}
            onChange={(e) => setFee(e.target.value === "" ? NaN : Math.min(5000, Math.max(0, Number(e.target.value))))}
          />
          <label htmlFor={sessionsId}>
            {t.sessionsLabel}: <b>{sessions}</b>
          </label>
          <input id={sessionsId} type="range" min="0" max="10" step="1" value={sessions} onChange={(e) => setSessions(Number(e.target.value))} />
        </div>
        <div className="sales-worth-result" aria-live="polite">
          <p>
            {t.income}
            <b dir="ltr" data-testid="worth-income">{shekels(income)}</b>
          </p>
          <p>
            {t.after}
            <b dir="ltr" data-testid="worth-after" className={after < 0 ? "sales-minus" : undefined}>
              {after < 0 ? `−${shekels(-after)}` : shekels(after)}
            </b>
          </p>
          {covered && <p className="sales-worth-covered">{covered}</p>}
        </div>
      </div>
      <p className="sales-note sales-center">{t.disclaimer}</p>
    </Section>
  );
}

export function Tools({ t }) {
  return (
    <Section id="sales-tools" title={t.title}>
      <Cards items={t.items} className="sales-grid-3" />
    </Section>
  );
}

export function Privacy({ t }) {
  return (
    <Section id="sales-privacy" title={t.title}>
      <ul className="sales-checks">
        {t.items.map((item) => (
          <li key={item}>
            <span aria-hidden="true"><Icon name="lock" size={17} /></span>
            {item}
          </li>
        ))}
      </ul>
      <p className="sales-more"><a href="#privacy">{t.more}</a></p>
    </Section>
  );
}

/** The one plan: the price and the trial once the owner sets them (config.js), words for them until then, and how to join. */
export function Price({ t, join, contact, price = PRICE_MONTHLY, trialDays = TRIAL_DAYS }) {
  return (
    <Section id="sales-price" title={t.title}>
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
      {join && (
        <div className="sales-join">
          <h3>{join.title}</h3>
          <ol className="sales-grid sales-steps">
            {join.steps.map((step, i) => (
              <li key={step.title} className="sales-card">
                <span className="sales-step-number" aria-hidden="true">{i + 1}</span>
                <h4>{step.title}</h4>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </Section>
  );
}

/** The common questions, each one opening in place (details/summary: no script, keyboard and readers included). */
export function Faq({ t }) {
  return (
    <Section id="sales-faq" title={t.title}>
      <div className="sales-faq">
        {t.items.map((item) => (
          <details key={item.q}>
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}

export function Final({ t, contact }) {
  return (
    <section className="sales-final" aria-labelledby="sales-final">
      <div className="sales-wrap">
        <h2 id="sales-final">{t.title}</h2>
        <p>{t.text}</p>
        <div className="sales-actions">
          <a className="sales-btn sales-btn-gold" href="#demo">{t.tryIt}</a>
          <ContactButton contact={contact} label={t.contact} />
        </div>
      </div>
    </section>
  );
}
