/*
 * The legal pages: terms of use, privacy policy, and cancellation and refunds, in Hebrew and English.
 * Each page is { title, sections: [{ title, paragraphs: [...], items?: [...] }] }. LegalPage.jsx shows them
 * and turns the contact address into a mailto link wherever it appears.
 *
 * The text describes how the website and the Studio work today, and nothing more. A lawyer should review it
 * before it is relied on. The Hebrew speaks to readers in the plural or impersonally, never in the singular.
 */

/** The "last updated" date on every legal page (YYYY-MM-DD). Change it whenever a page changes. */
export const LEGAL_UPDATED = "2026-10-07";

/** The address for every legal matter: questions, privacy requests and cancellations. */
export const LEGAL_EMAIL = "shlomi.cohen4444@gmail.com";

/** The operator's legal name. While it is null the pages say only "מפעיל השירות"; once set, they show it after that. */
export const OPERATOR_NAME = null;

/** Who runs the service, at the end of a sentence: the neutral term, followed by the legal name once it is known. */
function operator(name, he) {
  const term = he ? "מפעיל השירות" : "the service operator";
  return name ? `${term}, ${name}` : term;
}

function terms(name) {
  return {
    he: {
      title: "תנאי שימוש",
      sections: [
        {
          title: "כללי",
          paragraphs: [
            `תנאים אלה חלים על האתר ועל הסטודיו (יחד: "השירות").`,
            `האתר והסטודיו מופעלים על ידי ${operator(name, true)}. כשכתוב כאן "אנחנו", הכוונה למפעיל השירות.`,
            `השימוש בשירות מהווה הסכמה לתנאים אלה. אם אינכם מסכימים להם, אין להשתמש בשירות.`,
            `מדיניות הפרטיות ומדיניות הביטול וההחזרים הן חלק מתנאים אלה.`,
          ],
        },
        {
          title: "השירות",
          paragraphs: [
            `באתר אפשר לקבל קריאה נומרולוגית חינמית לפי שם ותאריך לידה. החישוב נעשה בדפדפן.`,
            `באתר אין חנות מקוונת ואין תשלום מקוון.`,
            `הסטודיו הוא תוכנה בתשלום, במנוי. מפעיל השירות מוכר אותה לנומרולוגים, לשימושם שלהם.`,
            `את החשבונות בסטודיו פותח מפעיל השירות. אין הרשמה עצמית.`,
          ],
        },
        {
          title: "נומרולוגיה אינה ייעוץ מקצועי",
          paragraphs: [
            `הקריאות, הדוחות ושאר התוכן בשירות נועדו לתובנה רוחנית או אישית בלבד.`,
            `הם אינם ייעוץ רפואי, פסיכולוגי, משפטי או פיננסי, ואינם תחליף לפנייה לאיש מקצוע מוסמך.`,
            `ההחלטות שלכם על סמך התוכן הן באחריותכם.`,
          ],
        },
        {
          title: "גיל",
          paragraphs: [`השירות מיועד לבני 18 ומעלה.`],
        },
        {
          title: "חשבונות בסטודיו",
          paragraphs: [
            `החשבון מיועד לשימוש של בעל החשבון בלבד.`,
            `יש לשמור את הסיסמה בסוד. ניתן להוסיף אימות דו-שלבי באמצעות אפליקציית אימות, ואנחנו ממליצים לעשות זאת.`,
            `בכל חשבון יכול להיות חיבור פעיל אחד בלבד, ומספר המכשירים בכל חשבון מוגבל.`,
            `אם יש חשד שמישהו אחר השתמש בחשבון, יש לפנות אלינו מיד.`,
          ],
        },
        {
          title: "מידע שמנויים שומרים על לקוחותיהם",
          paragraphs: [
            `מנויים שומרים בסטודיו מידע על הלקוחות שלהם, וגם קבצים בגודל של עד 20 מגה-בייט כל אחד.`,
            `כל מנוי קובע איזה מידע לשמור ולאיזו מטרה, והוא האחראי למידע הזה, גם לפי חוק הגנת הפרטיות, התשמ"א-1981.`,
            `מפעיל השירות מחזיק את המידע ומעבד אותו עבור המנוי.`,
            `יש לשמור בסטודיו רק מידע וקבצים שמותר לשמור.`,
            `דוחות PDF שמנוי מייצא נחתמים בשמו, והמנוי אחראי לתוכן שהוא מוסר ללקוחותיו.`,
          ],
        },
        {
          title: "שימוש אסור",
          paragraphs: [`אין להשתמש בשירות בניגוד לדין, או באופן שפוגע בשירות או באחרים. בין היתר, אסור:`],
          items: [
            `לנסות לגשת לחשבונות או למידע של אחרים;`,
            `לעקוף או לשבש אמצעי אבטחה;`,
            `להעלות קוד זדוני או תוכן שאסור על פי דין;`,
            `להעתיק, למכור או להפיץ את התוכנה בלי רשות בכתב.`,
          ],
        },
        {
          title: "קניין רוחני",
          paragraphs: [
            `התוכנה, העיצוב והתוכן של השירות שייכים למפעיל השירות או לבעלי זכויות אחרים.`,
            `מנויים מקבלים רשות אישית להשתמש בסטודיו בתקופת המנוי. אין להעביר את הרשות הזאת לאחרים.`,
            `המידע שמנויים מזינים לסטודיו נשאר שלהם.`,
          ],
        },
        {
          title: "זמינות וגיבוי",
          paragraphs: [
            `השירות ניתן כמות שהוא (AS IS). איננו מתחייבים שיהיה זמין תמיד או שיפעל בלי תקלות.`,
            `אנחנו רשאים לעדכן ולשנות את השירות מעת לעת.`,
            `מומלץ לשמור גיבוי: בסטודיו אפשר לשמור עותק מקומי של סביבת העבודה במכשיר, ולייצא קובץ גיבוי.`,
          ],
        },
        {
          title: "הגבלת אחריות",
          paragraphs: [
            `ככל שהדין מתיר, מפעיל השירות אינו אחראי לנזק עקיף או תוצאתי, או לנזק שנגרם מהחלטות שהתקבלו על סמך התוכן בשירות.`,
            `אין בתנאים אלה כדי לגרוע מזכות שהדין מקנה ושאי אפשר לוותר עליה.`,
          ],
        },
        {
          title: "השעיה וסגירה של חשבונות",
          paragraphs: [
            `אנחנו רשאים להשעות או לסגור חשבון שנעשה בו שימוש בניגוד לתנאים אלה.`,
            `ביטול מנוי והחזר כספי נעשים לפי מדיניות הביטול וההחזרים.`,
          ],
        },
        {
          title: "שינויים בתנאים",
          paragraphs: [`אנחנו עשויים לעדכן תנאים אלה. כל שינוי יפורסם בעמוד זה, עם תאריך העדכון האחרון.`],
        },
        {
          title: "הדין החל וסמכות שיפוט",
          paragraphs: [`על תנאים אלה ועל השימוש בשירות חלים דיני מדינת ישראל.`, `סמכות השיפוט נתונה לבתי המשפט המוסמכים בישראל.`],
        },
        {
          title: "יצירת קשר",
          paragraphs: [`לשאלות על תנאים אלה ולכל עניין משפטי, פנו אלינו בדוא"ל: ${LEGAL_EMAIL}`],
        },
      ],
    },
    en: {
      title: "Terms of Use",
      sections: [
        {
          title: "About these terms",
          paragraphs: [
            `These terms apply to the website and the Studio (together, the "Service").`,
            `The website and the Studio are run by ${operator(name, false)}. "We" and "us" mean the service operator.`,
            `Using the Service means accepting these terms. If you do not accept them, do not use the Service.`,
            `The Privacy Policy and the Cancellation and Refund Policy are part of these terms.`,
          ],
        },
        {
          title: "The Service",
          paragraphs: [
            `The website offers a free numerology reading from a name and a birth date. The calculation runs in the browser.`,
            `The website has no online shop and takes no online payments.`,
            `The Studio is paid subscription software. The service operator sells it to numerology practitioners for their own use.`,
            `The service operator opens every Studio account. There is no public sign-up.`,
          ],
        },
        {
          title: "Numerology is not professional advice",
          paragraphs: [
            `Readings, reports and other content in the Service are for spiritual or personal insight only.`,
            `They are not medical, psychological, legal or financial advice, and they do not replace a qualified professional.`,
            `Decisions you make based on the content are your own responsibility.`,
          ],
        },
        {
          title: "Age",
          paragraphs: [`The Service is intended for people aged 18 and over.`],
        },
        {
          title: "Studio accounts",
          paragraphs: [
            `An account is for its holder's use only.`,
            `Keep the password secret. Two-step verification with an authenticator app can be added, and we recommend it.`,
            `Each account can have one active session at a time, and the number of devices on an account is limited.`,
            `If you suspect that someone else has used an account, contact us at once.`,
          ],
        },
        {
          title: "Data subscribers keep about their clients",
          paragraphs: [
            `Subscribers keep data about their own clients in the Studio, including files of up to 20 MB each.`,
            `Each subscriber decides what to store and why, and is responsible for that data, including under the Protection of Privacy Law, 5741-1981.`,
            `The service operator holds and processes the data on the subscriber's behalf.`,
            `Store in the Studio only data and files that you are allowed to keep.`,
            `PDF reports a subscriber exports are signed with the subscriber's name, and the subscriber is responsible for what they give their clients.`,
          ],
        },
        {
          title: "Prohibited use",
          paragraphs: [`Do not use the Service unlawfully or in a way that harms the Service or others. Among other things, do not:`],
          items: [
            `try to access other people's accounts or data;`,
            `bypass or disrupt security measures;`,
            `upload malicious code or unlawful content;`,
            `copy, sell or distribute the software without written permission.`,
          ],
        },
        {
          title: "Intellectual property",
          paragraphs: [
            `The software, design and content of the Service belong to the service operator or to other rights holders.`,
            `Subscribers receive a personal right to use the Studio during their subscription. This right may not be passed to others.`,
            `The data subscribers enter into the Studio remains theirs.`,
          ],
        },
        {
          title: "Availability and backups",
          paragraphs: [
            `The Service is provided "as is". We do not promise that it will always be available or free of faults.`,
            `We may update and change the Service from time to time.`,
            `Keep backups: the Studio can keep a local copy of the workspace on the device and export a backup file.`,
          ],
        },
        {
          title: "Limitation of liability",
          paragraphs: [
            `As far as the law allows, the service operator is not liable for indirect or consequential damage, or for damage caused by decisions based on the content of the Service.`,
            `Nothing in these terms takes away a right the law gives you that cannot be waived.`,
          ],
        },
        {
          title: "Suspending and closing accounts",
          paragraphs: [
            `We may suspend or close an account that is used in breach of these terms.`,
            `Cancelling a subscription and refunds follow the Cancellation and Refund Policy.`,
          ],
        },
        {
          title: "Changes to these terms",
          paragraphs: [`We may update these terms. Every change is published on this page, with the date of the last update.`],
        },
        {
          title: "Governing law and jurisdiction",
          paragraphs: [`These terms and the use of the Service are governed by the laws of the State of Israel.`, `The competent courts in Israel have jurisdiction.`],
        },
        {
          title: "Contact",
          paragraphs: [`For questions about these terms or any legal matter, email us at ${LEGAL_EMAIL}`],
        },
      ],
    },
  };
}

