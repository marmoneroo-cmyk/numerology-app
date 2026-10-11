/**
 * Public surface of the numerology engine. UI code imports from here only.
 * See core.js for the method and the tests in __tests__ for worked examples.
 */
export {
  ENGINE_VERSION,
  LV,
  VOW,
  R,
  Rm,
  NV,
  SU,
  EX,
  LP,
  LPm,
  CA,
  PY,
  addsOne,
  personalYearOn,
  PM,
  PD,
  CH,
  karmicDebt,
  reductionChain,
  loShu,
  yearCycle,
  cycleSpans,
  cycleAt,
  masterBase,
  dailyRitualNumber,
  fullCalc,
  liveNum,
} from "./core.js";
export { nameCounts, dominantNumbers, missingNumbers, maturity, birthdayNumber, charValue, textNumber } from "./extras.js";
export { getRecommendations } from "./recommendations.js";
export { compatKey, matchReading, coupleReading, parentChildReading } from "./compat.js";
