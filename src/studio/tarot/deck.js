/*
 * The tarot deck's content: the 78 cards of the Rider-Waite-Smith deck, each with its name, three keywords and its
 * upright and reversed meanings, in Hebrew and in English. The meanings are the traditional ones, written for a
 * professional reader to use with clients: what a card points to and what it invites, never a prediction. The Hebrew
 * speaks impersonally or in the plural, never to the reader in the singular (src/__tests__/hebrew-voice.test.js).
 * Data only, and frozen: a screen that shuffles or sorts the cards works on a copy.
 */

/** @typedef {"wands"|"cups"|"swords"|"pentacles"} Suit */
/** @typedef {{ he: string, en: string }} Text */
/**
 * One card. `id` is "major-0".."major-21", or the suit and the number ("wands-1".."pentacles-14"). `number` is 0..21
 * in the major arcana, in the Rider-Waite-Smith order (8 = Strength, 11 = Justice), and 1..14 in a suit (1 = ace,
 * 2..10, 11 = page, 12 = knight, 13 = queen, 14 = king); `suit` is null in the major arcana. Three short keywords per
 * language; `upright` is one or two sentences (170 characters at most), `reversed` one sentence (140 at most).
 * @typedef {{
 *   id: string,
 *   arcana: "major"|"minor",
 *   number: number,
 *   suit: Suit|null,
 *   name: Text,
 *   keywords: { he: string[], en: string[] },
 *   upright: Text,
 *   reversed: Text,
 * }} TarotCard
 */

/**
 * The same thing in Hebrew and in English.
 * @template T
 * @param {T} he
 * @param {T} en
 * @returns {{ he: T, en: T }}
 */
const both = (he, en) => ({ he, en });

/** Freezes a value and everything in it, so no screen can change the deck by accident. */
function frozen(value) {
  if (value && typeof value === "object") {
    Object.values(value).forEach(frozen);
    Object.freeze(value);
  }
  return value;
}

/** @type {Readonly<Record<Suit, { name: Text, element: Text, theme: Text }>>} */
export const SUITS = frozen({
  wands: { name: both("מטות", "Wands"), element: both("אש", "Fire"), theme: both("יוזמה, תשוקה ויצירה", "Initiative, passion, and creativity") },
  cups: { name: both("גביעים", "Cups"), element: both("מים", "Water"), theme: both("רגשות, אהבה ויחסים", "Emotions, love, and relationships") },
  swords: { name: both("חרבות", "Swords"), element: both("אוויר", "Air"), theme: both("מחשבה, תקשורת ואתגרים", "Thought, communication, and challenges") },
  pentacles: { name: both("מטבעות", "Pentacles"), element: both("אדמה", "Earth"), theme: both("עבודה, כסף ועולם החומר", "Work, money, and the material world") },
});

/** The ranks of a suit, ace (1) to king (14), as they open a card's name: "Ace of Wands", "Two of Wands" and so on. */
const RANKS = [
  both("אס", "Ace"),
  ...["Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"].map((en, i) => both(String(i + 2), en)),
  both("עלם", "Page"),
  both("אביר", "Knight"),
  both("מלכת", "Queen"),
  both("מלך", "King"),
];

