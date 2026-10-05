/**
 * Run a reading for a client and save it to their file: a full map, a match
 * with another person, parent and child, or the personal-year cycle. The
 * engine computes; the store saves the input, the result snapshot, the engine
 * version and the date it was computed for.
 */
import { useState } from "react";
import { ENGINE_VERSION, fullCalc, yearCycle, matchReading, parentChildReading } from "../engine/index.js";
import { Card, Field, Loading, ErrorCard, BackButton, useLoad, btnPrimary, display } from "./ui.jsx";
import { parseDmy, formatDmy, personOf, readingTypeLabel, matchTypeLabel } from "./format.js";

const TYPES = ["map", "match", "parentChild", "yearCycle"];
const MATCH_TYPES = ["love", "twin", "biz", "parent"];

export default function NewReading({ store, go, he, c, now, clientId }) {
  const data = useLoad(async () => {
    const client = await store.clients.get(clientId);
    const others = (await store.clients.list()).filter((x) => x.id !== clientId && x.birthDate);
    return { client, others };
  }, [store, clientId]);
  const [type, setType] = useState("map");
  const [add, setAdd] = useState(false);
  const [useBirthName, setUseBirthName] = useState(false);
  const [matchType, setMatchType] = useState("love");
  const [role, setRole] = useState("parent");
  const [otherId, setOtherId] = useState("");
  const [otherName, setOtherName] = useState("");
  const [otherDob, setOtherDob] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (data.loading) return <Loading he={he} c={c} />;
  if (data.error) return <ErrorCard he={he} c={c} onBack={() => go({ name: "list" })} />;
  const { client, others } = data.data;
  const name = useBirthName && client.birthName ? client.birthName : client.fullName;
  const needsOther = type === "match" || type === "parentChild";

  /** The other person: a chosen client, or a name and date typed in. */
  const otherPerson = () => {
    if (otherId) {
      const o = others.find((x) => x.id === otherId);
      return o ? { clientId: o.id, name: o.fullName, birthDate: o.birthDate } : null;
    }
    const iso = parseDmy(otherDob, now().getFullYear() + 1);
    const nm = otherName.trim();
    return nm && iso ? { clientId: null, name: nm, birthDate: iso } : null;
  };

  const run = async () => {
    setError(null);
    const t = now();
    const me = personOf(name, client.birthDate);
    const person = { name, birthDate: client.birthDate };
    let input;
    let result;
    if (type === "map") {
      input = { name, birthDate: client.birthDate, add };
      result = fullCalc(me.d, me.m, me.y, name, add, t);
    } else if (type === "yearCycle") {
      input = { birthDate: client.birthDate, add };
      result = { proj: yearCycle(me.d, me.m, add, t) };
    } else {
      const other = otherPerson();
      if (!other) {
        setError(he ? "בחרו לקוח מהרשימה, או הקלידו שם ותאריך לידה (dd.mm.yyyy) של האדם השני." : "Pick a client, or type the other person's name and date of birth (dd.mm.yyyy).");
        return;
      }
      const them = personOf(other.name, other.birthDate);
      if (type === "match") {
        input = { person, other, matchType };
        result = matchReading(me, them, matchType);
      } else {
        input = { person, other, role };
        result = role === "parent" ? parentChildReading(me, them) : parentChildReading(them, me);
      }
    }
    setBusy(true);
    try {
      const saved = await store.readings.create({ clientId, type, input, result, engineVersion: ENGINE_VERSION, computedFor: t.toISOString() });
      go({ name: "reading", readingId: saved.id });
    } catch {
      setError(he ? "השמירה נכשלה. נסו שוב." : "Saving failed. Try again.");
      setBusy(false);
    }
  };

  return (
    <div>
      <BackButton onClick={() => go({ name: "client", clientId })}>{he ? "חזרה לתיק" : "Back to the file"}</BackButton>
      <Card>
        <h2 style={{ margin: "0 0 14px", fontFamily: display, color: c.ac, fontSize: 24, fontWeight: 600 }}>
          {he ? `בדיקה חדשה ל${client.fullName}` : `New reading for ${client.fullName}`}
        </h2>

        <div className="tabs" role="tablist" style={{ marginBottom: 16, flexWrap: "wrap" }}>
          {TYPES.map((k) => (
            <button key={k} role="tab" aria-selected={type === k} className={`ti ${type === k ? "act" : ""}`} style={{ border: 0, font: "inherit" }} onClick={() => { setType(k); setError(null); }}>
              {readingTypeLabel(k, he)}
            </button>
          ))}
        </div>

        {client.birthName && (
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, marginBottom: 14 }}>
            <label style={{ cursor: "pointer" }}>
              <input type="radio" name="nameKind" checked={!useBirthName} onChange={() => setUseBirthName(false)} /> {he ? `לפי השם הנוכחי (${client.fullName})` : `Current name (${client.fullName})`}
            </label>
            <label style={{ cursor: "pointer" }}>
              <input type="radio" name="nameKind" checked={useBirthName} onChange={() => setUseBirthName(true)} /> {he ? `לפי שם הלידה (${client.birthName})` : `Birth name (${client.birthName})`}
            </label>
          </div>
        )}

        {(type === "map" || type === "yearCycle") && (
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, marginBottom: 14, cursor: "pointer" }}>
            <input type="checkbox" checked={add} onChange={(e) => setAdd(e.target.checked)} />
            {he ? "הוסף 1 לשנה האישית" : "Add 1 to the personal year"}
          </label>
        )}

        {type === "match" && (
          <Field label={he ? "סוג ההתאמה" : "Kind of match"} c={c}>
            {(id) => (
              <select id={id} className="gi" value={matchType} onChange={(e) => setMatchType(e.target.value)}>
                {MATCH_TYPES.map((k) => <option key={k} value={k}>{matchTypeLabel(k, he)}</option>)}
              </select>
            )}
          </Field>
        )}

        {type === "parentChild" && (
          <Field label={he ? `${client.fullName} היא/הוא` : `${client.fullName} is the`} c={c}>
            {(id) => (
              <select id={id} className="gi" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="parent">{he ? "ההורה" : "parent"}</option>
                <option value="child">{he ? "הילד/ה" : "child"}</option>
              </select>
            )}
          </Field>
        )}

        {needsOther && (
          <div style={{ border: `1px solid ${c.line}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
            <Field label={he ? "בחירה מהלקוחות" : "Pick a client"} c={c}>
              {(id) => (
                <select id={id} className="gi" value={otherId} onChange={(e) => setOtherId(e.target.value)}>
                  <option value="">{others.length ? (he ? "לא מהרשימה, אקליד בעצמי" : "Not a client, I'll type it") : he ? "אין עוד לקוחות עם תאריך לידה" : "No other clients with a birth date"}</option>
                  {others.map((o) => <option key={o.id} value={o.id}>{`${o.fullName} · ${formatDmy(o.birthDate)}`}</option>)}
                </select>
              )}
            </Field>
            {!otherId && (
              <>
                <Field label={he ? "שם האדם השני" : "The other person's name"} c={c}>
                  {(id) => <input id={id} className="gi" value={otherName} onChange={(e) => setOtherName(e.target.value)} autoComplete="off" />}
                </Field>
                <Field label={he ? "תאריך הלידה של האדם השני" : "The other person's date of birth"} c={c}>
                  {(id) => <input id={id} className="gi" dir="ltr" placeholder="dd.mm.yyyy" inputMode="numeric" value={otherDob} onChange={(e) => setOtherDob(e.target.value)} />}
                </Field>
              </>
            )}
          </div>
        )}

        {error && <p role="alert" style={{ color: c.danger, fontSize: 13 }}>{error}</p>}
        <button className="gb" style={btnPrimary} onClick={run} disabled={busy}>{he ? "חשב ושמור" : "Calculate and save"}</button>
      </Card>
    </div>
  );
}
