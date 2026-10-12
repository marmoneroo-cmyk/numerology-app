/**
 * The "היום" home: today's energy (the universal day on the wheel of numbers, with the clients' life paths
 * on it), four figures from the client files, the week ahead, the clients' birthdays, the follow-ups that
 * are due (each can be marked done), the most recently active clients, the clients worth a word, every
 * tool, and today's card. It reads the client list and the summary from the workspace store; the day, the
 * numbers and the deck come in from the app. Nothing on it is made up: every figure is counted from the store.
 */
import { useEffect, useId, useRef, useState } from "react";
import { useLoad } from "../workspace/ui.jsx";
import { NotFoundError, toYmd } from "../data/store.js";
import {
  checkInText, followUpText, greetingLink, greetingText, initialsOf, isNewYearMonth, newYearText, quietClients,
  recentClients, shareLink, upcomingBirthdays,
} from "./today.js";
import { WEEK_DAYS, dueBy, lifePathCounts, weekAhead, weekEnd } from "./dashboard.js";
import { TOOL_LINES } from "./screenHelp.js";
import { formatDmy } from "../workspace/format.js";
import HowButton from "../reading/HowButton.jsx";
import Locked from "../demo/DemoLock.jsx";
import AppIcon from "../ui/Icon.jsx";
import NumberWheel from "./NumberWheel.jsx";
import "./today.css";
import "./home.css";

const DATE_FORMAT = { weekday: "long", day: "numeric", month: "long", year: "numeric" };

/** Line icons on a 24px grid, drawn in the text colour. */
const ICONS = {
  plus: <path d="M12 5v14M5 12h14" />,
  client: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M19 14.8c1.4.9 2.3 2.6 2.6 5.2" />
    </>
  ),
  meeting: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M12 16v4M8 20h8" />
    </>
  ),
  gift: (
    <>
      <rect x="4" y="9" width="16" height="11" rx="1.5" />
      <path d="M12 9v11M4 13h16M12 9c-1.5-3-5-3.5-5-1s3.5 1 5 1c1.5 0 5 1.5 5-1s-3.5-2-5 1" />
    </>
  ),
};

function Icon({ name }) {
  return (
    <svg className="st-today-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {ICONS[name]}
    </svg>
  );
}

const Initials = ({ name }) => (
  <span className="st-today-av" aria-hidden="true">
    {initialsOf(name)}
  </span>
);

/**
 * A titled panel; with `titleRef`, the title can also take the focus. `rise` is its place in the order the
 * screen's parts come in (a short fade, held back a little more for each).
 */
function Panel({ title, titleRef, className = "", rise, children }) {
  return (
    <section className={`st-panel ${rise === undefined ? "" : "st-rise "}${className}`.trim()} style={rise === undefined ? undefined : { "--i": rise }}>
      <h3 ref={titleRef} tabIndex={titleRef ? -1 : undefined} className="st-today-title">
        {title}
      </h3>
      {children}
    </section>
  );
}

/**
 * A retry for `load`. Once a retry succeeds, the pressed button is gone, so
 * the focus moves to `target`, unless it was moved somewhere else meanwhile.
 */
function useRetry(load, target) {
  const retrying = useRef(false);
  useEffect(() => {
    if (!retrying.current || load.loading || load.error) return;
    retrying.current = false;
    const active = document.activeElement;
    if (!active || active === document.body || !active.isConnected) target.current?.focus();
  }, [load.loading, load.error, load.data, target]);
  return () => {
    retrying.current = true;
    load.reload();
  };
}

/** Where a load stands: "loading", "failed" or "ready". */
const stateOf = (load) => (load.loading ? "loading" : load.error ? "failed" : "ready");

