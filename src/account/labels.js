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
