/**
 * The art of one tarot card, hand-drawn in SVG: no words, no images, and the
 * same drawing every time for the same card. A night ground with star dust
 * seeded by the card's id, a fine gold double frame with corner ornaments, and
 * the card's emblem in gold foil under one soft glow: a composed emblem for
 * each of the 22 major arcana, its Roman numeral at the top (tarotArtMajors),
 * and for the 56 minor arcana the suit's glyph as pips, ace or court card
 * (tarotArtMinors). Each suit adds its own faint accent over the gold.
 *
 * Every id inside is unique to the instance (useId), so a page can show all 78
 * at once, and the drawing is memoised: a card whose props do not change is not
 * drawn again. The foil light and the tilt belong to the card around it (CSS);
 * moving anything inside this svg would repaint its glow on every frame. An
 * unknown card gets the night and the frame only.
 *
 * @param {{ card: { id?: string, arcana: "major"|"minor", number: number,
 *   suit: "wands"|"cups"|"swords"|"pentacles"|null }, className?: string }} props
 */
import { memo, useId, useMemo } from "react";
import { MAJOR_EMBLEMS } from "./tarotArtMajors.jsx";
import { MinorEmblem } from "./tarotArtMinors.jsx";
import { SUITS, dotsPath, r2, sparklePath, starPath } from "./tarotArtShapes.jsx";

/** Each suit's faint hint over the gold; the major arcana keep a warm gold. */
const ACCENTS = Object.freeze({ wands: "#e2a35a", cups: "#62bdb4", swords: "#a8bde0", pentacles: "#93b46f" });
const MAJOR_ACCENT = "#d8bd84";

