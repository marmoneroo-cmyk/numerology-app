/** "My account": name and phone, a new password, two-step verification, and the account's devices. */
import { useRef, useState } from "react";
import { Card, Field, SectionTitle, ScreenTitle, ConfirmAction, Loading, ErrorCard, useLoad, colors, btnPrimary, btnGhost } from "../workspace/ui.jsx";
import { countLabel } from "../workspace/format.js";
import { planLabel, dateTime, MIN_PASSWORD } from "./labels.js";
import { QrCode, qrMatrix } from "./qr.jsx";
import PasswordInput from "./PasswordInput.jsx";

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
      {/* two columns on a computer (studio.css); one column, in this order, on narrower screens */}
      <div className="st-cols-2">
        <div>
          <Details account={account} he={he} c={c} />
          <Password account={account} he={he} c={c} />
        </div>
        <div>
          <TwoStep account={account} he={he} c={c} />
          <Devices account={account} he={he} c={c} />
        </div>
      </div>
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
          {(id) => <PasswordInput id={id} he={he} c={c} autoComplete="new-password" value={first} onChange={(e) => setFirst(e.target.value)} />}
        </Field>
        <Field label={he ? "הסיסמה החדשה שוב" : "The new password again"} c={c}>
          {(id) => <PasswordInput id={id} he={he} c={c} autoComplete="new-password" value={second} onChange={(e) => setSecond(e.target.value)} />}
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
  const [starting, setStarting] = useState(false);
  const focusNext = useRef(null);
  if (state.loading) return <Loading he={he} c={c} />;
  const active = done || Boolean(state.data?.factorId);
  const qrLabel = he ? "קוד QR לאפליקציית האימות" : "QR code for the authenticator app";
  /** Moves the focus to an element once it appears, when it is the one the user needs next. */
  const focusIf = (target) => (el) => {
    if (el && focusNext.current === target) {
      focusNext.current = null;
      el.focus();
    }
  };

  const begin = async () => {
    // one setup at a time: a second start would remove the first one's key while it is on screen
    if (starting) return;
    setStarting(true);
    setError(null);
    try {
      const enrolled = await account.service.mfaEnroll();
      // a sparse code drawn here scans far more easily; the server's dense image is the fallback
      const matrix = enrolled.uri ? await qrMatrix(enrolled.uri).catch(() => null) : null;
      focusNext.current = "setup";
      setSetup({ ...enrolled, matrix });
    } catch {
      setError(he ? "אי אפשר להתחיל כרגע. נסו שוב." : "Cannot start right now. Try again.");
    } finally {
      setStarting(false);
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
      setCode("");
      if (err.code === "setup_expired") {
        // removed by a setup started elsewhere: this key will never work, so back to the start
        focusNext.current = "start";
        setSetup(null);
        setError(he ? "ההגדרה הזאת כבר לא בתוקף, אולי כי התחילה הגדרה במכשיר אחר. מתחילים מחדש." : "This setup is no longer valid, perhaps because one was started on another device. Start again.");
        return;
      }
      setError(err.code === "wrong_code" ? (he ? "הקוד שגוי. נסו את הקוד הנוכחי באפליקציה." : "Wrong code. Try the current one.") : he ? "האישור נכשל. נסו שוב." : "Confirming failed. Try again.");
    }
  };
  const cancel = () => {
    focusNext.current = "start";
    setSetup(null);
    setCode("");
    setError(null);
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
          <button ref={focusIf("start")} className="ghost" style={btnGhost} onClick={begin} disabled={starting}>{he ? "הפעלת אימות דו-שלבי" : "Turn on two-step verification"}</button>
        </>
      ) : (
        <form onSubmit={confirm} noValidate>
          <p ref={focusIf("setup")} tabIndex={-1} style={{ margin: "0 0 10px", fontSize: 13, lineHeight: 1.7, outline: "none" }}>
            {he
              ? "באפליקציית האימות בטלפון מוסיפים חשבון וסורקים את הקוד. מעכשיו האפליקציה מציגה קוד בן 6 ספרות שמתחלף כל 30 שניות: מקלידים אותו כאן."
              : "In the authenticator app on your phone, add an account and scan this code. The app then shows a 6-digit code that changes every 30 seconds: type it here."}
          </p>
          {setup.matrix ? (
            <QrCode matrix={setup.matrix} label={qrLabel} />
          ) : (
            <img src={setup.qr} alt={qrLabel} width={243} height={243} style={{ background: "#fff", borderRadius: 8, padding: 12 }} />
          )}
          {setup.uri?.startsWith("otpauth://") && (
            <p style={{ margin: "10px 0 0", fontSize: 13 }}>
              <a href={setup.uri} style={{ color: c.ac }}>{he ? "בטלפון? פתיחה ישירה באפליקציית האימות" : "On your phone? Open it in the authenticator app"}</a>
            </p>
          )}
          <ManualKey secret={setup.secret} he={he} c={c} />
          <Field label={he ? "קוד מהאפליקציה" : "Code from the app"} error={error} c={c}>
            {(id) => <input id={id} className="gi" dir="ltr" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />}
          </Field>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button className="gb" type="submit" style={btnPrimary} disabled={code.length !== 6}>{he ? "אישור" : "Confirm"}</button>
            <button className="ghost" type="button" style={btnGhost} onClick={cancel}>{he ? "ביטול" : "Cancel"}</button>
          </div>
        </form>
      )}
    </Card>
  );
}

