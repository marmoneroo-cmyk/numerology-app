/**
 * Compatibility between two people. Three readings with their own rules, as
 * the app has always scored them: the studio match (love / twin / biz), the
 * couple reading on the customer page, and parent and child. Each person is
 * { d, m, y, name }. The interpretation texts are looked up by the caller
 * (LP_COMPAT / getCompat), keyed by compatKey.
 */
import { LP, LPm, NV, SU, EX } from "./core.js";

const COMPLEMENTARY = [[1, 2], [3, 4], [5, 6], [7, 8], [1, 9]];
/** Who teaches whom between parent and child, by life path. */
const TEACHES = { 1: 4, 2: 8, 3: 7, 4: 5, 5: 6, 6: 1, 7: 3, 8: 9, 9: 2 };
const MASTERS = [11, 22, 33];

const clamp = (min, max, n) => Math.max(min, Math.min(max, n));
const complementary = (a, b) => COMPLEMENTARY.some(([x, y]) => (x === a && y === b) || (y === a && x === b));

/** The key the compatibility texts are stored under: smaller life path first. */
export const compatKey = (a, b) => `${Math.min(a, b)}-${Math.max(a, b)}`;

/** Both people's core numbers, as the readings name them. */
function pair(a, b) {
  return {
    lp1: LP(a.d, a.m, a.y), lp2: LP(b.d, b.m, b.y),
    nv1: NV(a.name), nv2: NV(b.name),
    su1: SU(a.name), su2: SU(b.name),
    ex1: EX(a.name), ex2: EX(b.name),
  };
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

/** Studio match. `type` is "twin", "biz" or anything else for a love match. Score 20-99. */
export function matchReading(a, b, type) {
  const p = pair(a, b);
  const lpm1 = LPm(a.d, a.m, a.y), lpm2 = LPm(b.d, b.m, b.y);
  let score = baseScore(p);
  if (p.nv1 === p.nv2) score += 10;
  if (complementary(p.lp1, p.lp2)) score += 12;
  if (type === "twin" && p.lp1 === p.lp2) score += 10;
  if (type === "twin" && lpm1 === lpm2 && MASTERS.includes(lpm1)) score += 8;
  if (type === "biz") {
    score -= 5;
    if ([4, 8].includes(p.lp1) && [4, 8].includes(p.lp2)) score += 15;
    if ([1, 8].includes(p.lp1) && [1, 8].includes(p.lp2)) score += 10;
  }
  score = clamp(20, 99, score);
  return { ...p, lpm1, lpm2, score, type, ...gauges(p, score) };
}

/** Couple reading on the customer page: also rewards close name numbers. Score 20-99. */
export function coupleReading(a, b) {
  const p = pair(a, b);
  let score = baseScore(p);
  if (p.nv1 === p.nv2) score += 10;
  else if (Math.abs(p.nv1 - p.nv2) <= 2) score += 5;
  if (complementary(p.lp1, p.lp2)) score += 12;
  score = clamp(20, 99, score);
  return { ...p, score, ...gauges(p, score) };
}

/** Parent and child: life paths, souls, and who teaches whom. Score 25-99. */
export function parentChildReading(parent, child) {
  const lpP = LP(parent.d, parent.m, parent.y), lpC = LP(child.d, child.m, child.y);
  const nvP = NV(parent.name), nvC = NV(child.name);
  const suP = SU(parent.name), suC = SU(child.name);
  let score = 55;
  if (lpP === lpC) score += 18;
  else if (Math.abs(lpP - lpC) <= 2) score += 12;
  if (suP === suC) score += 10;
  if (TEACHES[lpP] === lpC || TEACHES[lpC] === lpP) score += 10;
  score = clamp(25, 99, score);
  return { lpP, lpC, nvP, nvC, suP, suC, score };
}