/** The major arcana in order, 0 (The Fool) to 21 (The World). */
const MAJOR = [
  {
    name: both("השוטה", "The Fool"),
    keywords: both(["התחלה חדשה", "ספונטניות", "אמונה"], ["New beginnings", "Spontaneity", "Faith"]),
    upright: both("התחלה חדשה וקפיצה אל הלא נודע, בלב פתוח ובסקרנות. הקלף מזמין לסמוך על הדרך גם בלי לדעת לאן היא מובילה.",
      "A new beginning and a leap into the unknown, with an open heart and curiosity. This card invites trust in the journey, even without knowing where it leads."),
    reversed: both("מצביע על פזיזות, חוסר זהירות או פחד שמעכב צעד ראשון, ומזמין לעצור ולבדוק לפני הקפיצה.",
      "Points to recklessness, carelessness, or a fear that holds back a first step, and invites a pause to look before leaping."),
  },
  {
    name: both("הקוסם", "The Magician"),
    keywords: both(["כוח רצון", "תושייה", "הגשמה"], ["Willpower", "Resourcefulness", "Manifestation"]),
    upright: both("כל הכלים כבר נמצאים בהישג יד. תקופה של יוזמה, ריכוז וכוח רצון, שבה רעיונות יכולים להפוך למציאות.",
      "All the tools are already at hand. A time of initiative, focus, and willpower, when ideas can be turned into reality."),
    reversed: both("מצביע על כישרון שאינו מנוצל, פיזור כוחות או מניפולציה, ומזמין לבדוק שהמילים והמעשים הולכים יחד.",
      "Points to untapped talent, scattered energy, or manipulation, and invites checking that words and actions match."),
  },
  {
    name: both("הכוהנת הגדולה", "The High Priestess"),
    keywords: both(["אינטואיציה", "ידע נסתר", "שקט פנימי"], ["Intuition", "Hidden knowledge", "Inner stillness"]),
    upright: both("אינטואיציה, ידע פנימי ומה שנמצא מתחת לפני השטח. הקלף מזמין להאט, להקשיב לקול הפנימי ולתת לתשובות להתבהר.",
      "Intuition, inner knowing, and what lies beneath the surface. This card invites slowing down, listening to the inner voice, and letting answers become clear."),
    reversed: both("מצביע על ניתוק מהאינטואיציה, סודות או התעלמות מתחושת בטן, ומזמין לחזור אל השקט הפנימי.",
      "Points to disconnection from intuition, secrets, or ignoring a gut feeling, and invites a return to inner stillness."),
  },
  {
    name: both("הקיסרית", "The Empress"),
    keywords: both(["שפע", "פוריות", "טיפוח"], ["Abundance", "Fertility", "Nurturing"]),
    upright: both("שפע, פוריות ויצירה. תקופה של צמיחה, חיבור לטבע ולגוף, טיפוח ואהבה שמאפשרים לדברים לפרוח.",
      "Abundance, fertility, and creation. A time of growth, connection to nature and the body, and nurturing love that lets things flourish."),
    reversed: both("מצביע על חסימה יצירתית, הזנחה עצמית או תלות, ומזמין להחזיר את תשומת הלב לטיפול עצמי.",
      "Points to a creative block, self-neglect, or dependence, and invites bringing attention back to self-care."),
  },
  {
    name: both("הקיסר", "The Emperor"),
    keywords: both(["סמכות", "יציבות", "מבנה"], ["Authority", "Stability", "Structure"]),
    upright: both("סמכות, סדר ויציבות. הקלף מצביע על מנהיגות, גבולות ברורים ותכנון שמאפשרים לבנות בסיס איתן.",
      "Authority, order, and stability. This card points to leadership, clear boundaries, and planning that make it possible to build a solid foundation."),
    reversed: both("מצביע על נוקשות, שתלטנות או חוסר משמעת, ומזמין לבדוק את היחס לסמכות ולשליטה.",
      "Points to rigidity, domination, or a lack of discipline, and invites a look at the relationship with authority and control."),
  },
  {
    name: both("הכוהן הגדול", "The Hierophant"),
    keywords: both(["מסורת", "הדרכה", "ערכים"], ["Tradition", "Guidance", "Values"]),
    upright: both("מסורת, ערכים משותפים והדרכה. הקלף מצביע על למידה ממורה או ממסגרת מוכרת, ועל כוחם של טקסים ושל קהילה.",
      "Tradition, shared values, and guidance. This card points to learning from a teacher or a familiar framework, and to the power of ritual and community."),
    reversed: both("מצביע על מרד במוסכמות, חיפוש אחר מסלול אישי או כללים שכבר אינם מתאימים.",
      "Points to rebellion against convention, a search for a personal path, or rules that no longer fit."),
  },
  {
    name: both("האוהבים", "The Lovers"),
    keywords: both(["אהבה", "הרמוניה", "בחירה"], ["Love", "Harmony", "Choice"]),
    upright: both("אהבה, חיבור עמוק והרמוניה. הקלף מצביע גם על רגע של בחירה, ומזמין לבחור מתוך הלב ובהתאם לערכים.",
      "Love, deep connection, and harmony. This card also points to a moment of choice, and invites choosing from the heart and from deeply held values."),
    reversed: both("מצביע על חוסר איזון בקשר, ספק או בחירה שאינה תואמת את הערכים, ומזמין לבדוק מה באמת חשוב.",
      "Points to imbalance in a relationship, doubt, or a choice at odds with personal values, and invites checking what truly matters."),
  },
  {
    name: both("המרכבה", "The Chariot"),
    keywords: both(["נחישות", "ניצחון", "מיקוד"], ["Determination", "Victory", "Focus"]),
    upright: both("נחישות, מיקוד ותנועה קדימה. הקלף מצביע על ניצחון שמגיע כשרותמים כוחות מנוגדים ומכוונים אותם אל מטרה אחת.",
      "Determination, focus, and forward motion. This card points to victory that comes from harnessing opposing forces and steering them toward one goal."),
    reversed: both("מצביע על פיזור, חוסר כיוון או ניסיון לשלוט בכל, ומזמין לעצור ולבחור כיוון מחדש.",
      "Points to scattered energy, lack of direction, or trying to control everything, and invites stopping to choose a direction again."),
  },
  {
    name: both("הכוח", "Strength"),
    keywords: both(["אומץ", "חמלה", "כוח פנימי"], ["Courage", "Compassion", "Inner strength"]),
    upright: both("כוח פנימי, אומץ וסבלנות. הקלף מצביע על כוח שמגיע מעדינות ומחמלה ולא מכפייה, ועל אילוף רגשות סוערים באהבה.",
      "Inner strength, courage, and patience. This card points to a strength born of gentleness and compassion, not force, that tames wild emotions with love."),
    reversed: both("מצביע על ספק עצמי, חולשה זמנית או התפרצויות, ומזמין לחזור אל הכוח השקט שבפנים.",
      "Points to self-doubt, a passing weakness, or outbursts, and invites reconnecting with the quiet strength within."),
  },
  {
    name: both("הנזיר", "The Hermit"),
    keywords: both(["התבוננות", "התבודדות", "חוכמה"], ["Introspection", "Solitude", "Wisdom"]),
    upright: both("תקופה של התבוננות פנימית, שקט וחיפוש אחר משמעות. ההתרחקות מהרעש מאפשרת למצוא את האור הפנימי ואת התשובות.",
      "A time of introspection, quiet, and a search for meaning. Stepping away from the noise makes room to find the inner light and the answers."),
    reversed: both("מצביע על בדידות שאינה מיטיבה, הסתגרות או בריחה מקשר, ומזמין לחזור בהדרגה אל אנשים.",
      "Points to loneliness that does not serve, withdrawal, or avoiding connection, and invites a gradual return to people."),
  },
  {
    name: both("גלגל המזל", "Wheel of Fortune"),
    keywords: both(["מחזוריות", "שינוי", "גורל"], ["Cycles", "Change", "Destiny"]),
    upright: both("הגלגל מסתובב: מחזוריות, נקודות מפנה ושינויים שמגיעים בזמנם. תקופה טובה לזרום עם השינוי ולזהות הזדמנויות.",
      "The wheel turns: cycles, turning points, and changes that arrive in their own time. A good time to go with the change and spot opportunities."),
    reversed: both("מצביע על עיכובים, התנגדות לשינוי או תחושה של חוסר שליטה, ומזכיר שגם שלב כזה הוא חלק מהמחזור.",
      "Points to delays, resistance to change, or feeling out of control, with a reminder that this phase is also part of the cycle."),
  },
  {
    name: both("הצדק", "Justice"),
    keywords: both(["הגינות", "אמת", "אחריות"], ["Fairness", "Truth", "Accountability"]),
    upright: both("הגינות, אמת ואחריות. הקלף מצביע על החלטות שנשקלות בבהירות, ועל כך שלכל מעשה יש תוצאה.",
      "Fairness, truth, and accountability. This card points to decisions weighed with clarity, and to the fact that every action has a consequence."),
    reversed: both("מצביע על חוסר הוגנות, הימנעות מאחריות או חוסר כנות, ומזמין לבחון מחדש מה הוגן באמת.",
      "Points to unfairness, avoided responsibility, or dishonesty, and invites a fresh look at what is truly fair."),
  },
  {
    name: both("התלוי", "The Hanged Man"),
    keywords: both(["השהיה", "ויתור", "נקודת מבט"], ["Pause", "Surrender", "Perspective"]),
    upright: both("השהיה מכוונת, ויתור ונקודת מבט חדשה. דווקא כשעוצרים ומשחררים שליטה, מתגלה זווית שלא נראתה קודם.",
      "A deliberate pause, surrender, and a new perspective. Stopping and letting go of control is exactly what reveals an angle not seen before."),
    reversed: both("מצביע על תקיעות, דחיינות או הקרבה שאין בה טעם, ומזמין להחליט ולהתקדם.",
      "Points to feeling stuck, procrastination, or pointless sacrifice, and invites making a decision and moving forward."),
  },
  {
    name: both("המוות", "Death"),
    keywords: both(["סיום", "טרנספורמציה", "מעבר"], ["Endings", "Transformation", "Transition"]),
    upright: both("הקלף אינו מדבר על מוות פיזי: הוא מצביע על סיום של שלב ועל טרנספורמציה עמוקה. משהו ישן נגמר ומפנה מקום לחדש.",
      "This card is not about physical death: it points to the end of a chapter and a deep transformation. Something old ends, making room for the new."),
    reversed: both("מצביע על התנגדות לשינוי ועל היאחזות במה שכבר הסתיים, כשדווקא השחרור הוא מה שיאפשר להתקדם.",
      "Points to resisting change and clinging to what has already ended, when letting go is what allows moving forward."),
  },
  {
    name: both("המתינות", "Temperance"),
    keywords: both(["איזון", "מתינות", "סבלנות"], ["Balance", "Moderation", "Patience"]),
    upright: both("איזון, מתינות ושילוב נכון בין הפכים. תקופה של ריפוי, סבלנות ומציאת דרך האמצע.",
      "Balance, moderation, and a wise blending of opposites. A time of healing, patience, and finding the middle way."),
    reversed: both("מצביע על חוסר איזון, הפרזה או חוסר סבלנות, ומזמין לחזור למינון הנכון.",
      "Points to imbalance, excess, or impatience, and invites a return to the right measure."),
  },
  {
    name: both("השטן", "The Devil"),
    keywords: both(["היקשרות", "הרגלים", "חומריות"], ["Attachment", "Habits", "Materialism"]),
    upright: both("היקשרות, הרגלים ודפוסים שקשה להשתחרר מהם, ומשיכה לחומריות. הקלף מזמין לזהות מה כובל, ולזכור שהשרשראות לרוב רופפות.",
      "Attachment, habits, and hard-to-break patterns, along with a pull toward materialism. This card invites noticing what binds, as the chains are often loose."),
    reversed: both("מצביע על השתחררות מדפוס מגביל, על מודעות חדשה ועל החזרת הכוח לידיים.",
      "Points to breaking free of a limiting pattern, new awareness, and taking back personal power."),
  },
  {
    name: both("המגדל", "The Tower"),
    keywords: both(["טלטלה", "התפכחות", "שינוי פתאומי"], ["Upheaval", "Revelation", "Sudden change"]),
    upright: both("שינוי פתאומי, טלטלה והתפכחות. מבנה שנבנה על יסודות לא יציבים מתפרק, וכך מתפנה מקום לבנות מחדש על בסיס אמיתי.",
      "Sudden change, upheaval, and revelation. A structure built on shaky foundations falls apart, clearing the ground to rebuild on something true."),
    reversed: both("מצביע על שינוי שמתעכב, פחד מהתפרקות או משבר שנמנע ברגע האחרון, כשההתנגדות רק מאריכה את המעבר.",
      "Points to a delayed change, fear of collapse, or a crisis narrowly avoided, while resistance only prolongs the transition."),
  },
  {
    name: both("הכוכב", "The Star"),
    keywords: both(["תקווה", "השראה", "ריפוי"], ["Hope", "Inspiration", "Healing"]),
    upright: both("תקווה, השראה וריפוי אחרי תקופה קשה. הקלף מצביע על אמונה מחודשת בעתיד, על רוגע ועל חיבור למשהו גדול יותר.",
      "Hope, inspiration, and healing after a hard time. This card points to renewed faith in the future, calm, and connection to something greater."),
    reversed: both("מצביע על אובדן אמונה, ייאוש או ניתוק מההשראה, ומזמין לחפש מחדש את מה שמעורר תקווה.",
      "Points to lost faith, discouragement, or disconnection from inspiration, and invites seeking again what sparks hope."),
  },
  {
    name: both("הירח", "The Moon"),
    keywords: both(["אשליה", "פחדים", "תת-מודע"], ["Illusion", "Fear", "Subconscious"]),
    upright: both("אשליה, חלומות ותת-מודע. לא הכול ברור כרגע ופחדים עלולים לעוות את התמונה, ולכן כדאי לסמוך על האינטואיציה ולהתקדם בזהירות.",
      "Illusion, dreams, and the subconscious. Not everything is clear and fears may distort the picture, so it is wise to trust intuition and move carefully."),
    reversed: both("מצביע על התבהרות, שחרור מפחד או אמת שיוצאת לאור, כשהערפל מתחיל להתפזר.",
      "Points to growing clarity, release from fear, or a truth coming to light, as the fog begins to lift."),
  },
  {
    name: both("השמש", "The Sun"),
    keywords: both(["שמחה", "הצלחה", "חיוניות"], ["Joy", "Success", "Vitality"]),
    upright: both("שמחה, הצלחה וחיוניות. תקופה של בהירות, ביטחון וחום, שבה אפשר ליהנות מהאור ולשתף אותו עם אחרים.",
      "Joy, success, and vitality. A time of clarity, confidence, and warmth, when the light can be enjoyed and shared with others."),
    reversed: both("מצביע על שמחה שמתעכבת, אופטימיות מופרזת או קושי לראות את הטוב, שעדיין נמצא שם גם אם הוא מוסתר.",
      "Points to delayed joy, overblown optimism, or difficulty seeing the good, which is still there even if hidden."),
  },
  {
    name: both("הדין", "Judgement"),
    keywords: both(["התעוררות", "התחדשות", "קריאה פנימית"], ["Awakening", "Renewal", "Inner calling"]),
    upright: both("התעוררות, התחדשות וקריאה פנימית. זמן לסכם את מה שהיה, לסלוח ולקום אל שלב חדש מתוך בהירות.",
      "Awakening, renewal, and an inner calling. A time to take stock of the past, to forgive, and to rise into a new chapter with clarity."),
    reversed: both("מצביע על ביקורת עצמית חריפה, ספק או התעלמות מקריאה פנימית, ומזמין חמלה כלפי מה שהיה.",
      "Points to harsh self-judgment, doubt, or ignoring an inner calling, and invites compassion toward the past."),
  },
  {
    name: both("העולם", "The World"),
    keywords: both(["השלמה", "מימוש", "שלמות"], ["Completion", "Fulfillment", "Wholeness"]),
    upright: both("השלמה, מימוש וסגירת מעגל. הקלף מצביע על הצלחה, על תחושת שלמות ועל מוכנות לפתוח פרק חדש.",
      "Completion, fulfillment, and a full circle. This card points to success, a sense of wholeness, and readiness to open a new chapter."),
    reversed: both("מצביע על משהו שעדיין לא הושלם, קיצורי דרך או קושי לסגור פרק, ומזמין להשלים את הצעד האחרון.",
      "Points to something not yet complete, shortcuts, or difficulty closing a chapter, and invites taking the final step."),
  },
];

