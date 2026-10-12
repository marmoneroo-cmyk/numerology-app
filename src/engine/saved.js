/**
 * Saved readings under today's rules. A map or years table saved with the +1 (July - December from 2026-10-10, or
 * the checkbox before) is shown without it (the owner, 2026-10-12): the numbers that rest on the personal year are
 * worked out again for the date the reading was made for, and everything else stays as saved. The saved row itself
 * is never changed: the workspace calls this as it loads a reading.
 */
import { R, PM, PD, personalYearOn, yearCycle, psychMap } from "./core.js";
import { getRecommendations } from "./recommendations.js";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** The day and month of a saved ISO birth date ("1990-09-15"), or null. */
function birthOf(input) {
  const match = ISO_DATE.exec(typeof input?.birthDate === "string" ? input.birthDate : "");
  return match ? { d: Number(match[3]), m: Number(match[2]) } : null;
}

/**
 * The reading as today's rules show it. A map gets its personal year, month and day, years table, psychological map
 * (its ambition reads the year) and saved insights (some read the year) without the +1; a years table gets its
 * table. Any other reading, one saved without the +1, or one that can't be read comes back as it is.
 */
export function withoutPlusOne(reading) {
  if (reading?.input?.add !== true || !reading.result || !["map", "yearCycle"].includes(reading.type)) return reading;
  const birth = birthOf(reading.input);
  const at = new Date(reading.computedFor);
  if (!birth || Number.isNaN(at.getTime())) return reading;
  const { d, m } = birth;
  const input = { ...reading.input, add: false };
  if (reading.type === "yearCycle") return { ...reading, input, result: { ...reading.result, proj: yearCycle(d, m, at) } };

  const saved = reading.result;
  const py = personalYearOn(d, m, at);
  const result = {
    ...saved,
    py,
    pm: PM(d, m, at),
    pd: PD(d, m, at),
    proj: yearCycle(d, m, at),
    psych: psychMap({ nv: R(saved.nv), lp: R(saved.lp), su: R(saved.su), ex: R(saved.ex), py }),
  };
  if (saved.insights) result.insights = { he: getRecommendations(result, "he"), en: getRecommendations(result, "en") };
  return { ...reading, input, result };
}