/** Today's energy: the universal day on the wheel, its meaning, and the day's first actions. */
function Hero({ he, today, day, paths, onNewReading, onNewClient, onMeeting }) {
  const titleId = useId();
  return (
    <section className="st-hero st-rise" style={{ "--i": 0 }} aria-labelledby={titleId}>
      <svg className="st-hero-grid" viewBox="0 0 90 90" aria-hidden="true" focusable="false">
        {/* the Lo Shu square, faint behind the title */}
        {[4, 9, 2, 3, 5, 7, 8, 1, 6].map((n, i) => (
          <text key={n} x={15 + (i % 3) * 30} y={15 + Math.floor(i / 3) * 30} textAnchor="middle" dominantBaseline="central">
            {n}
          </text>
        ))}
        <path d="M30 0V90M60 0V90M0 30H90M0 60H90" />
      </svg>
      <div className="st-hero-text">
        <h3 id={titleId} className="st-hero-title">
          {he ? "האנרגיה של היום" : "Today's energy"}
        </h3>
        <p className="st-today-date">{today.toLocaleDateString(he ? "he-IL" : "en-GB", DATE_FORMAT)}</p>
        <p className="st-today-meaning">
          {day.title && <b>{day.title}.</b>} <Locked he={he}>{day.text}</Locked>
        </p>
        <div className="st-hero-actions">
          <button type="button" className="st-today-btn st-today-solid fx" onClick={() => onNewReading()}>
            <Icon name="plus" />
            {he ? "קריאה חדשה" : "New reading"}
          </button>
          {onNewClient && (
            <button type="button" className="st-today-btn fx" onClick={() => onNewClient()}>
              <Icon name="client" />
              {he ? "לקוח חדש" : "New client"}
            </button>
          )}
          {onMeeting && (
            <button type="button" className="st-today-btn fx" onClick={() => onMeeting()}>
              <Icon name="meeting" />
              {he ? "מצב פגישה" : "Meeting mode"}
            </button>
          )}
        </div>
      </div>
      <NumberWheel
        he={he}
        day={day.number}
        paths={paths}
        caption={
          <p className="st-wheel-caption">
            <span>{he ? "היום האוניברסלי" : "Universal day"}</span>
            <HowButton k="universal" ctx={{ now: today }} he={he} />
          </p>
        }
      />
    </section>
  );
}

/**
 * Each figure's words, for one and for any other count, and where pressing it goes. A button's name is its
 * visible text with where it goes after it, so a voice command can say what the screen shows.
 */
const FIGURES = {
  clients: {
    he: { one: ["לקוח", "פעיל בתיק"], many: ["לקוחות", "פעילים בתיק"], go: "לפתיחת הלקוחות" },
    en: { one: ["Client", "on file"], many: ["Clients", "on file"], go: "open the clients" },
  },
  readings: {
    he: { one: ["קריאה", "שמורה בתיקים"], many: ["קריאות", "שמורות בתיקים"], go: "לתיקי הלקוחות" },
    en: { one: ["Reading", "saved"], many: ["Readings", "saved"], go: "open the client files" },
  },
  followUps: {
    he: { one: ["מעקב", "שהגיע זמנו"], many: ["מעקבים", "שהגיע זמנם"], go: "לרשימת המעקבים" },
    en: { one: ["Follow-up", "due"], many: ["Follow-ups", "due"], go: "go to the list" },
  },
  birthdays: {
    he: { one: ["יום הולדת", "בשבוע הקרוב"], many: ["ימי הולדת", "בשבוע הקרוב"], go: "לרשימת ימי ההולדת" },
    en: { one: ["Birthday", "this week"], many: ["Birthdays", "this week"], go: "go to the list" },
  },
};

/**
 * One figure: a number counted from the store, with a quiet placeholder while it loads and a dash when it
 * could not load. With somewhere to go it is a button.
 */
function Figure({ he, kind, value, state, onGo }) {
  const words = FIGURES[kind][he ? "he" : "en"];
  const [label, sub] = value === 1 ? words.one : words.many;
  const ready = state === "ready";
  const body = (
    <>
      <span className="st-stat-num">{state === "loading" ? <span className="st-skel" /> : ready ? value : "—"}</span>{" "}
      <span className="st-stat-label">{label}</span> <span className="st-stat-sub">{sub}</span>
      {state === "failed" && <span className="st-sr">{he ? " (לא נטען)" : " (did not load)"}</span>}
    </>
  );
  if (ready && onGo) {
    return (
      <button type="button" className="st-stat st-stat-go fx" onClick={() => onGo()}>
        {body}
        <span className="st-sr">{`, ${words.go}`}</span>
      </button>
    );
  }
  return (
    <div className="st-stat" aria-busy={state === "loading" || undefined}>
      {body}
    </div>
  );
}

