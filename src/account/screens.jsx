/** The screens in front of the Studio: signing in, a forgotten password, and why the account cannot open. */
import { useState } from "react";
import { Card, Field, ScreenTitle, colors, btnPrimary, btnGhost } from "../workspace/ui.jsx";
import PasswordInput from "./PasswordInput.jsx";
import { isEmail, MIN_PASSWORD, MAX_PASSWORD, NEW_PASSWORD_PROBLEMS } from "./labels.js";

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
          {(id) => <PasswordInput id={id} he={he} c={c} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
        </Field>
        {error && <p role="alert" style={{ color: c.danger, fontSize: 13, margin: "0 0 12px" }}>{error}</p>}
        <button className="gb" type="submit" style={btnPrimary} disabled={busy || !email.trim() || !password}>{he ? "כניסה" : "Sign in"}</button>
      </form>
      {!account.selfServiceReset && (
        <p style={{ margin: "16px 0 0", fontSize: 12, color: c.ts, lineHeight: 1.7 }}>
          {he ? "שכחתם את הסיסמה? פנו למנהלת המערכת, והיא תקבע לכם סיסמה חדשה." : "Forgot your password? Ask the administrator to set a new one."}
        </p>
      )}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
        {account.selfServiceReset && <button className="ghost" style={btnGhost} onClick={() => account.toForgot(email)}>{he ? "שכחתי סיסמה" : "Forgot password"}</button>}
        <button className="ghost" style={btnGhost} onClick={onLeave}>{he ? "חזרה לאתר" : "Back to the site"}</button>
      </div>
    </Card>
  );
}

const RESET_ERRORS = {
  rate_limited: ["נשלחו יותר מדי בקשות בזמן קצר. נסו שוב בעוד כמה דקות.", "Too many requests in a short time. Try again in a few minutes."],
  wrong_code: ["הקוד שגוי או שפג תוקפו. אפשר לבקש קוד חדש.", "The code is wrong or has expired. You can ask for a new one."],
  unavailable: SIGN_IN_ERRORS.unavailable,
};
const resetError = (code, he) => (RESET_ERRORS[code] || RESET_ERRORS.unavailable)[he ? 0 : 1];

/** "Forgot password": the address that gets a code for a new one. */
export function ForgotScreen({ he, dk, account }) {
  const c = colors(dk);
  const [email, setEmail] = useState(account.email);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!isEmail(email.trim().toLowerCase())) {
      setError(he ? "כתובת אימייל לא תקינה." : "Not a valid email address.");
      return;
    }
    setBusy(true);
    setError(null);
    const problem = await account.requestReset(email);
    setBusy(false);
    if (problem) setError(resetError(problem, he));
  };
  return (
    <Card style={narrow}>
      <ScreenTitle c={c} size={24} style={{ marginBottom: 8 }}>{he ? "שכחתי סיסמה" : "Forgot password"}</ScreenTitle>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: c.ts, lineHeight: 1.7 }}>
        {he ? "נשלח לאימייל שלכם קוד בן 6 ספרות, ואיתו בוחרים סיסמה חדשה." : "We email you a 6-digit code, and with it you choose a new password."}
      </p>
      <form onSubmit={submit} noValidate>
        <Field label={he ? "אימייל" : "Email"} error={error} c={c}>
          {(id) => <input id={id} className="gi" type="email" dir="ltr" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />}
        </Field>
        <button className="gb" type="submit" style={btnPrimary} disabled={busy || !email.trim()}>{he ? "שליחת קוד" : "Send a code"}</button>
      </form>
      <button className="ghost" style={{ ...btnGhost, marginTop: 14 }} onClick={account.toSignIn}>{he ? "חזרה למסך הכניסה" : "Back to sign in"}</button>
    </Card>
  );
}

