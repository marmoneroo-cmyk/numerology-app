/**
 * The drawing kit of the tarot art (TarotArt.jsx): path builders, the four
 * suit glyphs, and the motifs several cards share. Everything is drawn in the
 * card's 240 by 400 space, except the glyphs: each sits in its own box, 100
 * units tall around its centre, and SuitGlyph places and scales it.
 *
 * `p` is the card's paint set, { gold, glyphGold, accent }: the url of its foil
 * gradient across the card, the url of the same foil across one glyph's box,
 * and the suit's hint colour. Shapes inherit the gold line from the emblem
 * group and add only fills (or a finer line) of their own.
 */

/** Opaque, close to the card's ground: a shape filled with it hides the lines behind it. */
export const NIGHT = "#13102b";
/** Darker than the ground, for the dark one of a pair (a pillar, a sphinx, a banner). */
export const INK = "#06050d";
export const IVORY = "#f6eedb";

const RAD = Math.PI / 180;

/** Two decimals keep the markup short. */
export const r2 = (n) => Math.round(n * 100) / 100;

/** A low fill in the foil gold. */
export const wash = (p, opacity = 0.14) => ({ fill: p.gold, fillOpacity: opacity });

/** The point `r` away from (cx, cy) toward `deg` degrees (0 points right, 90 down). */
export function polar(cx, cy, r, deg) {
  return [r2(cx + r * Math.cos(deg * RAD)), r2(cy + r * Math.sin(deg * RAD))];
}

/** A point as path data. */
export const xy = ([x, y]) => `${r2(x)} ${r2(y)}`;

/** A star of n points as path data: tips at `outer`, notches at `inner`, the first tip toward `startDeg`. */
export function starPath(cx, cy, n, outer, inner, startDeg = -90) {
  const pts = Array.from({ length: n * 2 }, (_, i) => xy(polar(cx, cy, i % 2 ? inner : outer, startDeg + (i * 180) / n)));
  return `M${pts.join("L")}Z`;
}

/** The five-pointed star drawn in one line, its first point toward `startDeg` (90 turns it over). */
export function pentagramPath(cx, cy, r, startDeg = -90) {
  return `M${[0, 2, 4, 1, 3].map((k) => xy(polar(cx, cy, r, startDeg + k * 72))).join("L")}Z`;
}

/**
 * Rays as one path, from r1 out to rLong, every second one to rShort: n of them
 * round the circle, or spread over `span` degrees from `startDeg`.
 */
export function raysPath(cx, cy, n, r1, rLong, rShort = rLong, startDeg = -90, span = 360) {
  const step = span >= 360 ? 360 / n : span / (n - 1);
  let d = "";
  for (let i = 0; i < n; i++) {
    const deg = startDeg + i * step;
    d += `M${xy(polar(cx, cy, r1, deg))}L${xy(polar(cx, cy, i % 2 ? rShort : rLong, deg))}`;
  }
  return d;
}

/** A ray that waves from r1 out to `rEnd` along `deg`, `amp` to each side. */
export function wavyRayPath(cx, cy, deg, r1, rEnd, amp) {
  const at = (f, side) => {
    const [x, y] = polar(cx, cy, r1 + (rEnd - r1) * f, deg);
    const [ox, oy] = polar(0, 0, amp * side, deg + 90);
    return xy([x + ox, y + oy]);
  };
  return `M${at(0, 0)}Q${at(1 / 6, 1)} ${at(1 / 3, 0)}Q${at(1 / 2, -1)} ${at(2 / 3, 0)}Q${at(5 / 6, 1)} ${at(1, 0)}`;
}

/** Round dots as one path: [[x, y, r], ...]. */
export function dotsPath(dots) {
  return dots
    .map(([x, y, r]) => {
      const rr = r2(r);
      return `M${r2(x - r)} ${r2(y)}a${rr} ${rr} 0 1 0 ${r2(2 * r)} 0a${rr} ${rr} 0 1 0 ${r2(-2 * r)} 0`;
    })
    .join("");
}

/** An almond leaf from (x, y) toward `deg`, `len` long. */
export function leafPath(x, y, len, deg, width = len * 0.4) {
  const [mx, my] = polar(x, y, len / 2, deg);
  const side = (turn) => xy(polar(mx, my, width, deg + turn));
  return `M${xy([x, y])}Q${side(-90)} ${xy(polar(x, y, len, deg))}Q${side(90)} ${xy([x, y])}Z`;
}