/** The four figures: clients, saved readings, follow-ups due and birthdays this week. */
function Figures({ he, load, due, today, onOpenClients, onFollowUps, onBirthdays }) {
  const clients = stateOf(load);
  const summary = stateOf(due);
  const figures = [
    { kind: "clients", state: clients, value: load.data?.length, onGo: onOpenClients },
    { kind: "readings", state: summary, value: due.data?.readings, onGo: onOpenClients },
    { kind: "followUps", state: summary, value: due.data && dueBy(due.data.followUps, today).length, onGo: onFollowUps },
    { kind: "birthdays", state: clients, value: load.data && upcomingBirthdays(load.data, today, WEEK_DAYS).length, onGo: onBirthdays },
  ];
  return (
    <section className="st-stats st-rise" style={{ "--i": 1 }} aria-label={he ? "נתונים מהתיק" : "From the client files"}>
      {figures.map((f) => (
        <Figure key={f.kind} he={he} kind={f.kind} value={f.value} state={f.state} onGo={f.onGo} />
      ))}
    </section>
  );
}

const DAY_SHORT = { he: ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"], en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] };
const DAY_LONG = {
  he: ["יום ראשון", "יום שני", "יום שלישי", "יום רביעי", "יום חמישי", "יום שישי", "שבת"],
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
};
/** The names a day of the week strip shows; the rest are counted. */
const DAY_NAMES_SHOWN = 3;

/** What a screen reader hears for a day: its events, "none" only when both kinds are in, and what did not load. */
function daySaid(he, events, known) {
  const said = events.map((e) => {
    if (e.kind === "birthday") return he ? `יום הולדת של ${e.name}` : `${e.name}'s birthday`;
    return he ? `מעקב עם ${e.name}` : `a follow-up with ${e.name}`;
  });
  const settled = known.birthdays === "ready" && known.followUps === "ready";
  const none = he ? "אין ימי הולדת או מעקבים" : "no birthdays or follow-ups";
  const missing = [known.birthdays === "failed" && (he ? "ימי ההולדת" : "the birthdays"), known.followUps === "failed" && (he ? "המעקבים" : "the follow-ups")].filter(Boolean);
  const notLoaded = missing.length ? (he ? `${missing.join(" ו")} לא נטענו` : `${missing.join(" and ")} did not load`) : "";
  return [said.length ? said.join(he ? ", " : "; ") : settled ? none : "", notLoaded].filter(Boolean);
}

/**
 * A day of the week strip: its birthdays and follow-ups, by name where there is room and by initials on a
 * phone; a birthday's mark is round and a follow-up's square, so they differ by more than their colour.
 * `known` says whether each kind is "ready", "loading" or "failed", so a failed load is never read as an empty day.
 */
function WeekDay({ he, day, known }) {
  const lang = he ? "he" : "en";
  const { date, inDays } = day;
  const events = [
    ...day.birthdays.map((b) => ({ key: `b${b.client.id}`, kind: "birthday", name: b.client.fullName })),
    ...day.followUps.map((f) => ({ key: `f${f.readingId}`, kind: "follow", name: f.clientName })),
  ];
  const when = `${DAY_LONG[lang][date.getDay()]} ${date.getDate()}.${date.getMonth() + 1}${inDays === 0 ? (he ? ", היום" : ", today") : ""}`;
  const parts = daySaid(he, events, known);
  const more = events.length - DAY_NAMES_SHOWN;
  return (
    <li className={`st-week-day${inDays === 0 ? " is-today" : ""}`}>
      <span className="st-week-head" aria-hidden="true">
        <span className="st-week-name">{inDays === 0 ? (he ? "היום" : "Today") : DAY_SHORT[lang][date.getDay()]}</span>
        <span className="st-week-date">
          {date.getDate()}
          <span className="st-week-month">{`.${date.getMonth() + 1}`}</span>
        </span>
      </span>
      <span className="st-week-events" aria-hidden="true">
        {events.slice(0, DAY_NAMES_SHOWN).map((e) => (
          <span key={e.key} className={`st-week-ev is-${e.kind}`}>
            <span className="st-week-dot" />
            <span className="st-week-initials">{initialsOf(e.name)}</span>
            <span className="st-week-who">{e.name}</span>
          </span>
        ))}
        {more > 0 && <span className="st-week-more">{he ? `עוד ${more}` : `+${more}`}</span>}
      </span>
      <span className="st-sr">{`${when}${parts.length ? `: ${parts.join(". ")}` : ""}.`}</span>
    </li>
  );
}

/** The week ahead: seven days from today, with the birthdays and the follow-ups on each. */
function Week({ he, load, due, today }) {
  const week = weekAhead(load.data || [], due.data?.followUps || [], today);
  const known = { birthdays: stateOf(load), followUps: stateOf(due) };
  return (
    <Panel title={he ? "השבוע הקרוב" : "The week ahead"} className="st-week-panel" rise={2}>
      {(load.error || due.error) && <p className="st-today-quiet st-week-note">{he ? "חלק מהנתונים של השבוע לא נטענו." : "Part of the week did not load."}</p>}
      <ol className="st-week" aria-busy={load.loading || due.loading || undefined}>
        {week.map((d) => (
          <WeekDay key={d.inDays} he={he} day={d} known={known} />
        ))}
      </ol>
      <p className="st-week-key" aria-hidden="true">
        <span className="st-week-ev is-birthday">
          <span className="st-week-dot" />
          {he ? "יום הולדת" : "Birthday"}
        </span>
        <span className="st-week-ev is-follow">
          <span className="st-week-dot" />
          {he ? "מעקב" : "Follow-up"}
        </span>
      </p>
    </Panel>
  );
}

/** In place of the week while there are no clients: the three steps that fill this screen. */
function Welcome({ he }) {
  const steps = he
    ? ["מוסיפים לקוח ב׳לקוח חדש׳: שם, תאריך לידה וטלפון.", "עושים קריאה ושומרים אותה בתיק של הלקוח.", "קובעים תאריך מעקב, והוא יופיע כאן ביום שלו."]
    : ["Add a client with New client: a name, a birth date and a phone.", "Make a reading and save it in the client's file.", "Set a follow-up date, and it shows here on its day."];
  return (
    <Panel title={he ? "מתחילים כאן" : "Start here"} className="st-welcome" rise={2}>
      <ol className="st-welcome-steps">
        {steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
    </Panel>
  );
}

/**
 * What a panel that needs the client list shows while it loads, when it
 * failed, or when it is empty; otherwise `children(clients)`. Both client
 * panels show a failure, but only the one marked `announce` reads it out.
 */
function WithClients({ he, load, onRetry, announce = false, children }) {
  if (load.loading) return <p className="st-today-quiet">{he ? "טוענים…" : "Loading…"}</p>;
  if (load.error) {
    return (
      <div className="st-today-failed">
        <p role={announce ? "alert" : undefined} className="st-today-error">
          {he ? "לא הצלחנו לטעון את הלקוחות." : "The clients could not be loaded."}
        </p>
        <button type="button" className="st-today-btn st-today-small fx" onClick={() => onRetry()}>
          {he ? "לנסות שוב" : "Try again"}
        </button>
      </div>
    );
  }
  if (!load.data?.length) {
    return <p className="st-today-quiet">{he ? "עוד אין לקוחות. מוסיפים את הראשון ב׳לקוח חדש׳." : "No clients yet. Add the first one with New client."}</p>;
  }
  return children(load.data);
}

function whenText(inDays, he) {
  if (inDays === 0) return he ? "היום" : "Today";
  if (inDays === 1) return he ? "מחר" : "Tomorrow";
  if (he) return inDays === 2 ? "בעוד יומיים" : `בעוד ${inDays} ימים`;
  return `In ${inDays} days`;
}

/** A WhatsApp link with `text` to the client's own number; in the demo (a phone for show only) to no one chosen. */
const messageLink = (client, text, greetAnyone) => (client.phone && greetAnyone ? shareLink(text) : greetingLink(client.phone, text));

/** A message button: opens WhatsApp with the message typed, and shows it on hover first. */
function MessageButton({ he, href, text, client, label }) {
  return (
    <a className="st-today-btn st-today-small fx" href={href} target="_blank" rel="noopener noreferrer" title={text}>
      {label}
      <span className="st-sr">{he ? ` ל${client.fullName}` : ` for ${client.fullName}`}</span>
    </a>
  );
}

function BirthdayRow({ he, birthday, lifePath, personalYear, greetAnyone, signature }) {
  const { client, date, age, inDays } = birthday;
  const year = personalYear(client.birthDate, date); // the one the client enters on the birthday
  const [y, m, d] = String(client.birthDate).split("-").map(Number); // upcomingBirthdays keeps valid dates only
  const text = greetingText(client.fullName, he, { personalYear: year, signature });
  const link = messageLink(client, text, greetAnyone);
  const about = [whenText(inDays, he), `${date.getDate()}.${date.getMonth() + 1}`, he ? `יום הולדת ${age}` : `Turning ${age}`].join(" · ");
  return (
    <li className="st-today-row">
      <Initials name={client.fullName} />
      <div className="st-today-who">
        <b className="st-today-name">{client.fullName}</b>
        <span className="st-today-sub">{about}</span>
        <span className="st-today-chips">
          <span className="st-today-chip st-today-chip-gold">
            {`${he ? "מסלול" : "Life path"} ${lifePath(client.birthDate)}`}
            <HowButton k="lp" ctx={{ d, m, y }} he={he} label={he ? `שביל הגורל של ${client.fullName}` : `${client.fullName}'s life path`} />
          </span>
          <span className="st-today-chip">
            {`${he ? "שנה אישית" : "Personal year"} ${year}`}
            <HowButton k="py" ctx={{ d, m, y, now: date }} he={he} label={he ? `השנה האישית של ${client.fullName}` : `${client.fullName}'s personal year`} />
          </span>
        </span>
        {!link && <span className="st-today-sub">{he ? "אין טלפון בתיק, אז אין ברכה בוואטסאפ" : "No phone on file, so no WhatsApp greeting"}</span>}
      </div>
      {link && (
        <a className="st-today-btn st-today-small fx" href={link} target="_blank" rel="noopener noreferrer" title={text}>
          <Icon name="gift" />
          {he ? "ברכה" : "Greeting"}
          <span className="st-sr">{he ? ` ל${client.fullName}` : ` for ${client.fullName}`}</span>
        </a>
      )}
    </li>
  );
}

function Birthdays({ he, clients, today, lifePath, personalYear, greetAnyone, signature }) {
  const birthdays = upcomingBirthdays(clients, today, WEEK_DAYS);
  if (!birthdays.length) return <p className="st-today-quiet">{he ? "אין ימי הולדת השבוע." : "No birthdays this week."}</p>;
  return (
    <ul className="st-today-rows">
      {birthdays.map((b) => (
        <BirthdayRow key={b.client.id} he={he} birthday={b} lifePath={lifePath} personalYear={personalYear} greetAnyone={greetAnyone} signature={signature} />
      ))}
    </ul>
  );
}

/**
 * Marking a due follow-up done: its date is cleared (as the clients screen does) and `due` reloads. A
 * reading deleted meanwhile just leaves the list. A press while that row is being marked (until the list
 * has reloaded) is ignored. Once the row is gone, a focus left with nowhere to be moves to the "done"
 * button that took its place (or the last one), or else to the panel's title; a focus the user has moved
 * on meanwhile stays put. `failed` is the follow-up whose update failed; it clears when the next try
 * starts, so a second failure is announced again. No `markDone` for a store that cannot update.
 */
function useMarkDone(store, due, title) {
  const [failed, setFailed] = useState(null);
  const busy = useRef(new Set());
  const refocusAt = useRef(null);
  useEffect(() => {
    if (refocusAt.current === null) return;
    const at = refocusAt.current;
    refocusAt.current = null;
    const active = document.activeElement;
    if (active && active !== document.body && active.isConnected) return;
    const buttons = title.current?.closest("section")?.querySelectorAll("button[data-done]") || [];
    (buttons[Math.min(at, buttons.length - 1)] || title.current)?.focus();
  }, [due.data, due.error, title]);
  if (!store.readings) return { markDone: undefined, failed: null };
  const markDone = async (f, index) => {
    if (busy.current.has(f.readingId)) return;
    busy.current.add(f.readingId);
    setFailed(null);
    try {
      await store.readings.update(f.readingId, { followUp: null });
      refocusAt.current = index;
      await due.reload(); // never rejects: a failed load shows in the panel
    } catch (err) {
      if (err instanceof NotFoundError) {
        refocusAt.current = index;
        await due.reload();
      } else {
        setFailed(f); // the row stays, and the alert names the client
      }
    } finally {
      busy.current.delete(f.readingId);
    }
  };
  return { markDone, failed };
}

/** The readings whose follow-up date has come: open the reading, ask the client how they are, or mark it done. */
function FollowUps({ he, due, clients, onOpenReading, onDone, failed, greetAnyone, signature }) {
  if (!due.length) return <p className="st-today-quiet">{he ? "אין מעקבים שהגיע זמנם." : "No follow-ups due."}</p>;
  const byId = new Map(clients.map((c) => [c.id, c]));
  const clientOf = (f) => byId.get(f.clientId) || { fullName: f.clientName };
  // a failed row that has since left the list (marked done elsewhere, say) needs no alert
  const failedName = failed && due.some((f) => f.readingId === failed.readingId) ? clientOf(failed).fullName : null;
  return (
    <>
      {failedName && (
        <p className="st-today-error" role="alert">
          {he ? `לא הצלחנו לסמן את המעקב של ${failedName} כבוצע. אפשר לנסות שוב.` : `${failedName}'s follow-up was not marked done. Try again.`}
        </p>
      )}
      <ul className="st-today-rows">
        {due.map((f, i) => {
          const client = clientOf(f);
          const text = followUpText(client.fullName, he, { signature });
          const link = messageLink(client, text, greetAnyone);
          return (
            <li key={f.readingId} className="st-today-row st-today-row-wrap">
              <Initials name={client.fullName} />
              <div className="st-today-who">
                <b className="st-today-name">{client.fullName}</b>
                <span className="st-today-sub">{he ? `מעקב מ-${formatDmy(f.followUp)}` : `Follow-up from ${formatDmy(f.followUp)}`}</span>
              </div>
              <span className="st-today-row-actions">
                {onOpenReading && (
                  <button type="button" className="st-today-btn st-today-small fx" onClick={() => onOpenReading(f.readingId)}>
                    {he ? "לבדיקה" : "Open"}
                    <span className="st-sr">{he ? ` של ${client.fullName}` : ` for ${client.fullName}`}</span>
                  </button>
                )}
                {link && <MessageButton he={he} href={link} text={text} client={client} label={he ? "הודעה" : "Message"} />}
                {onDone && (
                  <button type="button" data-done className="st-today-btn st-today-small fx" onClick={() => onDone(f, i)}>
                    {he ? "בוצע" : "Done"}
                    {/* starts with a space: a screen reader may or may not put one before it */}
                    <span className="st-sr">{he ? ` — המעקב של ${client.fullName}` : ` — ${client.fullName}'s follow-up`}</span>
                  </button>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/** In January, the clients shown before "show all". */
const NEW_YEAR_FIRST = 8;

/**
 * Clients worth a word: the ones quiet for half a year, with their personal year now; in January, when every
 * personal year moves on, every client with their new year (the most recent first, the rest on asking).
 */
function Reconnect({ he, clients, now, personalYear, greetAnyone, signature }) {
  const [showAll, setShowAll] = useState(false);
  const newYear = isNewYearMonth(now);
  // a client with no birth date has no personal year to send
  const everyone = newYear ? recentClients(clients, Infinity).filter((c) => c.birthDate) : [];
  const list = newYear
    ? everyone.slice(0, showAll ? everyone.length : NEW_YEAR_FIRST).map((client) => ({ client, months: null }))
    : quietClients(clients, now);
  if (!list.length) {
    if (newYear) return <p className="st-today-quiet">{he ? "אין עדיין לקוחות עם תאריך לידה." : "No clients with a birth date yet."}</p>;
    return <p className="st-today-quiet">{he ? "לכל הלקוחות הייתה פעילות בחצי השנה האחרונה." : "Every client had activity in the last half year."}</p>;
  }
  const more = newYear && !showAll && everyone.length > NEW_YEAR_FIRST;
  return (
    <>
      <ul className="st-today-rows">
        {list.map(({ client, months }) => {
          const year = client.birthDate ? personalYear(client.birthDate, now) : undefined;
          const make = newYear ? newYearText : checkInText;
          const text = make(client.fullName, he, { personalYear: year, signature });
          const link = messageLink(client, text, greetAnyone);
          const about = newYear
            ? year && (he ? `שנה אישית חדשה: ${year}` : `New personal year: ${year}`)
            : he ? `פעילות אחרונה לפני ${months} חודשים` : `Last activity ${months} months ago`;
          return (
            <li key={client.id} className="st-today-row">
              <Initials name={client.fullName} />
              <div className="st-today-who">
                <b className="st-today-name">{client.fullName}</b>
                {about && <span className="st-today-sub">{about}</span>}
              </div>
              {link ? (
                <MessageButton he={he} href={link} text={text} client={client} label={he ? "הודעה" : "Message"} />
              ) : (
                <span className="st-today-sub">{he ? "אין טלפון" : "No phone"}</span>
              )}
            </li>
          );
        })}
      </ul>
      {more && (
        <button type="button" className="st-today-btn st-today-small fx" onClick={() => setShowAll(true)}>
          {he ? `להציג את כל ${everyone.length} הלקוחות` : `Show all ${everyone.length} clients`}
        </button>
      )}
    </>
  );
}

function Recent({ he, clients, lifePath, onOpenClient }) {
  return (
    <ul className="st-today-rows">
      {recentClients(clients).map((c) => (
        <li key={c.id}>
          <button type="button" className="st-today-row st-today-open fx" onClick={() => onOpenClient(c.id)}>
            <Initials name={c.fullName} />
            <span className="st-today-who">
              <b className="st-today-name">{c.fullName}</b>
            </span>
            {c.birthDate && <span className="st-today-chip st-today-chip-gold">{`${he ? "מסלול" : "Life path"} ${lifePath(c.birthDate)}`}</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}

/** A tool's name and line; the button is named by both, so its name holds everything it shows. */
function ToolText({ id, label, line }) {
  return (
    <>
      <span className="st-tool-name" id={id}>
        {label}
      </span>
      {/* a space between the two, so the visible text reads as the name does (voice control matches the two) */}
      {line && " "}
      {line && (
        <span className="st-tool-line" id={`${id}-line`}>
          {line}
        </span>
      )}
    </>
  );
}

/**
 * On a wide screen, the tiles to a row: ten in two rows of five, eight in two of four; any other count in rows
 * of five, the last row centred under the others (home.css).
 */
const toolColumns = (count) => (count % 5 !== 0 && count % 4 === 0 ? 4 : 5);

/**
 * Every tool, as a tile with a line on what it is for, under a bar for quick search. `tools` are the app's
 * tools ({k, i, he, en}, as the toolbar has them); "היום" itself is left out, and so is anything the app has
 * not wired (no `onTool`, no `onSearch`).
 */
function Tools({ he, tools, onTool, onSearch }) {
  const id = useId();
  const lang = he ? "he" : "en";
  const tiles = onTool ? tools.filter((t) => t.k !== "today") : [];
  if (!tiles.length && !onSearch) return null;
  // named by the tool's name and its line together (the key hint is left out of the name)
  const named = (key) => (TOOL_LINES[key] ? `${id}-${key} ${id}-${key}-line` : `${id}-${key}`);
  return (
    <Panel title={he ? "כל הכלים" : "All the tools"} className="st-tools" rise={5}>
      {onSearch && (
        <button type="button" className="st-tool-search fx" aria-labelledby={named("search")} aria-keyshortcuts="Control+K Meta+K" onClick={() => onSearch()}>
          <span className="st-tool-icon" aria-hidden="true">
            <AppIcon name="search" size={20} stroke={1.6} />
          </span>
          <ToolText id={`${id}-search`} label={he ? "חיפוש מהיר" : "Quick search"} line={TOOL_LINES.search[lang]} />
          <kbd className="st-today-kbd" dir="ltr" aria-hidden="true">
            Ctrl K
          </kbd>
        </button>
      )}
      {tiles.length > 0 && (
        <ul className="st-tools-grid" style={{ "--cols": toolColumns(tiles.length) }}>
          {tiles.map((t) => (
            <li key={t.k}>
              <button type="button" className="st-tool-tile fx" aria-labelledby={named(t.k)} onClick={() => onTool(t.k)}>
                <span className="st-tool-icon" aria-hidden="true">
                  <AppIcon name={t.i} size={22} stroke={1.6} />
                </span>
                <ToolText id={`${id}-${t.k}`} label={t[lang]} line={TOOL_LINES[t.k]?.[lang]} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/**
 * @param {{
 *   he: boolean, store: object, now?: () => Date,
 *   day: {number: number, title: string, text: string},
 *   lifePath: (isoDate: string) => number, personalYear: (isoDate: string, at: Date) => number,
 *   deck: import("react").ReactNode, onOpenClient: (id: string) => void, onNewReading: () => void,
 *   tools?: {k: string, i: string, he: string, en: string}[], onTool?: (k: string) => void,
 *   onNewClient?: () => void, onMeeting?: () => void, onSearch?: () => void,
 *   greetAnyone?: boolean, signature?: string, onOpenReading?: (id: string) => void,
 * }} props `signature` ends each message to a client (the studio's name)
 */
export default function Today({ he, store, now = () => new Date(), day, lifePath, personalYear, deck, tools = [], onTool, onOpenClient, onNewReading, onNewClient, onMeeting, onSearch, onOpenReading, greetAnyone = false, signature = "" }) {
  const load = useLoad(() => store.clients.list(), [store]);
  // the follow-ups up to the week strip's last day (the panel lists the ones due by today), asked again on a new date
  const dayKey = toYmd(now());
  const due = useLoad(() => store.summary(weekEnd(now())), [store, dayKey]);
  const firstTitle = useRef(null);
  const followTitle = useRef(null);
  const retry = useRetry(load, firstTitle);
  const retryDue = useRetry(due, followTitle);
  const done = useMarkDone(store, due, followTitle);
  const today = now();
  const messages = { he, greetAnyone, signature };
  const hasClients = load.data?.length > 0;
  const paths = load.data ? lifePathCounts(load.data, lifePath) : null;
  return (
    <div className="st-today">
      <h2 className="st-sr">{he ? "היום" : "Today"}</h2>
      <Hero he={he} today={today} day={day} paths={paths} onNewReading={onNewReading} onNewClient={onNewClient} onMeeting={onMeeting} />
      <Figures
        he={he}
        load={load}
        due={due}
        today={today}
        onOpenClients={onTool && (() => onTool("clients"))}
        onFollowUps={hasClients ? () => followTitle.current?.focus() : undefined}
        onBirthdays={() => firstTitle.current?.focus()}
      />
      {load.data && !hasClients ? <Welcome he={he} /> : <Week he={he} load={load} due={due} today={today} />}
      {/* the lists, two by two: birthdays and follow-ups, then the recent clients and the ones worth a word */}
      <div className="st-today-lists">
        <Panel title={he ? "ימי הולדת השבוע" : "Birthdays this week"} titleRef={firstTitle} rise={3}>
          <WithClients he={he} load={load} onRetry={retry} announce>
            {(clients) => <Birthdays he={he} clients={clients} today={today} lifePath={lifePath} personalYear={personalYear} greetAnyone={greetAnyone} signature={signature} />}
          </WithClients>
        </Panel>
        {hasClients && (
          <Panel title={he ? "מעקבים שהגיע זמנם" : "Follow-ups due"} titleRef={followTitle} rise={3}>
            {due.data && (
              <FollowUps {...messages} due={dueBy(due.data.followUps, today)} clients={load.data} onOpenReading={onOpenReading} onDone={done.markDone} failed={done.failed} />
            )}
            {due.error && (
              <div className="st-today-failed">
                <p role="alert" className="st-today-error">
                  {he ? "לא הצלחנו לטעון את המעקבים." : "The follow-ups did not load."}
                </p>
                <button type="button" className="st-today-btn st-today-small fx" onClick={() => retryDue()}>
                  {he ? "לנסות שוב" : "Try again"}
                </button>
              </div>
            )}
          </Panel>
        )}
        <Panel title={he ? "לקוחות אחרונים" : "Recent clients"} rise={4}>
          <WithClients he={he} load={load} onRetry={retry}>
            {(clients) => <Recent he={he} clients={clients} lifePath={lifePath} onOpenClient={onOpenClient} />}
          </WithClients>
        </Panel>
        {hasClients && (
          <Panel title={isNewYearMonth(today) ? (he ? "השנה האישית החדשה" : "The new personal year") : he ? "כדאי לחזור אליהם" : "Worth getting back to"} rise={4}>
            <Reconnect {...messages} clients={load.data} now={today} personalYear={personalYear} />
          </Panel>
        )}
      </div>
      <Tools he={he} tools={tools} onTool={onTool} onSearch={onSearch} />
      <Panel title={he ? "קלף היום" : "Today's card"} className="st-deck-panel" rise={6}>
        {deck}
      </Panel>
    </div>
  );
}
