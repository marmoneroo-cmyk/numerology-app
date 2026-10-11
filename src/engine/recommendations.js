import { R } from "./core.js";

/**
 * The Hebrew recommendations as they read until 2026-10-12, speaking to the reader in the singular, and as
 * they read since (the owner's rule for Hebrew). A reading saved before keeps its own recommendations; the
 * screens show them in today's wording. The rules that choose them never changed.
 */
export const HEBREW_REWORDING = Object.freeze({
  "השנה הנוכחית מזמינה אותך להתמודד עם חובות קארמיים.": "השנה הנוכחית מזמינה התמודדות עם החובות הקארמיים.",
  "השילוב שלך מצביע על פוטנציאל מנהיגות יוצא דופן.": "השילוב הזה מצביע על פוטנציאל מנהיגות יוצא דופן.",
  "האנרגיה היצירתית שלך בשיא.": "האנרגיה היצירתית בשיאה.",
  "מחזור מסתיים. שחרר מה שכבר לא משרת אותך.": "מחזור מסתיים. זה הזמן לשחרר את מה שכבר לא מועיל.",
  "אתה בנקודת שיא רוחנית.": "זו נקודת שיא רוחנית.",
  "חסרות לך אנרגיות של יציבות וכוח.": "חסרות אנרגיות של יציבות וכוח.",
  "האנרגיה שלך מאוזנת": "האנרגיה מאוזנת",
  "המספרים שלך מצביעים על תקופה של הרמוניה.": "המספרים מצביעים על תקופה של הרמוניה.",
});

/** Saved recommendations in today's wording: the same ones, any old Hebrew text reworded. */
export const inTodaysWording = (recs) => recs.map((r) => ({ ...r, t: HEBREW_REWORDING[r.t] ?? r.t, d: HEBREW_REWORDING[r.d] ?? r.d }));

/**
 * Smart recommendations: rules over a full map (from fullCalc) that pick the
 * insights worth showing first. Each item names an icon (a key of the app's
 * icon set) and a title/description in the requested language: "he" for
 * Hebrew, anything else for English. The map is not modified.
 */
export function getRecommendations(map, lang) {
  const he = lang === "he";
  const r = { ...map, lp: R(map.lp), nv: R(map.nv), su: R(map.su), ex: R(map.ex) };
  const recs = [];
  const recommend = (icon, titleHe, titleEn, textHe, textEn) =>
    recs.push({ icon, t: he ? titleHe : titleEn, d: he ? textHe : textEn });

  // the Hebrew speaks of the numbers, not to the reader in the singular (the owner's rule for every Hebrew text)
  if (r.kd.length > 0 && r.py === 7)
    recommend("orb", "שנת תיקון עמוק", "Deep repair year", "השנה הנוכחית מזמינה התמודדות עם החובות הקארמיים.", "This year invites you to face karmic debts.");
  if ((r.nv === 1 || r.nv === 8) && (r.lp === 1 || r.lp === 8))
    recommend("crown", "מסלול מנהיגות חזק", "Strong leadership track", "השילוב הזה מצביע על פוטנציאל מנהיגות יוצא דופן.", "Your combination indicates exceptional leadership potential.");
  if ([3, 5].includes(r.py) && [3, 5].includes(r.lp))
    recommend("palette", "גל יצירתי", "Creative surge", "האנרגיה היצירתית בשיאה.", "Your creative energy peaks.");
  if (r.py === 9)
    recommend("wave", "שנת מעבר", "Transition year", "מחזור מסתיים. זה הזמן לשחרר את מה שכבר לא מועיל.", "A cycle ends. Release what no longer serves you.");
  if (r.py === 8)
    recommend("coin", "חלון שפע", "Abundance window", "האנרגיה של 8 תומכת בהגשמה חומרית.", "The energy of 8 supports material manifestation.");
  if (r.su === 2 && r.py === 6)
    recommend("heart", "ריפוי רגשי", "Emotional healing", "השנה מזמינה ריפוי של מערכות יחסים.", "This year invites healing of relationships.");
  if ([7, 9].includes(r.lp) && [7, 9].includes(r.py))
    recommend("sparkle", "יקיצה רוחנית", "Spiritual awakening", "זו נקודת שיא רוחנית.", "You are at a spiritual peak.");
  if (r.ls.miss.includes(4) && r.ls.miss.includes(8))
    recommend("globe", "צורך בהארקה", "Grounding needed", "חסרות אנרגיות של יציבות וכוח.", "You lack stability and power energies.");
  if (recs.length === 0)
    recommend("star", "האנרגיה מאוזנת", "Your energy is balanced", "המספרים מצביעים על תקופה של הרמוניה.", "Your numbers indicate a period of harmony.");
  return recs;
}
