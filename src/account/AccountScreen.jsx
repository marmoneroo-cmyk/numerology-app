/** "My account": name and phone, a new password, two-step verification, and the account's devices. */
import { useState } from "react";
import { Card, Field, SectionTitle, ScreenTitle, ConfirmAction, Loading, ErrorCard, useLoad, colors, btnPrimary, btnGhost } from "../workspace/ui.jsx";
import { countLabel } from "../workspace/format.js";
import { planLabel, dateTime, MIN_PASSWORD } from "./labels.js";

export default function AccountScreen({ account, he, dk }) {
  const c = colors(dk);
  const { profile } = account;
  return (
    <div dir={he ? "rtl" : "ltr"} style={{ color: c.tm }}>
      <Card>
        <ScreenTitle c={c} size={26}>{he ? "החשבון שלי" : "My account"}</ScreenTitle>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: c.ts }}>
          {profile.email} · {he ? `מסלול: ${planLabel(profile.plan, he)}` : `Plan: ${planLabel(profile.plan, he)}`} · {he ? `עד ${countLabel(profile.deviceLimit, "devices", he)}` : `up to ${countLabel(profile.deviceLimit, "devices", he)}`}
        </p>
      </Card>
      <Details account={account} he={he} c={c} />
      <Password account={account} he={he} c={c} />
      <TwoStep account={account} he={he} c={c} />
      <Devices account={account} he={he} c={c} />
      <Card style={{ padding: 16 }}>
        <button className="ghost" style={btnGhost} onClick={account.signOut}>{he ? "יציאה מהחשבון" : "Sign out"}</button>
      </Card>
    </div>
  );
}

function Details({ account, he, c }) {
  const [fullName, setFullName] = useState(account.profile.fullName);
  const [phone, setPhone] = useState(account.profile.phone);
  const [status, setStatus] = useState(null);
  const save = async () => {
    try {
      await account.service.updateProfile(fullName.trim(), phone.trim());
      account.updateProfile({ fullName: fullName.trim(), phone: phone.trim() });
      setStatus({ ok: true, text: he ? "הפרטים נשמרו" : "Saved" });
    } catch {
      setStatus({ ok: false, text: he ? "השמירה נכשלה. נסו שוב." : "Saving failed. Try again." });
    }
  };
  return (
    <Card>
      <SectionTitle c={c}>{he ? "פרטים" : "Details"}</SectionTitle>
      <Field label={he ? "שם מלא" : "Full name"} hint={he ? "מופיע על הדוחות ובסימן המים" : "Shown on reports and in the watermark"} c={c}>
        {(id) => <input id={id} className="gi" value={fullName} maxLength={120} onChange={(e) => { setFullName(e.target.value); setStatus(null); }} />}
      </Field>
      <Field label={he ? "טלפון" : "Phone"} c={c}>
        {(id) => <input id={id} className="gi" dir="ltr" inputMode="tel" value={phone} maxLength={25} onChange={(e) => { setPhone(e.target.value); setStatus(null); }} />}
      </Field>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button className="gb" style={btnPrimary} onClick={save}>{he ? "שמירת הפרטים" : "Save details"}</button>
        {status && <span role="status" style={{ fontSize: 13, color: status.ok ? c.ok : c.danger }}>{status.text}</span>}
      </div>
    </Card>
  );
}

function Password({ account, he, c }) {
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const change = async (e) => {
    e.preventDefault();
    setDone(false);
    if (first.length < MIN_PASSWORD) return setError(he ? `לפחות ${MIN_PASSWORD} תווים` : `At least ${MIN_PASSWORD} characters`);
    if (first !== second) return setError(he ? "הסיסמאות לא זהות" : "The passwords differ");
    setError(null);
    try {
      await account.service.changePassword(first);
      setFirst("");
      setSecond("");
      setDone(true);
    } catch {
      setError(he ? "ההחלפה נכשלה. נסו שוב." : "Changing failed. Try again.");
    }
  };
  return (
    <Card>
      <SectionTitle c={c}>{he ? "סיסמה" : "Password"}</SectionTitle>
      <form onSubmit={change} noValidate>
        <Field label={he ? "סיסמה חדשה" : "New password"} error={error} c={c}>
          {(id) => <input id={id} className="gi" type="password" dir="ltr" autoComplete="new-password" value={first} onChange={(e) => setFirst(e.target.value)} />}
        </Field>
        <Field label={he ? "הסיסמה החדשה שוב" : "The new password again"} c={c}>
          {(id) => <input id={id} className="gi" type="password" dir="ltr" autoComplete="new-password" value={second} onChange={(e) => setSecond(e.target.value)} />}
        </Field>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button className="gb" type="submit" style={btnPrimary}>{he ? "החלפת סיסמה" : "Change password"}</button>
          {done && <span role="status" style={{ fontSize: 13, color: c.ok }}>{he ? "הסיסמה הוחלפה" : "Password changed"}</span>}
        </div>
      </form>
    </Card>
  );
}

