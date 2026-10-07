/**
 * A legal page (terms of use, privacy policy, or cancellation and refunds) in Hebrew or English, from ./content.js.
 * The contact address becomes a mailto link wherever it appears, and the focus moves to the title when a page
 * opens, so a screen reader starts reading there.
 */
import { useEffect, useRef } from "react";
import { LEGAL_DOCS, LEGAL_EMAIL, LEGAL_UPDATED } from "./content.js";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const BODY_FONT = "'Heebo','Noto Sans Hebrew',Arial,sans-serif";
const DISPLAY_FONT = "'Cormorant Garamond',Georgia,serif";

/**
 * The app's theme pair on a solid page colour, so the contrast is known. Body and small text reach 4.5:1 or more.
 * The brand gold is only on the large headings (it is 3.8:1 on the light page); small gold text on the light page
 * uses the darker gold the Studio uses for text.
 */
function palette(dk) {
  return {
    page: dk ? "#080812" : "#f5f0e8",
    text: dk ? "#e8e0d0" : "#2a2520",
    muted: dk ? "#b5ada0" : "#5a5148",
    gold: dk ? "#c8a96a" : "#937640",
    goldText: dk ? "#c8a96a" : "#6f5629",
    line: dk ? "rgba(200,169,106,.35)" : "rgba(147,118,64,.4)",
  };
}

/** "7.10.2026" in Hebrew, "7 October 2026" in English, from a YYYY-MM-DD date. */
function formatDate(iso, he) {
  const [year, month, day] = iso.split("-").map(Number);
  return he ? `${day}.${month}.${year}` : `${day} ${MONTHS[month - 1]} ${year}`;
}

/** The text, with each mention of the contact address as a mailto link, kept left to right inside Hebrew. */
function withEmailLinks(text, style) {
  return text.split(LEGAL_EMAIL).flatMap((part, i) =>
    i === 0
      ? [part]
      : [
          <a key={i} href={`mailto:${LEGAL_EMAIL}`} dir="ltr" style={style}>
            {LEGAL_EMAIL}
          </a>,
          part,
        ],
  );
}

function BackButton({ he, colors, onBack }) {
  const style = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 28,
    padding: "9px 16px",
    fontSize: 14,
    fontFamily: "inherit",
    color: colors.goldText,
    background: "transparent",
    border: `1px solid ${colors.line}`,
    borderRadius: 12,
    cursor: "pointer",
  };
  return (
    <button type="button" onClick={() => onBack()} style={style}>
      <span aria-hidden="true">{he ? "→" : "←"}</span>
      {he ? "חזרה לאתר" : "Back to the site"}
    </button>
  );
}

function Section({ section, colors, link }) {
  return (
    <section style={{ marginTop: 32 }}>
      <h2 style={{ margin: "0 0 10px", fontSize: 20, fontWeight: 700, lineHeight: 1.4, color: colors.gold }}>{section.title}</h2>
      {section.paragraphs.map((text, i) => (
        <p key={i} style={{ margin: "0 0 12px" }}>
          {withEmailLinks(text, link)}
        </p>
      ))}
      {section.items?.length > 0 && (
        <ul style={{ margin: "0 0 12px", paddingInlineStart: 22 }}>
          {section.items.map((item, i) => (
            <li key={i} style={{ marginBottom: 6 }}>
              {withEmailLinks(item, link)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * @param {{ doc: "terms" | "privacy" | "refunds", he?: boolean, dk?: boolean, onBack?: () => void }} props
 *   doc: which page; any other value renders nothing. he: Hebrew (right to left) or English. dk: the dark theme.
 *   onBack: called by the "back to the site" button, which shows only when it is given.
 */
export default function LegalPage({ doc, he = true, dk = true, onBack }) {
  const titleRef = useRef(null);
  const page = Object.prototype.hasOwnProperty.call(LEGAL_DOCS, doc) ? LEGAL_DOCS[doc][he ? "he" : "en"] : null;

  useEffect(() => {
    titleRef.current?.focus();
  }, [doc]);

  if (!page) return null;
  const colors = palette(dk);
  const link = { color: colors.goldText, textDecoration: "underline", textUnderlineOffset: 3, overflowWrap: "anywhere" };
  const title = {
    margin: 0,
    fontSize: "clamp(28px, 6vw, 40px)",
    fontWeight: he ? 700 : 600,
    lineHeight: 1.2,
    fontFamily: he ? BODY_FONT : DISPLAY_FONT,
    color: colors.gold,
    outline: "none", // focused by the page itself, never by Tab
  };
  return (
    <div
      dir={he ? "rtl" : "ltr"}
      lang={he ? "he" : "en"}
      style={{ minHeight: "100vh", boxSizing: "border-box", padding: "24px 16px 64px", backgroundColor: colors.page, color: colors.text, fontFamily: BODY_FONT, fontSize: 16, lineHeight: 1.8 }}
    >
      <article style={{ maxWidth: 760, margin: "0 auto" }}>
        {onBack && <BackButton he={he} colors={colors} onBack={onBack} />}
        <h1 ref={titleRef} tabIndex={-1} style={title}>
          {page.title}
        </h1>
        <p style={{ margin: "8px 0 0", fontSize: 14, color: colors.muted }}>
          {he ? "עודכן לאחרונה: " : "Last updated: "}
          <time dateTime={LEGAL_UPDATED}>{formatDate(LEGAL_UPDATED, he)}</time>
        </p>
        {page.sections.map((section, i) => (
          <Section key={i} section={section} colors={colors} link={link} />
        ))}
      </article>
    </div>
  );
}
