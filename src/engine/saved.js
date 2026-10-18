/**
 * Saved readings under today's rules. A map or years table saved with the +1 (July - December from 2026-10-10, or
 * the checkbox before) is shown without it (the owner, 2026-10-12), and one made before engine 4 by the year of the
 * last birthday (the owner, 2026-10-18): the numbers that rest on the personal year are worked out again for the
 * date the reading was made for, and everything else stays as saved. The saved row itself is never changed: the
 * workspace calls this as it loads a reading.
 */
import { R, PM, PD, personalYearOn, yearCycle, psychMap } from "./core.js";
import { getRecommendations } from "./recommendations.js";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** The day and month of a saved ISO birth date ("1990-09-15"), or null. */
function birthOf(input) {
  const match = ISO_DATE.exec(typeof input?.birthDate === "string" ? input.birthDate : "");
  return match ? { d: Number(match[3]), m: Number(match[2]) } : null;
}

/** A saved map's numbers that rest on the personal year, worked out again for `at` without the +1. */
function mapWithoutPlusOne(saved, d, m, at) {
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
  return result;
}

/** Made before engine 4, by the calendar year: "3.0.0", "2.2.0" and so on, or no version at all. */
const beforeLastBirthday = (version) => !(Number.parseInt(String(version ?? ""), 10) >= 4);

/** Whether the personal year, or the years table, came out differently. */
const yearChanged = (saved, now) =>
  saved.py !== now.py || JSON.stringify(saved.proj ?? null) !== JSON.stringify(now.proj ?? null);

/**
 * The reading as today's rules show it. A map gets its personal year, month and day, years table, psychological map
 * (its ambition reads the year) and saved insights (some read the year) without the +1 and by the last birthday; a
 * years table gets its table. Either comes back marked `recalculated`, for the screen to say so. Any other reading,
 * one that today's rules give the same year and table, or one that can't be read or worked out again comes back as
 * it is (the screen then shows it, or says it is damaged, instead of failing the client's whole file).
 */
export function withoutPlusOne(reading) {
  if (!reading?.result || !["map", "yearCycle"].includes(reading.type)) return reading;
  // a damaged table stays damaged, for the screen to say so, rather than be quietly made whole
  const { proj } = reading.result;
  if (reading.type === "yearCycle" ? !Array.isArray(proj) : proj != null && !Array.isArray(proj)) return reading;
  const added = reading.input?.add === true;
  if (!added && !beforeLastBirthday(reading.engineVersion)) return reading;
  const birth = birthOf(reading.input);
  const at = new Date(reading.computedFor);
  if (!birth || Number.isNaN(at.getTime())) return reading;
  const { d, m } = birth;
  try {
    const result = reading.type === "yearCycle" ? { ...reading.result, proj: yearCycle(d, m, at) } : mapWithoutPlusOne(reading.result, d, m, at);
    if (!added && !yearChanged(reading.result, result)) return reading;
    return { ...reading, input: { ...reading.input, add: false }, result, recalculated: true };
  } catch {
    return reading;
  }
}
