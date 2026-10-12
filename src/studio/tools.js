/**
 * The Studio's tools in toolbar order: the toolbar, quick search and the home screen's tiles all list them,
 * by their name in either language. `i` names the icon (src/ui/Icon.jsx).
 */
export const STUDIO_TOOLS = [
  { k: "today", i: "sparkles", he: "היום", en: "Today" },
  { k: "clients", i: "user", he: "לקוחות", en: "Clients" },
  { k: "reading", i: "orb", he: "קריאה", en: "Reading" },
  { k: "leads", i: "users", he: "לידים", en: "Leads" },
  { k: "tables", i: "chart", he: "טבלאות", en: "Tables" },
  { k: "match", i: "heart", he: "התאמה", en: "Match" },
  { k: "daily", i: "sun", he: "יומי", en: "Daily" },
  { k: "numbers", i: "book", he: "מספרים", en: "Numbers" },
  { k: "calc", i: "calculator", he: "מחשבונים", en: "Calculators" },
  { k: "account", i: "user", he: "החשבון שלי", en: "My account" },
];

/** Only an admin sees it. */
export const ADMIN_TOOL = { k: "admin", i: "users", he: "חשבונות", en: "Accounts" };
