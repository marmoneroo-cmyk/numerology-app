/*
 * Every word of the sales page, in Hebrew and English (the two trees have the same shape).
 * The Hebrew speaks to readers in the plural or impersonally, never in the singular. The claims follow what
 * the Studio does today, and the privacy ones follow the privacy policy (src/legal/content.js).
 */
export const SALES = {
  he: {
    brand: "הסטודיו",
    language: "EN",
    languageLabel: "English",
    signIn: "כניסה למנויים",
    hero: {
      kicker: "תוכנה לנומרולוגים",
      title: "כל הלקוחות, הקריאות והמפות — במקום אחד",
      subtitle: "הסטודיו לנומרולוגים: תיקי לקוחות, חישובים מדויקים, מצב פגישה ודוחות PDF בשם שלכם.",
      tryIt: "לנסות את הסטודיו",
      contact: "לדבר איתנו",
      note: "ההדגמה נפתחת מיד, עם לקוחות לדוגמה. בלי הרשמה.",
      shotAlt: "הסטודיו: מסך \"היום\" עם ימי ההולדת של השבוע, הלקוחות האחרונים וקלף היום",
    },
    features: {
      title: "מה יש בסטודיו",
      items: [
        { icon: "users", title: "תיקי לקוחות", text: "לכל לקוח תאריך לידה, טלפון, הערות, תגיות וקבצים. חיפוש מהיר מכל מסך, גם מהמקלדת (Ctrl+K)." },
        { icon: "orb", title: "קריאה מלאה", text: "שביל גורל, מספרי השם, שנה וחודש אישיים, מחזורים, פסגות ואתגרים, חובות קארמיים ומפת לו-שו, מחושבים מיד." },
        { icon: "eye", title: "מצב פגישה", text: "הקריאה במסך גדול ונקי מול הלקוח, בלי תפריטים ובלי הסחות." },
        { icon: "doc", title: "דוחות PDF בשם שלכם", text: "דוח מעוצב לכל לקוח, חתום בשם שלכם, מוכן לשליחה." },
        { icon: "sparkles", title: "מסך \"היום\"", text: "ימי ההולדת של השבוע עם ברכה מוכנה בוואטסאפ, הלקוחות האחרונים וקלף היום, במבט אחד." },
        { icon: "heart", title: "התאמות וכלים", text: "התאמה זוגית והתאמת הורה וילד, טבלאות, מחשבונים וקלפים." },
      ],
    },
    join: {
      title: "איך מצטרפים",
      steps: [
        { title: "פונים אלינו", text: "שולחים לנו הודעה, ושואלים כל מה שרוצים לדעת." },
        { title: "פותחים לכם חשבון", text: "עם תקופת ניסיון חינם. מקבלים פרטי כניסה, ובמסך \"החשבון שלי\" מחליפים לסיסמה משלכם. מומלץ להפעיל גם אימות דו-שלבי." },
        { title: "עובדים מכל מקום", text: "במחשב ובטלפון, בדפדפן. הלקוחות והקריאות שמורים בחשבון." },
      ],
    },
    privacy: {
      title: "המידע של הלקוחות שלכם בטוח",
      items: [
        "השרתים באיחוד האירופי, בפרנקפורט.",
        "כללי הגישה במסד הנתונים מאפשרים רק לחשבון שלכם לקרוא את הלקוחות שלכם. מסכי הניהול שלנו מציגים רק מספרים, לא תוכן.",
        "כניסה בסיסמה, ואפשר להוסיף אימות דו-שלבי.",
        "חיבור פעיל אחד לכל חשבון, ורשימת מכשירים שבשליטתכם.",
        "גיבוי וייצוא של כל המידע בכל רגע.",
      ],
      more: "כל הפרטים במדיניות הפרטיות",
    },
    price: {
      title: "מחיר",
      plan: "מנוי לסטודיו",
      perMonth: "לחודש",
      onRequest: "מחיר בפנייה",
      trialDays: "ימי ניסיון חינם",
      trial: "תקופת ניסיון חינם",
      includes: ["כל הכלים שבסטודיו", "דוחות PDF בשם שלכם", "ביטול בתוך 14 ימים"],
      contact: "לדבר איתנו",
    },
    faq: {
      title: "שאלות נפוצות",
      items: [
        { q: "צריך להתקין משהו?", a: "לא. הסטודיו עובד בדפדפן, במחשב ובטלפון." },
        { q: "על כמה מכשירים אפשר לעבוד?", a: "מספר המכשירים נקבע במנוי, ובכל רגע יש חיבור פעיל אחד. מכשיר ישן אפשר להסיר לבד, במסך \"החשבון שלי\"." },
        { q: "של מי המידע?", a: "שלכם. אפשר לייצא את כל הלקוחות והקריאות לקובץ גיבוי בכל רגע, ולשמור עותק מקומי במכשיר." },
        { q: "מה קורה בסוף תקופת הניסיון?", a: "מחליטים אם להמשיך. ממשיכים: הכול נשאר כמו שהוא. לא ממשיכים: אפשר לייצא את המידע לפני שהחשבון נסגר." },
        { q: "יש גם אנגלית?", a: "כן. הסטודיו עובד בעברית ובאנגלית, ומחליפים שפה בלחיצה." },
        { q: "איך מבטלים?", a: "בהודעה אלינו. בתוך 14 ימים מהעסקה מקבלים החזר לפי מדיניות הביטולים (ייתכנו דמי ביטול של עד 5% או 100 ש\"ח, הנמוך מביניהם)." },
      ],
    },
    footer: {
      label: "יצירת קשר ומסמכים",
      whatsapp: "וואטסאפ",
      email: "מייל",
      terms: "תקנון",
      privacy: "מדיניות פרטיות",
      refunds: "ביטולים והחזרים",
      rights: "© 2026 הסטודיו",
    },
  },
  en: {
    brand: "The Studio",
    language: "עב",
    languageLabel: "עברית",
    signIn: "Subscriber sign-in",
    hero: {
      kicker: "Software for numerologists",
      title: "Every client, reading and map — in one place",
      subtitle: "The Studio for numerologists: client files, precise calculations, meeting mode and PDF reports in your name.",
      tryIt: "Try the Studio",
      contact: "Talk to us",
      note: "The demo opens at once, with sample clients. No sign-up.",
      shotAlt: "The Studio: the Today screen with this week's birthdays, recent clients and today's card",
    },
    features: {
      title: "What's in the Studio",
      items: [
        { icon: "users", title: "Client files", text: "Each client with a birth date, phone, notes, tags and files. Quick search from any screen, from the keyboard too (Ctrl+K)." },
        { icon: "orb", title: "A full reading", text: "Life path, name numbers, personal year and month, cycles, pinnacles and challenges, karmic debts and the Lo Shu grid, calculated at once." },
        { icon: "eye", title: "Meeting mode", text: "The reading on a large, clean screen in front of the client, with no menus and no distractions." },
        { icon: "doc", title: "PDF reports in your name", text: "A designed report for each client, signed with your name, ready to send." },
        { icon: "sparkles", title: "The Today screen", text: "This week's birthdays with a WhatsApp greeting ready, recent clients and today's card, at a glance." },
        { icon: "heart", title: "Matches and tools", text: "Couple and parent-child matches, tables, calculators and cards." },
      ],
    },
    join: {
      title: "How to join",
      steps: [
        { title: "Get in touch", text: "Send us a message, and ask anything you want to know." },
        { title: "We open your account", text: "With a free trial. You get sign-in details, then switch to a password of your own in My account. Two-step verification is recommended too." },
        { title: "Work from anywhere", text: "On computer and phone, in the browser. Your clients and readings are kept in your account." },
      ],
    },
    privacy: {
      title: "Your clients' data is safe",
      items: [
        "The servers are in the European Union, in Frankfurt.",
        "The database's access rules let only your account read your clients. Our admin screens show counts only, never content.",
        "Sign-in with a password, and two-step verification can be added.",
        "One active session per account, and a device list you control.",
        "Back up and export all the data at any time.",
      ],
      more: "All the details in the privacy policy",
    },
    price: {
      title: "Price",
      plan: "Studio subscription",
      perMonth: "a month",
      onRequest: "Price on request",
      trialDays: "days of free trial",
      trial: "A free trial period",
      includes: ["Every tool in the Studio", "PDF reports in your name", "Cancel within 14 days"],
      contact: "Talk to us",
    },
    faq: {
      title: "Common questions",
      items: [
        { q: "Is there anything to install?", a: "No. The Studio runs in the browser, on computer and phone." },
        { q: "On how many devices can I work?", a: "The number of devices is set in the subscription, and one session is active at a time. You can remove an old device yourself, in My account." },
        { q: "Whose data is it?", a: "Yours. You can export all clients and readings to a backup file at any time, and keep a local copy on the device." },
        { q: "What happens when the trial ends?", a: "You decide whether to go on. Go on: everything stays as it is. Stop: export the data before the account is closed." },
        { q: "Is it in English too?", a: "Yes. The Studio works in Hebrew and English, and switching takes one click." },
        { q: "How do I cancel?", a: "With a message to us. Within 14 days of the purchase you get a refund under the cancellation policy (a fee of up to 5% or 100 NIS, the lower, may apply)." },
      ],
    },
    footer: {
      label: "Contact and documents",
      whatsapp: "WhatsApp",
      email: "Email",
      terms: "Terms",
      privacy: "Privacy",
      refunds: "Cancellations & refunds",
      rights: "© 2026 The Studio",
    },
  },
};
