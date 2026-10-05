/** A client's file: details, core numbers, the readings history and attached files. */
import { useId, useState } from "react";
import { LPm, NV, SU, CA, PY } from "../engine/index.js";
import { ValidationError } from "../data/validation.js";
import { useContent, numberTitle } from "./content.js";
import { Card, Num, Loading, ErrorCard, SectionTitle, BackButton, useLoad, rowButton, tilesGrid, btnPrimary, btnGhost, display } from "./ui.jsx";
import { formatDmy, formatStamp, formatBytes, personOf, readingTypeLabel, summarizeReading, readFileBytes, errorText } from "./format.js";

export default function ClientFile({ store, go, he, c, now, clientId }) {
  const content = useContent();
  const fileId = useId();
  const [fileMsg, setFileMsg] = useState(null);
  const data = useLoad(async () => {
    const client = await store.clients.get(clientId);
    const [readings, files] = await Promise.all([store.readings.listByClient(clientId), store.attachments.listByClient(clientId)]);
    return { client, readings, files };
  }, [store, clientId]);

  if (data.loading) return <Loading he={he} c={c} />;
  if (data.error) return <ErrorCard he={he} c={c} onBack={() => go({ name: "list" })} />;
  const { client, readings, files } = data.data;

  const today = now();
  const p = client.birthDate ? personOf(client.fullName, client.birthDate) : null;
  const nums = p && {
    lp: LPm(p.d, p.m, p.y),
    nv: NV(client.fullName),
    su: SU(client.fullName),
    py: PY(p.d, p.m, today.getFullYear(), false),
    age: CA(p.d, p.m, p.y, today),
  };

  const upload = async (e) => {
    const chosen = [...(e.target.files || [])];
    e.target.value = "";
    setFileMsg(null);
    for (const file of chosen) {
      try {
        const bytes = await readFileBytes(file);
        await store.attachments.add({ clientId, name: file.name, type: file.type, bytes });
      } catch (err) {
        const reason = err instanceof ValidationError ? errorText(err.errors[0].field, err.errors[0].code, he) : he ? "ההעלאה נכשלה" : "Upload failed";
        setFileMsg(`${file.name}: ${reason}`);
      }
    }
    data.reload();
  };

  const open = async (file) => {
    const blob = await store.attachments.getBlob(file.id);
    const url = URL.createObjectURL(new Blob([blob.bytes], { type: blob.type || "application/octet-stream" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const removeFile = async (file) => {
    await store.attachments.remove(file.id);
    data.reload();
  };

  return (
    <div>
      <BackButton onClick={() => go({ name: "list" })}>{he ? "חזרה ללקוחות" : "Back to clients"}</BackButton>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontFamily: display, color: c.ac, fontSize: 30, fontWeight: 600 }}>{client.fullName}</h2>
            {client.birthName && <div style={{ fontSize: 13, color: c.ts }}>{he ? `שם לידה: ${client.birthName}` : `Birth name: ${client.birthName}`}</div>}
            <div style={{ fontSize: 13, color: c.ts, marginTop: 4 }}>
              {p ? `${formatDmy(client.birthDate)} · ${he ? `גיל ${nums.age}` : `age ${nums.age}`}` : he ? "עוד אין תאריך לידה" : "No birth date yet"}
            </div>
            {(client.phone || client.email) && (
              <div style={{ fontSize: 13, color: c.tm, marginTop: 6, direction: "ltr", textAlign: he ? "right" : "left" }}>
                {[client.phone, client.email].filter(Boolean).join(" · ")}
              </div>
            )}
            {client.tags.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                {client.tags.map((t) => <span key={t} className="chip" style={{ fontSize: 11 }}>{t}</span>)}
              </div>
            )}
          </div>
          <button className="ghost" style={btnGhost} onClick={() => go({ name: "clientForm", clientId })}>{he ? "עריכה" : "Edit"}</button>
        </div>

        {nums && (
          <div style={{ ...tilesGrid, marginTop: 16 }}>
            <Num testId="num-lp" label={he ? "שביל הגורל" : "Life path"} value={nums.lp} title={numberTitle(content, nums.lp, he)} c={c} />
            <Num testId="num-nv" label={he ? "ערך השם" : "Name number"} value={nums.nv} title={numberTitle(content, nums.nv, he)} c={c} />
            <Num testId="num-su" label={he ? "קול הנשמה" : "Soul"} value={nums.su} title={numberTitle(content, nums.su, he)} c={c} />
            <Num testId="num-py" label={he ? `שנה אישית ${today.getFullYear()}` : `Personal year ${today.getFullYear()}`} value={nums.py} title={numberTitle(content, nums.py, he)} c={c} />
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <button className="gb" style={btnPrimary} disabled={!p} onClick={() => go({ name: "newReading", clientId })}>{he ? "בדיקה חדשה" : "New reading"}</button>
          {!p && <div style={{ fontSize: 12, color: c.warn, marginTop: 8 }}>{he ? "כדי לחשב צריך תאריך לידה. אפשר להוסיף אותו בעריכה." : "A reading needs a birth date. Add it under Edit."}</div>}
        </div>
      </Card>

      {client.notes && (
        <Card>
          <SectionTitle c={c}>{he ? "הערות" : "Notes"}</SectionTitle>
          <p style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.7, fontSize: 14 }}>{client.notes}</p>
        </Card>
      )}

      <Card style={{ padding: "16px 14px" }}>
        <SectionTitle c={c}>{he ? `הבדיקות (${readings.length})` : `Readings (${readings.length})`}</SectionTitle>
        {readings.length === 0 && <p style={{ margin: 0, fontSize: 13, color: c.ts }}>{he ? "עוד אין בדיקות שמורות ללקוח הזה." : "No saved readings for this client yet."}</p>}
        {readings.map((r) => (
          <button key={r.id} className="rrow" style={rowButton(c)} onClick={() => go({ name: "reading", readingId: r.id })}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 12, color: c.ts }}>
                {formatStamp(r.computedFor)} · {readingTypeLabel(r.type, he)}{r.title ? ` · ${r.title}` : ""}
              </span>
              <span style={{ display: "block", fontSize: 14 }}>{summarizeReading(r, he)}</span>
            </span>
            {r.followUp && <span className="badge" style={{ fontSize: 11 }}>{he ? `מעקב ${formatDmy(r.followUp)}` : `follow-up ${formatDmy(r.followUp)}`}</span>}
            {r.notes && <span style={{ fontSize: 11, color: c.ts }}>{he ? "יש סיכום" : "has notes"}</span>}
          </button>
        ))}
      </Card>

      <Card style={{ padding: "16px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <SectionTitle c={c}>{he ? `קבצים (${files.length})` : `Files (${files.length})`}</SectionTitle>
          <label htmlFor={fileId} className="ghost" style={{ ...btnGhost, display: "inline-block" }}>{he ? "הוספת קובץ" : "Add a file"}</label>
          <input id={fileId} type="file" multiple onChange={upload} style={{ display: "none" }} />
        </div>
        {fileMsg && <p role="alert" style={{ color: c.danger, fontSize: 13, margin: "0 0 8px" }}>{fileMsg}</p>}
        {files.length === 0 && <p style={{ margin: 0, fontSize: 13, color: c.ts }}>{he ? "אפשר לצרף מפות, תמונות, הקלטות ומסמכים, עד 20MB לקובץ." : "Attach maps, photos, recordings or documents, up to 20 MB each."}</p>}
        {files.map((f) => (
          <div key={f.id} className="rrow" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>
              <span style={{ fontSize: 14 }}>{f.name}</span>
              <span style={{ display: "block", fontSize: 11, color: c.ts }}>{formatBytes(f.size)} · {formatStamp(f.createdAt)}</span>
            </span>
            <button className="ghost" style={btnGhost} onClick={() => open(f)}>{he ? "פתיחה" : "Open"}</button>
            <button className="ghost" style={{ ...btnGhost, color: c.danger }} aria-label={he ? `מחיקת ${f.name}` : `Delete ${f.name}`} onClick={() => removeFile(f)}>
              {he ? "מחיקה" : "Delete"}
            </button>
          </div>
        ))}
      </Card>
    </div>
  );
}
