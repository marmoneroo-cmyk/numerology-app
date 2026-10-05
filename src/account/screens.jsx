/** The screens in front of the Studio: signing in, and why the account cannot open. */
import { useState } from "react";
import { Card, Field, ScreenTitle, colors, btnPrimary, btnGhost } from "../workspace/ui.jsx";

const narrow = { maxWidth: 440, margin: "24px auto" };
const SIGN_IN_ERRORS = {
  invalid_credentials: ["האימייל או הסיסמה שגויים.", "The email or password is wrong."],
  unavailable: ["אין חיבור כרגע. נסו שוב בעוד רגע.", "No connection right now. Try again in a moment."],
};

export function SignInScreen({ he, dk, account, onLeave }) {
  const c = colors(dk);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const code = await account.signIn(email, password);
    setBusy(false);
    if (code) setError((SIGN_IN_ERRORS[code] || SIGN_IN_ERRORS.unavailable)[he ? 0 : 1]);
  };

  return (
    <Card style={narrow}>
      <ScreenTitle c={c} size={26} style={{ marginBottom: 8 }}>{he ? "כניסה לסטודיו" : "Sign in to the Studio"}</ScreenTitle>
      <p style={{ margin: "0 0 18px", fontSize: 13, color: c.ts, lineHeight: 1.7 }}>
        {he ? "הסטודיו פתוח למנויים. נכנסים עם האימייל והסיסמה שקיבלתם." : "The Studio is for subscribers. Sign in with the email and password you were given."}
      </p>
      <form onSubmit={submit} noValidate>
        <Field label={he ? "אימייל" : "Email"} c={c}>
          {(id) => <input id={id} className="gi" type="email" dir="ltr" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />}
        </Field>
        <Field label={he ? "סיסמה" : "Password"} c={c}>
          {(id) => <input id={id} className="gi" type="password" dir="ltr" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
        </Field>
        {error && <p role="alert" style={{ color: c.danger, fontSize: 13, margin: "0 0 12px" }}>{error}</p>}
        <button className="gb" type="submit" style={btnPrimary} disabled={busy || !email.trim() || !password}>{he ? "כניסה" : "Sign in"}</button>
      </form>
      <p style={{ margin: "16px 0 0", fontSize: 12, color: c.ts, lineHeight: 1.7 }}>
        {he ? "שכחתם את הסיסמה? פנו למנהלת המערכת, והיא תקבע לכם סיסמה חדשה." : "Forgot your password? Ask the administrator to set a new one."}
      </p>
      <button className="ghost" style={{ ...btnGhost, marginTop: 14 }} onClick={onLeave}>{he ? "חזרה לאתר" : "Back to the site"}</button>
    </Card>
  );
}

const CODE_ERRORS = {
  wrong_code: ["הקוד שגוי. נסו את הקוד הנוכחי באפליקציה.", "Wrong code. Try the current code in the app."],
  unavailable: ["אין חיבור כרגע. נסו שוב בעוד רגע.", "No connection right now. Try again in a moment."],
};

/** The second step: the six-digit code from the authenticator app. */
export function CodeScreen({ he, dk, account }) {
  const c = colors(dk);
  const [code, setCode] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const problem = await account.verifyCode(code);
    setBusy(false);
    if (problem) {
      setError((CODE_ERRORS[problem] || CODE_ERRORS.unavailable)[he ? 0 : 1]);
      setCode("");
    }
  };
  return (
    <Card style={narrow}>
      <ScreenTitle c={c} size={24} style={{ marginBottom: 8 }}>{he ? "אימות דו-שלבי" : "Two-step verification"}</ScreenTitle>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: c.ts, lineHeight: 1.7 }}>
        {he ? "הקלידו את הקוד בן 6 הספרות מאפליקציית האימות בטלפון." : "Type the 6-digit code from the authenticator app on your phone."}
      </p>
      <form onSubmit={submit} noValidate>
        <Field label={he ? "קוד מהאפליקציה" : "Code from the app"} error={error} c={c}>
          {(id) => <input id={id} className="gi" dir="ltr" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />}
        </Field>
        <button className="gb" type="submit" style={btnPrimary} disabled={busy || code.length !== 6}>{he ? "אימות" : "Verify"}</button>
      </form>
      <button className="ghost" style={{ ...btnGhost, marginTop: 14 }} onClick={account.toSignIn}>{he ? "חזרה למסך הכניסה" : "Back to sign in"}</button>
    </Card>
  );
}

