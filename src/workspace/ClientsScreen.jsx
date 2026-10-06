/** Home of the workspace: search, today's follow-ups and birthdays, the client list, backup. */
import { useEffect, useId, useRef, useState } from "react";
import { LPm } from "../engine/index.js";
import { toYmd, lastActive } from "../data/store.js";
import { ValidationError } from "../data/validation.js";
import { Card, Loading, ErrorCard, SectionTitle, ScreenTitle, useLoad, rowButton, btnPrimary, btnGhost } from "./ui.jsx";
import { formatDmy, formatStamp, personOf, readingTypeLabel, countLabel } from "./format.js";
import { readFileText, saveJson } from "./files.js";

const LAST_BACKUP_KEY = "numerology_workspace_last_backup";
const BACKUP_REMINDER_DAYS = 14;
const DAY_MS = 86400000;

function lastBackup() {
  try {
    return localStorage.getItem(LAST_BACKUP_KEY);
  } catch {
    return null;
  }
}
function rememberBackup(date) {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, date.toISOString());
  } catch {
    /* storage refused: the reminder just keeps showing */
  }
}

/** A note for files a backup had to leave out because their contents are gone from the device. */
function missingNote(n, he) {
  if (!n) return "";
  if (he) return n === 1 ? " קובץ אחד לא נכלל בגיבוי כי התוכן שלו חסר במכשיר." : ` ${n} קבצים לא נכללו בגיבוי כי התוכן שלהם חסר במכשיר.`;
  return n === 1 ? " 1 file was left out because its contents are missing on this device." : ` ${n} files were left out because their contents are missing on this device.`;
}

/** Why a restore did not happen. A restore is all-or-nothing, so in every case nothing changed. */
function restoreError(err, he) {
  if (!(err instanceof ValidationError)) return he ? "השחזור נכשל ושום דבר לא השתנה. נסו שוב." : "Restoring failed and nothing changed. Try again.";
  if (err.errors.some((x) => x.field === "backup")) return he ? "הקובץ הזה אינו גיבוי של מרחב העבודה." : "This file is not a workspace backup.";
  const n = countLabel(err.errors.length, "errors", he);
  return he ? `הגיבוי פגום ולכן לא שוחזר ממנו דבר (${n}).` : `The backup is damaged, so nothing was restored from it (${n}).`;
}

/**
 * `selectedId` marks the client open beside the list (on a computer), and a
 * new `refreshKey` reloads the list and summary after a change made there.
 */
