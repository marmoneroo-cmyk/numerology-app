/** Create or edit a client file; deleting asks for confirmation first. */
import { useEffect, useState } from "react";
import { ValidationError, validateClient } from "../data/validation.js";
import { Card, Field, Loading, ErrorCard, ScreenTitle, BackButton, ConfirmAction, useLoad, btnPrimary, btnGhost } from "./ui.jsx";
import { parseDmy, formatDmy, errorText } from "./format.js";

const EMPTY = { fullName: "", birthName: "", birthDate: "", phone: "", email: "", tags: "", notes: "", consent: false };

export default function ClientForm({ store, go, he, c, now, clientId }) {
  const editing = Boolean(clientId);
  const existing = useLoad(() => (editing ? store.clients.get(clientId) : Promise.resolve(null)), [store, clientId]);
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (existing.loading || existing.error) return;
    const x = existing.data;
    setForm(x ? { ...EMPTY, ...x, birthDate: formatDmy(x.birthDate), tags: x.tags.join(", ") } : EMPTY);
  }, [existing.loading, existing.error, existing.data]);

  const back = () => go(editing ? { name: "client", clientId } : { name: "list" });
  if (existing.error) return <ErrorCard he={he} c={c} onBack={() => go({ name: "list" })} />;
  if (!form) return <Loading he={he} c={c} />;

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  const save = async () => {
    const found = {};
    const dateText = form.birthDate.trim();
    const birthDate = dateText ? parseDmy(dateText, now().getFullYear() + 1) : null;
    if (dateText && !birthDate) found.birthDate = errorText("birthDate", "invalid", he);
    const payload = {
      fullName: form.fullName, birthName: form.birthName, birthDate, phone: form.phone, email: form.email,
      tags: form.tags, notes: form.notes, consent: form.consent,
    };
    setBusy(true);
    try {
      if (found.birthDate) {
        validateClient(payload, { today: now() }); // collect the other problems in the same pass
        setErrors(found);
        return;
      }
      const saved = editing ? await store.clients.update(clientId, payload) : await store.clients.create(payload);
      go({ name: "client", clientId: saved.id });
    } catch (e) {
      if (e instanceof ValidationError) {
        e.errors.forEach((x) => {
          found[x.field] = errorText(x.field, x.code, he);
        });
        setErrors(found);
      } else {
        setErrors({ form: he ? "השמירה נכשלה. נסו שוב." : "Saving failed. Try again." });
      }
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await store.clients.remove(clientId);
      go({ name: "list" });
    } catch {
      setErrors({ form: he ? "המחיקה נכשלה. נסו שוב." : "Deleting failed. Try again." });
      setBusy(false);
    }
  };

  const text = (key, label, extra = {}) => (
    <Field label={label} error={errors[key]} hint={extra.hint} c={c}>
      {(id) => <input id={id} className="gi" value={form[key]} onChange={set(key)} dir={extra.dir} inputMode={extra.inputMode} placeholder={extra.placeholder} autoComplete="off" />}
    </Field>
  );

  return (
    <div>
      <BackButton onClick={back}>{editing ? (he ? "חזרה לתיק" : "Back to the file") : he ? "חזרה ללקוחות" : "Back to clients"}</BackButton>
      <Card>
        <ScreenTitle c={c} size={24} style={{ marginBottom: 16 }}>
          {editing ? (he ? "עריכת פרטי לקוח" : "Edit client") : he ? "לקוח חדש" : "New client"}
        </ScreenTitle>
        {text("fullName", he ? "שם מלא" : "Full name")}
        {text("birthName", he ? "שם לידה, אם שונה" : "Birth name, if different", { hint: he ? "אפשר לבחור בכל בדיקה לפי איזה שם לחשב" : "Each reading can use either name" })}
        {text("birthDate", he ? "תאריך לידה" : "Date of birth", { dir: "ltr", placeholder: "dd.mm.yyyy", inputMode: "numeric", hint: he ? "אפשר להשאיר ריק ולהשלים אחר כך" : "Can be added later" })}
        {text("phone", he ? "טלפון" : "Phone", { dir: "ltr", inputMode: "tel" })}
        {text("email", he ? "אימייל" : "Email", { dir: "ltr", inputMode: "email" })}
        {text("tags", he ? "תגיות" : "Tags", { hint: he ? "מופרדות בפסיק, למשל: VIP, ערב חלה" : "Comma separated, e.g. VIP, challah evening" })}
        <Field label={he ? "הערות" : "Notes"} error={errors.notes} c={c}>
          {(id) => <textarea id={id} className="gi" rows={4} value={form.notes} onChange={set("notes")} style={{ resize: "vertical", fontFamily: "inherit" }} />}
        </Field>
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: c.tm, marginBottom: 16, cursor: "pointer" }}>
          <input type="checkbox" checked={form.consent} onChange={set("consent")} />
          {he ? "התקבלה הסכמה לשמירת הפרטים" : "Consent to keep these details was given"}
        </label>
        {errors.form && <p role="alert" style={{ color: c.danger, fontSize: 13 }}>{errors.form}</p>}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="gb" style={btnPrimary} onClick={save} disabled={busy}>{he ? "שמירה" : "Save"}</button>
          <button className="ghost" style={btnGhost} onClick={back} disabled={busy}>{he ? "ביטול" : "Cancel"}</button>
        </div>
      </Card>

      {editing && (
        <Card style={{ borderColor: c.danger }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <ConfirmAction
              c={c}
              stacked
              label={he ? "מחיקת הלקוח" : "Delete client"}
              question={he
                ? `למחוק את ${form.fullName} עם כל הבדיקות והקבצים? אי אפשר לבטל את זה.`
                : `Delete ${form.fullName} with every reading and file? This cannot be undone.`}
              confirmLabel={he ? "כן, למחוק הכל" : "Yes, delete everything"}
              keepLabel={he ? "השארה" : "Keep"}
              onConfirm={remove}
              busy={busy}
            />
          </div>
        </Card>
      )}
    </div>
  );
}
