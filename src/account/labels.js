/** Words for account things, in Hebrew and English. */

const PLANS = {
  trial: ["ניסיון", "Trial"],
  basic: ["בסיסי", "Basic"],
  pro: ["מקצועי", "Pro"],
  studio: ["סטודיו", "Studio"],
  founder: ["מייסדים", "Founder"],
};
export const PLAN_KEYS = Object.keys(PLANS);
export const planLabel = (plan, he) => (PLANS[plan] || [plan, plan])[he ? 0 : 1];

export const statusLabel = (status, he) => (status === "suspended" ? (he ? "מושהה" : "Suspended") : he ? "פעיל" : "Active");

const AUDIT = {
  session_claimed: ["כניסה", "Signed in"],
  device_added: ["מכשיר חדש נוסף", "New device added"],
  device_refused: ["מכשיר נחסם", "Device refused"],
  device_revoked: ["מכשיר הוסר", "Device removed"],
  account_created: ["החשבון נפתח", "Account opened"],
  account_updated: ["פרטי החשבון שונו", "Account changed"],
  password_set: ["נקבעה סיסמה חדשה", "New password set"],
  client_deleted: ["תיק לקוח נמחק", "Client file deleted"],
  backup_exported: ["גיבוי הורד", "Backup downloaded"],
  backup_restored: ["גיבוי שוחזר", "Backup restored"],
  local_data_uploaded: ["נתונים מהמכשיר הועלו לחשבון", "Device data uploaded"],
  signed_out: ["יציאה", "Signed out"],
};

/** One line for an audit entry: what happened, and the one detail that matters. */
export function auditLine(entry, he) {
  const [h, e] = AUDIT[entry.action] || [entry.action, entry.action];
  const d = entry.detail || {};
  let extra = "";
  if (entry.action === "session_claimed" && d.replaced) extra = he ? " (ניתק את המכשיר הקודם)" : " (signed the previous device out)";
  if ((entry.action === "device_added" || entry.action === "device_refused") && d.label) extra = ` · ${d.label}`;
  if (entry.action === "device_refused") extra += d.reason === "changes" ? (he ? " · יותר מדי מכשירים חדשים" : " · too many new devices") : he ? " · מעבר למכסה" : " · over the limit";
  if (entry.action === "account_updated") {
    const parts = Object.entries(d).map(([k, v]) => `${k}: ${v}`);
    if (parts.length) extra = ` · ${parts.join(", ")}`;
  }
  return (he ? h : e) + extra;
}

/** "5.10.2026 14:03" in the device's time. */
export function dateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const PASSWORD_ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** A 14-character first password, easy to read aloud (no 0/O, 1/l/I). */
export function generatePassword(length = 14) {
  const values = crypto.getRandomValues(new Uint32Array(length));
  return [...values].map((v) => PASSWORD_ALPHABET[v % PASSWORD_ALPHABET.length]).join("");
}

export const MIN_PASSWORD = 10;
export const MAX_PASSWORD = 72;

const EMAIL = /^[A-Za-z0-9_%+'-]+([.][A-Za-z0-9_%+'-]+)*@[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?([.][A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)*[.][A-Za-z]{2,}$/;

/**
 * An email address as people really have them: letters, digits and . _ % + ' -
 * before the @ (no dot at either end, no two dots in a row), a domain of
 * dotted labels, a top level of 2 letters or more, at most 254 characters.
 * Stricter than the server's own check, so a typo is caught before sending.
 */
export const isEmail = (value) => value.length <= 254 && EMAIL.test(value);

/** A phone number as typed: digits with + - ( ) and spaces, 9 to 15 digits. */
export const isPhone = (value) => /^[0-9+()-][0-9+() -]*$/.test(value) && value.replace(/[^0-9]/g, "").length >= 9 && value.replace(/[^0-9]/g, "").length <= 15;

/**
 * What is wrong with a new account's details, as {field: code}; empty when it
 * can be opened. `taken` lists the emails that already have an account.
 */
export function accountProblems({ email, fullName, phone, password }, taken = []) {
  const problems = {};
  const address = email.trim().toLowerCase();
  if (!address) problems.email = "required";
  else if (!isEmail(address)) problems.email = "invalid";
  else if (taken.some((t) => t.toLowerCase() === address)) problems.email = "taken";
  if (fullName.trim().length < 2) problems.fullName = "required";
  if (phone.trim() && !isPhone(phone.trim())) problems.phone = "invalid";
  if (password.length < MIN_PASSWORD) problems.password = "short";
  else if (password.length > MAX_PASSWORD) problems.password = "long";
  return problems;
}