/** Each suit's cards in order, ace (1) to king (14); their names come from RANKS and SUITS. */
const MINOR = {
  wands: [
    // Ace
    {
      keywords: both(["השראה", "יוזמה חדשה", "תשוקה"], ["Inspiration", "New venture", "Passion"]),
      upright: both("ניצוץ של השראה ויוזמה חדשה. הקלף מצביע על אנרגיה יצירתית, התלהבות והזדמנות להתחיל משהו שמלהיב באמת.",
        "A spark of inspiration and a new venture. This card points to creative energy, enthusiasm, and a chance to start something truly exciting."),
      reversed: both("מצביע על עיכוב בהתחלה, חוסר מוטיבציה או רעיון שעוד לא הבשיל.",
        "Points to a delayed start, low motivation, or an idea that has not yet ripened."),
    },
    // Two
    {
      keywords: both(["תכנון", "החלטות", "אופקים"], ["Planning", "Decisions", "Horizons"]),
      upright: both("תכנון קדימה והתבוננות באופקים חדשים. הקלף מצביע על החלטה לגבי הכיוון הבא ועל ביטחון לצאת מאזור הנוחות.",
        "Planning ahead and looking toward new horizons. This card points to a decision about the next direction and the confidence to leave the comfort zone."),
      reversed: both("מצביע על פחד מהלא נודע, תכנון לקוי או היסוס שמשאיר הכול במקום.",
        "Points to fear of the unknown, poor planning, or hesitation that keeps everything in place."),
    },
    // Three
    {
      keywords: both(["התרחבות", "חזון", "התקדמות"], ["Expansion", "Foresight", "Progress"]),
      upright: both("התרחבות, חזון והתקדמות. המאמצים הראשונים מתחילים לשאת פרי, ויש מקום להסתכל רחוק יותר ולהרחיב את התוכניות.",
        "Expansion, foresight, and progress. Early efforts begin to bear fruit, and there is room to look further ahead and widen the plans."),
      reversed: both("מצביע על עיכובים, מכשולים בלתי צפויים או תוצאות שמגיעות לאט מהמתוכנן.",
        "Points to delays, unexpected obstacles, or results arriving more slowly than planned."),
    },
    // Four
    {
      keywords: both(["חגיגה", "בית", "אבן דרך"], ["Celebration", "Home", "Milestone"]),
      upright: both("חגיגה, שמחה ותחושת בית. הקלף מצביע על אבן דרך שהושגה, על קהילה תומכת ועל הרמוניה במשפחה.",
        "Celebration, joy, and a sense of home. This card points to a milestone reached, a supportive community, and harmony in the family."),
      reversed: both("מצביע על חוסר יציבות בבית, מתח לפני אירוע או חגיגה שנדחית.",
        "Points to instability at home, tension before an event, or a postponed celebration."),
    },
    // Five
    {
      keywords: both(["תחרות", "חיכוכים", "מאבק"], ["Competition", "Friction", "Struggle"]),
      upright: both("תחרות, חיכוכים ודעות מתנגשות. תקופה של מאבק על מקום ועל השפעה, שגם מחדדת רעיונות ויכולות.",
        "Competition, friction, and clashing opinions. A period of struggling for space and influence, which also sharpens ideas and abilities."),
      reversed: both("מצביע על הימנעות מעימות, סיום של מאבק או פשרה שמביאה רגיעה.",
        "Points to avoiding conflict, the end of a struggle, or a compromise that brings calm."),
    },
    // Six
    {
      keywords: both(["הכרה", "הצלחה", "ביטחון עצמי"], ["Recognition", "Success", "Confidence"]),
      upright: both("הצלחה, הכרה ציבורית וביטחון עצמי. הקלף מצביע על הישג שזוכה להערכה ועל רגע לחגוג את הדרך שנעשתה.",
        "Success, public recognition, and self-confidence. This card points to an achievement that earns appreciation and a moment to celebrate the progress made."),
      reversed: both("מצביע על תלות בהכרה של אחרים, ספק עצמי או הצלחה שמתעכבת.",
        "Points to dependence on the approval of others, self-doubt, or success that is slow to arrive."),
    },
    // Seven
    {
      keywords: both(["התגוננות", "עמידה איתנה", "אומץ"], ["Defense", "Standing firm", "Courage"]),
      upright: both("עמידה איתנה על עמדה ועל גבולות. הקלף מצביע על אתגר או ביקורת, ועל אומץ להגן על מה שחשוב בלי לוותר.",
        "Standing firm on a position and on boundaries. This card points to challenge or criticism, and the courage to defend what matters without giving up."),
      reversed: both("מצביע על תשישות מהתגוננות מתמדת, ויתור מוקדם או תחושה של הצפה.",
        "Points to exhaustion from constant defending, giving up too soon, or feeling overwhelmed."),
    },
    // Eight
    {
      keywords: both(["מהירות", "תנועה", "בשורות"], ["Speed", "Momentum", "News"]),
      upright: both("תנועה מהירה, בשורות והתקדמות בלי עיכובים. הדברים זזים, והזמן מתאים לפעולה נמרצת ולנסיעות.",
        "Swift movement, news, and progress without delays. Things are in motion, and the time is right for energetic action and travel."),
      reversed: both("מצביע על עיכובים, חיפזון שגורם לטעויות או תקשורת שמשתבשת.",
        "Points to delays, haste that leads to mistakes, or communication going astray."),
    },
    // Nine
    {
      keywords: both(["חוסן", "התמדה", "ערנות"], ["Resilience", "Persistence", "Vigilance"]),
      upright: both("חוסן והתמדה לקראת הסוף. גם אחרי מאבקים ועייפות, הקלף מצביע על כוח להחזיק מעמד עוד צעד ועל ערנות לגבולות.",
        "Resilience and persistence near the finish line. Despite struggle and fatigue, this card points to the strength to hold on a little longer, staying alert."),
      reversed: both("מצביע על תשישות, חשדנות יתר או תחושה שאין עוד כוח להמשיך.",
        "Points to exhaustion, excessive suspicion, or feeling there is no strength left to go on."),
    },
    // Ten
    {
      keywords: both(["עומס", "אחריות", "מאמץ"], ["Burden", "Responsibility", "Effort"]),
      upright: both("עומס, אחריות כבדה ומאמץ רב. הקלף מצביע על נשיאה של יותר מדי על הכתפיים, ומזמין לבדוק מה אפשר להניח או להאציל.",
        "Overload, heavy responsibility, and great effort. This card points to carrying too much and invites checking what can be put down or delegated."),
      reversed: both("מצביע על הורדת עומס והאצלת סמכויות, או על שחיקה כשממשיכים לשאת הכול לבד.",
        "Points to lightening the load and delegating, or to burnout when everything is still carried alone."),
    },
    // Page
    {
      keywords: both(["סקרנות", "התלהבות", "גילוי"], ["Curiosity", "Enthusiasm", "Discovery"]),
      upright: both("סקרנות, התלהבות ורוח הרפתקנית. הקלף מצביע על רעיון חדש, על חדשות טובות ועל רצון לחקור כיוונים יצירתיים.",
        "Curiosity, enthusiasm, and an adventurous spirit. This card points to a new idea, good news, and a desire to explore creative directions."),
      reversed: both("מצביע על התלהבות שדועכת מהר, חוסר כיוון או רעיונות שלא מתממשים.",
        "Points to enthusiasm that fades quickly, lack of direction, or ideas that go unrealized."),
    },
    // Knight
    {
      keywords: both(["אנרגיה", "הרפתקה", "אימפולסיביות"], ["Energy", "Adventure", "Impulsiveness"]),
      upright: both("אנרגיה, תשוקה ותנועה נועזת קדימה. הקלף מצביע על פעולה נלהבת, הרפתקה ונכונות לקחת סיכונים.",
        "Energy, passion, and bold forward motion. This card points to enthusiastic action, adventure, and a willingness to take risks."),
      reversed: both("מצביע על פזיזות, חוסר סבלנות או התחלות רבות בלי סיום.",
        "Points to recklessness, impatience, or many beginnings without follow-through."),
    },
    // Queen
    {
      keywords: both(["ביטחון", "כריזמה", "חום"], ["Confidence", "Charisma", "Warmth"]),
      upright: both("ביטחון עצמי, כריזמה וחום. הקלף מצביע על נוכחות שמושכת אחרים, על נחישות ועל יכולת להוביל בלב פתוח.",
        "Self-confidence, charisma, and warmth. This card points to a magnetic presence, determination, and the ability to lead with an open heart."),
      reversed: both("מצביע על חוסר ביטחון, קנאה או שתלטנות, ומזמין לחזור אל האור הפנימי.",
        "Points to insecurity, jealousy, or a need to dominate, and invites reconnecting with the inner light."),
    },
    // King
    {
      keywords: both(["מנהיגות", "חזון", "יזמות"], ["Leadership", "Vision", "Entrepreneurship"]),
      upright: both("מנהיגות, חזון ויזמות. הקלף מצביע על הובלה בביטחון, על היכולת להפוך רעיונות גדולים למציאות ועל השראה לאחרים.",
        "Leadership, vision, and entrepreneurship. This card points to leading with confidence, turning big ideas into reality, and inspiring others."),
      reversed: both("מצביע על יהירות, אימפולסיביות או ציפיות לא מציאותיות.",
        "Points to arrogance, impulsiveness, or unrealistic expectations."),
    },
  ],
  cups: [
    // Ace
    {
      keywords: both(["אהבה", "רגש חדש", "חמלה"], ["Love", "New feelings", "Compassion"]),
      upright: both("לב פתוח, אהבה חדשה ושפע רגשי. הקלף מצביע על התחלה של קשר, על חמלה ועל רגשות שמבקשים לזרום.",
        "An open heart, new love, and emotional abundance. This card points to the start of a relationship, compassion, and feelings that want to flow."),
      reversed: both("מצביע על רגשות חסומים, ריקנות או קושי לתת ולקבל אהבה.",
        "Points to blocked emotions, emptiness, or difficulty giving and receiving love."),
    },
    // Two
    {
      keywords: both(["שותפות", "משיכה", "חיבור"], ["Partnership", "Attraction", "Connection"]),
      upright: both("חיבור הדדי, שותפות ומשיכה. הקלף מצביע על קשר שווה ומאוזן שמבוסס על כבוד, באהבה, בחברות או בעבודה.",
        "Mutual connection, partnership, and attraction. This card points to an equal, balanced bond built on respect, in love, friendship, or work."),
      reversed: both("מצביע על קשר לא מאוזן, נתק או חוסר הבנה בין הצדדים.",
        "Points to an unbalanced relationship, disconnection, or misunderstanding between the two sides."),
    },
    // Three
    {
      keywords: both(["חברות", "חגיגה", "קהילה"], ["Friendship", "Celebration", "Community"]),
      upright: both("חברות, חגיגה ושמחה משותפת. הקלף מצביע על מפגשים, על קהילה תומכת ועל רגעים טובים עם אנשים קרובים.",
        "Friendship, celebration, and shared joy. This card points to gatherings, a supportive community, and good moments with close people."),
      reversed: both("מצביע על הפרזה בבילויים, רכילות או תחושה של ריחוק מהחברים.",
        "Points to overindulgence, gossip, or feeling distant from friends."),
    },
    // Four
    {
      keywords: both(["התבוננות", "אדישות", "הזדמנות מוחמצת"], ["Contemplation", "Apathy", "Missed chance"]),
      upright: both("התבוננות פנימית, אדישות או חוסר שביעות רצון. הקלף מזמין לשים לב להזדמנות שמוצעת ממש עכשיו ועלולה להתפספס.",
        "Introspection, apathy, or discontent. This card invites noticing an opportunity being offered right now that could be missed."),
      reversed: both("מצביע על התעוררות מחודשת, נכונות לקבל את מה שמוצע ויציאה מהקיפאון.",
        "Points to a renewed awakening, openness to what is offered, and moving out of stagnation."),
    },
    // Five
    {
      keywords: both(["אובדן", "צער", "אכזבה"], ["Loss", "Grief", "Disappointment"]),
      upright: both("אובדן, צער ואכזבה. הקלף מצביע על התמקדות במה שאבד, ומזכיר שעדיין נשאר משהו טוב להישען עליו.",
        "Loss, grief, and disappointment. This card points to dwelling on what was lost, with a reminder that something good still remains to lean on."),
      reversed: both("מצביע על השלמה, ריפוי והתחלה לראות שוב את מה שנשאר.",
        "Points to acceptance, healing, and beginning to see again what remains."),
    },
    // Six
    {
      keywords: both(["נוסטלגיה", "ילדות", "תמימות"], ["Nostalgia", "Childhood", "Innocence"]),
      upright: both("נוסטלגיה, זיכרונות ילדות ותמימות. הקלף מצביע על חיבור לעבר, על מפגש מחודש ועל נתינה פשוטה מהלב.",
        "Nostalgia, childhood memories, and innocence. This card points to a connection with the past, a reunion, and simple giving from the heart."),
      reversed: both("מצביע על היאחזות בעבר, אידיאליזציה של מה שהיה או קושי להתבגר ולהתקדם.",
        "Points to clinging to the past, idealizing what was, or difficulty growing up and moving on."),
    },
    // Seven
    {
      keywords: both(["אפשרויות", "דמיון", "פנטזיה"], ["Options", "Imagination", "Fantasy"]),
      upright: both("אפשרויות רבות, דמיון ופנטזיה. הקלף מצביע על בחירות מפתות, ומזמין להבחין בין משאלה לבין מה שאפשר באמת להגשים.",
        "Many options, imagination, and fantasy. This card points to tempting choices and invites telling wishful thinking apart from what can truly be achieved."),
      reversed: both("מצביע על התבהרות, מיקוד בבחירה אחת ויציאה מבלבול.",
        "Points to clarity, focusing on one choice, and coming out of confusion."),
    },
    // Eight
    {
      keywords: both(["עזיבה", "חיפוש משמעות", "שחרור"], ["Walking away", "Seeking meaning", "Letting go"]),
      upright: both("עזיבה של משהו שכבר אינו ממלא, גם אם הושקע בו הרבה. הקלף מצביע על חיפוש אחר משמעות עמוקה יותר ועל אומץ להמשיך הלאה.",
        "Walking away from something no longer fulfilling, even after much was invested. This card points to a search for deeper meaning and the courage to move on."),
      reversed: both("מצביע על היסוס לעזוב, פחד מהלא נודע או חזרה למשהו שכבר מוצה.",
        "Points to hesitating to leave, fear of the unknown, or returning to something already exhausted."),
    },
    // Nine
    {
      keywords: both(["סיפוק", "הגשמת משאלה", "הנאה"], ["Contentment", "Wish fulfilled", "Pleasure"]),
      upright: both("סיפוק, הנאה ושביעות רצון. זהו קלף המשאלות, והוא מצביע על משאלה שמתגשמת ועל רגע ליהנות ממה שהושג.",
        "Contentment, pleasure, and satisfaction. Known as the wish card, it points to a wish coming true and a moment to enjoy what has been achieved."),
      reversed: both("מצביע על חוסר סיפוק, הפרזה בהנאות או משאלה שלא מתממשת כפי שקיוו.",
        "Points to dissatisfaction, overindulgence, or a wish that does not come true as hoped."),
    },
    // Ten
    {
      keywords: both(["הרמוניה", "משפחה", "אושר"], ["Harmony", "Family", "Happiness"]),
      upright: both("אושר משפחתי, הרמוניה ותחושת שלמות רגשית. הקלף מצביע על קשרים אוהבים, על בית חם ועל חלומות שמתגשמים יחד.",
        "Family happiness, harmony, and emotional fulfillment. This card points to loving bonds, a warm home, and dreams that come true together."),
      reversed: both("מצביע על מתחים במשפחה, פער בין הציפיות למציאות או ניתוק רגשי.",
        "Points to family tension, a gap between expectations and reality, or emotional disconnection."),
    },
    // Page
    {
      keywords: both(["רגישות", "יצירתיות", "אינטואיציה"], ["Sensitivity", "Creativity", "Intuition"]),
      upright: both("רגישות, יצירתיות ופתיחות רגשית. הקלף מצביע על מסר מהלב, על הפתעה נעימה ועל אינטואיציה שכדאי להקשיב לה.",
        "Sensitivity, creativity, and emotional openness. This card points to a message from the heart, a pleasant surprise, and intuition worth listening to."),
      reversed: both("מצביע על חוסר בגרות רגשית, פגיעות יתר או יצירתיות חסומה.",
        "Points to emotional immaturity, oversensitivity, or blocked creativity."),
    },
    // Knight
    {
      keywords: both(["רומנטיקה", "קסם", "הזמנה"], ["Romance", "Charm", "Invitation"]),
      upright: both("רומנטיקה, קסם והליכה אחרי הלב. הקלף מצביע על הצעה, הזמנה או מחווה רגשית, ועל אידיאליזם יצירתי.",
        "Romance, charm, and following the heart. This card points to an offer, an invitation, or an emotional gesture, along with creative idealism."),
      reversed: both("מצביע על מצבי רוח משתנים, ציפיות לא מציאותיות או הבטחות שלא מקוימות.",
        "Points to changing moods, unrealistic expectations, or promises that are not kept."),
    },
    // Queen
    {
      keywords: both(["חמלה", "אמפתיה", "הכלה"], ["Compassion", "Empathy", "Holding space"]),
      upright: both("חמלה, אמפתיה ואינטואיציה עמוקה. הקלף מצביע על יכולת להכיל רגשות, להעניק תמיכה ולהקשיב מתוך רוגע.",
        "Compassion, empathy, and deep intuition. This card points to the ability to hold emotions, support others, and listen with calm."),
      reversed: both("מצביע על הצפה רגשית, תלות או נתינה לאחרים על חשבון הטיפול העצמי.",
        "Points to emotional overwhelm, dependence, or giving to others at the expense of self-care."),
    },
    // King
    {
      keywords: both(["איזון רגשי", "בגרות", "דיפלומטיה"], ["Emotional balance", "Maturity", "Diplomacy"]),
      upright: both("איזון רגשי, בגרות ודיפלומטיה. הקלף מצביע על יכולת לשמור על שקט גם בסערה ולשלב בין הלב לשכל.",
        "Emotional balance, maturity, and diplomacy. This card points to the ability to stay calm in a storm and to bring heart and mind together."),
      reversed: both("מצביע על הדחקת רגשות, מניפולציה רגשית או מצבי רוח קיצוניים.",
        "Points to suppressed feelings, emotional manipulation, or extreme moods."),
    },
  ],
  swords: [
    // Ace
    {
      keywords: both(["בהירות", "אמת", "פריצת דרך"], ["Clarity", "Truth", "Breakthrough"]),
      upright: both("בהירות, אמת ופריצת דרך מחשבתית. הקלף מצביע על רעיון חדש וחד, על החלטה ברורה ועל כוחה של תקשורת כנה.",
        "Clarity, truth, and a mental breakthrough. This card points to a sharp new idea, a clear decision, and the power of honest communication."),
      reversed: both("מצביע על בלבול, מחשבות מעורפלות או מילים שנאמרות בלי שיקול דעת.",
        "Points to confusion, clouded thinking, or words spoken without care."),
    },
    // Two
    {
      keywords: both(["התלבטות", "קיפאון", "בחירה קשה"], ["Indecision", "Stalemate", "Hard choice"]),
      upright: both("התלבטות, קיפאון והימנעות מהכרעה. הקלף מצביע על בחירה קשה שנדחית, ומזמין להסתכל על המצב בעיניים פקוחות.",
        "Indecision, stalemate, and avoiding a choice. This card points to a difficult decision being postponed, and invites looking at the situation with open eyes."),
      reversed: both("מצביע על עומס מידע, בלבול שמתגבר או החלטה שכבר אי אפשר לדחות.",
        "Points to information overload, growing confusion, or a decision that can no longer be put off."),
    },
    // Three
    {
      keywords: both(["שברון לב", "כאב", "אמת כואבת"], ["Heartbreak", "Sorrow", "Painful truth"]),
      upright: both("שברון לב, כאב ואמת כואבת. הקלף מצביע על פגיעה רגשית או פרידה, ועל הצורך לתת לכאב מקום כדי שיוכל להירפא.",
        "Heartbreak, sorrow, and a painful truth. This card points to emotional hurt or separation, and the need to give the pain room so it can heal."),
      reversed: both("מצביע על החלמה הדרגתית, שחרור מכאב ישן וסליחה.",
        "Points to gradual recovery, release from old pain, and forgiveness."),
    },
    // Four
    {
      keywords: both(["מנוחה", "החלמה", "הפוגה"], ["Rest", "Recovery", "Respite"]),
      upright: both("מנוחה, החלמה והפוגה. הקלף מצביע על צורך לעצור, לאסוף כוחות ולתת לגוף ולנפש להתאושש לפני השלב הבא.",
        "Rest, recovery, and respite. This card points to a need to stop, gather strength, and let body and mind recover before the next stage."),
      reversed: both("מצביע על חוסר מנוחה, שחיקה או חזרה הדרגתית לפעילות אחרי הפסקה.",
        "Points to restlessness, burnout, or a gradual return to activity after a break."),
    },
    // Five
    {
      keywords: both(["עימות", "ניצחון חלול", "אגו"], ["Conflict", "Hollow victory", "Ego"]),
      upright: both("עימות, מתח וניצחון שמחירו גבוה. הקלף מצביע על מאבק שבו גם המנצחים מפסידים משהו, ומזמין לשאול אם זה שווה את המחיר.",
        "Conflict, tension, and a costly victory. This card points to a struggle where even the winners lose something, and asks whether it is worth the price."),
      reversed: both("מצביע על פיוס, רצון לשים סוף למריבה או חרטה על מה שנאמר.",
        "Points to reconciliation, a wish to end a quarrel, or regret over what was said."),
    },
    // Six
    {
      keywords: both(["מעבר", "הקלה", "התקדמות"], ["Transition", "Relief", "Moving on"]),
      upright: both("מעבר ממצב קשה אל מקום שקט יותר. הקלף מצביע על הקלה הדרגתית, על התרחקות ממה שהכביד ועל התקדמות אל שלב רגוע.",
        "A passage from hardship toward calmer waters. This card points to gradual relief, leaving behind what weighed heavily, and moving into a quieter phase."),
      reversed: both("מצביע על קושי לעזוב, מטען שנגרר הלאה או מעבר שמתעכב.",
        "Points to difficulty leaving, baggage carried along, or a delayed transition."),
    },
    // Seven
    {
      keywords: both(["הסתרה", "אסטרטגיה", "ערמומיות"], ["Concealment", "Strategy", "Cunning"]),
      upright: both("אסטרטגיה, הסתרה ופעולה מאחורי הקלעים. הקלף מצביע על ניסיון להתחמק, על חוסר כנות או על צורך לפעול בתבונה ובשקט.",
        "Strategy, concealment, and acting behind the scenes. This card points to evasion, dishonesty, or a need to act wisely and quietly."),
      reversed: both("מצביע על אמת שיוצאת לאור, הודאה או החלטה לפעול ביושר.",
        "Points to a truth coming out, a confession, or a decision to act with integrity."),
    },
    // Eight
    {
      keywords: both(["הגבלה", "תחושת לכידות", "מחשבות כובלות"], ["Restriction", "Feeling trapped", "Limiting beliefs"]),
      upright: both("תחושת לכידות, חוסר אונים ומחשבות מגבילות. הקלף מצביע על כך שהכלא הוא לרוב בראש, ושהיציאה ממנו קרובה מהנראה.",
        "Feeling trapped, helpless, and bound by limiting thoughts. This card points out that the prison is often in the mind, and the way out is closer than it seems."),
      reversed: both("מצביע על שחרור ממחשבות מגבילות, נקודת מבט חדשה וחזרה לתחושת שליטה.",
        "Points to freedom from limiting thoughts, a new perspective, and regaining a sense of control."),
    },
    // Nine
    {
      keywords: both(["חרדה", "דאגה", "לילות לבנים"], ["Anxiety", "Worry", "Sleepless nights"]),
      upright: both("חרדה, דאגות ולילות ללא שינה. הקלף מצביע על מחשבות שמגדילות את הפחד מעבר לגודלו האמיתי, ועל הצורך לשתף ולבקש תמיכה.",
        "Anxiety, worry, and sleepless nights. This card points to thoughts that magnify fear beyond its real size, and to the need to share and ask for support."),
      reversed: both("מצביע על הקלה בחרדה, תקווה חדשה או התמודדות עם פחד שהודחק.",
        "Points to easing anxiety, new hope, or facing a fear that was pushed aside."),
    },
    // Ten
    {
      keywords: both(["סיום כואב", "נקודת שפל", "שחר חדש"], ["Painful ending", "Rock bottom", "New dawn"]),
      upright: both("סיום כואב ונקודת שפל. הקלף מצביע על משהו שהגיע לסופו המוחלט, אבל מעבר לאופק כבר מפציע שחר חדש.",
        "A painful ending and rock bottom. This card points to something reaching its final end, yet beyond the horizon a new dawn is already breaking."),
      reversed: both("מצביע על התאוששות איטית, קושי להרפות או סיום שנגרר בלי צורך.",
        "Points to slow recovery, difficulty letting go, or an ending dragged out needlessly."),
    },
    // Page
    {
      keywords: both(["ערנות", "חשיבה חדה", "שאלות"], ["Alertness", "Sharp mind", "Questions"]),
      upright: both("סקרנות אינטלקטואלית, ערנות ורעב לידע. הקלף מצביע על רעיונות חדשים, על שאלות נוקבות ועל רצון להבין לעומק.",
        "Intellectual curiosity, alertness, and a hunger for knowledge. This card points to new ideas, probing questions, and a wish to understand deeply."),
      reversed: both("מצביע על רכילות, מילים פוגעות או פיזור מחשבתי.",
        "Points to gossip, hurtful words, or scattered thinking."),
    },
    // Knight
    {
      keywords: both(["ישירות", "שאפתנות", "פעולה נחרצת"], ["Directness", "Ambition", "Decisive action"]),
      upright: both("פעולה מהירה ונחרצת, שאפתנות וישירות. הקלף מצביע על דהירה אל המטרה במלוא הכוח, עם מחשבה חדה ובלי היסוס.",
        "Fast, decisive action, ambition, and directness. This card points to charging toward a goal at full force, with a sharp mind and no hesitation."),
      reversed: both("מצביע על פזיזות, חוסר סבלנות או מילים חדות מדי שנאמרות בלי לחשוב.",
        "Points to rashness, impatience, or overly sharp words spoken without thinking."),
    },
    // Queen
    {
      keywords: both(["עצמאות", "כנות", "שיקול דעת"], ["Independence", "Honesty", "Clear judgment"]),
      upright: both("בהירות מחשבתית, עצמאות וכנות. הקלף מצביע על שיקול דעת חד, על גבולות ברורים ועל תקשורת ישירה שמבוססת על ניסיון.",
        "Mental clarity, independence, and honesty. This card points to sharp judgment, clear boundaries, and direct communication grounded in experience."),
      reversed: both("מצביע על קרירות, ביקורתיות יתר או מרירות מפגיעות ישנות.",
        "Points to coldness, excessive criticism, or bitterness from old wounds."),
    },
    // King
    {
      keywords: both(["סמכות", "היגיון", "אמת"], ["Authority", "Logic", "Truth"]),
      upright: both("סמכות אינטלקטואלית, היגיון ואמת. הקלף מצביע על החלטות שמתקבלות בצורה הוגנת ומקצועית, מתוך חשיבה צלולה.",
        "Intellectual authority, logic, and truth. This card points to decisions made fairly and professionally, from clear thinking."),
      reversed: both("מצביע על שימוש לרעה בכוח, נוקשות או קרירות שמנותקת מהרגש.",
        "Points to misuse of power, rigidity, or coldness cut off from feeling."),
    },
  ],
  pentacles: [
    // Ace
    {
      keywords: both(["הזדמנות חדשה", "שגשוג", "ביסוס"], ["New opportunity", "Prosperity", "Grounding"]),
      upright: both("הזדמנות חדשה בעולם החומר: עבודה, כסף או בריאות. הקלף מצביע על התחלה מבוססת, על שגשוג ועל פוטנציאל לצמיחה יציבה.",
        "A new opportunity in the material world: work, money, or health. This card points to a grounded start, prosperity, and potential for steady growth."),
      reversed: both("מצביע על הזדמנות שהוחמצה, תכנון כלכלי לקוי או חוסר יציבות.",
        "Points to a missed opportunity, poor financial planning, or instability."),
    },
    // Two
    {
      keywords: both(["איזון", "גמישות", "ריבוי משימות"], ["Balance", "Flexibility", "Multitasking"]),
      upright: both("איזון בין כמה משימות ומחויבויות. הקלף מצביע על גמישות, על הסתגלות לשינויים ועל יכולת לנהל כמה דברים במקביל.",
        "Balancing several tasks and commitments. This card points to flexibility, adapting to change, and the ability to manage several things at once."),
      reversed: both("מצביע על עומס, חוסר סדר או קושי לשמור על איזון בין העבודה לחיים.",
        "Points to overload, disorganization, or difficulty keeping a balance between work and life."),
    },
    // Three
    {
      keywords: both(["שיתוף פעולה", "מקצועיות", "למידה"], ["Teamwork", "Craftsmanship", "Learning"]),
      upright: both("שיתוף פעולה, מקצועיות ועבודה איכותית. הקלף מצביע על הכרה במיומנות, על למידה מאחרים ועל תוצאה שנבנית יחד.",
        "Teamwork, craftsmanship, and quality work. This card points to recognized skill, learning from others, and results built together."),
      reversed: both("מצביע על חוסר תיאום בצוות, עבודה חפוזה או חוסר הערכה למאמץ.",
        "Points to poor teamwork, rushed work, or a lack of appreciation for effort."),
    },
    // Four
    {
      keywords: both(["ביטחון חומרי", "חסכנות", "היאחזות"], ["Security", "Saving", "Holding on"]),
      upright: both("ביטחון חומרי, חסכנות ורצון לשמור על מה שיש. הקלף מצביע על יציבות, ומזמין לבדוק אם הזהירות לא הפכה להיאחזות.",
        "Material security, saving, and a wish to protect what is already there. This card points to stability and invites checking that caution has not become clinging."),
      reversed: both("מצביע על קמצנות, פחד מאובדן או לחלופין על הוצאות לא מבוקרות.",
        "Points to stinginess, fear of loss, or, at the other extreme, uncontrolled spending."),
    },
    // Five
    {
      keywords: both(["מחסור", "קושי כלכלי", "בדידות"], ["Scarcity", "Financial strain", "Isolation"]),
      upright: both("מחסור, קושי כלכלי ותחושת בדידות. הקלף מצביע על תקופה מאתגרת, ומזכיר שעזרה עשויה להיות קרובה מהנראה, אם מבקשים אותה.",
        "Scarcity, financial strain, and isolation. This card points to a challenging time, and help may be closer than it seems, once it is asked for."),
      reversed: both("מצביע על התאוששות כלכלית, יציאה ממשבר או קבלת עזרה.",
        "Points to financial recovery, coming out of a crisis, or accepting help."),
    },
    // Six
    {
      keywords: both(["נדיבות", "נתינה", "צדקה"], ["Generosity", "Giving", "Charity"]),
      upright: both("נדיבות, נתינה וקבלה. הקלף מצביע על זרימה הוגנת של משאבים, על עזרה הדדית ועל איזון בין מי שנותנים למי שמקבלים.",
        "Generosity, giving, and receiving. This card points to a fair flow of resources, mutual help, and balance between those who give and those who receive."),
      reversed: both("מצביע על נתינה עם תנאים, חובות או יחסי כוח לא מאוזנים.",
        "Points to giving with strings attached, debt, or unequal power dynamics."),
    },
    // Seven
    {
      keywords: both(["השקעה", "סבלנות", "הערכת מצב"], ["Investment", "Patience", "Assessment"]),
      upright: both("השקעה לטווח ארוך, סבלנות והערכת מצב. הקלף מצביע על עצירה כדי לבחון את מה שנזרע ולהחליט איך ממשיכים.",
        "Long-term investment, patience, and assessment. This card points to pausing to review what has been sown and to decide how to continue."),
      reversed: both("מצביע על חוסר סבלנות, השקעה שלא מניבה או מאמץ בכיוון הלא נכון.",
        "Points to impatience, an investment that does not pay off, or effort in the wrong direction."),
    },
    // Eight
    {
      keywords: both(["התמקצעות", "חריצות", "מיומנות"], ["Mastery", "Diligence", "Skill"]),
      upright: both("חריצות, התמקצעות ועבודה מדויקת. הקלף מצביע על השקעה בפיתוח מיומנות, על התמדה ועל גאווה במלאכה.",
        "Diligence, mastery, and careful work. This card points to investing in developing a skill, persistence, and pride in the craft."),
      reversed: both("מצביע על שחיקה, פרפקציוניזם או עבודה שחוזרת על עצמה בלי התפתחות.",
        "Points to burnout, perfectionism, or repetitive work without growth."),
    },
    // Nine
    {
      keywords: both(["עצמאות", "שפע", "רווחה"], ["Self-sufficiency", "Abundance", "Comfort"]),
      upright: both("עצמאות כלכלית, שפע ורווחה שהושגו בעבודה קשה. זמן ליהנות מהפירות ולהוקיר את מה שנבנה.",
        "Financial independence, abundance, and comfort earned through hard work. A time to enjoy the fruits and appreciate what has been built."),
      reversed: both("מצביע על תלות כלכלית, בזבזנות או הצלחה שבאה על חשבון החיים האישיים.",
        "Points to financial dependence, overspending, or success at the expense of personal life."),
    },
    // Ten
    {
      keywords: both(["מורשת", "משפחה", "עושר"], ["Legacy", "Family", "Wealth"]),
      upright: both("עושר, מורשת וביטחון שעוברים מדור לדור. הקלף מצביע על יציבות משפחתית, על שורשים ועל הצלחה שנבנתה לטווח ארוך.",
        "Wealth, legacy, and security passed from generation to generation. This card points to family stability, roots, and success built for the long term."),
      reversed: both("מצביע על מחלוקות משפחתיות סביב כסף, ירושה או ערכים, או על חוסר יציבות כלכלית.",
        "Points to family disputes over money, inheritance, or values, or to financial instability."),
    },
    // Page
    {
      keywords: both(["לימודים", "תכנון", "צעד ראשון"], ["Study", "Planning", "First step"]),
      upright: both("למידה, שקידה וצעד ראשון לקראת מטרה מעשית. הקלף מצביע על הזדמנות חדשה בלימודים, בעבודה או בכסף, ועל רצינות ומחויבות.",
        "Learning, diligence, and a first step toward a practical goal. This card points to a new opportunity in study, work, or money, approached with commitment."),
      reversed: both("מצביע על דחיינות, חוסר מיקוד או תוכניות שלא יוצאות לפועל.",
        "Points to procrastination, lack of focus, or plans that never get off the ground."),
    },
    // Knight
    {
      keywords: both(["אמינות", "עבודה יסודית", "שגרה"], ["Reliability", "Thoroughness", "Routine"]),
      upright: both("אמינות, עבודה יסודית והתקדמות איטית ובטוחה. הקלף מצביע על מחויבות, על סבלנות ועל הקפדה על הפרטים עד להשלמת המשימה.",
        "Reliability, thoroughness, and slow but steady progress. This card points to commitment, patience, and attention to detail until the task is done."),
      reversed: both("מצביע על תקיעות בשגרה, שעמום או עקשנות שמעכבת התקדמות.",
        "Points to being stuck in routine, boredom, or stubbornness that slows progress."),
    },
    // Queen
    {
      keywords: both(["טיפוח", "מעשיות", "יציבות"], ["Nurturing", "Practicality", "Stability"]),
      upright: both("טיפוח, מעשיות ושפע ביתי. הקלף מצביע על דאגה חמה ומעשית לאחרים, על יציבות ועל איזון בין עבודה לבית.",
        "Nurturing, practicality, and abundance at home. This card points to warm, practical care for others, stability, and balance between work and home."),
      reversed: both("מצביע על הזנחה עצמית, דאגה מופרזת לאחרים או חוסר איזון בין הבית לעבודה.",
        "Points to self-neglect, excessive worry for others, or imbalance between home and work."),
    },
    // King
    {
      keywords: both(["שגשוג", "הצלחה עסקית", "ביטחון"], ["Prosperity", "Business success", "Security"]),
      upright: both("שגשוג, הצלחה עסקית וביטחון. הקלף מצביע על ניהול נבון של משאבים, על אחריות ועל יציבות שמיטיבה גם עם אחרים.",
        "Prosperity, business success, and security. This card points to wise use of resources, responsibility, and stability that benefits others too."),
      reversed: both("מצביע על חומרנות, עקשנות או שימוש בכסף ככלי לשליטה.",
        "Points to materialism, stubbornness, or using money as a means of control."),
    },
  ],
};

/**
 * The 78 cards: the major arcana 0..21, then wands, cups, swords and pentacles, each from ace (1) to king (14).
 * @type {ReadonlyArray<TarotCard>}
 */
export const TAROT = frozen([
  ...MAJOR.map((card, number) => ({ id: `major-${number}`, arcana: "major", number, suit: null, ...card })),
  ...Object.keys(SUITS).flatMap((suit) =>
    MINOR[suit].map((card, i) => ({
      id: `${suit}-${i + 1}`,
      arcana: "minor",
      number: i + 1,
      suit,
      name: both(`${RANKS[i].he} ${SUITS[suit].name.he}`, `${RANKS[i].en} of ${SUITS[suit].name.en}`),
      ...card,
    })),
  ),
]);

const BY_ID = new Map(TAROT.map((card) => [card.id, card]));

/**
 * The card with this id ("major-13", "cups-12"), or undefined when the deck has none.
 * @param {string} id
 * @returns {TarotCard|undefined}
 */
export const cardById = (id) => BY_ID.get(id);
