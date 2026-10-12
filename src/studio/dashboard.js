/**
 * The home dashboard's figures (Today.jsx): the life paths on the wheel, the week ahead and the follow-ups due.
 * Everything is counted from the client list and the store's summary; nothing is estimated or made up (the
 * owner, 2026-10-12).
 */
import { masterBase } from "../engine/index.js";
import { toYmd } from "../data/store.js";
import { upcomingBirthdays } from "./today.js";

/** The days the week strip shows: today and the six after it. */
export const WEEK_DAYS = 7;

/** The wheel's numbers. */
export const WHEEL_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/** The engine's path for a birth date, or NaN when it has none (or cannot read the date). */
function pathOf(birthDate, lifePath) {
  if (!birthDate) return NaN;
  try {
    return lifePath(birthDate);
  } catch {
    return NaN;
  }
}

/**
 * How many active clients walk each life path. A master path (11, 22, 33) counts with the number it reduces
 * to (2, 4, 6), and `masters` says how many of the counted are masters. A client with no birth date, or one
 * the engine gives no path from 1 to 9 for, is left out and counted in `noDate`.
 * @param {object[]} clients
 * @param {(isoDate: string) => number} lifePath the engine's life path, masters kept
 * @returns {{counts: number[], masters: number, counted: number, noDate: number}} counts[n] for n = 1 to 9
 */
export function lifePathCounts(clients, lifePath) {
  const paths = clients.filter((c) => !c.archived).map((c) => pathOf(c.birthDate, lifePath));
  const bases = paths.map((p) => (Number.isInteger(p) ? masterBase(p) : NaN));
  const onWheel = (n) => Number.isInteger(n) && n >= 1 && n <= 9;
  const counts = Array.from({ length: 10 }, (_, n) => (n === 0 ? 0 : bases.filter((b) => b === n).length));
  const counted = bases.filter(onWheel).length;
  return {
    counts,
    masters: paths.filter((p, i) => p > 9 && onWheel(bases[i])).length,
    counted,
    noDate: paths.length - counted,
  };
}

/** The last day the week strip shows, for the store's summary: its follow-ups come up to that day. */
export const weekEnd = (now, days = WEEK_DAYS) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + days - 1);

/** The follow-ups due by `now`'s date: the day's own and the overdue ones. */
export const dueBy = (followUps, now) => followUps.filter((f) => f.followUp <= toYmd(now));

/**
 * The next `days` days, today first, each with its birthdays (as upcomingBirthdays gives them) and follow-ups.
 * A follow-up whose date has passed is still due, so it shows on today.
 * @param {object[]} clients
 * @param {{followUp: string}[]} followUps from the store's summary
 * @param {Date} now
 * @returns {{date: Date, inDays: number, birthdays: object[], followUps: object[]}[]}
 */
export function weekAhead(clients, followUps, now, days = WEEK_DAYS) {
  const birthdays = upcomingBirthdays(clients, now, days);
  const today = toYmd(now);
  return Array.from({ length: days }, (_, inDays) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + inDays);
    const ymd = toYmd(date);
    return {
      date,
      inDays,
      birthdays: birthdays.filter((b) => b.inDays === inDays),
      followUps: followUps.filter((f) => (inDays === 0 ? f.followUp <= today : f.followUp === ymd)),
    };
  });
}

/** Where number `n` sits on a wheel of radius `r` around (0, 0): 9 at the top, then clockwise, 40 degrees apart. */
export function wheelPoint(n, r) {
  const angle = (n / 9) * 2 * Math.PI;
  return { x: r * Math.sin(angle), y: -r * Math.cos(angle) };
}

/**
 * The smallest and largest bubble on the wheel, in its 240-unit square: one client, and the path with the most.
 * The smallest still holds a two-digit count at the Studio's 13px on a phone's 270px wheel.
 */
export const BUBBLE = { min: 10, max: 15 };

/**
 * A count bubble's radius: its area grows with the count, from BUBBLE.min for one client to BUBBLE.max for
 * `most` (the largest count on the wheel). No clients, no bubble.
 */
export function bubbleRadius(count, most, { min, max } = BUBBLE) {
  if (!count) return 0;
  if (most <= 1) return min;
  const share = Math.min(1, (count - 1) / (most - 1));
  return Math.sqrt(min * min + share * (max * max - min * min));
}
