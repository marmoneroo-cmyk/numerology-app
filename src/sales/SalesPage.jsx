/**
 * The Studio's sales page, at the plain address: what the Studio is, a way to try it, how to join, the price and
 * the common questions. It loads alone (Root.jsx); the Studio and its demo load only when asked for.
 */
import { SALES } from "./content.js";
import { contactLink } from "./config.js";
import { Hero, Features, Join, Privacy, Price, Faq } from "./sections.jsx";
import "./sales.css";

export default function SalesPage({ he = true, onLanguage }) {
  const t = SALES[he ? "he" : "en"];
  const contact = contactLink(he);
  const external = contact?.kind === "whatsapp";
  return (
    <div className="sales" dir={he ? "rtl" : "ltr"} lang={he ? "he" : "en"}>
      <header className="sales-bar">
        <span className="sales-brand"><span aria-hidden="true">✦ </span>{t.brand}</span>
        <div className="sales-bar-actions">
          <button type="button" className="sales-lang" onClick={onLanguage} aria-label={t.languageLabel}>{t.language}</button>
          <a className="sales-btn sales-btn-ghost sales-btn-small" href="#studio">{t.signIn}</a>
        </div>
      </header>
      <main>
        <Hero t={t.hero} contact={contact} />
        <Features t={t.features} />
        <Join t={t.join} />
        <Privacy t={t.privacy} />
        <Price t={t.price} contact={contact} />
        <Faq t={t.faq} />
      </main>
      <footer className="sales-footer">
        <nav aria-label={t.footer.label}>
          {contact && (
            <a href={contact.href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}>
              {external ? t.footer.whatsapp : t.footer.email}
            </a>
          )}
          <a href="#terms">{t.footer.terms}</a>
          <a href="#privacy">{t.footer.privacy}</a>
          <a href="#refunds">{t.footer.refunds}</a>
        </nav>
        <p>{t.footer.rights}</p>
      </footer>
    </div>
  );
}