/** A drop, round below and pointed above (a falling yod, a small flame), resting on (x, y). */
export function dropPath(x, y, h, w) {
  const top = r2(y - h);
  const mid = r2(y - h * 0.42);
  return `M${r2(x)} ${top}C${r2(x + w)} ${mid} ${r2(x + w)} ${r2(y)} ${r2(x)} ${r2(y)}C${r2(x - w)} ${r2(y)} ${r2(x - w)} ${mid} ${r2(x)} ${top}Z`;
}

/** A four-pointed sparkle with curved sides. */
export function sparklePath(x, y, r) {
  const c = xy([x, y]);
  return `M${xy([x, y - r])}Q${c} ${xy([x + r, y])}Q${c} ${xy([x, y + r])}Q${c} ${xy([x - r, y])}Q${c} ${xy([x, y - r])}Z`;
}

/** The sign of infinity across (cx, cy): `a` out to each side, its loops about 1.5h tall. */
export function lemniscatePath(cx, cy, a, h) {
  const k = a * 0.36;
  const [l, r, t, b] = [cx - a, cx + a, cy - h, cy + h];
  const pt = (x, y) => xy([x, y]);
  return (
    `M${pt(cx, cy)}C${pt(cx + k, t)} ${pt(r, t)} ${pt(r, cy)}C${pt(r, b)} ${pt(cx + k, b)} ${pt(cx, cy)}` +
    `C${pt(cx - k, t)} ${pt(l, t)} ${pt(l, cy)}C${pt(l, b)} ${pt(cx - k, b)} ${pt(cx, cy)}Z`
  );
}

/** A crown on its base line: n points over `w`, `h` tall. */
export function crownPath(cx, base, w, h, n = 3) {
  const left = cx - w / 2;
  const gap = w / (n - 1);
  let d = `M${xy([left, base])}`;
  for (let i = 0; i < n; i++) {
    const x = left + i * gap;
    if (i > 0) d += `L${xy([x - gap / 2, base - h * 0.42])}`;
    d += `L${xy([x, base - h])}`;
  }
  return `${d}L${xy([left + w, base])}Z`;
}

/** The tips of that crown, as pearls of radius r. */
export const crownPearls = (cx, base, w, h, n, r) =>
  dotsPath(Array.from({ length: n }, (_, i) => [cx - w / 2 + (i * w) / (n - 1), base - h, r]));

/** A row of n scallops hanging `depth` under the line from x0 to x1 at y. */
export function scallopPath(x0, x1, y, n, depth) {
  const step = (x1 - x0) / n;
  let d = `M${xy([x0, y])}`;
  for (let i = 0; i < n; i++) d += `Q${xy([x0 + step * (i + 0.5), y + depth * 2])} ${xy([x0 + step * (i + 1), y])}`;
  return d;
}

/** A wave line from x0 to x1 at y: n humps, each `amp` high. */
export function wavesPath(x0, x1, y, n, amp) {
  const step = (x1 - x0) / n;
  let d = `M${xy([x0, y])}q${r2(step / 2)} ${r2(-amp * 2)} ${r2(step)} 0`;
  for (let i = 1; i < n; i++) d += `t${r2(step)} 0`;
  return d;
}

/** The point at t (0..1) on the quadratic curve from a through control c to b. */
export function onCurve([ax, ay], [cx, cy], [bx, by], t) {
  const u = 1 - t;
  return [u * u * ax + 2 * u * t * cx + t * t * bx, u * u * ay + 2 * u * t * cy + t * t * by];
}

/** The heading, in degrees, of that curve at t. */
export function curveHeading([ax, ay], [cx, cy], [bx, by], t) {
  const dx = 2 * (1 - t) * (cx - ax) + 2 * t * (bx - cx);
  const dy = 2 * (1 - t) * (cy - ay) + 2 * t * (by - cy);
  return Math.atan2(dy, dx) / RAD;
}

/** Leaves in pairs along that curve, each pair at t, pointing on along it and out to both sides. */
export function sprigPath(a, c, b, pairs, len, spread = 38) {
  let d = "";
  for (let i = 0; i < pairs; i++) {
    const t = 0.18 + (i * 0.8) / Math.max(pairs - 1, 1);
    const [x, y] = onCurve(a, c, b, t);
    const heading = curveHeading(a, c, b, t);
    d += leafPath(x, y, len, heading - spread) + leafPath(x, y, len, heading + spread);
  }
  return d;
}