function privacy(name) {
  return {
    he: {
      title: "מדיניות פרטיות",
      sections: [
        {
          title: "כללי",
          paragraphs: [
            `מדיניות זו מסבירה איזה מידע נאסף באתר ובסטודיו, למה, איפה הוא נשמר ומה הזכויות שלכם.`,
            `האתר והסטודיו מופעלים על ידי ${operator(name, true)}. כשכתוב כאן "אנחנו", הכוונה למפעיל השירות.`,
            `המדיניות נכתבה לאור חוק הגנת הפרטיות, התשמ"א-1981, ותקנות הגנת הפרטיות (אבטחת מידע), התשע"ז-2017.`,
          ],
        },
        {
          title: "הקריאה החינמית באתר",
          paragraphs: [
            `לקריאה חינמית מזינים שם ותאריך לידה. החישוב נעשה בדפדפן, והפרטים האלה לא נשלחים לשרתים שלנו.`,
            `אפשר לבחור להשאיר מספר WhatsApp כדי לקבל את הקריאה המלאה. אז נפתחת ב-WhatsApp הודעה אל מפעיל השירות, עם השם, המספר ופרטים מהקריאה. ההודעה נשלחת רק אם תשלחו אותה.`,
            `עותק של הפרטים נשמר גם בדפדפן שלכם (localStorage), במכשיר שלכם בלבד. ניקוי נתוני האתר בדפדפן מוחק אותו.`,
            `מסירת המספר היא לבחירתכם, ואין חובה חוקית למסור אותו.`,
          ],
        },
        {
          title: "פנייה ב-WhatsApp",
          paragraphs: [
            `באתר יש כפתור ליצירת קשר ב-WhatsApp. מה שנשלח אלינו ב-WhatsApp, למשל מספר טלפון או כתובת דוא"ל, מגיע אלינו דרך WhatsApp.`,
            `אנחנו משתמשים בהודעות כדי לטפל בפניות. על השימוש ב-WhatsApp חלים גם התנאים ומדיניות הפרטיות של WhatsApp.`,
          ],
        },
        {
          title: "הרשמה לתחזית החודשית",
          paragraphs: [
            `באתר אפשר להשאיר כתובת דוא"ל כדי לקבל תחזית נומרולוגית חודשית. ההרשמה פותחת ב-WhatsApp הודעה אל מפעיל השירות עם הכתובת, וההודעה נשלחת רק אם תשלחו אותה.`,
            `הכתובת משמשת רק למשלוח התחזית החודשית. אפשר לבקש להפסיק לקבל אותה בכל עת, בפנייה אלינו.`,
            `מסירת הכתובת היא לבחירתכם, ואין חובה חוקית למסור אותה.`,
          ],
        },
        {
          title: "אחסון האתר, סטטיסטיקה, גופנים ותמונות",
          paragraphs: [
            `האתר מאוחסן ב-Vercel. כמו כל שירות אחסון, Vercel מקבלת נתונים טכניים, כמו כתובת IP, כדי להציג את האתר.`,
            `לספירת ביקורים אנחנו משתמשים ב-Vercel Web Analytics. הכלי אינו משתמש בעוגיות (cookies), ומציג נתונים מצטברים בלבד, כמו מספר הצפיות בדפים. כתובת הדף נשלחת בלי החלק שאחרי סימן השאלה (?) או הסולמית (#).`,
            `הגופנים באתר נטענים מ-Google Fonts. לכן הדפדפן פונה לשרתים של Google, ו-Google מקבלת את כתובת ה-IP של המבקרים.`,
            `תמונת הרקע בעמוד הקריאה החינמית נטענת מ-Unsplash. לכן בעמוד הזה הדפדפן פונה גם לשרתים של Unsplash, ו-Unsplash מקבלת את כתובת ה-IP של המבקרים.`,
          ],
        },
        {
          title: "חשבונות בסטודיו",
          paragraphs: [
            `את החשבונות פותח מפעיל השירות. חשבון כולל שם, כתובת דוא"ל ומספר טלפון.`,
            `הכניסה לחשבון היא בסיסמה, ואפשר להוסיף אימות דו-שלבי באמצעות אפליקציית אימות. למנהלי המערכת אימות דו-שלבי הוא חובה.`,
            `בכל חשבון יכול להיות חיבור פעיל אחד בלבד, ומספר המכשירים מוגבל. כל מכשיר נשמר עם תיאור קצר של הדפדפן ומערכת ההפעלה (למשל Chrome ו-Windows).`,
            `אירועי כניסה ואבטחה נשמרים ביומן ביקורת לכ-400 ימים.`,
            `המטרה: לנהל את החשבונות, לאבטח אותם ולמנוע שימוש בלי רשות. אין חובה חוקית למסור את הפרטים, אבל בלעדיהם אי אפשר לפתוח חשבון.`,
            `המערכת שולחת דוא"ל רק בענייני אבטחת החשבון, למשל קוד לבחירת סיסמה חדשה. ההודעות נשלחות דרך שירות הדואר של Google (Gmail).`,
          ],
        },
        {
          title: "מידע על לקוחות של מנויים",
          paragraphs: [
            `מנויים שומרים בסטודיו מידע על הלקוחות שלהם: שמות, תאריכי לידה, מספרי טלפון, כתובות דוא"ל, הערות, תגיות, קריאות נומרולוגיות וקבצים (עד 20 מגה-בייט לקובץ).`,
            `כל מנוי קובע איזה מידע לשמור ולאיזו מטרה, והוא האחראי למידע של לקוחותיו. מפעיל השירות מחזיק את המידע ומעבד אותו עבור המנוי.`,
            `כללי האבטחה של מסד הנתונים (Row Level Security) מאפשרים רק לחיבור הפעיל של המנוי לקרוא את המידע הזה או לשנות אותו.`,
            `מסכי הניהול של מפעיל השירות מציגים פרטי חשבון ומספרים בלבד (כמה לקוחות וכמה קריאות), ולא את תוכן המידע על הלקוחות.`,
            `מנוי יכול לשמור עותק מקומי של סביבת העבודה במכשיר שלו, לייצא קובץ גיבוי ולייבא אותו, ולייצא דוחות PDF. קבצים ועותקים כאלה נמצאים באחריות המנוי.`,
          ],
        },
        {
          title: "ספקי שירות ומקום אחסון המידע",
          paragraphs: [`איננו מעבירים מידע אישי לאחרים, מלבד לספקי השירות שלהלן ומלבד מה שהדין מחייב. ספקי השירות:`],
          items: [
            `Supabase: מסד הנתונים, אחסון הקבצים והכניסה לחשבונות. המידע נשמר בשרתים באיחוד האירופי, בפרנקפורט שבגרמניה, והקבצים נשמרים באזור אחסון פרטי.`,
            `Vercel: אחסון האתר וסטטיסטיקת הביקורים.`,
            `Google Fonts: הגופנים באתר.`,
            `Unsplash: תמונת הרקע בעמוד הקריאה החינמית.`,
            `Google (Gmail): משלוח הודעות הדוא"ל של החשבונות.`,
            `WhatsApp: הודעות שתבחרו לשלוח אלינו.`,
          ],
        },
        {
          title: "אבטחת מידע",
          paragraphs: [
            `אנחנו מגינים על המידע באמצעים שנבחרו בהתחשב בתקנות הגנת הפרטיות (אבטחת מידע), התשע"ז-2017. אף שיטת אבטחה אינה מושלמת, ולכן איננו יכולים להבטיח הגנה מלאה. בין האמצעים:`,
          ],
          items: [
            `סיסמה לכל חשבון, ואפשרות לאימות דו-שלבי (חובה למנהלי המערכת);`,
            `חיבור פעיל אחד לכל חשבון, ומגבלה על מספר המכשירים;`,
            `יומן ביקורת של אירועי כניסה ואבטחה;`,
            `כללי גישה במסד הנתונים, שמפרידים בין המידע של מנוי אחד למשנהו;`,
            `אחסון קבצים פרטי.`,
          ],
        },
        {
          title: "כמה זמן המידע נשמר",
          paragraphs: [
            `יומן הביקורת נשמר לכ-400 ימים.`,
            `פרטי החשבון ומידע הלקוחות נשמרים כל עוד החשבון פעיל. לשאלות על מחיקת מידע אחרי סגירת חשבון, פנו אלינו.`,
            `עותקים שנשמרים בדפדפן או במכשיר נשארים בו עד שמוחקים אותם.`,
          ],
        },
        {
          title: "הזכויות שלכם",
          paragraphs: [
            `לפי סעיף 13 לחוק הגנת הפרטיות, כל אדם זכאי לעיין במידע עליו המוחזק במאגר מידע.`,
            `לפי סעיף 14 לחוק, אם המידע אינו נכון, שלם, ברור או מעודכן, אפשר לבקש לתקן אותו או למחוק אותו.`,
            `לבקשה לעיין במידע או לתקן אותו, פנו אלינו בדוא"ל: ${LEGAL_EMAIL}`,
            `ייתכן שנבקש פרטים כדי לוודא את זהותכם. נשיב בתוך הזמן שקובע הדין.`,
            `לקוחות של מנוי, שהמידע עליהם נשמר בסטודיו, מתבקשים לפנות אל המנוי, שהוא האחראי למידע.`,
            `אפשר גם לפנות לרשות להגנת הפרטיות.`,
          ],
        },
        {
          title: "קטינים",
          paragraphs: [`השירות אינו מיועד לבני פחות מ-18.`],
        },
        {
          title: "שינויים במדיניות",
          paragraphs: [`אנחנו עשויים לעדכן מדיניות זו. כל שינוי יפורסם בעמוד זה, עם תאריך העדכון האחרון.`],
        },
        {
          title: "יצירת קשר",
          paragraphs: [`לכל שאלה או בקשה בנושא פרטיות, פנו אלינו בדוא"ל: ${LEGAL_EMAIL}`],
        },
      ],
    },
    en: {
      title: "Privacy Policy",
      sections: [
        {
          title: "About this policy",
          paragraphs: [
            `This policy explains what information the website and the Studio collect, why, where it is kept and what your rights are.`,
            `The website and the Studio are run by ${operator(name, false)}. "We" and "us" mean the service operator.`,
            `It was written with the Protection of Privacy Law, 5741-1981, and the Protection of Privacy Regulations (Data Security), 5777-2017, in mind.`,
          ],
        },
        {
          title: "The free reading",
          paragraphs: [
            `For a free reading you enter a name and a birth date. The calculation runs in your browser, and these details are not sent to our servers.`,
            `You may choose to leave a WhatsApp number to get the full reading. WhatsApp then opens a message to the service operator with the name, the number and details from the reading. The message is sent only if you send it.`,
            `A copy of the details is also kept in your browser's storage (localStorage), on your device only. Clearing the site's data in the browser deletes it.`,
            `Leaving the number is your choice; there is no legal duty to provide it.`,
          ],
        },
        {
          title: "Contacting us on WhatsApp",
          paragraphs: [
            `The website has a WhatsApp contact button. Whatever you send us on WhatsApp, such as a phone number or an email address, reaches us through WhatsApp.`,
            `We use these messages to handle your requests. WhatsApp's own terms and privacy policy also apply to its use.`,
          ],
        },
        {
          title: "Signing up for the monthly forecast",
          paragraphs: [
            `The website lets visitors leave an email address to receive a monthly numerology forecast. Signing up opens a WhatsApp message to the service operator with the address, and the message is sent only if you send it.`,
            `The address is used only to send the monthly forecast. You can ask us to stop sending it at any time.`,
            `Leaving the address is your choice; there is no legal duty to provide it.`,
          ],
        },
        {
          title: "Hosting, statistics, fonts and images",
          paragraphs: [
            `The website is hosted on Vercel. Like any host, Vercel receives technical data, such as IP addresses, in order to serve the site.`,
            `To count visits we use Vercel Web Analytics. It uses no cookies and shows only aggregate figures, such as page views. The page address is sent without its query or fragment (the part after ? or #).`,
            `The fonts load from Google Fonts, so the browser contacts Google's servers and Google receives the visitor's IP address.`,
            `The background image on the free reading page loads from Unsplash, so on that page the browser also contacts Unsplash's servers and Unsplash receives the visitor's IP address.`,
          ],
        },
        {
          title: "Studio accounts",
          paragraphs: [
            `The service operator opens every account. An account holds a name, an email address and a phone number.`,
            `Signing in takes a password, and two-step verification with an authenticator app can be added. Admins must use two-step verification.`,
            `Each account can have one active session at a time and a limited number of devices. Each device is recorded with a short label naming the browser and operating system (for example, Chrome on Windows).`,
            `Sign-in and security events are kept in an audit log for about 400 days.`,
            `Purpose: to manage the accounts, secure them and prevent unauthorised use. There is no legal duty to provide these details, but an account cannot be opened without them.`,
            `The system sends email only about account security, such as a code for choosing a new password. These emails go out through Google's email service (Gmail).`,
          ],
        },
        {
          title: "Subscribers' client data",
          paragraphs: [
            `Subscribers keep data about their clients in the Studio: names, birth dates, phone numbers, email addresses, notes, tags, numerology readings and files (up to 20 MB each).`,
            `Each subscriber decides what to store and why, and is responsible for their clients' data. The service operator holds and processes it on the subscriber's behalf.`,
            `The database's access rules (row-level security) let only the subscriber's active session read or change this data.`,
            `The service operator's admin screens show only account details and counts (how many clients and readings), never the content of client data.`,
            `A subscriber can keep a local copy of the workspace on their device, export and import a backup file, and export PDF reports. Such files and copies are the subscriber's responsibility.`,
          ],
        },
        {
          title: "Service providers and where data is stored",
          paragraphs: [`We do not pass personal information to others, except to the service providers below and where the law requires it. Our service providers:`],
          items: [
            `Supabase: the database, file storage and account sign-in. The data is stored on servers in the European Union, in Frankfurt, Germany, and files are kept in a private storage area.`,
            `Vercel: website hosting and visit statistics.`,
            `Google Fonts: the website's fonts.`,
            `Unsplash: the background image on the free reading page.`,
            `Google (Gmail): sending the account emails.`,
            `WhatsApp: messages you choose to send us.`,
          ],
        },
        {
          title: "Security",
          paragraphs: [
            `We protect the data with measures chosen with the Protection of Privacy Regulations (Data Security), 5777-2017, in mind. No security is perfect, so we cannot promise complete protection. The measures include:`,
          ],
          items: [
            `a password for every account, and optional two-step verification (required for admins);`,
            `one active session per account, and a device limit;`,
            `an audit log of sign-in and security events;`,
            `database access rules that keep each subscriber's data apart;`,
            `private file storage.`,
          ],
        },
        {
          title: "How long data is kept",
          paragraphs: [
            `The audit log is kept for about 400 days.`,
            `Account details and client data are kept while the account is active. For questions about deleting data after an account is closed, contact us.`,
            `Copies kept in a browser or on a device stay there until they are deleted.`,
          ],
        },
        {
          title: "Your rights",
          paragraphs: [
            `Under section 13 of the Protection of Privacy Law, everyone may inspect information about them that is held in a database.`,
            `Under section 14 of the law, if the information is not correct, complete, clear or up to date, you may ask to have it corrected or deleted.`,
            `To ask to inspect or correct your information, email us at ${LEGAL_EMAIL}`,
            `We may ask for details to confirm who you are. We will answer within the time the law sets.`,
            `Clients of a subscriber, whose data is kept in the Studio, should contact that subscriber, who is responsible for it.`,
            `You may also contact the Privacy Protection Authority.`,
          ],
        },
        {
          title: "Minors",
          paragraphs: [`The Service is not intended for anyone under 18.`],
        },
        {
          title: "Changes to this policy",
          paragraphs: [`We may update this policy. Every change is published on this page, with the date of the last update.`],
        },
        {
          title: "Contact",
          paragraphs: [`For any privacy question or request, email us at ${LEGAL_EMAIL}`],
        },
      ],
    },
  };
}

