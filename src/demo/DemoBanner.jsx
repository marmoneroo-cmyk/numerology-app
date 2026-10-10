/** Across the top of the demo: what it is, how to reach us, and the way back to the sales page. */
import { contactLink } from "../sales/config.js";

export default function DemoBanner({ he, onExit }) {
  const contact = contactLink(he);
  const external = contact?.kind === "whatsapp";
  return (
    <div role="note" className="demo-banner">
      <span>{he ? "זו הדגמה עם לקוחות לדוגמה. שום דבר לא נשמר." : "This is a demo with sample clients. Nothing is saved."}</span>
      <span className="demo-banner-actions">
        {contact && (
          <a href={contact.href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}>
            {he ? "לדבר איתנו" : "Talk to us"}
          </a>
        )}
        <button type="button" onClick={onExit}>{he ? "חזרה לעמוד" : "Back to the page"}</button>
      </span>
    </div>
  );
}
