/**
 * "Accounts", for admins: every subscriber account, opening a new one with a
 * first password to hand over, and for each account its plan, device limit,
 * status, a new password, its devices and its log. The database decides who
 * may do this (admins in their active session); this screen only asks.
 */
import { useState } from "react";
import { Card, Field, SectionTitle, ScreenTitle, BackButton, ConfirmAction, Loading, ErrorCard, useLoad, colors, rowButton, btnPrimary, btnGhost } from "../workspace/ui.jsx";
import { PLAN_KEYS, planLabel, statusLabel, auditLine, dateTime, generatePassword } from "./labels.js";
import { AccountError } from "./service.js";

export default function AdminScreen({ account, he, dk }) {
  const c = colors(dk);
  const [view, setView] = useState({ name: "list" });
  const admin = account.service.admin;
  const props = { admin, he, c, me: account.profile, go: setView };
  return (
    <div dir={he ? "rtl" : "ltr"} style={{ color: c.tm }}>
      {view.name === "list" && <AccountList {...props} />}
      {view.name === "create" && <CreateAccount {...props} />}
      {view.name === "details" && <AccountDetails {...props} userId={view.userId} />}
    </div>
  );
}

function AccountList({ admin, he, c, go }) {
  const [search, setSearch] = useState("");
  const accounts = useLoad(() => admin.listAccounts(), [admin]);
  const q = search.trim().toLowerCase();
  const shown = (accounts.data || []).filter((a) => !q || `${a.fullName} ${a.email} ${a.phone}`.toLowerCase().includes(q));
  return (
    <>
      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <ScreenTitle c={c} size={26}>{he ? "חשבונות" : "Accounts"}</ScreenTitle>
          <button className="gb" style={btnPrimary} onClick={() => go({ name: "create" })}>{he ? "חשבון חדש" : "New account"}</button>
        </div>
        <input className="gi" type="search" style={{ marginTop: 14 }} aria-label={he ? "חיפוש חשבונות" : "Search accounts"} placeholder={he ? "חיפוש לפי שם, אימייל או טלפון" : "Search by name, email or phone"} value={search} onChange={(e) => setSearch(e.target.value)} />
      </Card>
      {accounts.loading ? <Loading he={he} c={c} /> : accounts.error ? <ErrorCard he={he} c={c} /> : (
        <Card style={{ padding: "8px 14px" }}>
          {shown.map((a) => (
            <button key={a.id} className="rrow" style={rowButton(c)} onClick={() => go({ name: "details", userId: a.id })}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 15 }}>{a.fullName || a.email}{a.role === "admin" ? ` · ${he ? "מנהל/ת" : "admin"}` : ""}</span>
                <span style={{ display: "block", fontSize: 12, color: c.ts, direction: "ltr", textAlign: he ? "right" : "left" }}>{a.email}</span>
                <span style={{ display: "block", fontSize: 12, color: a.status === "suspended" ? c.danger : c.ts }}>
                  {[planLabel(a.plan, he), statusLabel(a.status, he), he ? `${a.devices} מכשירים` : `${a.devices} devices`, he ? `${a.clients} לקוחות` : `${a.clients} clients`,
                    a.lastSeenAt ? (he ? `נראה ${dateTime(a.lastSeenAt)}` : `seen ${dateTime(a.lastSeenAt)}`) : he ? "עוד לא נכנס" : "never signed in"].join(" · ")}
                </span>
              </span>
            </button>
          ))}
          {shown.length === 0 && <p style={{ fontSize: 13, color: c.ts }}>{he ? "אין חשבונות שמתאימים." : "No matching accounts."}</p>}
        </Card>
      )}
    </>
  );
}

const CREATE_ERRORS = {
  email_taken: ["לכתובת הזאת כבר יש חשבון.", "This address already has an account."],
  invalid_email: ["כתובת אימייל לא תקינה.", "Invalid email address."],
  invalid_password: ["הסיסמה צריכה 10 תווים לפחות.", "The password needs at least 10 characters."],
  invalid_details: ["השם או הטלפון ארוכים מדי.", "The name or phone is too long."],
  "admins only": ["רק מנהלים יכולים לעשות את זה.", "Only admins can do this."],
};
const errorText = (e, he) => (CREATE_ERRORS[e instanceof AccountError ? e.code : ""] || ["הפעולה נכשלה. נסו שוב.", "That failed. Try again."])[he ? 0 : 1];