/**
 * A road winding into the distance along the cubic curve through `pts` (four
 * points, near end first), `near` wide at its start and `far` at its end: the
 * area to fill, and its two edges to stroke.
 */
export function roadPaths(pts, near, far, samples = 14) {
  const [a, b, c, d] = pts;
  const left = [];
  const right = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const u = 1 - t;
    const at = (k) => u * u * u * a[k] + 3 * u * u * t * b[k] + 3 * u * t * t * c[k] + t * t * t * d[k];
    const slope = (k) => 3 * u * u * (b[k] - a[k]) + 6 * u * t * (c[k] - b[k]) + 3 * t * t * (d[k] - c[k]);
    const [dx, dy] = [slope(0), slope(1)];
    const len = Math.hypot(dx, dy) || 1;
    const half = (near + (far - near) * t) / 2;
    left.push(xy([at(0) - (dy / len) * half, at(1) + (dx / len) * half]));
    right.push(xy([at(0) + (dy / len) * half, at(1) - (dx / len) * half]));
  }
  return { area: `M${left.join("L")}L${[...right].reverse().join("L")}Z`, edges: `M${left.join("L")}M${right.join("L")}` };
}

/** Draws its children twice: as they are, and mirrored across the card's middle line. */
export function Mirror({ children }) {
  return (
    <>
      {children}
      <g transform="matrix(-1 0 0 1 240 0)">{children}</g>
    </>
  );
}

/* ─── the four suit glyphs, each in a box 100 units tall around (0, 0) ─── */

const WAND_LEAVES = [
  leafPath(2.6, -30, 15, -38),
  leafPath(-2.8, -9, 14, -142),
  leafPath(3, 13, 13, -34),
  leafPath(-3.2, 31, 12, -146),
  leafPath(0.8, -44.5, 10, -62),
  leafPath(-0.8, -44.5, 10, -118),
].join("");

/** A living staff, budding at the top, leaves along it. */
function Wand({ p, sw }) {
  const fine = r2(sw * 0.6);
  return (
    <>
      <path d="M-3.4 46L-2.6 -42Q0 -47 2.6 -42L3.4 46Q0 49 -3.4 46Z" fill={p.accent} fillOpacity=".3" />
      <path d="M-2.9 -18Q0 -15.6 2.9 -18M-3.2 18Q0 20.4 3.2 18" strokeWidth={fine} />
      <path d={WAND_LEAVES} fill={p.accent} fillOpacity=".45" strokeWidth={fine} />
    </>
  );
}

/** A chalice: open bowl with a band, knop on the stem, a wide foot. */
function Cup({ p, sw }) {
  return (
    <>
      <path d="M-5 -4L-3 22M5 -4L3 22" />
      <path d="M-3 22C-4 31 -17 36 -22 43Q0 49 22 43C17 36 4 31 3 22Z" fill={p.accent} fillOpacity=".22" />
      <ellipse cx="0" cy="9" rx="7" ry="3.6" fill={p.gold} fillOpacity=".4" />
      <path d="M-25 -42C-25 -18 -14 -6 -5 -4L5 -4C14 -6 25 -18 25 -42A25 5 0 0 1 -25 -42Z" fill={p.accent} fillOpacity=".26" />
      <ellipse cx="0" cy="-42" rx="25" ry="5" fill={NIGHT} />
      <path d="M-22 -28Q0 -22 22 -28" strokeWidth={r2(sw * 0.6)} />
    </>
  );
}

/** A straight sword: ridged blade, cross-guard, bound grip, round pommel. */
function Sword({ p, sw }) {
  const fine = r2(sw * 0.55);
  return (
    <>
      <path d="M0 -50L4.4 -40V20H-4.4V-40Z" fill={p.accent} fillOpacity=".24" />
      <path d="M0 -42V17" strokeWidth={fine} />
      <rect x="-17" y="20" width="34" height="4.6" rx="2.3" fill={p.gold} fillOpacity=".4" />
      <rect x="-2.6" y="24.6" width="5.2" height="15" fill={NIGHT} />
      <path d="M-2.6 29.6H2.6M-2.6 34.6H2.6" strokeWidth={fine} />
      <circle cy="44.4" r="4.4" fill={p.gold} fillOpacity=".4" />
    </>
  );
}

const GLYPH_PENTAGRAM = pentagramPath(0, 0, 40);

