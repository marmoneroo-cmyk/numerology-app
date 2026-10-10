/**
 * The name generator's ideas: common first names whose number reduces to the one asked for.
 * The shipped list was typed by hand, and most of its names did not add up to their number
 * (the audit of 2026-10-11), so the names are now filtered by their actual value.
 */
import { NV, R, liveNum } from "../engine/index.js";

const HEBREW_NAMES = [
  "אורי", "אילן", "אדם", "עדי", "נועה", "מיכל", "דניאל", "רוני", "יובל", "שיר", "אלה", "ליאור",
  "עומר", "תמר", "דוד", "רות", "גיל", "ניר", "הדר", "רון", "שלום", "נעמי", "חנה", "אור",
  "עדן", "יונתן", "מורן", "שגב", "עוז", "אמיר", "גבריאל", "נתן", "חיים", "רחל", "שרה", "יעל",
  "מאיה", "אביגיל", "שירה", "טל", "איתי", "אריאל", "משה", "אברהם", "יצחק", "יעקב", "יוסף", "בנימין",
  "אליה", "אלון", "עידו", "נדב", "רועי", "עמית", "אסף", "ערן", "גלעד", "שחר", "ליה", "נוי",
  "הילה", "ענבל", "קרן", "דנה", "מור", "אופיר", "אביב", "ליאם", "נגה", "אלמה", "רומי", "איילת",
  "שני", "ורד", "מירב", "אסתר", "דבורה", "לאה", "מרים", "צביה", "אהרון", "שמואל", "גדעון", "יואב",
  "אלעד", "ירדן", "שקד", "טליה", "אגם", "הלל", "ברק", "תומר", "רז", "זיו", "אייל", "עופר",
  "אפרת", "סיון", "אורית", "יהודית", "אביטל", "הודיה", "חן", "ליאת", "ענת", "נטע", "גאיה", "יערה",
  "אלי", "מתן", "נועם", "אוהד", "נריה", "אליאור", "אוריה", "בן", "גל", "דור", "יהלי", "לביא",
  "מעיין", "סהר", "עמרי", "פלג", "צליל", "קשת", "רעות", "שילת", "תהל", "אלמוג", "הראל", "ישי",
];

const LATIN_NAMES = [
  "Adam", "Ava", "Ian", "Una", "Beth", "Dana", "Noah", "Ruth", "Joy", "Leo", "Maya", "Sky",
  "Dean", "Kate", "Mark", "Sara", "Alex", "Iris", "Noel", "Vera", "Anna", "Emma", "Luke", "Rosa",
  "Alan", "Gaia", "Seth", "Zara", "Brock", "Diana", "Hugo", "Stella", "Grace", "Ira", "Luna", "Sage",
  "Olivia", "Liam", "Ethan", "Mia", "Lily", "Chloe", "Ella", "Zoe", "Jack", "Owen", "Ryan", "Amy",
  "Eve", "Nora", "Oscar", "Paul", "Rachel", "Sam", "Tom", "Victor", "Wendy", "Yael", "Ben", "Clara",
  "David", "Ezra", "Felix", "Hannah", "Isaac", "Julia", "Kevin", "Laura", "Max", "Naomi", "Peter", "Rose",
  "Adele", "Aubrey", "Carmen", "Daniel", "Fiona", "Gideon", "Holly", "Olive", "Sophie", "Tess", "Yara",
  "Asher", "Jasper", "Mabel", "Riley", "Aidan", "Nadia", "Nina", "Violet",
];

/**
 * Up to `count` first names whose number reduces to `target` (1-9): Hebrew names by letter value
 * (masters kept, so an 11 serves a 2), Latin ones by letter position.
 * @returns {{ name: string, value: number }[]}
 */
export function nameIdeas(target, he, count = 8) {
  const pool = he ? HEBREW_NAMES : LATIN_NAMES;
  const valueOf = he ? NV : liveNum;
  return pool
    .map((name) => ({ name, value: valueOf(name) }))
    .filter(({ value }) => R(value) === target)
    .slice(0, count);
}
