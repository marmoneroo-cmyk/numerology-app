/**
 * Lab section: quick search over sample tools, clients and actions. The button
 * or Ctrl+K (Cmd+K on a Mac) opens it, and the line under the button says what
 * ran. Every name is fake; nothing here signs in or goes to the network.
 */
import { useCallback, useMemo, useState } from "react";
import CommandPalette, { useCommandShortcut } from "../../studio/CommandPalette.jsx";

const TOOLS = [
  ["היום", "today"],
  ["לקוחות", "clients"],
  ["קריאה", "reading"],
  ["לידים", "leads"],
  ["חנות", "shop"],
  ["טבלאות", "tables"],
  ["התאמה", "match"],
  ["יומי", "daily"],
  ["קלפים", "cards"],
  ["מחשבונים", "calculators"],
  ["החשבון שלי", "my account"],
  ["חשבונות", "accounts"],
];
const CLIENTS = [
  ["רחל כהן", 7],
  ["יוסי לוי", 3],
  ["מיכל אברהם", 11],
  ["דנה שמיר", 1],
  ["אורי בן דוד", 5],
];
const ACTIONS = [
  ["קריאה חדשה", "new reading"],
  ["לקוח חדש", "new client"],
  ["מצב פגישה", "meeting mode"],
];

/** The palette's items; `report` gets a line saying what ran. */
function sampleItems(report) {
  return [
    ...TOOLS.map(([label, en], i) => ({ id: `tool-${i}`, label, hint: "כלי", keywords: [en], run: () => report(`נפתח הכלי: ${label}`) })),
    ...CLIENTS.map(([label, lifePath], i) => ({
      id: `client-${i}`,
      label,
      hint: `מסלול חיים ${lifePath}`,
      keywords: ["לקוח", "client"],
      run: () => report(`נפתח תיק הלקוח: ${label}`),
    })),
    ...ACTIONS.map(([label, en], i) => ({ id: `action-${i}`, label, hint: "פעולה", keywords: [en], run: () => report(`הופעלה הפעולה: ${label}`) })),
  ];
}

export default function PaletteSection() {
  const [open, setOpen] = useState(false);
  const [ran, setRan] = useState("");
  const openPalette = useCallback(() => setOpen(true), []);
  const closePalette = useCallback(() => setOpen(false), []);
  const items = useMemo(() => sampleItems(setRan), []);
  useCommandShortcut(openPalette);
  return (
    <div className="st-view" style={{ display: "grid", gap: 16, justifyItems: "start" }}>
      <p style={{ margin: 0, color: "var(--st-ink-soft)" }}>
        לוחצים על הכפתור או על Ctrl+K (ב-Mac: Cmd+K), ומחפשים כלי, לקוח או פעולה. כל השמות כאן לדוגמה.
      </p>
      <button type="button" className="fx lab-btn" onClick={openPalette}>חיפוש מהיר</button>
      <p role="status" style={{ margin: 0, color: ran ? "var(--st-gold)" : "var(--st-ink-faint)" }}>{ran || "עוד לא נבחר דבר."}</p>
      <CommandPalette open={open} onClose={closePalette} he items={items} />
    </div>
  );
}