/** A disc with a ring and the five-pointed star. */
function Pentacle({ p, sw }) {
  return (
    <>
      <circle r="46" fill={p.accent} fillOpacity=".11" />
      <circle r="40" strokeWidth={r2(sw * 0.55)} />
      <path d={GLYPH_PENTAGRAM} fill={p.gold} fillOpacity=".08" />
    </>
  );
}

const SHAPES = { wands: Wand, cups: Cup, swords: Sword, pentacles: Pentacle };

/** The four suits, in the deck's order. */
export const SUITS = Object.freeze(Object.keys(SHAPES));

/**
 * One suit glyph `size` units tall, centred on (x, y), turned by `rotate`
 * degrees. Its line stays `sw` wide on the card at any size, and it wears the
 * foil laid across its own box, so each glyph catches the light; other props
 * (a data-pip mark) go on its group.
 */
export function SuitGlyph({ suit, x, y, size, rotate = 0, sw = 1.5, p, ...rest }) {
  const Shape = SHAPES[suit];
  const scale = size / 100;
  const local = r2(sw / scale);
  const turn = rotate ? ` rotate(${rotate})` : "";
  const foil = p.glyphGold;
  return (
    <g transform={`translate(${r2(x)} ${r2(y)})${turn} scale(${Math.round(scale * 1000) / 1000})`} stroke={foil} strokeWidth={local} {...rest}>
      <Shape p={{ ...p, gold: foil }} sw={local} />
    </g>
  );
}

/* ─── motifs several cards share ─── */

/** A heraldic rose: five barbs, five round petals in one scalloped outline, a seeded heart. */
export function Rose({ cx, cy, r, p }) {
  const notches = [0, 1, 2, 3, 4].map((i) => -126 + i * 72);
  const rim = (deg) => xy(polar(cx, cy, r * 0.8575, deg));
  const petal = r2(r * 0.54);
  const outline = `M${rim(notches[0])}${notches.map((_, i) => `A${petal} ${petal} 0 0 1 ${rim(notches[(i + 1) % 5])}`).join("")}Z`;
  const barbs = notches
    .map((deg) => `M${xy(polar(cx, cy, r * 0.78, deg - 15))}L${xy(polar(cx, cy, r * 1.32, deg))}L${xy(polar(cx, cy, r * 0.78, deg + 15))}Z`)
    .join("");
  const veins = notches.map((deg) => `M${xy(polar(cx, cy, r * 0.32, deg))}L${xy(polar(cx, cy, r * 0.62, deg))}`).join("");
  return (
    <>
      <path d={barbs} {...wash(p, 0.55)} strokeWidth="1" />
      <path d={outline} fill={IVORY} fillOpacity=".93" strokeWidth="1.3" />
      <path d={veins} strokeWidth=".9" />
      <circle cx={cx} cy={cy} r={r2(r * 0.3)} {...wash(p, 0.85)} strokeWidth="1" />
    </>
  );
}

const WING = "M-7 -3C-13 -11 -22 -14 -31 -12L-22 -6.5L-30.5 -3L-20.5 1.5L-26 6C-17 7.5 -11 6.5 -7 4Z";
const BEING_SIGNS = {
  angel: (p) => (
    <>
      <circle cy="-0.5" r="5" strokeWidth=".8" />
      <circle cy=".6" r="2.5" {...wash(p, 0.95)} stroke="none" />
    </>
  ),
  eagle: (p) => <path d="M-4 -1.5Q1.5 -5.5 5.2 -.4Q2.4 -1 1 2.8Q-.8 .4 -4 -1.5Z" {...wash(p, 0.95)} strokeWidth=".7" />,
  bull: (p) => (
    <>
      <path d="M-5.5 -5Q-5 0 0 0Q5 0 5.5 -5" strokeWidth="1.1" />
      <circle cy="2.6" r="2.3" {...wash(p, 0.95)} stroke="none" />
    </>
  ),
  lion: (p) => (
    <>
      <path d={raysPath(0, 0, 10, 2.8, 5.9)} strokeWidth=".8" />
      <circle r="2.5" {...wash(p, 0.95)} stroke="none" />
    </>
  ),
};

/** One of the four winged beings of the Wheel and the World: a medallion between two wings, with its sign. */
export function Being({ kind, x, y, p }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d={WING} {...wash(p, 0.2)} strokeWidth="1.1" />
      <path d={WING} transform="scale(-1 1)" {...wash(p, 0.2)} strokeWidth="1.1" />
      <circle r="8.5" fill={NIGHT} strokeWidth="1.3" />
      {BEING_SIGNS[kind](p)}
    </g>
  );
}

