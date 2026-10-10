/**
 * A saved reading, rendered from its stored snapshot (never recomputed), with
 * the session summary, a follow-up date, the PDF report and deletion.
 */
import { useEffect, useRef, useState } from "react";
import { compatKey, getRecommendations } from "../engine/index.js";
import { ValidationError } from "../data/validation.js";
import { useContent, numberTitle } from "./content.js";
import { Card, Field, Loading, ErrorCard, SectionTitle, ScreenTitle, BackButton, ConfirmAction, useLoad, btnPrimary, btnGhost, display } from "./ui.jsx";
import { parseDmy, formatDmy, formatStamp, readingTypeLabel, matchTypeLabel, personName, errorText } from "./format.js";
import ReadingSummary from "../reading/ReadingSummary.jsx";
import Locked from "../demo/DemoLock.jsx";

export default function ReadingView({ store, go, he, c, now, readingId }) {
  const content = useContent();
  const data = useLoad(async () => {
    const reading = await store.readings.get(readingId);
    const client = await store.clients.get(reading.clientId);
    return { reading, client };
  }, [store, readingId]);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [followUpError, setFollowUpError] = useState(null);
  const [status, setStatus] = useState(null);
  /** The summary as last saved, to tell whether leaving needs a save first. */
  const saved = useRef("");

  useEffect(() => {
    if (!data.data) return;
    const r = data.data.reading;
    setTitle(r.title);
    setNotes(r.notes);
    setFollowUp(formatDmy(r.followUp));
    saved.current = JSON.stringify([r.title, r.notes, formatDmy(r.followUp)]);
  }, [data.data]);

  if (data.loading) return <Loading he={he} c={c} />;
  if (data.error) return <ErrorCard he={he} c={c} onBack={() => go({ name: "list" })} />;
  const { reading, client } = data.data;
  const toFile = () => go({ name: "client", clientId: client.id });
  const current = () => JSON.stringify([title, notes, followUp]);
  const edited = (setter) => (e) => {
    setter(e.target.value);
    setStatus(null);
  };

  /** Saves the summary; false (with the reason shown) when it could not be saved. */
  const saveNotes = async () => {
    const text = followUp.trim();
    const iso = text ? parseDmy(text, now().getFullYear() + 10) : null;
    setFollowUpError(text && !iso ? errorText("followUp", "invalid", he) : null);
    if (text && !iso) return false;
    try {
      await store.readings.update(reading.id, { title, notes, followUp: iso });
      saved.current = current();
      setStatus({ ok: true, text: he ? "נשמר" : "Saved" });
      return true;
    } catch (e) {
      setStatus({ ok: false, text: e instanceof ValidationError ? errorText(e.errors[0].field, e.errors[0].code, he) : he ? "השמירה נכשלה" : "Saving failed" });
      return false;
    }
  };

  /** Back to the file, saving a changed summary on the way; stays when it cannot be saved. */
  const back = async () => {
    if (current() !== saved.current && !(await saveNotes())) return;
    toFile();
  };

  const remove = async () => {
    try {
      await store.readings.remove(reading.id);
      toFile();
    } catch {
      setStatus({ ok: false, text: he ? "המחיקה נכשלה. נסו שוב." : "Deleting failed. Try again." });
    }
  };

  return (
    <div>
      <BackButton onClick={back}>{he ? "חזרה לתיק" : "Back to the file"}</BackButton>
      <Card>
        <ScreenTitle c={c}>{readingTypeLabel(reading.type, he)}</ScreenTitle>
        <div style={{ fontSize: 13, color: c.ts, marginTop: 4 }}>
          {client.fullName} · {he ? `חושב ל-${formatStamp(reading.computedFor)}` : `computed for ${formatStamp(reading.computedFor)}`}
        </div>
        <div style={{ fontSize: 11, color: c.ts, marginTop: 2 }}>{he ? `גרסת מנוע ${reading.engineVersion}` : `Engine version ${reading.engineVersion}`}</div>
      </Card>

      {reading.type === "map" && <MapResult reading={reading} he={he} c={c} content={content} />}
      {reading.type === "match" && <MatchResult reading={reading} he={he} c={c} content={content} />}
      {reading.type === "parentChild" && <ParentChildResult reading={reading} he={he} c={c} content={content} />}
      {reading.type === "yearCycle" && <CycleTable proj={reading.result.proj} he={he} c={c} content={content} />}

      <Card>
        <SectionTitle c={c}>{he ? "סיכום ומעקב" : "Summary and follow-up"}</SectionTitle>
        <Field label={he ? "כותרת" : "Title"} c={c}>
          {(id) => <input id={id} className="gi" value={title} onChange={edited(setTitle)} placeholder={he ? "למשל: פגישה ראשונה" : "e.g. first session"} />}
        </Field>
        <Field label={he ? "סיכום הפגישה" : "Session summary"} c={c}>
          {(id) => <textarea id={id} className="gi" rows={5} value={notes} onChange={edited(setNotes)} style={{ resize: "vertical", fontFamily: "inherit" }} />}
        </Field>
        <Field label={he ? "תאריך מעקב" : "Follow-up date"} hint={he ? "יופיע במסך הבית ביום הזה" : "Shows on the home screen on that day"} error={followUpError} c={c}>
          {(id) => <input id={id} className="gi" dir="ltr" placeholder="dd.mm.yyyy" inputMode="numeric" value={followUp} onChange={edited(setFollowUp)} />}
        </Field>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button className="gb" style={btnPrimary} onClick={saveNotes}>{he ? "שמירת סיכום" : "Save summary"}</button>
          {status && <span role="status" style={{ fontSize: 13, color: status.ok ? c.ok : c.danger }}>{status.text}</span>}
        </div>
      </Card>

      <Card style={{ padding: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {reading.type === "map" && content.exportReport && (
            <button className="ghost" style={btnGhost} onClick={() => content.exportReport(reading.result, reading.input.name, he, content.D)}>
              {he ? "הורדת דוח PDF" : "Download PDF report"}
            </button>
          )}
          {/* the Studio shows the map in large type for the client; the saved snapshot, as on this screen */}
          {reading.type === "map" && content.openMeeting && (
            <button className="ghost" style={btnGhost} onClick={() => content.openMeeting(reading.result, reading.input.name || client.fullName)}>
              {he ? "מצב פגישה" : "Meeting mode"}
            </button>
          )}
          <ConfirmAction
            c={c}
            label={he ? "מחיקת הבדיקה" : "Delete reading"}
            question={he ? "למחוק את הבדיקה? הקבצים שלה יישארו בתיק." : "Delete this reading? Its files stay in the file."}
            confirmLabel={he ? "כן, למחוק" : "Yes, delete"}
            keepLabel={he ? "השארה" : "Keep"}
            onConfirm={remove}
          />
        </div>
      </Card>
    </div>
  );
}

function MapResult({ reading, he, c, content }) {
  const r = reading.result;
  const lang = he ? "he" : "en";
  // the insights saved with the reading; a reading saved before they were kept gets today's
  const recs = r.insights ? r.insights[lang] : getRecommendations(r, lang);
  return (
    <>
      {/* every number on one screen, as saved: made for its own date, with the +1 it recorded */}
      <ReadingSummary r={r} name={reading.input.name} now={new Date(reading.computedFor)} add={reading.input.add} he={he} />

      {r.kd.length > 0 && (
        <Card>
          <SectionTitle c={c}>{he ? "חובות קארמתיים" : "Karmic debts"}</SectionTitle>
          {r.kd.map((k, i) => (
            <p key={i} style={{ margin: "0 0 6px", fontSize: 14, lineHeight: 1.6 }}>
              <strong style={{ color: c.ac }}>{k}</strong> · <Locked he={he}>{content.KARMA[k]?.[lang] || ""}</Locked>
            </p>
          ))}
        </Card>
      )}

      {recs.length > 0 && (
        <Card>
          <SectionTitle c={c}>{he ? "תובנות מרכזיות" : "Key insights"}</SectionTitle>
          {recs.map((x, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 14, color: c.ac }}>{x.t}</div>
              <div style={{ fontSize: 13, color: c.tm, lineHeight: 1.6 }}>
                <Locked he={he}>{x.d}</Locked>
              </div>
            </div>
          ))}
        </Card>
      )}

      <CycleTable proj={r.proj} he={he} c={c} content={content} />
    </>
  );
}

