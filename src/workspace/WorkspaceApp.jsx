/**
 * The practitioner workspace: client files, saved readings, attachments and
 * backup. Lives in the Studio's "לקוחות" tab. Five screens switched by a small
 * view state; data comes from the workspace store (IndexedDB on this device).
 */
import { useEffect, useRef, useState } from "react";
import { openWorkspaceStore } from "../data/open.js";
import { colors, Card } from "./ui.jsx";
import ClientsScreen from "./ClientsScreen.jsx";
import ClientForm from "./ClientForm.jsx";
import ClientFile from "./ClientFile.jsx";
import NewReading from "./NewReading.jsx";
import ReadingView from "./ReadingView.jsx";

/**
 * @param {{he?: boolean, dk?: boolean, store?: object, now?: () => Date}} props
 *   `store` and `now` are injectable for tests; by default the device store and the real clock.
 */
export default function WorkspaceApp({ he = true, dk = true, store: injected = null, now = () => new Date() }) {
  const [store, setStore] = useState(injected);
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState({ name: "list" });
  const top = useRef(null);
  const c = colors(dk);

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
  }, [view]);

  if (failed) {
    return <Card style={{ textAlign: "center", color: c.danger }}>{he ? "לא ניתן לפתוח את מרחב העבודה בדפדפן הזה." : "The workspace cannot open in this browser."}</Card>;
  }
  if (!store) return <Card style={{ textAlign: "center", color: c.ts }}>{he ? "טוען…" : "Loading…"}</Card>;

  const props = { store, go: setView, he, c, now };
  return (
    <div ref={top} dir={he ? "rtl" : "ltr"} style={{ color: c.tm, scrollMarginTop: 80 }}>
      {!store.persistent && (
        <Card style={{ borderColor: c.warn, color: c.warn, fontSize: 13, padding: 14 }}>
          <span role="status">
            {he
              ? "שימו לב: הנתונים לא נשמרים בדפדפן הזה (למשל בגלישה בסתר). לפני שסוגרים, גבו לקובץ."
              : "Note: this browser does not keep the data (private browsing?). Back up to a file before closing."}
          </span>
        </Card>
      )}
      {view.name === "list" && <ClientsScreen {...props} />}
      {view.name === "clientForm" && <ClientForm {...props} clientId={view.clientId} />}
      {view.name === "client" && <ClientFile {...props} clientId={view.clientId} />}
      {view.name === "newReading" && <NewReading {...props} clientId={view.clientId} />}
      {view.name === "reading" && <ReadingView {...props} readingId={view.readingId} />}
    </div>
  );
}
