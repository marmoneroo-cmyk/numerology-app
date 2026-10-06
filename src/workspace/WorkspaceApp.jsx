/**
 * The practitioner workspace: client files, saved readings, attachments and
 * backup. Lives in the Studio's "לקוחות" tab. Five screens switched by a small
 * view state; data comes from the workspace store. On a computer the client
 * list stays in a column beside whatever is open; on a phone it is one screen
 * at a time.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { openWorkspaceStore } from "../data/open.js";
import { useLayout } from "../studio/useMediaQuery.js";
import { colors, Card, ErrorCard, ScreenBoundary, FocusTitleContext } from "./ui.jsx";
import ClientsScreen from "./ClientsScreen.jsx";
import ClientForm from "./ClientForm.jsx";
import ClientFile from "./ClientFile.jsx";
import NewReading from "./NewReading.jsx";
import ReadingView from "./ReadingView.jsx";

/** File inputs stay focusable for the keyboard but invisible; their label (styled as a button) shows the focus. */
const fileInputCss = (ac) =>
  `.ws-file{position:absolute;width:1px;height:1px;margin:-1px;padding:0;border:0;opacity:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap}` +
  `.ws-file:focus-visible+label{outline:2px solid ${ac};outline-offset:2px}`;

/**
 * @param {{he?: boolean, dk?: boolean, store?: object, now?: () => Date, onEvent?: (action: string) => void,
 *   openRequest?: {view: object, nonce: number} | null, onOpenHandled?: () => void}} props
 *   `store` and `now` are injectable (by default the device store and the real clock);
 *   `onEvent(action)` hears of backups and restores, for the account's log;
 *   a new `openRequest.nonce` opens `openRequest.view` (other screens open a client this way), then
 *   `onOpenHandled()` lets the asker drop the request, so the next visit starts at the list.
 */
export default function WorkspaceApp({ he = true, dk = true, store: injected = null, now = () => new Date(), onEvent = () => {}, openRequest = null, onOpenHandled = () => {} }) {
  const [store, setStore] = useState(injected);
  const [failed, setFailed] = useState(false);
  // every move counts, so the screen (and its error boundary) starts fresh even when it is the same screen again
  const [nav, setNav] = useState({ view: { name: "list" }, moves: 0 });
  const go = useCallback((view) => setNav((n) => ({ view, moves: n.moves + 1 })), []);
  const top = useRef(null);
  const split = useLayout() === "desk";
  const c = colors(dk);

  useEffect(() => {
    if (!openRequest?.view) return;
    go(openRequest.view);
    onOpenHandled();
    // only a new request moves; the same one re-rendered does not
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openRequest?.nonce]);

  useEffect(() => {
    if (injected) return undefined;
    let alive = true;
    openWorkspaceStore()
      .then((s) => alive && setStore(s))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [injected]);

  useEffect(() => {
    top.current?.scrollIntoView?.({ block: "start", behavior: "smooth" });
  }, [nav]);

  if (failed) {
    return <Card style={{ textAlign: "center", color: c.danger }}>{he ? "לא ניתן לפתוח את מרחב העבודה בדפדפן הזה." : "The workspace cannot open in this browser."}</Card>;
  }
  if (!store) return <Card style={{ textAlign: "center", color: c.ts }}>{he ? "טוען…" : "Loading…"}</Card>;

  const { view } = nav;
  const props = { store, go, he, c, now, onEvent };
  const crashed = (
    <ErrorCard
      he={he}
      c={c}
      text={he ? "משהו השתבש בהצגת המסך הזה." : "Something went wrong showing this screen."}
      backLabel={he ? "חזרה ללקוחות" : "Back to clients"}
      onBack={() => go({ name: "list" })}
    />
  );
  return (
    <div ref={top} dir={he ? "rtl" : "ltr"} style={{ color: c.tm, scrollMarginTop: 80 }}>
      <style>{fileInputCss(c.ac)}</style>
      {!store.persistent && (
        <Card style={{ borderColor: c.warn, color: c.warn, fontSize: 13, padding: 14 }}>
          <span role="status">
            {he
              ? "שימו לב: הנתונים לא נשמרים בדפדפן הזה (למשל בגלישה בסתר). לפני שסוגרים, גבו לקובץ."
              : "Note: this browser does not keep the data (private browsing?). Back up to a file before closing."}
          </span>
        </Card>
      )}
      {/* the open screen keeps its place (key "open") whether or not the list is beside it, so a form
          half typed survives the window crossing the computer's width */}
      <div className={split ? "st-split" : undefined}>
        {split && (
          <section key="list" className="st-split-list" aria-label={he ? "רשימת הלקוחות" : "Client list"}>
            {/* one boundary for the list that never restarts: the search and the scroll survive a move */}
            <ScreenBoundary key="list" fallback={crashed}>
              <ClientsScreen {...props} selectedId={view.clientId ?? null} refreshKey={nav.moves} />
            </ScreenBoundary>
          </section>
        )}
        <section key="open" aria-label={split ? (he ? "הלקוח הפתוח" : "Open client") : undefined}>
          <OpenView view={view} props={props} moves={nav.moves} crashed={crashed} split={split} he={he} c={c} />
        </section>
      </div>
    </div>
  );
}

/** The open screen: on a computer the list itself is beside it, so "list" shows a prompt instead. */
function OpenView({ view, props, moves, crashed, split, he, c }) {
  return (
    <FocusTitleContext.Provider value={moves > 0}>
      <ScreenBoundary key={moves} fallback={crashed}>
        {view.name === "list" &&
          (split ? (
            <Card>
              <div className="st-split-empty">
                <p style={{ margin: 0, color: c.ts, lineHeight: 1.7 }}>{he ? "בחרו לקוח מהרשימה, או פתחו לקוח חדש." : "Choose a client from the list, or open a new one."}</p>
              </div>
            </Card>
          ) : (
            <ClientsScreen {...props} />
          ))}
        {view.name === "clientForm" && <ClientForm {...props} clientId={view.clientId} />}
        {view.name === "client" && <ClientFile {...props} clientId={view.clientId} />}
        {view.name === "newReading" && <NewReading {...props} clientId={view.clientId} />}
        {view.name === "reading" && <ReadingView {...props} readingId={view.readingId} />}
      </ScreenBoundary>
    </FocusTitleContext.Provider>
  );
}