function CycleTable({ proj, he, c, content }) {
  const lang = he ? "he" : "en";
  return (
    <Card style={{ padding: "16px 14px" }}>
      <SectionTitle c={c}>{he ? "מחזור השנים האישיות" : "Personal year cycle"}</SectionTitle>
      {proj.map((p, i) => (
        <div key={i} className="rrow" style={{ display: "flex", gap: 12, alignItems: "center", fontWeight: p.isCurrent ? 600 : 400 }}>
          <span style={{ width: 52, color: p.isCurrent ? c.ac : c.ts, fontVariantNumeric: "tabular-nums" }}>{p.year}</span>
          <span className="badge">{p.py}</span>
          <span style={{ fontSize: 13, color: c.tm, flex: 1 }}>
            <Locked he={he}>{content.YEAR_ENERGY[p.py]?.[lang] || numberTitle(content, p.py, he)}</Locked>
          </span>
          {p.isCurrent && <span style={{ fontSize: 11, color: c.ac }}>{he ? "השנה" : "this year"}</span>}
        </div>
      ))}
    </Card>
  );
}

function Score({ score, he, c, label }) {
  return (
    <div style={{ textAlign: "center", marginBottom: 12 }}>
      <div style={{ fontSize: 46, fontFamily: display, color: c.ac, lineHeight: 1 }}>{`${score}%`}</div>
      <div style={{ fontSize: 13, color: c.ts }}>{label || (he ? "התאמה" : "match")}</div>
    </div>
  );
}

