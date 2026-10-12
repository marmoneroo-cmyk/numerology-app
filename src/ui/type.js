/**
 * The Studio's text size. Every font size in the Studio goes through `fs`, so one pair of CSS variables sets
 * how large the whole Studio reads: --ts (the factor) and --ts-min (the smallest size). The Studio sets them on
 * <html data-st-view="studio"> (studio.css), and meeting mode sets larger ones for itself. Where they are not set,
 * as on the customer page, the expression comes out at the plain size, so those pages look as they did.
 * Display sizes above TYPE_CAP (big numerals, titles) stay as they are.
 */
export const TYPE_CAP = 24;

/**
 * @param {number} px the size the design was drawn at
 * @returns {string} a CSS length for `font-size`
 */
export const fs = (px) => (px > TYPE_CAP ? `${px}px` : `max(var(--ts-min, 0px), calc(${px}px * var(--ts, 1)))`);
