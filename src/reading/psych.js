/**
 * How the psychological map is shown (the owner, 2026-10-12): relative to the person's strongest trait, in
 * words instead of a score out of 10. The engine's points do not change (src/engine/core.js, psychMap): a trait
 * gets points only from four or five numbers, so out of 10 nearly everyone scored 2 to 6, which read as a
 * judgement. Now the strongest trait reaches the edge of the chart and the others follow in proportion.
 */
export const PSYCH_KEYS = ["leadership", "intuition", "creativity", "stability", "ambition", "wisdom"];

/** At this share of the strongest trait or more, a trait is "strong"; above 0 it is "present". */
export const STRONG_SHARE = 0.6;

export const PSYCH_NAMES = {
  he: { leadership: "מנהיגות", intuition: "אינטואיציה", creativity: "יצירתיות", stability: "יציבות", ambition: "שאיפה", wisdom: "חכמה" },
  en: { leadership: "Leadership", intuition: "Intuition", creativity: "Creativity", stability: "Stability", ambition: "Ambition", wisdom: "Wisdom" },
};

export const LEVEL_WORDS = {
  he: { strong: "בולט", present: "קיים", none: "לא מודגש" },
  en: { strong: "Strong", present: "Present", none: "Not emphasized" },
};

/**
 * @param {Object<string, number>} psych the engine's points per trait (0-10); a missing trait counts as 0
 * @returns {{ max: number, items: {key: string, value: number, ratio: number, level: "strong"|"present"|"none"}[], dominant: string[] }}
 */
export function psychLevels(psych) {
  const values = PSYCH_KEYS.map((key) => Math.max(0, Number(psych?.[key]) || 0));
  const max = Math.max(...values);
  const items = PSYCH_KEYS.map((key, i) => {
    const value = values[i];
    const ratio = max > 0 ? value / max : 0;
    const level = value === 0 ? "none" : ratio >= STRONG_SHARE ? "strong" : "present";
    return { key, value, ratio, level };
  });
  const dominant = max > 0 ? items.filter((t) => t.value === max).map((t) => t.key) : [];
  return { max, items, dominant };
}
