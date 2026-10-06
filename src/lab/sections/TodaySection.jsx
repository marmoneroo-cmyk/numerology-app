/**
 * Lab section: the "היום" home over an in-memory store of six made-up
 * clients. Three have birthdays in the coming week, counted from the real
 * date; one is archived and one has no phone. The buttons only write what
 * happened on the line above the screen, and a greeting shows there instead
 * of opening WhatsApp. No sign-in, no network.
 */
import { useMemo, useState } from "react";
import Today from "../../studio/Today.jsx";
import { createStore } from "../../data/store.js";
import { memoryBackend } from "../../data/memoryBackend.js";

const pad2 = (n) => String(n).padStart(2, "0");

/** A birth date in `year` whose birthday is `days` from today. Every year here is a leap year, so 29 February works. */
function bornIn(year, days) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  return `${year}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// created in this order, a minute apart, so the last is the most recently active
const CLIENTS = [
  { fullName: "רחל כהן", birthDate: bornIn(1984, 1), phone: "050-0000001" },
  { fullName: "יוסי לוי", birthDate: bornIn(1988, 0) },
  { fullName: "מיכל אברהם", birthDate: bornIn(1976, 4), phone: "+44 20 7946 0958" },
  { fullName: "דנה שמיר", birthDate: bornIn(1992, 40), phone: "052-0000004" },
  { fullName: "אורי בן דוד", birthDate: bornIn(1980, 200), phone: "053-0000005", archived: true },
  { fullName: "נועה ברק", birthDate: bornIn(1996, 120), phone: "054-0000006" },
];

const DAY = { number: 8, title: "עוצמה", text: "הישגים, שפע וסמכות. יום טוב לפגישות שמתאימות לאנרגיה הזאת." };

const digitSum = (value) => [...String(value)].filter((ch) => ch >= "0" && ch <= "9").reduce((sum, ch) => sum + Number(ch), 0);
/** Adds the digits until one is left (11, 22 and 33 stay): a stand-in for the engine. */
const reduceNumber = (n) => (n > 9 && n !== 11 && n !== 22 && n !== 33 ? reduceNumber(digitSum(n)) : n);
const lifePath = (iso) => reduceNumber(digitSum(iso));
const personalYear = (iso, at) => reduceNumber(digitSum(iso.slice(5)) + digitSum(at.getFullYear()));
const now = () => new Date();

/** A fresh in-memory store; its list waits until the sample clients are in. */
function sampleStore() {
  let t = Date.now() - 6 * 60 * 60 * 1000;
  const store = createStore(memoryBackend(), { now: () => new Date((t += 60 * 1000)) });
  const seeded = (async () => {
    for (const c of CLIENTS) await store.clients.create(c);
  })();
  const list = async (options) => {
    await seeded;
    return store.clients.list(options);
  };
  return { ...store, clients: { ...store.clients, list } };
}

const PLACEHOLDER = {
  display: "grid",
  placeItems: "center",
  minHeight: 180,
  border: "1px dashed var(--st-line-strong)",
  borderRadius: 14,
  color: "var(--st-ink-faint)",
};

export default function TodaySection() {
  const store = useMemo(sampleStore, []);
  const [said, setSaid] = useState("לוחצים על כל דבר במסך, ומה שקרה יופיע כאן.");
  const openClient = (id) =>
    store.clients.get(id).then(
      (c) => setSaid(`נפתח תיק הלקוח: ${c.fullName}`),
      () => setSaid(`לא נמצא לקוח ${id}`),
    );
  // a greeting link shows what it would send instead of opening WhatsApp
  const catchGreeting = (e) => {
    const link = e.target.closest?.("a[href^='https://wa.me/']");
    if (!link) return;
    e.preventDefault();
    const url = new URL(link.href);
    setSaid(`ברכה בוואטסאפ ל-${url.pathname.slice(1)}: ${url.searchParams.get("text")}`);
  };
  return (
    <div className="st-view" style={{ display: "grid", gap: 14 }} onClickCapture={catchGreeting}>
      <p role="status" style={{ margin: 0, color: "var(--st-ink-soft)" }}>
        {said}
      </p>
      <Today
        he
        store={store}
        now={now}
        day={DAY}
        lifePath={lifePath}
        personalYear={personalYear}
        deck={<div style={PLACEHOLDER}>כאן תופיע החפיסה</div>}
        onOpenClient={openClient}
        onNewReading={() => setSaid("נלחץ: קריאה חדשה")}
        onNewClient={() => setSaid("נלחץ: לקוח חדש")}
        onMeeting={() => setSaid("נלחץ: מצב פגישה")}
        onSearch={() => setSaid("נלחץ: חיפוש מהיר")}
      />
    </div>
  );
}
