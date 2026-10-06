/**
 * The "היום" home: today's universal day with a way into a new reading, the
 * clients' birthdays this week, the most recently active clients, quick
 * actions, and today's card. It reads the client list from the workspace store
 * once; the day, the numbers and the deck come in from the app.
 */
import { useEffect, useRef } from "react";
import { useLoad } from "../workspace/ui.jsx";
import { greetingLink, greetingText, initialsOf, recentClients, upcomingBirthdays } from "./today.js";
import "./today.css";

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
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.2-4.2" />
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

/** A titled panel; with `titleRef`, the title can also take the focus. */
function Panel({ title, titleRef, className = "", children }) {
  return (
    <section className={`st-panel ${className}`.trim()}>
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

/** The band: today's number, the date, the day's meaning and a new reading. */
function DayBand({ he, today, day, onNewReading }) {
  return (
    <section className="st-today-band">
      <div className="st-today-day">
        <small>{he ? "המספר של היום" : "Today’s number"}</small>
        <span className="st-today-num">{day.number}</span>
      </div>
      <div>
        <p className="st-today-date">{today.toLocaleDateString(he ? "he-IL" : "en-GB", DATE_FORMAT)}</p>
        <p className="st-today-meaning">
          {day.title && <b>{day.title}.</b>} {day.text}
        </p>
      </div>
      <button type="button" className="st-today-btn st-today-solid st-today-go fx" onClick={() => onNewReading()}>
        <Icon name="plus" />
        {he ? "קריאה חדשה" : "New reading"}
      </button>
    </section>
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

function BirthdayRow({ he, birthday, lifePath, personalYear }) {
  const { client, date, age, inDays } = birthday;
  const link = greetingLink(client.phone, greetingText(client.fullName, he));
  const about = [whenText(inDays, he), `${date.getDate()}.${date.getMonth() + 1}`, he ? `יום הולדת ${age}` : `Turning ${age}`].join(" · ");
  return (
    <li className="st-today-row">
      <Initials name={client.fullName} />
      <div className="st-today-who">
        <b className="st-today-name">{client.fullName}</b>
        <span className="st-today-sub">{about}</span>
        <span className="st-today-chips">
          <span className="st-today-chip st-today-chip-gold">{`${he ? "מסלול" : "Life path"} ${lifePath(client.birthDate)}`}</span>
          <span className="st-today-chip">{`${he ? "שנה אישית" : "Personal year"} ${personalYear(client.birthDate, date)}`}</span>
        </span>
      </div>
      {link && (
        <a className="st-today-btn st-today-small fx" href={link} target="_blank" rel="noopener noreferrer">
          <Icon name="gift" />
          {he ? "ברכה" : "Greeting"}
          <span className="st-sr">{he ? ` ל${client.fullName}` : ` for ${client.fullName}`}</span>
        </a>
      )}
    </li>
  );
}

function Birthdays({ he, clients, today, lifePath, personalYear }) {
  const birthdays = upcomingBirthdays(clients, today);
  if (!birthdays.length) return <p className="st-today-quiet">{he ? "אין ימי הולדת השבוע." : "No birthdays this week."}</p>;
  return (
    <ul className="st-today-rows">
      {birthdays.map((b) => (
        <BirthdayRow key={b.client.id} he={he} birthday={b} lifePath={lifePath} personalYear={personalYear} />
      ))}
    </ul>
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

/** The quick actions the app has wired; one without a handler is left out. */
function QuickActions({ he, onNewClient, onMeeting, onSearch }) {
  const actions = [
    { key: "client", icon: "client", label: he ? "לקוח חדש" : "New client", run: onNewClient },
    { key: "meeting", icon: "meeting", label: he ? "מצב פגישה" : "Meeting mode", run: onMeeting },
    { key: "search", icon: "search", label: he ? "חיפוש מהיר" : "Quick search", run: onSearch, keys: "Ctrl K", shortcut: "Control+K Meta+K" },
  ];
  return (
    <div className="st-today-actions">
      {actions
        .filter((a) => a.run)
        .map((a) => (
          <button key={a.key} type="button" className="st-today-btn fx" aria-keyshortcuts={a.shortcut} onClick={() => a.run()}>
            <Icon name={a.icon} />
            {a.label}
            {a.keys && (
              <kbd className="st-today-kbd" dir="ltr" aria-hidden="true">
                {a.keys}
              </kbd>
            )}
          </button>
        ))}
    </div>
  );
}

/**
 * @param {{
 *   he: boolean, store: object, now?: () => Date,
 *   day: {number: number, title: string, text: string},
 *   lifePath: (isoDate: string) => number, personalYear: (isoDate: string, at: Date) => number,
 *   deck: import("react").ReactNode, onOpenClient: (id: string) => void, onNewReading: () => void,
 *   onNewClient?: () => void, onMeeting?: () => void, onSearch?: () => void,
 * }} props
 */
export default function Today({ he, store, now = () => new Date(), day, lifePath, personalYear, deck, onOpenClient, onNewReading, onNewClient, onMeeting, onSearch }) {
  const load = useLoad(() => store.clients.list(), [store]);
  const firstTitle = useRef(null);
  const retry = useRetry(load, firstTitle);
  const today = now();
  return (
    <div className="st-today">
      <h2 className="st-sr">{he ? "היום" : "Today"}</h2>
      <DayBand he={he} today={today} day={day} onNewReading={onNewReading} />
      <div className="st-cols-3">
        <Panel title={he ? "ימי הולדת השבוע" : "Birthdays this week"} titleRef={firstTitle}>
          <WithClients he={he} load={load} onRetry={retry} announce>
            {(clients) => <Birthdays he={he} clients={clients} today={today} lifePath={lifePath} personalYear={personalYear} />}
          </WithClients>
        </Panel>
        <Panel title={he ? "לקוחות אחרונים" : "Recent clients"}>
          <WithClients he={he} load={load} onRetry={retry}>
            {(clients) => <Recent he={he} clients={clients} lifePath={lifePath} onOpenClient={onOpenClient} />}
          </WithClients>
        </Panel>
        <Panel title={he ? "פעולות מהירות" : "Quick actions"} className="st-today-quick">
          <QuickActions he={he} onNewClient={onNewClient} onMeeting={onMeeting} onSearch={onSearch} />
        </Panel>
      </div>
      <Panel title={he ? "קלף היום" : "Today's card"}>{deck}</Panel>
    </div>
  );
}