/** Email and password to give the subscriber, with a copy button. */
function Handover({ email, password, he, c }) {
  const [copied, setCopied] = useState(false);
  const text = he ? `כניסה לסטודיו\nאימייל: ${email}\nסיסמה: ${password}` : `Studio sign-in\nEmail: ${email}\nPassword: ${password}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div data-testid="handover" style={{ border: `1px solid ${c.line}`, borderRadius: 14, padding: 14, margin: "12px 0" }}>
      <p style={{ margin: "0 0 8px", fontSize: 13, color: c.ts }}>{he ? "העבירו את הפרטים למנוי/ה (למשל בוואטסאפ). הסיסמה לא תוצג שוב." : "Send these to the subscriber (e.g. on WhatsApp). The password is not shown again."}</p>
      <p dir="ltr" style={{ margin: 0, fontFamily: "monospace", fontSize: 14, textAlign: he ? "right" : "left" }}>{email}<br />{password}</p>
      <button className="ghost" style={{ ...btnGhost, marginTop: 10 }} onClick={copy}>{he ? "העתקת פרטי הכניסה" : "Copy sign-in details"}</button>
      {copied && <span role="status" style={{ fontSize: 12, color: c.ok, marginInlineStart: 8 }}>{he ? "הועתק" : "Copied"}</span>}
    </div>
  );
}

function CreateAccount({ admin, he, c, go }) {
  const [form, setForm] = useState({ email: "", fullName: "", phone: "", plan: "pro", password: generatePassword() });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await admin.createAccount({ email: form.email.trim(), fullName: form.fullName.trim(), phone: form.phone.trim(), plan: form.plan, password: form.password });
      setCreated({ email: form.email.trim(), password: form.password });
    } catch (e) {
      setError(errorText(e, he));
    } finally {
      setBusy(false);
    }
  };
  if (created) {
    return (
      <Card>
        <ScreenTitle c={c} size={24}>{he ? "החשבון נפתח" : "Account opened"}</ScreenTitle>
        <Handover email={created.email} password={created.password} he={he} c={c} />
        <button className="ghost" style={btnGhost} onClick={() => go({ name: "list" })}>{he ? "חזרה לחשבונות" : "Back to accounts"}</button>
      </Card>
    );
  }
  return (
    <>
      <BackButton onClick={() => go({ name: "list" })}>{he ? "חזרה לחשבונות" : "Back to accounts"}</BackButton>
      <Card>
        <ScreenTitle c={c} size={24} style={{ marginBottom: 14 }}>{he ? "חשבון חדש" : "New account"}</ScreenTitle>
        <Field label={he ? "אימייל" : "Email"} c={c}>{(id) => <input id={id} className="gi" type="email" dir="ltr" autoComplete="off" value={form.email} onChange={set("email")} />}</Field>
        <Field label={he ? "שם מלא" : "Full name"} c={c}>{(id) => <input id={id} className="gi" maxLength={120} value={form.fullName} onChange={set("fullName")} />}</Field>
        <Field label={he ? "טלפון" : "Phone"} c={c}>{(id) => <input id={id} className="gi" dir="ltr" inputMode="tel" maxLength={25} value={form.phone} onChange={set("phone")} />}</Field>
        <Field label={he ? "מסלול" : "Plan"} c={c}>
          {(id) => <select id={id} className="gi" value={form.plan} onChange={set("plan")}>{PLAN_KEYS.map((p) => <option key={p} value={p}>{planLabel(p, he)}</option>)}</select>}
        </Field>
        <Field label={he ? "סיסמה ראשונה" : "First password"} hint={he ? "המנוי/ה יוכלו להחליף אותה ב\"החשבון שלי\"" : "They can change it under \"My account\""} c={c}>
          {(id) => <input id={id} className="gi" dir="ltr" autoComplete="off" value={form.password} onChange={set("password")} />}
        </Field>
        <button className="ghost" style={{ ...btnGhost, marginBottom: 14 }} onClick={() => setForm({ ...form, password: generatePassword() })}>{he ? "סיסמה אחרת" : "Another password"}</button>
        {error && <p role="alert" style={{ color: c.danger, fontSize: 13 }}>{error}</p>}
        <button className="gb" style={btnPrimary} onClick={submit} disabled={busy}>{he ? "פתיחת החשבון" : "Open the account"}</button>
      </Card>
    </>
  );
}

function AccountDetails({ admin, he, c, me, go, userId }) {
  const data = useLoad(async () => {
    const [accounts, devices, audit] = await Promise.all([admin.listAccounts(), admin.listDevices(userId), admin.audit(userId, 100)]);
    return { account: accounts.find((a) => a.id === userId), devices, audit };
  }, [admin, userId]);
  const [handover, setHandover] = useState(null);
  const [message, setMessage] = useState(null);
  if (data.loading) return <Loading he={he} c={c} />;
  if (data.error || !data.data.account) return <ErrorCard he={he} c={c} onBack={() => go({ name: "list" })} />;
  const { account: a, devices, audit } = data.data;
  const isMe = a.id === me.id;
  const act = async (fn) => {
    setMessage(null);
    try {
      await fn();
      data.reload();
    } catch (e) {
      setMessage(errorText(e, he));
    }
  };
  const newPassword = () => act(async () => {
    const password = generatePassword();
    await admin.setPassword(a.id, password);
    setHandover({ email: a.email, password });
  });
  return (
    <>
      <BackButton onClick={() => go({ name: "list" })}>{he ? "חזרה לחשבונות" : "Back to accounts"}</BackButton>
      <Card>
        <ScreenTitle c={c} size={26}>{a.fullName || a.email}</ScreenTitle>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: c.ts }}>
          <span dir="ltr">{a.email}</span>{a.phone ? ` · ${a.phone}` : ""} · {statusLabel(a.status, he)} · {he ? `נפתח ${dateTime(a.createdAt)}` : `opened ${dateTime(a.createdAt)}`}
        </p>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: c.ts }}>{he ? `${a.clients} לקוחות · ${a.readings} בדיקות` : `${a.clients} clients · ${a.readings} readings`}</p>
        {message && <p role="alert" style={{ color: c.danger, fontSize: 13 }}>{message}</p>}
      </Card>
      <PlanCard a={a} isMe={isMe} he={he} c={c} onSave={(patch) => act(() => admin.updateAccount(a.id, patch))} />
      <Card style={{ padding: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <ConfirmAction c={c} label={he ? "קביעת סיסמה חדשה" : "Set a new password"} question={he ? "לקבוע סיסמה חדשה? כל המכשירים של החשבון יתנתקו." : "Set a new password? Every device of the account is signed out."}
            confirmLabel={he ? "כן, לקבוע סיסמה חדשה" : "Yes, set a new password"} keepLabel={he ? "ביטול" : "Cancel"} onConfirm={newPassword} />
          {!isMe && a.status === "active" && (
            <ConfirmAction c={c} label={he ? "השהיית החשבון" : "Suspend the account"} question={he ? "להשהות את החשבון? הוא ייסגר מיד בכל מכשיר." : "Suspend the account? It closes at once on every device."}
              confirmLabel={he ? "כן, להשהות" : "Yes, suspend"} keepLabel={he ? "ביטול" : "Cancel"} onConfirm={() => act(() => admin.updateAccount(a.id, { status: "suspended" }))} />
          )}
          {!isMe && a.status === "suspended" && (
            <button className="ghost" style={btnGhost} onClick={() => act(() => admin.updateAccount(a.id, { status: "active" }))}>{he ? "הפעלת החשבון מחדש" : "Activate the account again"}</button>
          )}
        </div>
        {handover && <Handover email={handover.email} password={handover.password} he={he} c={c} />}
      </Card>
      <DeviceList devices={devices} he={he} c={c} onRevoke={(d) => act(() => admin.revokeDevice(d.id))} />
      <Card style={{ padding: "16px 14px" }}>
        <SectionTitle c={c}>{he ? "יומן פעולות" : "Activity"}</SectionTitle>
        <ul aria-label={he ? "יומן פעולות" : "Activity log"} style={{ listStyle: "none", margin: 0, padding: 0, fontSize: 13 }}>
          {audit.map((e) => (
            <li key={e.id} style={{ padding: "6px 0", borderBottom: `1px solid ${c.line}` }}>
              <span style={{ color: c.ts }}>{dateTime(e.at)}</span> · {auditLine(e, he)}
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

function PlanCard({ a, isMe, he, c, onSave }) {
  const [plan, setPlan] = useState(a.plan);
  const [deviceLimit, setDeviceLimit] = useState(a.deviceLimit);
  const [role, setRole] = useState(a.role);
  const save = () => {
    const patch = {};
    if (plan !== a.plan) patch.plan = plan;
    if (Number(deviceLimit) !== a.deviceLimit) patch.deviceLimit = Number(deviceLimit);
    if (!isMe && role !== a.role) patch.role = role;
    if (Object.keys(patch).length) onSave(patch);
  };
  return (
    <Card>
      <SectionTitle c={c}>{he ? "מסלול והרשאות" : "Plan and access"}</SectionTitle>
      <Field label={he ? "מסלול" : "Plan"} c={c}>
        {(id) => <select id={id} className="gi" value={plan} onChange={(e) => setPlan(e.target.value)}>{PLAN_KEYS.map((p) => <option key={p} value={p}>{planLabel(p, he)}</option>)}</select>}
      </Field>
      <Field label={he ? "מכשירים מותרים" : "Devices allowed"} c={c}>
        {(id) => <select id={id} className="gi" value={deviceLimit} onChange={(e) => setDeviceLimit(e.target.value)}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</select>}
      </Field>
      {!isMe && (
        <Field label={he ? "תפקיד" : "Role"} c={c}>
          {(id) => (
            <select id={id} className="gi" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="subscriber">{he ? "מנוי/ה" : "Subscriber"}</option>
              <option value="admin">{he ? "מנהל/ת" : "Admin"}</option>
            </select>
          )}
        </Field>
      )}
      <button className="gb" style={btnPrimary} onClick={save}>{he ? "שמירת השינויים" : "Save changes"}</button>
    </Card>
  );
}

function DeviceList({ devices, he, c, onRevoke }) {
  return (
    <Card style={{ padding: "16px 14px" }}>
      <SectionTitle c={c}>{he ? "מכשירים" : "Devices"}</SectionTitle>
      <ul aria-label={he ? "מכשירים" : "Devices"} style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {devices.map((d) => (
          <li key={d.id} className="rrow" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", opacity: d.status === "revoked" ? 0.55 : 1 }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 14 }}>{d.label}{d.current ? ` · ${he ? "פתוח עכשיו" : "open now"}` : ""}{d.status === "revoked" ? ` · ${he ? "בוטל" : "revoked"}` : ""}</span>
              <span style={{ display: "block", fontSize: 11, color: c.ts }}>{he ? `נוסף ${dateTime(d.createdAt)} · נראה ${dateTime(d.lastSeenAt)}` : `added ${dateTime(d.createdAt)} · seen ${dateTime(d.lastSeenAt)}`}</span>
            </span>
            {d.status === "approved" && (
              <ConfirmAction c={c} label={he ? "ביטול" : "Revoke"} ariaLabel={he ? `ביטול ${d.label}` : `Revoke ${d.label}`}
                question={he ? "לבטל את המכשיר? אם החשבון פתוח בו, הוא ייסגר." : "Revoke this device? If the account is open on it, it closes."}
                confirmLabel={he ? "כן, לבטל" : "Yes, revoke"} confirmAriaLabel={he ? `כן, לבטל את ${d.label}` : `Yes, revoke ${d.label}`}
                keepLabel={he ? "השארה" : "Keep"} onConfirm={() => onRevoke(d)} />
            )}
          </li>
        ))}
        {devices.length === 0 && <li style={{ fontSize: 13, color: c.ts }}>{he ? "עוד לא נכנסו מאף מכשיר." : "No device has signed in yet."}</li>}
      </ul>
    </Card>
  );
}
