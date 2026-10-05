import { R } from "./core.js";

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

  if (r.kd.length > 0 && r.py === 7)
    recommend("orb", "שנת תיקון עמוק", "Deep repair year", "השנה הנוכחית מזמינה אותך להתמודד עם חובות קארמיים.", "This year invites you to face karmic debts.");
  if ((r.nv === 1 || r.nv === 8) && (r.lp === 1 || r.lp === 8))
    recommend("crown", "מסלול מנהיגות חזק", "Strong leadership track", "השילוב שלך מצביע על פוטנציאל מנהיגות יוצא דופן.", "Your combination indicates exceptional leadership potential.");
  if ([3, 5].includes(r.py) && [3, 5].includes(r.lp))
    recommend("palette", "גל יצירתי", "Creative surge", "האנרגיה היצירתית שלך בשיא.", "Your creative energy peaks.");
  if (r.py === 9)
    recommend("wave", "שנת מעבר", "Transition year", "מחזור מסתיים. שחרר מה שכבר לא משרת אותך.", "A cycle ends. Release what no longer serves you.");
  if (r.py === 8)
    recommend("coin", "חלון שפע", "Abundance window", "האנרגיה של 8 תומכת בהגשמה חומרית.", "The energy of 8 supports material manifestation.");
  if (r.su === 2 && r.py === 6)
    recommend("heart", "ריפוי רגשי", "Emotional healing", "השנה מזמינה ריפוי של מערכות יחסים.", "This year invites healing of relationships.");
  if ([7, 9].includes(r.lp) && [7, 9].includes(r.py))
    recommend("sparkle", "יקיצה רוחנית", "Spiritual awakening", "אתה בנקודת שיא רוחנית.", "You are at a spiritual peak.");
  if (r.ls.miss.includes(4) && r.ls.miss.includes(8))
    recommend("globe", "צורך בהארקה", "Grounding needed", "חסרות לך אנרגיות של יציבות וכוח.", "You lack stability and power energies.");
  if (recs.length === 0)
    recommend("star", "האנרגיה שלך מאוזנת", "Your energy is balanced", "המספרים שלך מצביעים על תקופה של הרמוניה.", "Your numbers indicate a period of harmony.");
  return recs;
}
