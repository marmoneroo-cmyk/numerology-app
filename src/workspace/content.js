import { createContext, useContext } from "react";

/**
 * Interpretation content for the workspace: number meanings (D), master
 * numbers (MASTER), karmic debts (KARMA), year energies (YEAR_ENERGY),
 * compatibility texts (LP_COMPAT, getCompat) and the PDF report
 * (exportReport). App.jsx provides Shani's content today; the editable
 * interpretation library will provide each subscriber's own later.
 */
export const EMPTY_CONTENT = Object.freeze({
  D: {},
  MASTER: {},
  KARMA: {},
  YEAR_ENERGY: {},
  LP_COMPAT: {},
  getCompat: () => null,
  exportReport: null,
});

export const ContentContext = createContext(EMPTY_CONTENT);

export const useContent = () => useContext(ContentContext) || EMPTY_CONTENT;

/** The archetype title of a number in the UI language, e.g. 6 -> "המטפל". */
export function numberTitle(content, n, he) {
  const entry = n > 9 ? content.MASTER[n] || content.D[n] : content.D[n];
  if (!entry) return "";
  return he ? entry.t || "" : entry.te || entry.t || "";
}