/** Two-step verification with an authenticator app (required for admins). */
function TwoStep({ account, he, c }) {
  const state = useLoad(() => account.service.mfaState(), [account.service]);
  const [setup, setSetup] = useState(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  if (state.loading) return <Loading he={he} c={c} />;
  const active = done || Boolean(state.data?.factorId);

  const begin = async () => {
    setError(null);
    try {
      setSetup(await account.service.mfaEnroll());
    } catch {
      setError(he ? "אי אפשר להתחיל כרגע. נסו שוב." : "Cannot start right now. Try again.");
    }
  };
  const confirm = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await account.service.mfaVerify(setup.factorId, code);
      setDone(true);
      setSetup(null);
      await account.refreshAal();
    } catch (err) {
      setError(err.code === "wrong_code" ? (he ? "הקוד שגוי. נסו את הקוד הנוכחי באפליקציה." : "Wrong code. Try the current one.") : he ? "האישור נכשל. נסו שוב." : "Confirming failed. Try again.");
      setCode("");
    }
  };

  return (
    <Card>
      <SectionTitle c={c}>{he ? "אימות דו-שלבי" : "Two-step verification"}</SectionTitle>
      {active ? (
        <p role="status" style={{ margin: 0, fontSize: 14, color: c.ok }}>{he ? "האימות הדו-שלבי פעיל" : "Two-step verification is on"}</p>
      ) : !setup ? (
        <>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: c.ts, lineHeight: 1.7 }}>
            {he
              ? "כניסה עם סיסמה וגם קוד מאפליקציית אימות בטלפון (למשל Google Authenticator). חובה למנהלי מערכת."
              : "Sign in with your password and a code from an authenticator app on your phone. Required for admins."}
          </p>
          {error && <p role="alert" style={{ color: c.danger, fontSize: 13 }}>{error}</p>}
          <button className="ghost" style={btnGhost} onClick={begin}>{he ? "הפעלת אימות דו-שלבי" : "Turn on two-step verification"}</button>
        </>
      ) : (
        <form onSubmit={confirm} noValidate>
          <p style={{ margin: "0 0 10px", fontSize: 13, lineHeight: 1.7 }}>
            {he ? "סרקו את הקוד באפליקציית האימות, או הקלידו בה את המפתח, ואז הזינו את הקוד שהיא מציגה." : "Scan this with your authenticator app, or type the key into it, then enter the code it shows."}
          </p>
          <img src={setup.qr} alt={he ? "קוד QR לאפליקציית האימות" : "QR code for the authenticator app"} width={180} height={180} style={{ background: "#fff", borderRadius: 8, padding: 6 }} />
          <p dir="ltr" style={{ fontFamily: "monospace", fontSize: 13, wordBreak: "break-all", textAlign: he ? "right" : "left" }}>{setup.secret}</p>
          <Field label={he ? "קוד מהאפליקציה" : "Code from the app"} error={error} c={c}>
            {(id) => <input id={id} className="gi" dir="ltr" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />}
          </Field>
          <button className="gb" type="submit" style={btnPrimary} disabled={code.length !== 6}>{he ? "אישור" : "Confirm"}</button>
        </form>
      )}
    </Card>
  );
}

function Devices({ account, he, c }) {
  const devices = useLoad(() => account.service.myDevices(), [account.service]);
  const [message, setMessage] = useState(null);
  if (devices.loading) return <Loading he={he} c={c} />;
  if (devices.error) return <ErrorCard he={he} c={c} />;
  const approved = devices.data.filter((d) => d.status === "approved");
  const remove = async (d) => {
    setMessage(null);
    try {
      await account.service.revokeMyDevice(d.id);
      devices.reload();
    } catch {
      setMessage(he ? "ההסרה נכשלה. נסו שוב." : "Removing failed. Try again.");
    }
  };
  return (
    <Card style={{ padding: "16px 14px" }}>
      <SectionTitle c={c}>{he ? `מכשירים (${approved.length} מתוך ${account.profile.deviceLimit})` : `Devices (${approved.length} of ${account.profile.deviceLimit})`}</SectionTitle>
      <p style={{ margin: "0 0 10px", fontSize: 12, color: c.ts, lineHeight: 1.7 }}>
        {he
          ? "החשבון עובד במכשיר אחד בכל רגע. כדי לפנות מקום למכשיר חדש, הסירו מכשיר שכבר לא בשימוש."
          : "The account works on one device at a time. To make room for a new device, remove one you no longer use."}
      </p>
      {message && <p role="alert" style={{ color: c.danger, fontSize: 13, margin: "0 0 8px" }}>{message}</p>}
      <ul aria-label={he ? "המכשירים בחשבון" : "Devices on the account"} style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {approved.map((d) => (
          <li key={d.id} className="rrow" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 14 }}>{d.label}{d.current ? ` · ${he ? "המכשיר הזה" : "this device"}` : ""}</span>
              <span style={{ display: "block", fontSize: 11, color: c.ts }}>
                {he ? `נוסף ${dateTime(d.createdAt)} · נראה לאחרונה ${dateTime(d.lastSeenAt)}` : `added ${dateTime(d.createdAt)} · last seen ${dateTime(d.lastSeenAt)}`}
              </span>
            </span>
            {!d.current && (
              <ConfirmAction
                c={c}
                label={he ? "הסרה" : "Remove"}
                ariaLabel={he ? `הסרת ${d.label}` : `Remove ${d.label}`}
                question={he ? "להסיר את המכשיר מהחשבון?" : "Remove this device from the account?"}
                confirmLabel={he ? "כן, להסיר" : "Yes, remove"}
                confirmAriaLabel={he ? `כן, להסיר את ${d.label}` : `Yes, remove ${d.label}`}
                keepLabel={he ? "השארה" : "Keep"}
                onConfirm={() => remove(d)}
              />
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