/** "JBSWY3DP…" as "JBSW Y3DP …": easier to type, and the apps ignore the spaces. */
const groupKey = (key) => key.match(/.{1,4}/g)?.join(" ") ?? key;

/** The key to type into the authenticator app when the QR code will not scan. */
function ManualKey({ secret, he, c }) {
  const [copied, setCopied] = useState(null);
  const copy = async () => {
    setCopied(null); // cleared first, so copying again is announced again
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div style={{ margin: "14px 0", fontSize: 13, lineHeight: 1.7 }}>
      <p style={{ margin: "0 0 4px", fontWeight: 600 }}>{he ? "לא מצליחים לסרוק? מקלידים את המפתח:" : "Cannot scan? Type the key instead:"}</p>
      <ul style={{ margin: "0 0 8px", paddingInlineStart: 18, color: c.ts }}>
        <li>{he ? "ב-Google Authenticator: לוחצים על + ואז “הזנת מפתח הגדרה” (Enter a setup key)." : "Google Authenticator: tap + then “Enter a setup key”."}</li>
        <li>{he ? "ב-Microsoft Authenticator: לוחצים על + ואז “חשבון אחר” (Other account) ואז “הזן קוד באופן ידני” (Enter code manually)." : "Microsoft Authenticator: tap + then “Other account” then “Enter code manually”."}</li>
        <li>{he ? "שם החשבון: סטודיו. המפתח: זה שכאן למטה." : "Account name: Studio. Key: the one below."}</li>
      </ul>
      <p dir="ltr" style={{ margin: "0 0 8px", fontFamily: "monospace", fontSize: 17, letterSpacing: 1, wordBreak: "break-word", textAlign: he ? "right" : "left" }}>{groupKey(secret)}</p>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button className="ghost" type="button" style={btnGhost} onClick={copy}>{he ? "העתקת המפתח" : "Copy the key"}</button>
        {/* always in the page, so screen readers announce what appears in it */}
        <span role="status" style={{ fontSize: 13, color: copied ? c.ok : c.danger }}>
          {copied === null ? "" : copied ? (he ? "המפתח הועתק" : "Key copied") : he ? "ההעתקה לא הצליחה. אפשר לסמן את המפתח ולהעתיק." : "Copying failed. Select the key and copy it."}
        </span>
      </div>
    </div>
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