export default function ClientsScreen({ store, go, he, c, now, onEvent = () => {}, selectedId = null, refreshKey = 0 }) {
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState(null);
  const [followMsg, setFollowMsg] = useState(null);
  const restoreId = useId();
  const followUpsRef = useRef(null);
  const searchRef = useRef(null);
  const refocusAfterDone = useRef(false);
  const list = useLoad(() => store.clients.list({ search }), [store, search, refreshKey]);
  const sum = useLoad(() => store.summary(now()), [store, refreshKey]);

  // a follow-up marked done leaves the list: the focus moves to the next one, or else to the search
  useEffect(() => {
    if (!refocusAfterDone.current) return;
    refocusAfterDone.current = false;
    (followUpsRef.current?.querySelector("button[data-done]") || searchRef.current)?.focus();
  }, [sum.data]);

  const backup = async () => {
    try {
      const data = await store.exportAll();
      saveJson(`numerology-backup-${toYmd(now())}.json`, data);
      onEvent("backup_exported");
      rememberBackup(now());
      setMsg({
        ok: true,
        text:
          (he
            ? "הגיבוי נשמר לקובץ. שמרו אותו במקום מוגן: יש בו את כל פרטי הלקוחות."
            : "Backup saved to a file. Keep it somewhere safe: it holds all your clients' details.") + missingNote(data.missingFiles, he),
      });
    } catch {
      setMsg({ ok: false, text: he ? "הגיבוי נכשל. נסו שוב." : "Backup failed. Try again." });
    }
  };

  const restore = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    let backupData;
    try {
      backupData = JSON.parse(await readFileText(file));
    } catch {
      setMsg({ ok: false, text: he ? "לא ניתן לקרוא את הקובץ. בחרו את קובץ הגיבוי ששמרתם." : "Cannot read the file. Pick the backup file you saved." });
      return;
    }
    try {
      const counts = await store.importAll(backupData);
      onEvent("backup_restored");
      const parts = [countLabel(counts.clients, "clients", he), countLabel(counts.readings, "readings", he), countLabel(counts.attachments, "files", he)];
      setMsg({ ok: true, text: he ? `שוחזרו: ${parts.join(", ")}` : `Restored: ${parts.join(", ")}` });
      list.reload();
      sum.reload();
    } catch (err) {
      setMsg({ ok: false, text: restoreError(err, he) });
    }
  };

  const markDone = async (f) => {
    setFollowMsg(null);
    try {
      await store.readings.update(f.readingId, { followUp: null });
      refocusAfterDone.current = true;
      sum.reload();
    } catch {
      setFollowMsg(he ? "העדכון נכשל. נסו שוב." : "Updating failed. Try again.");
    }
  };

  const clients = list.data || [];
  const summary = sum.data;
  const backedUp = lastBackup();
  const daysSinceBackup = backedUp ? Math.floor((now() - new Date(backedUp)) / DAY_MS) : null;
  const remind = summary?.clients > 0 && (daysSinceBackup === null || daysSinceBackup >= BACKUP_REMINDER_DAYS);

  return (
    <div>
      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div>
            <ScreenTitle c={c} size={28}>{he ? "הלקוחות שלי" : "My clients"}</ScreenTitle>
            {summary && (
              <div style={{ fontSize: 12, color: c.ts }}>
                {`${countLabel(summary.clients, "clients", he)} · ${countLabel(summary.readings, "savedReadings", he)}`}
              </div>
            )}
          </div>
          <button className="gb" style={btnPrimary} onClick={() => go({ name: "clientForm" })}>{he ? "לקוח חדש" : "New client"}</button>
        </div>
        <input
          ref={searchRef}
          className="gi"
          type="search"
          style={{ marginTop: 14 }}
          aria-label={he ? "חיפוש לקוחות" : "Search clients"}
          placeholder={he ? "חיפוש לפי שם, טלפון או תגית" : "Search by name, phone or tag"}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Card>

      {summary && (summary.followUps.length > 0 || summary.birthdays.length > 0) && (
        <Card>
          {summary.followUps.length > 0 && (
            <div ref={followUpsRef} data-testid="follow-ups" style={{ marginBottom: summary.birthdays.length ? 14 : 0 }}>
              <SectionTitle c={c}>{he ? "מעקבים להיום" : "Follow-ups due"}</SectionTitle>
              {followMsg && <p role="alert" style={{ color: c.danger, fontSize: 13, margin: "0 0 8px" }}>{followMsg}</p>}
              {summary.followUps.map((f) => (
                <div key={f.readingId} className="rrow" style={{ padding: "8px 8px", gap: 10 }}>
                  <button
                    style={{ ...rowButton(c), borderBottom: 0, width: "auto", flex: 1, minWidth: 0, display: "flex", gap: 12, alignItems: "center", padding: "6px 0" }}
                    onClick={() => go({ name: "reading", readingId: f.readingId })}
                  >
                    <span style={{ flex: 1 }}>{f.clientName}</span>
                    <span style={{ fontSize: 12, color: c.ts }}>{readingTypeLabel(f.type, he)} · {formatDmy(f.followUp)}</span>
                  </button>
                  <button
                    data-done
                    className="ghost"
                    style={btnGhost}
                    aria-label={he ? `סימון המעקב של ${f.clientName} כבוצע` : `Mark ${f.clientName}'s follow-up as done`}
                    onClick={() => markDone(f)}
                  >
                    {he ? "בוצע" : "Done"}
                  </button>
                </div>
              ))}
            </div>
          )}
          {summary.birthdays.length > 0 && (
            <div>
              <SectionTitle c={c}>{he ? "ימי הולדת החודש" : "Birthdays this month"}</SectionTitle>
              {summary.birthdays.map((b) => (
                <button key={b.clientId} className="rrow" style={rowButton(c)} onClick={() => go({ name: "client", clientId: b.clientId })}>
                  <span style={{ flex: 1 }}>{b.fullName}</span>
                  <span style={{ fontSize: 12, color: c.ts }}>
                    {he ? `ב-${b.day} לחודש · ${b.turning} · שנה אישית חדשה` : `on the ${b.day} · turning ${b.turning} · a new personal year`}
                  </span>
                </button>
              ))}
            </div>
          )}
        </Card>
      )}

      {list.loading ? (
        <Loading he={he} c={c} />
      ) : list.error ? (
        <ErrorCard he={he} c={c} />
      ) : clients.length === 0 ? (
        <Card style={{ textAlign: "center" }}>
          <p style={{ margin: "4px 0 14px", color: c.ts, lineHeight: 1.7 }}>
            {search
              ? he ? "לא נמצאו לקוחות שמתאימים לחיפוש." : "No clients match the search."
              : he
                ? "עוד אין לקוחות. כל לקוח שתוסיפו יקבל תיק משלו, עם כל הבדיקות, הסיכומים והקבצים."
                : "No clients yet. Each client you add gets a file with all their readings, notes and files."}
          </p>
          {!search && <button className="gb" style={btnPrimary} onClick={() => go({ name: "clientForm" })}>{he ? "הוספת הלקוח הראשון" : "Add your first client"}</button>}
        </Card>
      ) : (
        <Card style={{ padding: "8px 14px" }}>
          {clients.map((cl) => {
            const p = cl.birthDate ? personOf(cl.fullName, cl.birthDate) : null;
            const lp = p ? LPm(p.d, p.m, p.y) : null;
            return (
              <button
                key={cl.id}
                className="rrow"
                aria-current={cl.id === selectedId ? "true" : undefined}
                style={{ ...rowButton(c), ...(cl.id === selectedId ? { background: `${c.ac}14`, borderRadius: 10 } : null) }}
                onClick={() => go({ name: "client", clientId: cl.id })}
              >
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 15, color: c.tm }}>{cl.fullName}</span>
                  <span style={{ display: "block", fontSize: 12, color: c.ts }}>
                    {cl.birthDate ? formatDmy(cl.birthDate) : he ? "בלי תאריך לידה" : "No birth date"}
                    {cl.tags.length > 0 && ` · ${cl.tags.join(", ")}`}
                  </span>
                </span>
                {lp !== null && <span className="badge" title={he ? "שביל הגורל" : "Life path"}>{lp}</span>}
                <span style={{ fontSize: 11, color: c.ts, whiteSpace: "nowrap" }}>{formatStamp(lastActive(cl))}</span>
              </button>
            );
          })}
        </Card>
      )}

      <Card style={{ padding: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button className="ghost" style={btnGhost} onClick={backup}>{he ? "גיבוי" : "Back up"}</button>
          <input id={restoreId} className="ws-file" type="file" accept="application/json,.json" onChange={restore} />
          <label htmlFor={restoreId} className="ghost" style={{ ...btnGhost, display: "inline-block" }}>{he ? "שחזור מגיבוי" : "Restore from backup"}</label>
          <span style={{ fontSize: 12, color: remind ? c.warn : c.ts }}>
            {daysSinceBackup === null
              ? he ? "עוד לא נעשה גיבוי במכשיר הזה." : "No backup on this device yet."
              : he ? `גיבוי אחרון לפני ${daysSinceBackup} ימים.` : `Last backup ${daysSinceBackup} days ago.`}
          </span>
        </div>
        {msg && <p role="status" style={{ margin: "10px 0 0", fontSize: 13, color: msg.ok ? c.ok : c.danger }}>{msg.text}</p>}
      </Card>
    </div>
  );
}