function refunds(name) {
  return {
    he: {
      title: "מדיניות ביטול והחזרים",
      sections: [
        {
          title: "כללי",
          paragraphs: [
            `מדיניות זו מסבירה איך מבטלים מנוי לסטודיו ומתי מקבלים החזר כספי.`,
            `האתר והסטודיו מופעלים על ידי ${operator(name, true)}. כשכתוב כאן "אנחנו", הכוונה למפעיל השירות.`,
            `הקריאה החינמית באתר אינה כרוכה בתשלום. באתר אין חנות מקוונת ואין תשלום מקוון.`,
          ],
        },
        {
          title: "המנוי לסטודיו",
          paragraphs: [
            `הסטודיו הוא תוכנה בתשלום, במנוי, לנומרולוגים. את המנוי מסדירים ישירות מול מפעיל השירות, והוא פותח את החשבון.`,
            `המחיר, תקופת המנוי ואופן התשלום נקבעים בהתקשרות בין המנוי לבין מפעיל השירות.`,
          ],
        },
        {
          title: "ביטול בתוך 14 ימים",
          paragraphs: [
            `אפשר לבטל את המנוי בתוך 14 ימים מיום העסקה או מיום קבלת המסמך עם פרטי העסקה, לפי המאוחר מביניהם.`,
            `הזכות הזאת ניתנת לכל המנויים, גם למי שרוכשים את המנוי לעסק שלהם ואינם "צרכנים" לפי חוק הגנת הצרכן, התשמ"א-1981.`,
            `מנויים שהם צרכנים זכאים גם לכל זכות נוספת שהחוק מקנה להם.`,
          ],
        },
        {
          title: "דמי ביטול",
          paragraphs: [
            `בביטול בתוך 14 הימים אנחנו רשאים לגבות דמי ביטול של עד 5% ממחיר העסקה או 100 ש"ח, לפי הנמוך מביניהם.`,
            `ממנויים שהם צרכנים נגבה דמי ביטול רק כאשר החוק מתיר זאת.`,
          ],
        },
        {
          title: "איך מבטלים",
          paragraphs: [
            `אפשר לבטל בהודעה בדוא"ל: ${LEGAL_EMAIL}`,
            `בהודעה כדאי לציין את השם ואת כתובת הדוא"ל של החשבון.`,
            `לפני סגירת החשבון מומלץ לייצא קובץ גיבוי של סביבת העבודה.`,
          ],
        },
        {
          title: "החזר כספי",
          paragraphs: [`לאחר ביטול בתוך 14 הימים נחזיר את הסכום ששולם, בניכוי דמי הביטול, בתוך 14 ימים מיום קבלת הודעת הביטול.`],
        },
        {
          title: "הפסקת המנוי",
          paragraphs: [`אפשר לפנות אלינו בכל זמן כדי להפסיק את המנוי.`, `מדיניות זו אינה גורעת מזכויות שהחוק מקנה.`],
        },
        {
          title: "שינויים במדיניות",
          paragraphs: [`אנחנו עשויים לעדכן מדיניות זו. כל שינוי יפורסם בעמוד זה, עם תאריך העדכון האחרון.`],
        },
        {
          title: "יצירת קשר",
          paragraphs: [`לשאלות על ביטולים והחזרים, פנו אלינו בדוא"ל: ${LEGAL_EMAIL}`],
        },
      ],
    },
    en: {
      title: "Cancellation and Refund Policy",
      sections: [
        {
          title: "About this policy",
          paragraphs: [
            `This policy explains how to cancel a Studio subscription and when money is refunded.`,
            `The website and the Studio are run by ${operator(name, false)}. "We" and "us" mean the service operator.`,
            `The free reading on the website costs nothing. The website has no online shop and takes no online payments.`,
          ],
        },
        {
          title: "The Studio subscription",
          paragraphs: [
            `The Studio is paid subscription software for numerology practitioners. The subscription is arranged directly with the service operator, who opens the account.`,
            `The price, the subscription period and the way of paying are set in the agreement between the subscriber and the service operator.`,
          ],
        },
        {
          title: "Cancelling within 14 days",
          paragraphs: [
            `A subscription may be cancelled within 14 days of the transaction, or of receiving the document with its details, whichever is later.`,
            `This right is given to every subscriber, including those who buy the subscription for their business and are not "consumers" under the Consumer Protection Law, 5741-1981.`,
            `Subscribers who are consumers also have every further right the law gives them.`,
          ],
        },
        {
          title: "Cancellation fee",
          paragraphs: [
            `On a cancellation within the 14 days we may charge a cancellation fee of up to 5% of the price or 100 NIS, whichever is lower.`,
            `From subscribers who are consumers we charge a cancellation fee only where the law allows it.`,
          ],
        },
        {
          title: "How to cancel",
          paragraphs: [
            `To cancel, email us at ${LEGAL_EMAIL}`,
            `Please include the name and email address of the account.`,
            `Before the account is closed, we recommend exporting a backup file of the workspace.`,
          ],
        },
        {
          title: "Refunds",
          paragraphs: [`After a cancellation within the 14 days we will refund the amount paid, less the cancellation fee, within 14 days of receiving the cancellation notice.`],
        },
        {
          title: "Ending the subscription",
          paragraphs: [`You can contact us at any time to end the subscription.`, `This policy does not limit any rights the law gives you.`],
        },
        {
          title: "Changes to this policy",
          paragraphs: [`We may update this policy. Every change is published on this page, with the date of the last update.`],
        },
        {
          title: "Contact",
          paragraphs: [`For questions about cancellations and refunds, email us at ${LEGAL_EMAIL}`],
        },
      ],
    },
  };
}

/** All three pages, naming the operator as `name` (see OPERATOR_NAME). */
export function buildLegalDocs(name) {
  return { terms: terms(name), privacy: privacy(name), refunds: refunds(name) };
}

/** The pages as the site shows them. */
export const LEGAL_DOCS = buildLegalDocs(OPERATOR_NAME);
