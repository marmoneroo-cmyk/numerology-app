/**
 * What each Studio screen is for, in a line or two, shown at the top of the screen (the owner, 2026-10-12:
 * "a short explanation for each topic"). Keyed by the tool's key in App.jsx's STUDIO_TOOLS and ADMIN_TOOL.
 * The Hebrew is impersonal, like every text in the app (src/__tests__/hebrew-voice.test.js).
 */
export const SCREEN_HELP = {
  today: {
    he: "סקירה של היום: המספר האוניברסלי, ימי הולדת קרובים עם ברכה מוכנה, הלקוחות האחרונים, מעקבים שהגיע זמנם, לקוחות שכדאי לחזור אליהם, וקלף היום.",
    en: "A look at the day: the universal number, birthdays coming up with a greeting ready, recent clients, follow-ups that are due, clients worth getting back to, and the card of the day.",
  },
  clients: {
    he: "תיק לכל לקוח: פרטים, הערות, תגיות, קבצים וכל הבדיקות שנשמרו. מכאן פותחים לקוח חדש או בדיקה חדשה, וקובעים מעקב.",
    en: "A file for each client: details, notes, tags, files and every saved reading. New clients, new readings and follow-ups start here.",
  },
  reading: {
    he: "מפה נומרולוגית מלאה לפי שם ותאריך לידה: כל המספרים בסיכום אחד, ואחריו שישה פרקים, מהמהות ועד הדרך קדימה. אפשר לשמור את הקריאה כדוח PDF או להציג אותה ללקוח במצב פגישה.",
    en: "A full numerology map from a name and a birth date: every number in one summary, then six chapters, from the essence to the path forward. A reading can be saved as a PDF or shown to the client in meeting mode.",
  },
  leads: {
    he: "פניות שמבקרים השאירו בדף הלקוח, כפי שנשמרו במכשיר הזה: שם, טלפון והמספרים העיקריים של כל פנייה, עם ייצוא לקובץ CSV.",
    en: "Enquiries visitors left on the customer page, as saved on this device: name, phone and the main numbers of each, with an export to a CSV file.",
  },
  tables: {
    he: "כל המספרים של אדם אחד בטבלה אחת: מספרי הליבה, השנה, החודש והיום האישיים, מחזורי החיים, הפסגות והאתגרים, הנשמה והביטוי.",
    en: "All of one person's numbers in one table: the core numbers, the personal year, month and day, the life cycles, the pinnacles and challenges, the soul and the expression.",
  },
  match: {
    he: "השוואה לפי המספרים: התאמה זוגית בין שני אנשים, פרופיל אישיותי של אדם אחד, או התאמה בין הורה לילד.",
    en: "Comparisons by the numbers: a couple's compatibility, one person's personality profile, or a parent and child.",
  },
  daily: {
    he: "המסר של היום וטקס קצר לפי מספר היום בחודש, לשיתוף עם לקוחות או לפתיחת היום.",
    en: "The message of the day and a short ritual by the day-of-month number, to share with clients or to open the day.",
  },
  cards: {
    he: "חפיסת טארוט מלאה של 78 קלפים, עם משמעות רגילה והפוכה לכל קלף ושליפה של קלף, ולצידה קלפי המספרים 1 עד 9.",
    en: "A full tarot deck of 78 cards, each with its upright and reversed meaning and a card to draw, beside the number cards 1 to 9.",
  },
  calc: {
    he: "מחשבונים ממוקדים: כל המספרים של אדם, נומרוסקופ יומי, מחזורי חיים, רשת לו שו, חובות קארמיים, מחזור שנים, השוואת שמות, מספרים מעשיים ומחשבוני התאמה.",
    en: "Focused calculators: all of a person's numbers, the daily numeroscope, life cycles, the Lo Shu grid, karmic debts, the cycle of years, comparing names, practical numbers and compatibility calculators.",
  },
  account: {
    he: "פרטי החשבון כפי שהם מופיעים על הדוחות, החלפת סיסמה, הקוד הדו-שלבי והמכשירים שמחוברים לחשבון.",
    en: "The account's details as they appear on the reports, the password, the two-step code and the devices signed in to the account.",
  },
  admin: {
    he: "ניהול המנויים: פתיחת חשבון חדש, חיפוש, מסלול והרשאות, השעיה והחזרה של חשבון, והעתקת פרטי הכניסה כדי לשלוח אותם למנוי.",
    en: "Managing subscribers: opening an account, searching, the plan and permissions, suspending and restoring an account, and copying the sign-in details to send to the subscriber.",
  },
};

/** The התאמה tab's three comparisons, keyed like CompatWidget's tabs. */
export const MATCH_HELP = {
  couple: {
    he: "התאמה זוגית: משווים את שביל הגורל, ערך השם, קול הנשמה והביטוי של שני בני הזוג, ומקבלים ציון, נקודות חיבור, אתגרים ועצה לזוג.",
    en: "Couple compatibility: compares the life path, name number, soul and expression of both partners, and gives a score, what connects them, the challenges and advice for the couple.",
  },
  profile: {
    he: "פרופיל אישי: תמונה של אדם אחד לפי המספרים שלו, עם החוזקות, האתגרים ושיעור הנשמה.",
    en: "Personal profile: one person by their numbers, with the strengths, the challenges and the soul's lesson.",
  },
  parent: {
    he: "הורה-ילד: איך המספרים של ההורה ושל הילד נפגשים, מה זורם ביניהם בקלות ומה דורש סבלנות ותשומת לב.",
    en: "Parent and child: how the parent's and the child's numbers meet, what flows easily between them and what needs patience and attention.",
  },
};
