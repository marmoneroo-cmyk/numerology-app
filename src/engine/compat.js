/**
 * Compatibility between two people: the studio match (love / twin / biz), with the couple reading of the
 * התאמה tab scoring as its love match, and parent and child. Each person is { d, m, y, name }. The
 * interpretation texts are looked up by the caller (LP_COMPAT / getCompat), keyed by compatKey.
 */
import { R, LPm, NV, SU, EX, isMaster } from "./core.js";

/**
 * How each number is compared (the owner, 2026-10-11): the life path in one digit (its original, masters
 * kept, comes back beside it for the screens to show); the name, soul and expression as the reading gives
 * them, masters kept. The last three wait for the owner's word, so they stay as they always were.
 * The life path has to stay "reduced": the compatibility texts and the teaching table are keyed 1-9.
 */
export const COMPAT_RULES = Object.freeze({ lifePath: "reduced", name: "mastersKept", soul: "mastersKept", expression: "mastersKept" });

const COMPLEMENTARY = [[1, 2], [3, 4], [5, 6], [7, 8], [1, 9]];
/** Who teaches whom between parent and child, by life path. */
const TEACHES = { 1: 4, 2: 8, 3: 7, 4: 5, 5: 6, 6: 1, 7: 3, 8: 9, 9: 2 };

const clamp = (min, max, n) => Math.max(min, Math.min(max, n));
const complementary = (a, b) => COMPLEMENTARY.some(([x, y]) => (x === a && y === b) || (y === a && x === b));

/** The key the compatibility texts are stored under: smaller life path first. */
export const compatKey = (a, b) => `${Math.min(a, b)}-${Math.max(a, b)}`;

/** A number as COMPAT_RULES compares it: in one digit, or as the reading gives it. Any other rule is a mistake. */
function byRule(rule, n) {
  if (rule === "reduced") return R(n);
  if (rule === "mastersKept") return n;
  throw new Error(`unknown compatibility rule: ${rule}`);
}
/** A person's numbers as compared, by COMPAT_RULES. */
const compared = (p) => ({
  lp: byRule(COMPAT_RULES.lifePath, LPm(p.d, p.m, p.y)),
  nv: byRule(COMPAT_RULES.name, NV(p.name)),
  su: byRule(COMPAT_RULES.soul, SU(p.name)),
  ex: byRule(COMPAT_RULES.expression, EX(p.name)),
});

/** Both people's core numbers, as the readings name them. */
function pair(a, b) {
  const x = compared(a), y = compared(b);
  return { lp1: x.lp, lp2: y.lp, nv1: x.nv, nv2: y.nv, su1: x.su, su2: y.su, ex1: x.ex, ex2: y.ex };
}

/** Life-path and soul agreement, the shared start of the studio and couple scores. */
function baseScore({ lp1, lp2, su1, su2 }) {
  let score = 50;
  if (lp1 === lp2) score += 20;
  else if (Math.abs(lp1 - lp2) <= 2) score += 15;
  else if (Math.abs(lp1 - lp2) >= 5) score -= 5;
  if (su1 === su2) score += 15;
  else if (Math.abs(su1 - su2) <= 1) score += 8;
  return score;
}

/** Harmony, tension and growth gauges (0-10). */
const gauges = ({ lp1, lp2, su1, su2 }, score) => ({
  harmony: Math.min(10, Math.round(score / 10)),
  tension: Math.min(10, Math.round((100 - score) / 12)),
  growth: Math.min(10, Math.round(Math.abs(lp1 - lp2) + Math.abs(su1 - su2) / 2 + 2)),
});

/**
 * Studio match. `type` is "twin", "biz", "parent" (`a` the parent, `b` the child) or anything else for
 * a love match. Score 20-99; a parent and child score as parentChildReading does (25-99).
 */
export function matchReading(a, b, type) {
  const p = pair(a, b);
  const lpm1 = LPm(a.d, a.m, a.y), lpm2 = LPm(b.d, b.m, b.y);
  if (type === "parent") {
    // the shipped code scored this as a love match (the audit of 2026-10-11)
    const score = parentChildReading(a, b).score;
    return { ...p, lpm1, lpm2, score, type, ...gauges(p, score) };
  }
  let score = baseScore(p);
  if (p.nv1 === p.nv2) score += 10;
  if (complementary(p.lp1, p.lp2)) score += 12;
  if (type === "twin" && p.lp1 === p.lp2) score += 10;
  if (type === "twin" && lpm1 === lpm2 && isMaster(lpm1)) score += 8;
  if (type === "biz") {
    score -= 5;
    if ([4, 8].includes(p.lp1) && [4, 8].includes(p.lp2)) score += 15;
    if ([1, 8].includes(p.lp1) && [1, 8].includes(p.lp2)) score += 10;
  }
  score = clamp(20, 99, score);
  return { ...p, lpm1, lpm2, score, type, ...gauges(p, score) };
}

/**
 * The couple reading of the התאמה tab: the studio's love match, so a couple scores the same on the tab, in
 * the calculators, in a client's file and in its saved readings (the owner, 2026-10-11). The tab used to
 * add 5 more for name numbers 1 or 2 apart; every saved match was scored without it, so that is the one kept.
 */
export const coupleReading = (a, b) => matchReading(a, b, "love");

/** Parent and child: life paths (in one digit; the originals come back too), souls, and who teaches whom. Score 25-99. */
export function parentChildReading(parent, child) {
  const p = compared(parent), c = compared(child);
  const [lpP, lpC, nvP, nvC, suP, suC] = [p.lp, c.lp, p.nv, c.nv, p.su, c.su];
  const lpmP = LPm(parent.d, parent.m, parent.y), lpmC = LPm(child.d, child.m, child.y);
  let score = 55;
  if (lpP === lpC) score += 18;
  else if (Math.abs(lpP - lpC) <= 2) score += 12;
  if (suP === suC) score += 10;
  // one bonus, also when each teaches the other (3 and 7)
  if (TEACHES[lpP] === lpC || TEACHES[lpC] === lpP) score += 10;
  score = clamp(25, 99, score);
  return { lpP, lpC, lpmP, lpmC, nvP, nvC, suP, suC, score };
}