const ROMAN = ["0", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI"];
const NUMERAL_FONT = '"Cormorant Garamond", "Times New Roman", serif';
/** About how wide each letter of the numeral is, to set the short lines on each side of it. */
const LETTER_W = { 0: 9, I: 5.6, V: 11, X: 11 };

/** The star dust of one card: how many dots of each kind. */
const DUST = { faint: 22, soft: 10, bright: 4, sparkles: 3 };

const CORNER = "M13.5 52C22 40 40 22 52 13.5M13.5 36C18 28 28 18 36 13.5";
const CORNER_GEM = starPath(23, 23, 4, 5.4, 1.7);
const CORNER_TURNS = ["", "matrix(-1 0 0 1 240 0)", "matrix(1 0 0 -1 0 400)", "matrix(-1 0 0 -1 240 400)"];
const SIDE_GEMS = [[120, 8], [120, 392], [8, 200], [232, 200]].map(([x, y]) => starPath(x, y, 4, 3.6, 1.3)).join("");
const FOOT_LINES = "M98 368H112M128 368H142";
const FOOT_GEM = starPath(120, 368, 4, 4.6, 1.6);
const FOOT_DOTS = dotsPath([[94.5, 368, 1.3], [145.5, 368, 1.3]]);

/** The card as drawn: its kind, number and suit when it is one of the 78, otherwise null. */
function readCard(card) {
  if (!card || !Number.isInteger(card.number)) return null;
  if (card.arcana === "major" && card.number >= 0 && card.number < MAJOR_EMBLEMS.length) return { number: card.number, suit: null };
  if (card.arcana === "minor" && SUITS.includes(card.suit) && card.number >= 1 && card.number <= 14) return { number: card.number, suit: card.suit };
  return null;
}

/** FNV-1a: a whole number from text, the seed of a card's star dust. */
function hashText(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32: a small repeatable random(), the same numbers for the same seed. */
function seededRandom(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The dust of one card: dots everywhere inside the frame, sparkles kept to the margins, clear of the emblem. */
function starDust(seedText) {
  const random = seededRandom(hashText(seedText));
  const spots = (n, rMin, rMax) => Array.from({ length: n }, () => [18 + random() * 204, 18 + random() * 364, rMin + random() * (rMax - rMin)]);
  const faint = dotsPath(spots(DUST.faint, 0.4, 0.7));
  const soft = dotsPath(spots(DUST.soft, 0.6, 0.95));
  const bright = dotsPath(spots(DUST.bright, 0.85, 1.25));
  const sparkles = Array.from({ length: DUST.sparkles }, () => {
    const x = random() < 0.5 ? 24 + random() * 30 : 186 + random() * 30;
    return sparklePath(x, 40 + random() * 320, 2.4 + random() * 1.6);
  }).join("");
  return { faint, soft, bright, sparkles };
}

/** The gold foil, light to deep with a sheen on the way. */
const FOIL_STOPS = [
  [0, "#f3e2a8"],
  [0.3, "#dcc184"],
  [0.52, "#c8a96a"],
  [0.66, "#ecd9a2"],
  [0.82, "#b39252"],
  [1, "#8a6a2e"],
];
const foilStops = FOIL_STOPS.map(([offset, color]) => <stop key={offset} offset={offset} stopColor={color} />);

/**
 * The gradients and the glow of one instance, under its own ids. The foil runs
 * twice: across the card, and across one glyph's own box (a gradient in user
 * space follows the glyph's scale, so the card-wide one would leave a small
 * glyph a single flat colour).
 */
function Defs({ ids, accent }) {
  return (
    <defs>
      <radialGradient id={ids.ground} cx="120" cy="175" r="290" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#211b45" />
        <stop offset=".42" stopColor="#1a1538" />
        <stop offset="1" stopColor="#0b0a16" />
      </radialGradient>
      <radialGradient id={ids.halo}>
        <stop offset="0" stopColor={accent} stopOpacity=".2" />
        <stop offset=".55" stopColor={accent} stopOpacity=".07" />
        <stop offset="1" stopColor={accent} stopOpacity="0" />
      </radialGradient>
      <linearGradient id={ids.gold} x1="30" y1="20" x2="210" y2="380" gradientUnits="userSpaceOnUse">
        {foilStops}
      </linearGradient>
      <linearGradient id={ids.glyph} x1="-30" y1="-50" x2="30" y2="50" gradientUnits="userSpaceOnUse">
        {foilStops}
      </linearGradient>
      <filter id={ids.glow} x="-15%" y="-15%" width="130%" height="130%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="2.4" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}

function Frame({ gold }) {
  return (
    <g stroke={gold}>
      <rect x="8" y="8" width="224" height="384" rx="11" strokeWidth="1.4" />
      <rect x="13.5" y="13.5" width="213" height="373" rx="7" strokeWidth=".7" strokeOpacity=".7" />
      {CORNER_TURNS.map((turn) => (
        <g key={turn || "top-left"} transform={turn || undefined}>
          <path d={CORNER} strokeWidth=".9" />
          <path d={CORNER_GEM} fill={gold} fillOpacity=".75" strokeWidth=".6" />
        </g>
      ))}
      <path d={SIDE_GEMS} fill={gold} fillOpacity=".85" strokeWidth=".6" />
      <path d={FOOT_LINES} strokeWidth=".8" />
      <path d={FOOT_GEM} fill={gold} fillOpacity=".8" strokeWidth=".6" />
      <path d={FOOT_DOTS} fill={gold} stroke="none" />
    </g>
  );
}

/** The Roman numeral of a major card (0 for the Fool), between two short lines. */
function Numeral({ number, gold }) {
  const text = ROMAN[number];
  const half = [...text].reduce((sum, letter) => sum + LETTER_W[letter], 0) / 2 + 8;
  return (
    <g>
      {/* lining figures: Cormorant's default old-style zero would sit small, like an "o" */}
      <text x="120" y="48" textAnchor="middle" fontFamily={NUMERAL_FONT} fontSize="17" fontWeight="500" fill={gold} style={{ fontVariantNumeric: "lining-nums" }}>
        {text}
      </text>
      <path d={`M${r2(120 - half)} 42.5H${r2(102 - half)}M${r2(120 + half)} 42.5H${r2(138 + half)}`} stroke={gold} strokeWidth=".8" />
      <path d={dotsPath([[99 - half, 42.5, 1.3], [141 + half, 42.5, 1.3]])} fill={gold} />
    </g>
  );
}

/** The head ornament of a minor card: a sparkle between two short lines. */
function HeadSparkle({ gold }) {
  return (
    <g>
      <path d={sparklePath(120, 42, 5)} fill={gold} fillOpacity=".85" />
      <path d="M100 42H110M130 42H140" stroke={gold} strokeWidth=".8" />
      <path d={dotsPath([[96.5, 42, 1.3], [143.5, 42, 1.3]])} fill={gold} />
    </g>
  );
}

function TarotArt({ card, className }) {
  const uid = useId().replace(/[^A-Za-z0-9]/g, "");
  const drawn = readCard(card);
  const seed = String(card?.id ?? `${card?.arcana}-${card?.suit}-${card?.number}`);
  const dust = useMemo(() => starDust(seed), [seed]);
  const ids = {
    ground: `ta-${uid}-ground`,
    halo: `ta-${uid}-halo`,
    gold: `ta-${uid}-gold`,
    glyph: `ta-${uid}-glyph`,
    glow: `ta-${uid}-glow`,
  };
  const accent = drawn?.suit ? ACCENTS[drawn.suit] : MAJOR_ACCENT;
  const p = { gold: `url(#${ids.gold})`, glyphGold: `url(#${ids.glyph})`, accent };
  const Major = drawn && !drawn.suit ? MAJOR_EMBLEMS[drawn.number] : null;

  return (
    <svg viewBox="0 0 240 400" aria-hidden="true" focusable="false" className={className}>
      <Defs ids={ids} accent={accent} />
      {/* explicit paint on the top group: a page's CSS on the svg (fill, stroke) cannot leak in */}
      <g fill="none" stroke="none">
        <rect width="240" height="400" fill={`url(#${ids.ground})`} />
        <ellipse cx="120" cy="205" rx="108" ry="150" fill={`url(#${ids.halo})`} />
        <g className="ta-dust">
          <path d={dust.faint} fill="#f3e2a8" fillOpacity=".3" />
          <path d={dust.soft} fill="#f3e2a8" fillOpacity=".55" />
          <path d={dust.bright} fill="#fff4d6" fillOpacity=".85" />
          <path d={dust.sparkles} fill="#f3e2a8" fillOpacity=".7" />
        </g>
        <Frame gold={p.gold} />
        {drawn && (Major ? <Numeral number={drawn.number} gold={p.gold} /> : <HeadSparkle gold={p.gold} />)}
        {drawn && (
          <g className="ta-emblem" filter={`url(#${ids.glow})`} stroke={p.gold} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            {Major ? <Major p={p} /> : <MinorEmblem suit={drawn.suit} number={drawn.number} p={p} />}
          </g>
        )}
      </g>
    </svg>
  );
}

export default memo(TarotArt);
