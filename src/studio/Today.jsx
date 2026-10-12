/**
 * The "היום" home: today's universal day with a way into a new reading, the
 * clients' birthdays this week, the most recently active clients, quick
 * actions, the follow-ups that are due (each can be marked done), the clients
 * worth a word, and today's card. It reads the client list and the summary
 * from the workspace store; the day, the numbers and the deck come in from the app.
 */
import { useEffect, useRef, useState } from "react";
import { useLoad } from "../workspace/ui.jsx";
import { NotFoundError } from "../data/store.js";
import {
  checkInText, followUpText, greetingLink, greetingText, initialsOf, isNewYearMonth, newYearText, quietClients,
  recentClients, shareLink, upcomingBirthdays,
} from "./today.js";
import { formatDmy } from "../workspace/format.js";
import HowButton from "../reading/HowButton.jsx";
import Locked from "../demo/DemoLock.jsx";
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

/** The band: the universal day, the date, the day's meaning and a new reading. */
function DayBand({ he, today, day, onNewReading }) {
  return (
    <section className="st-today-band">
      <div className="st-today-day">
        <small>
          {he ? "היום האוניברסלי" : "Universal day"}
          <HowButton k="universal" ctx={{ now: today }} he={he} />
        </small>
        <span className="st-today-num">{day.number}</span>
      </div>
      <div>
        <p className="st-today-date">{today.toLocaleDateString(he ? "he-IL" : "en-GB", DATE_FORMAT)}</p>
        <p className="st-today-meaning">
          {day.title && <b>{day.title}.</b>} <Locked he={he}>{day.text}</Locked>
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
  const birthdays = upcomingBirthdays(clients, today);
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

/** In July, the clients shown before "show all". */
const NEW_YEAR_FIRST = 8;

/**
 * Clients worth a word: the ones quiet for half a year, with their personal year now; in July, when the +1
 * moves every personal year on, every client with their new year (the most recent first, the rest on asking).
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
 *   greetAnyone?: boolean, signature?: string, onOpenReading?: (id: string) => void,
 * }} props `signature` ends each message to a client (the studio's name)
 */
export default function Today({ he, store, now = () => new Date(), day, lifePath, personalYear, deck, onOpenClient, onNewReading, onNewClient, onMeeting, onSearch, onOpenReading, greetAnyone = false, signature = "" }) {
  const load = useLoad(() => store.clients.list(), [store]);
  const due = useLoad(() => store.summary(now()), [store]);
  const firstTitle = useRef(null);
  const followTitle = useRef(null);
  const retry = useRetry(load, firstTitle);
  const retryDue = useRetry(due, followTitle);
  const done = useMarkDone(store, due, followTitle);
  const today = now();
  const messages = { he, greetAnyone, signature };
  return (
    <div className="st-today">
      <h2 className="st-sr">{he ? "היום" : "Today"}</h2>
      <DayBand he={he} today={today} day={day} onNewReading={onNewReading} />
      <div className="st-cols-3 st-today-top">
        <Panel title={he ? "ימי הולדת השבוע" : "Birthdays this week"} titleRef={firstTitle}>
          <WithClients he={he} load={load} onRetry={retry} announce>
            {(clients) => <Birthdays he={he} clients={clients} today={today} lifePath={lifePath} personalYear={personalYear} greetAnyone={greetAnyone} signature={signature} />}
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
      {/* once there are clients: the ones to follow up, and the ones worth a word */}
      {load.data?.length > 0 && (
        <div className="st-cols-2">
          <Panel title={he ? "מעקבים שהגיע זמנם" : "Follow-ups due"} titleRef={followTitle}>
            {due.data && (
              <FollowUps {...messages} due={due.data.followUps} clients={load.data} onOpenReading={onOpenReading} onDone={done.markDone} failed={done.failed} />
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
          <Panel title={isNewYearMonth(today) ? (he ? "השנה האישית החדשה" : "The new personal year") : he ? "כדאי לחזור אליהם" : "Worth getting back to"}>
            <Reconnect {...messages} clients={load.data} now={today} personalYear={personalYear} />
          </Panel>
        </div>
      )}
      <Panel title={he ? "קלף היום" : "Today's card"}>{deck}</Panel>
    </div>
  );
}
