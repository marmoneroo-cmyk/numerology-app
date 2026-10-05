/** Home of the workspace: search, today's follow-ups and birthdays, the client list, backup. */
import { useId, useState } from "react";
import { LPm } from "../engine/index.js";
import { toYmd } from "../data/store.js";
import { Card, Loading, ErrorCard, SectionTitle, useLoad, rowButton, btnPrimary, btnGhost, display } from "./ui.jsx";
import { formatDmy, formatStamp, personOf, readingTypeLabel, countLabel } from "./format.js";

const LAST_BACKUP_KEY = "numerology_workspace_last_backup";
const BACKUP_REMINDER_DAYS = 14;

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

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function readFileText(file) {
  if (typeof file.text === "function") return file.text();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsText(file);
  });
}

export default function ClientsScreen({ store, go, he, c, now }) {
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState(null);
  const restoreId = useId();
  const list = useLoad(() => store.clients.list({ search }), [store, search]);
  const sum = useLoad(() => store.summary(now()), [store]);

  const backup = async () => {
    try {
      const data = await store.exportAll();
      downloadJson(`numerology-backup-${toYmd(now())}.json`, data);
      rememberBackup(now());
      setMsg({ ok: true, text: he ? "הגיבוי נשמר לקובץ. כדאי לשמור אותו גם בענן או במייל." : "Backup saved to a file. Keep a copy in the cloud or your email." });
    } catch {
      setMsg({ ok: false, text: he ? "הגיבוי נכשל. נסו שוב." : "Backup failed. Try again." });
    }
  };

  const restore = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const counts = await store.importAll(JSON.parse(await readFileText(file)), { mode: "merge" });
      const parts = [countLabel(counts.clients, "clients", he), countLabel(counts.readings, "readings", he), countLabel(counts.attachments, "files", he)];
      setMsg({ ok: true, text: he ? `שוחזרו: ${parts.join(", ")}` : `Restored: ${parts.join(", ")}` });
      list.reload();
      sum.reload();
    } catch {
      setMsg({ ok: false, text: he ? "הקובץ הזה אינו גיבוי תקין של מרחב העבודה." : "This file is not a valid workspace backup." });
    }
  };

  const clients = list.data || [];
  const summary = sum.data;
  const backedUp = lastBackup();
  const daysSinceBackup = backedUp ? Math.floor((now() - new Date(backedUp)) / 86400000) : null;
  const remind = summary?.clients > 0 && (daysSinceBackup === null || daysSinceBackup >= BACKUP_REMINDER_DAYS);

  return (
    <div>
      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0, fontFamily: display, color: c.ac, fontSize: 28, fontWeight: 600 }}>{he ? "הלקוחות שלי" : "My clients"}</h2>
            {summary && (
              <div style={{ fontSize: 12, color: c.ts }}>
                {`${countLabel(summary.clients, "clients", he)} · ${countLabel(summary.readings, "savedReadings", he)}`}
              </div>
            )}
          </div>
          <button className="gb" style={btnPrimary} onClick={() => go({ name: "clientForm" })}>{he ? "לקוח חדש" : "New client"}</button>
        </div>
        <input
          className="gi"
          type="search"
          style={{ marginTop: 14 }}
          placeholder={he ? "חיפוש לפי שם, טלפון או תגית" : "Search by name, phone or tag"}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Card>

      {summary && (summary.followUps.length > 0 || summary.birthdays.length > 0) && (
        <Card>
          {summary.followUps.length > 0 && (
            <div data-testid="follow-ups" style={{ marginBottom: summary.birthdays.length ? 14 : 0 }}>
              <SectionTitle c={c}>{he ? "מעקבים להיום" : "Follow-ups due"}</SectionTitle>
              {summary.followUps.map((f) => (
                <button key={f.readingId} className="rrow" style={rowButton(c)} onClick={() => go({ name: "reading", readingId: f.readingId })}>
                  <span style={{ flex: 1 }}>{f.clientName}</span>
                  <span style={{ fontSize: 12, color: c.ts }}>{readingTypeLabel(f.type, he)} · {formatDmy(f.followUp)}</span>
                </button>
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
            const lp = cl.birthDate ? (() => { const p = personOf(cl.fullName, cl.birthDate); return LPm(p.d, p.m, p.y); })() : null;
            return (
              <button key={cl.id} className="rrow" style={rowButton(c)} onClick={() => go({ name: "client", clientId: cl.id })}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 15, color: c.tm }}>{cl.fullName}</span>
                  <span style={{ display: "block", fontSize: 12, color: c.ts }}>
                    {cl.birthDate ? formatDmy(cl.birthDate) : he ? "בלי תאריך לידה" : "No birth date"}
                    {cl.tags.length > 0 && ` · ${cl.tags.join(", ")}`}
                  </span>
                </span>
                {lp !== null && <span className="badge" title={he ? "שביל הגורל" : "Life path"}>{lp}</span>}
                <span style={{ fontSize: 11, color: c.ts, whiteSpace: "nowrap" }}>{formatStamp(cl.updatedAt)}</span>
              </button>
            );
          })}
        </Card>
      )}

      <Card style={{ padding: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button className="ghost" style={btnGhost} onClick={backup}>{he ? "גיבוי" : "Back up"}</button>
          <label htmlFor={restoreId} className="ghost" style={{ ...btnGhost, display: "inline-block" }}>{he ? "שחזור מגיבוי" : "Restore from backup"}</label>
          <input id={restoreId} type="file" accept="application/json,.json" onChange={restore} style={{ display: "none" }} />
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