/** "2 מכשירים", but "מכשיר אחד". */
const devicesText = (n, he) => (he ? (n === 1 ? "מכשיר אחד" : `${n} מכשירים`) : n === 1 ? "1 device" : `${n} devices`);

const BLOCKED = {
  suspended: (he) => (he ? "החשבון מושהה. לפרטים פנו למנהלת המערכת." : "This account is suspended. Please contact the administrator."),
  device_limit: (he, limit) => (he
    ? `החשבון כבר פעיל ב${limit === 1 ? "מכשיר אחד" : `-${limit} מכשירים`}, וזה המקסימום שלו. אפשר להסיר מכשיר ישן דרך "החשבון שלי" במכשיר שכבר מחובר, או לפנות למנהלת המערכת.`
    : `This account is already used on ${devicesText(limit, he)}, its maximum. Remove an old one under "My account" on a device that is signed in, or contact the administrator.`),
  device_changes: (he) => (he
    ? "לחשבון נוספו יותר מדי מכשירים חדשים בחודש האחרון. כדי לפתוח אותו כאן, פנו למנהלת המערכת."
    : "Too many new devices were added to this account in the last month. To open it here, contact the administrator."),
  device_revoked: (he) => (he
    ? "המכשיר הזה הוסר מהחשבון. אפשר להיכנס ממכשיר מאושר, או לפנות למנהלת המערכת."
    : "This device was removed from the account. Sign in from an approved device, or contact the administrator."),
};

export function BlockedScreen({ he, dk, account }) {
  const c = colors(dk);
  const text = (BLOCKED[account.reason] || BLOCKED.suspended)(he, account.limit);
  return (
    <Card style={narrow}>
      <ScreenTitle c={c} size={24} style={{ marginBottom: 10 }}>{he ? "אי אפשר לפתוח את החשבון כאן" : "The account cannot open here"}</ScreenTitle>
      <p role="alert" style={{ margin: "0 0 18px", lineHeight: 1.8, fontSize: 14 }}>{text}</p>
      <button className="ghost" style={btnGhost} onClick={account.toSignIn}>{he ? "חזרה למסך הכניסה" : "Back to sign in"}</button>
    </Card>
  );
}

export function ReplacedScreen({ he, dk, account }) {
  const c = colors(dk);
  return (
    <Card style={narrow}>
      <ScreenTitle c={c} size={24} style={{ marginBottom: 10 }}>{he ? "החשבון נפתח במכשיר אחר" : "The account was opened on another device"}</ScreenTitle>
      <p role="alert" style={{ margin: "0 0 18px", lineHeight: 1.8, fontSize: 14 }}>
        {he
          ? "החשבון נפתח במכשיר אחר. החשבון עובד במכשיר אחד בכל רגע, ולכן החיבור כאן נסגר. כל מה שנשמר נשאר בחשבון."
          : "The account was opened on another device. It works on one device at a time, so this one was signed out. Everything saved stays in the account."}
      </p>
      <button className="gb" style={btnPrimary} onClick={account.toSignIn}>{he ? "כניסה מחדש כאן" : "Sign in here again"}</button>
    </Card>
  );
}

export function WaitScreen({ he, dk }) {
  const c = colors(dk);
  return (
    <Card style={{ ...narrow, textAlign: "center", color: c.ts }}>
      <span role="status">{he ? "בודקים את החשבון…" : "Checking the account…"}</span>
    </Card>
  );
}

export function ProblemScreen({ he, dk, account }) {
  const c = colors(dk);
  return (
    <Card style={{ ...narrow, textAlign: "center" }}>
      <p role="alert" style={{ color: c.danger, marginTop: 0 }}>{he ? "אין חיבור לחשבון כרגע." : "The account cannot be reached right now."}</p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <button className="ghost" style={btnGhost} onClick={account.retry}>{he ? "לנסות שוב" : "Try again"}</button>
        <button className="ghost" style={btnGhost} onClick={account.toSignIn}>{he ? "חזרה למסך הכניסה" : "Back to sign in"}</button>
      </div>
    </Card>
  );
}