const NEMES = "M-10 -13Q0 -21 10 -13L17 1L13 17H6L6 4Q0 8 -6 4L-6 17H-13L-17 1Z";
const NEMES_STRIPES = "M-11.6 -8.4L-6.6 -9.6M-13.9 -3.6L-7.6 -4.6M-15.6 .6L-7 .4M-15 6H-6.5M-14 11H-6.5M11.6 -8.4L6.6 -9.6M13.9 -3.6L7.6 -4.6M15.6 .6L7 .4M15 6H6.5M14 11H6.5";

/** A sphinx's head, seen from the front: the striped headdress, the face, the two paws below. */
export function SphinxHead({ x, y, dark = false, scale = 1, p }) {
  const hood = dark ? { fill: INK } : wash(p, 0.5);
  const face = dark ? { fill: NIGHT } : { fill: IVORY, fillOpacity: 0.9 };
  const at = scale === 1 ? `translate(${x} ${y})` : `translate(${x} ${y}) scale(${scale})`;
  return (
    <g transform={at} strokeWidth={r2(1.4 / scale)}>
      <path d="M-15 17H15L17 25H-17Z" {...hood} />
      <path d="M-11 19.5H-2.5V25H-11ZM2.5 19.5H11V25H2.5Z" {...face} strokeWidth={r2(1 / scale)} />
      <path d={NEMES} {...hood} />
      <path d={NEMES_STRIPES} strokeWidth={r2(0.8 / scale)} />
      <ellipse cy="-4" rx="6" ry="8" {...face} />
      <path d="M-6.4 -9.6Q0 -12 6.4 -9.6" strokeWidth={r2(1 / scale)} />
      <path d="M-3.2 -5H-1.4M1.4 -5H3.2" strokeWidth={r2(1.1 / scale)} />
    </g>
  );
}

/** A wheel: rim, inner ring, spokes and hub. */
export function SpokedWheel({ cx, cy, r, spokes = 8, p }) {
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill={NIGHT} strokeWidth="1.8" />
      <circle cx={cx} cy={cy} r={r2(r * 0.84)} strokeWidth=".8" />
      <path d={raysPath(cx, cy, spokes, r * 0.22, r * 0.84)} strokeWidth="1.2" />
      <circle cx={cx} cy={cy} r={r2(r * 0.22)} {...wash(p, 0.4)} strokeWidth="1.2" />
    </>
  );
}

/** A small crenellated tower with one lit window, standing on `base`. */
export function Turret({ x, base, h, w = 22, p }) {
  const left = r2(x - w / 2);
  const top = base - h;
  const m = r2(w / 5);
  return (
    <>
      <path d={`M${left} ${base}V${top - 5}h${m}v5h${m}v-5h${m}v5h${m}v-5h${m}V${base}Z`} fill={NIGHT} strokeWidth="1.5" />
      <path d={`M${r2(x - 2.6)} ${top + 22}v-5a2.6 2.6 0 0 1 5.2 0v5Z`} {...wash(p, 0.7)} strokeWidth="1" />
    </>
  );
}

/** A temple pillar: lotus capital, abacus, shaft, a two-step base. Filled in gold, or dark. */
export function Pillar({ x, top, bottom, w = 22, filled = false, p }) {
  const l = x - w / 2;
  const r = x + w / 2;
  const shaft = filled ? wash(p, 0.5) : { fill: NIGHT };
  const bulb = `M${xy([l, top + 14])}C${xy([l, top + 2])} ${xy([x - 5, top - 4])} ${xy([x, top - 6])}C${xy([x + 5, top - 4])} ${xy([r, top + 2])} ${xy([r, top + 14])}Z`;
  return (
    <>
      <path d={bulb} {...wash(p, filled ? 0.5 : 0.12)} strokeWidth="1.4" />
      <rect x={l - 4} y={top + 14} width={w + 8} height="7" rx="1.5" {...wash(p, 0.2)} strokeWidth="1.4" />
      <rect x={l + 1.5} y={top + 21} width={w - 3} height={bottom - top - 33} {...shaft} strokeWidth="1.6" />
      <rect x={l - 4} y={bottom - 12} width={w + 8} height="6" {...wash(p, 0.2)} strokeWidth="1.4" />
      <rect x={l - 7} y={bottom - 6} width={w + 14} height="6" {...wash(p, 0.2)} strokeWidth="1.4" />
    </>
  );
}