/** The code from the email (the same answer whether or not the address has an account). */
export function ResetScreen({ he, dk, account }) {
  const c = colors(dk);
  const [code, setCode] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [resent, setResent] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const problem = await account.verifyResetCode(code);
    setBusy(false);
    if (problem) {
      setError(resetError(problem, he));
      setCode("");
    }
  };
  const resend = async () => {
    setError(null);
    setResent(false);
    const problem = await account.requestReset(account.email);
    if (problem) setError(resetError(problem, he));
    else setResent(true);
  };
  return (
    <Card style={narrow}>
      <ScreenTitle c={c} size={24} style={{ marginBottom: 8 }}>{he ? "הקוד מהאימייל" : "The code from the email"}</ScreenTitle>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: c.ts, lineHeight: 1.7 }}>
        {he ? "אם לכתובת " : "If "}<span dir="ltr">{account.email}</span>
        {he ? " יש חשבון, נשלח אליה עכשיו קוד בן 6 ספרות. הקוד בתוקף לשעה." : " has an account, a 6-digit code is on its way to it. The code is valid for an hour."}
      </p>
      <form onSubmit={submit} noValidate>
        <Field label={he ? "הקוד מהאימייל" : "Code from the email"} error={error} c={c}>
          {(id) => <input id={id} className="gi" dir="ltr" inputMode="numeric" autoComplete="one-time-code" maxLength={10} value={code} onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))} />}
        </Field>
        <button className="gb" type="submit" style={btnPrimary} disabled={busy || code.length < 6}>{he ? "המשך" : "Continue"}</button>
      </form>
      <p style={{ margin: "16px 0 0", fontSize: 12, color: c.ts, lineHeight: 1.7 }}>
        {he ? "לא הגיע תוך כמה דקות? בדקו בתיקיית הספאם, בקשו קוד חדש, או פנו למנהלת המערכת." : "Nothing after a few minutes? Check the spam folder, ask for a new code, or contact the administrator."}
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
        <button className="ghost" style={btnGhost} onClick={resend}>{he ? "שליחת קוד חדש" : "Send a new code"}</button>
        <button className="ghost" style={btnGhost} onClick={account.toSignIn}>{he ? "חזרה למסך הכניסה" : "Back to sign in"}</button>
        <span role="status" style={{ fontSize: 12, color: c.ok }}>{resent ? (he ? "נשלח קוד חדש" : "A new code was sent") : ""}</span>
      </div>
    </Card>
  );
}

const NEW_PASSWORD_ERRORS = {
  ...NEW_PASSWORD_PROBLEMS,
  unavailable: ["השמירה נכשלה. נסו שוב.", "Saving failed. Try again."],
};

/** After a forgotten password: the new one, typed twice. */
export function NewPasswordScreen({ he, dk, account }) {
  const c = colors(dk);
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (first.length < MIN_PASSWORD) return setError(he ? `לפחות ${MIN_PASSWORD} תווים.` : `At least ${MIN_PASSWORD} characters.`);
    if (first.length > MAX_PASSWORD) return setError(he ? `עד ${MAX_PASSWORD} תווים.` : `At most ${MAX_PASSWORD} characters.`);
    if (first !== second) return setError(he ? "הסיסמאות לא זהות." : "The passwords differ.");
    setBusy(true);
    setError(null);
    const problem = await account.setNewPassword(first);
    setBusy(false);
    if (problem) setError((NEW_PASSWORD_ERRORS[problem] || NEW_PASSWORD_ERRORS.unavailable)[he ? 0 : 1]);
  };
  return (
    <Card style={narrow}>
      <ScreenTitle c={c} size={24} style={{ marginBottom: 14 }}>{he ? "בחירת סיסמה חדשה" : "Choose a new password"}</ScreenTitle>
      <form onSubmit={submit} noValidate>
        <Field label={he ? "סיסמה חדשה" : "New password"} hint={he ? `לפחות ${MIN_PASSWORD} תווים` : `At least ${MIN_PASSWORD} characters`} error={error} c={c}>
          {(id) => <PasswordInput id={id} he={he} c={c} autoComplete="new-password" value={first} onChange={(e) => setFirst(e.target.value)} />}
        </Field>
        <Field label={he ? "הסיסמה החדשה שוב" : "The new password again"} c={c}>
          {(id) => <PasswordInput id={id} he={he} c={c} autoComplete="new-password" value={second} onChange={(e) => setSecond(e.target.value)} />}
        </Field>
        <button className="gb" type="submit" style={btnPrimary} disabled={busy || !first || !second}>{he ? "שמירה וכניסה" : "Save and sign in"}</button>
      </form>
      <button className="ghost" style={{ ...btnGhost, marginTop: 14 }} onClick={account.toSignIn}>{he ? "ביטול" : "Cancel"}</button>
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