function CompatText({ entry, he, c }) {
  if (!entry) return null;
  const t = entry[he ? "he" : "en"] || entry.he;
  if (!t) return null;
  return (
    <div style={{ marginTop: 14 }}>
      {[[he ? "מה מחבר" : "What connects", t.con], [he ? "האתגר" : "The challenge", t.ch], [he ? "עצה" : "Advice", t.tip]].map(([h, v]) => v && (
        <div key={h} style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: c.ac }}>{h}</div>
          <div style={{ fontSize: 14, lineHeight: 1.6 }}>
            <Locked he={he}>{v}</Locked>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Two people side by side. Keyed by position: two people can share a name. */
function PeopleTable({ rows, names, c }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
        <thead>
          <tr style={{ color: c.ac }}>
            <th style={{ padding: "6px", textAlign: "start", borderBottom: `1px solid ${c.line}` }} />
            {names.map((n, i) => <th key={i} style={{ padding: "6px", borderBottom: `1px solid ${c.line}`, fontWeight: 600 }}>{n}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, a, b], i) => (
            <tr key={i}>
              <td style={{ padding: "6px", borderBottom: `1px solid ${c.line}`, color: c.ts }}>{label}</td>
              <td style={{ padding: "6px", textAlign: "center", borderBottom: `1px solid ${c.line}` }}>{a}</td>
              <td style={{ padding: "6px", textAlign: "center", borderBottom: `1px solid ${c.line}` }}>{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MatchResult({ reading, he, c, content }) {
  const r = reading.result;
  const { person, other, matchType } = reading.input;
  return (
    <Card>
      <Score score={r.score} he={he} c={c} label={he ? `התאמה ${matchTypeLabel(matchType, he)}` : `${matchTypeLabel(matchType, he)} match`} />
      <div style={{ display: "flex", justifyContent: "center", gap: 18, fontSize: 13, color: c.ts, marginBottom: 14, flexWrap: "wrap" }}>
        <span>{he ? `הרמוניה ${r.harmony}/10` : `Harmony ${r.harmony}/10`}</span>
        <span>{he ? `מתח ${r.tension}/10` : `Tension ${r.tension}/10`}</span>
        <span>{he ? `צמיחה ${r.growth}/10` : `Growth ${r.growth}/10`}</span>
      </div>
      <PeopleTable
        c={c}
        names={[personName(person, he), personName(other, he)]}
        rows={[
          [he ? "שביל הגורל" : "Life path", r.lp1, r.lp2],
          [he ? "ערך השם" : "Name number", r.nv1, r.nv2],
          [he ? "קול הנשמה" : "Soul", r.su1, r.su2],
          [he ? "ביטוי" : "Expression", r.ex1, r.ex2],
        ]}
      />
      <CompatText entry={content.LP_COMPAT[compatKey(r.lp1, r.lp2)]} he={he} c={c} />
    </Card>
  );
}

function ParentChildResult({ reading, he, c, content }) {
  const r = reading.result;
  const { person, other, role } = reading.input;
  const parentName = personName(role === "parent" ? person : other, he);
  const childName = personName(role === "parent" ? other : person, he);
  return (
    <Card>
      <Score score={r.score} he={he} c={c} label={he ? "חיבור הורה-ילד" : "Parent-child connection"} />
      <PeopleTable
        c={c}
        names={[`${parentName} (${he ? "הורה" : "parent"})`, `${childName} (${he ? "ילד/ה" : "child"})`]}
        rows={[
          [he ? "שביל הגורל" : "Life path", r.lpP, r.lpC],
          [he ? "ערך השם" : "Name number", r.nvP, r.nvC],
          [he ? "קול הנשמה" : "Soul", r.suP, r.suC],
        ]}
      />
      <CompatText entry={content.getCompat(r.lpP, r.lpC)} he={he} c={c} />
    </Card>
  );
}
