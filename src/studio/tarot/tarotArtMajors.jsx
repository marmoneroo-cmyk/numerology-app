/**
 * The 22 emblems of the major arcana: one composed drawing each, in the card's
 * 240 by 400 space, recognisable by the traditional Rider-Waite-Smith symbols
 * (8 Strength, 11 Justice). Each takes the paint set `p` and inherits the gold
 * line from TarotArt's emblem group; low fills keep them light. They stay
 * between y 62 and 354, clear of the numeral above and the ornament below.
 */
import {
  INK, IVORY, NIGHT, Being, Mirror, Pillar, Rose, SphinxHead, SpokedWheel, SuitGlyph, Turret,
  crownPath, curveHeading, dotsPath, dropPath, leafPath, lemniscatePath, onCurve, pentagramPath, polar, r2,
  raysPath, roadPaths, scallopPath, starPath, wash, wavesPath, wavyRayPath, xy,
} from "./tarotArtShapes.jsx";

/** A winding road, computed once: a faint fill between two gold edges. */
function Road({ road, p }) {
  return (
    <>
      <path d={road.area} {...wash(p, 0.08)} stroke="none" />
      <path d={road.edges} strokeWidth="1.1" />
    </>
  );
}

const FOOL_ROAD = roadPaths([[86, 354], [70, 330], [128, 322], [153, 298]], 26, 3);
const TEMPERANCE_ROAD = roadPaths([[84, 354], [70, 330], [128, 326], [120, 306]], 24, 3);
const MOON_ROAD = roadPaths([[120, 320], [82, 300], [154, 272], [121, 244]], 28, 3);

/* 0 · The Fool: the open circle of the zero holding the white rose, the staff and bundle, the sun, the cliff's edge. */
function Fool({ p }) {
  return (
    <>
      <circle cx="178" cy="92" r="11" {...wash(p, 0.32)} strokeWidth="1.4" />
      <path d={raysPath(178, 92, 16, 15, 24, 19)} strokeWidth="1.2" />
      <path d="M30 312C70 304 118 298 158 296L165 305L160 318L170 330L164 342L170 354" />
      <Road road={FOOL_ROAD} p={p} />
      <path d="M162 264L72 124" strokeWidth="2.2" />
      <path d="M70 126C64 131 55 137 54 148C53 158 61 163 70 162C79 161 85 154 83 144C81 136 74 131 70 126Z" fill={NIGHT} strokeWidth="1.4" />
      <path d="M70 126C64 131 55 137 54 148C53 158 61 163 70 162C79 161 85 154 83 144C81 136 74 131 70 126Z" {...wash(p, 0.2)} stroke="none" />
      <path d="M70 126L62 119M70 126L77 118M65 139Q62 149 64 158M75 137Q79 147 77 157" strokeWidth="1.1" />
      <circle cx="120" cy="198" r="44" fill={NIGHT} strokeWidth="1.8" />
      <circle cx="120" cy="198" r="38.5" {...wash(p, 0.06)} strokeWidth=".9" />
      <Rose cx={120} cy={198} r={21} p={p} />
    </>
  );
}

/* 1 · The Magician: the lemniscate, the wand raised in a ring of light, the four tools on the table. */
function Magician({ p }) {
  return (
    <>
      <path d={lemniscatePath(120, 82, 22, 15)} {...wash(p, 0.1)} strokeWidth="1.8" />
      <circle cx="120" cy="160" r="42" strokeWidth="1.5" strokeDasharray=".1 5" />
      <path d={raysPath(120, 118, 12, 9, 18, 13)} strokeWidth="1.2" />
      <rect x="117" y="118" width="6" height="92" rx="3" {...wash(p, 0.28)} strokeWidth="1.4" />
      <circle cx="120" cy="118" r="4.6" fill={IVORY} strokeWidth="1.2" />
      <circle cx="120" cy="210" r="4.6" fill={IVORY} strokeWidth="1.2" />
      <path d="M44 252H196L190 262H50Z" {...wash(p, 0.14)} strokeWidth="1.4" />
      <path d="M52 262V296Q86 304 120 296Q154 304 188 296V262" {...wash(p, 0.05)} strokeWidth="1.2" />
      <SuitGlyph suit="cups" x={64} y={236} size={30} p={p} />
      <SuitGlyph suit="swords" x={94} y={232} size={38} p={p} />
      <SuitGlyph suit="pentacles" x={146} y={238} size={28} p={p} />
      <SuitGlyph suit="wands" x={176} y={232} size={38} p={p} />
    </>
  );
}

const POMEGRANATES = dotsPath(
  Array.from({ length: 9 }, (_, row) => {
    const y = 142 + row * 18;
    const xs = row % 2 ? [93, 111, 129, 147] : [84, 102, 120, 138, 156];
    return xs.filter((x) => !(x > 96 && x < 144 && y > 160 && y < 250)).map((x) => [x, y, 2.3]);
  }).flat(),
);

/** The triple moon: a full moon between two crescents, their horns turned outward. */
function TripleMoon({ cx, cy, r, p }) {
  const lx = cx - 2 * r - 4;
  const rx = cx + 2 * r + 4;
  const thin = r2(r * 0.55);
  return (
    <>
      <circle cx={cx} cy={cy} r={r} {...wash(p, 0.5)} strokeWidth="1.3" />
      <path d={`M${lx} ${cy - r}A${r} ${r} 0 0 1 ${lx} ${cy + r}A${thin} ${r} 0 0 0 ${lx} ${cy - r}Z`} {...wash(p, 0.35)} strokeWidth="1.2" />
      <path d={`M${rx} ${cy - r}A${r} ${r} 0 0 0 ${rx} ${cy + r}A${thin} ${r} 0 0 1 ${rx} ${cy - r}Z`} {...wash(p, 0.35)} strokeWidth="1.2" />
    </>
  );
}

/* 2 · The High Priestess: the two pillars, light and dark, the veil of pomegranates, the triple moon, the scroll, the crescent at her feet. */
function Priestess({ p }) {
  return (
    <>
      <path d="M72 128H168V298Q120 306 72 298Z" {...wash(p, 0.05)} strokeWidth="1" />
      <path d={POMEGRANATES} {...wash(p, 0.55)} stroke="none" />
      <path d="M64 126H176" strokeWidth="1.6" />
      <Pillar x={54} top={98} bottom={332} p={p} filled />
      <Pillar x={186} top={98} bottom={332} p={p} />
      <TripleMoon cx={120} cy={106} r={8} p={p} />
      <rect x="104" y="172" width="32" height="64" fill={NIGHT} strokeWidth="1.4" />
      <rect x="99" y="166" width="42" height="8" rx="4" {...wash(p, 0.3)} strokeWidth="1.4" />
      <rect x="99" y="234" width="42" height="8" rx="4" {...wash(p, 0.3)} strokeWidth="1.4" />
      <path d="M110 186H130M110 196H130M110 206H126M110 216H130M110 226H124" strokeWidth=".9" />
      <path d="M94 302Q120 332 146 302Q120 316 94 302Z" {...wash(p, 0.6)} strokeWidth="1.3" />
      <path d="M32 334H208" strokeWidth="1.2" />
    </>
  );
}

const EMPRESS_STARS = Array.from({ length: 12 }, (_, i) => polar(120, 214, 78, -165 + (i * 150) / 11))
  .map(([x, y]) => starPath(x, y, 6, 4.8, 2))
  .join("");
const HEART = "M120 186C112 170 84 168 82 192C80 214 104 236 120 258C136 236 160 214 158 192C156 168 128 170 120 186Z";
const WHEAT_GRAINS =
  Array.from({ length: 6 }, (_, k) => leafPath(0, -50 - k * 7.5, 11, -124) + leafPath(0, -50 - k * 7.5, 11, -56)).join("") +
  leafPath(0, -96, 10, -90);

/** An ear of wheat on a slightly bent stalk, rooted at (x, y) and leaning `deg` degrees. */
function WheatEar({ x, y, deg, p }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${deg})`}>
      <path d="M0 0Q3 -48 0 -96" strokeWidth="1.3" />
      <path d={leafPath(0, -20, 28, -128, 7)} {...wash(p, 0.12)} strokeWidth="1" />
      <path d={WHEAT_GRAINS} {...wash(p, 0.4)} strokeWidth=".9" />
    </g>
  );
}

/* 3 · The Empress: the arc of twelve stars, the heart-shaped shield with the sign of Venus, ears of wheat. */
function Empress({ p }) {
  return (
    <>
      <path d={EMPRESS_STARS} {...wash(p, 0.8)} strokeWidth=".8" />
      <Mirror>
        <WheatEar x={98} y={340} deg={-24} p={p} />
      </Mirror>
      <path d={HEART} fill={NIGHT} strokeWidth="2" />
      <path d={HEART} transform="matrix(.86 0 0 .86 16.8 29.68)" {...wash(p, 0.08)} strokeWidth="1" />
      <circle cx="120" cy="204" r="11" strokeWidth="1.8" />
      <path d="M120 215V240M110 228H130" strokeWidth="1.8" />
    </>
  );
}

const RAM_HORN = "M86 142C72 122 46 126 46 148C46 166 66 170 72 158C76 148 66 142 60 150";

/* 4 · The Emperor: the stone throne with ram-horn spirals, the ankh sceptre, the orb, the mountains behind. */
function Emperor({ p }) {
  return (
    <>
      <path d="M30 252L42 214L52 226L66 176L80 200H160L174 176L188 226L198 214L210 252" {...wash(p, 0.05)} strokeWidth="1.3" />
      <path d="M78 138H162V300H78Z" fill={NIGHT} strokeWidth="1.8" />
      <path d="M87 148H153V290H87Z" {...wash(p, 0.05)} strokeWidth=".9" />
      <path d="M66 300H174V312H66ZM56 312H184V324H56Z" {...wash(p, 0.1)} strokeWidth="1.4" />
      <Mirror>
        <path d={RAM_HORN} strokeWidth="1.8" />
      </Mirror>
      <circle cx="120" cy="112" r="9" {...wash(p, 0.3)} strokeWidth="1.5" />
      <path d="M111 112H129M120 103V93M115.5 97H124.5" strokeWidth="1.4" />
      <ellipse cx="120" cy="176" rx="11" ry="15" strokeWidth="2.2" />
      <path d="M120 191V282M100 197H140" strokeWidth="2.4" />
    </>
  );
}

const TIARA = "M96 152C94 124 104 98 120 88C136 98 146 124 144 152Z";
const TIARA_BANDS = [
  [[95.5, 141], [120, 148], [144.5, 141], [0.1, 0.3, 0.5, 0.7, 0.9]],
  [[98.5, 123], [120, 130], [141.5, 123], [0.2, 0.4, 0.6, 0.8]],
  [[105, 105], [120, 112], [135, 105], [0.25, 0.5, 0.75]],
];
const TIARA_LINES = TIARA_BANDS.map(([a, c, b]) => `M${xy(a)}Q${xy(c)} ${xy(b)}`).join("");
const TIARA_PEARLS = dotsPath(TIARA_BANDS.flatMap(([a, c, b, ts]) => ts.map((t) => [...onCurve(a, c, b, t), 1.8])));

/** A key: the bow below, the bit at the top. Drawn upright around its middle. */
function Key({ p }) {
  return (
    <>
      <circle cy="34" r="8" {...wash(p, 0.15)} strokeWidth="1.6" />
      <circle cy="34" r="3" strokeWidth="1.1" />
      <path d="M0 26V-40M0 -40H9V-34H5V-29H0" strokeWidth="1.8" />
      <path d="M-4 21H4" strokeWidth="1.6" />
    </>
  );
}

/* 5 · The Hierophant: the triple tiara in a fan of light, the triple cross, the two crossed keys. */
function Hierophant({ p }) {
  return (
    <>
      <path d={raysPath(120, 120, 25, 46, 58, 52, -170, 160)} strokeWidth="1" />
      <path d={TIARA} fill={NIGHT} strokeWidth="1.8" />
      <path d={TIARA} {...wash(p, 0.08)} stroke="none" />
      <path d={TIARA_LINES} strokeWidth="1.3" />
      <path d={TIARA_PEARLS} fill={p.gold} stroke="none" />
      <circle cx="120" cy="84" r="3.4" {...wash(p, 0.6)} strokeWidth="1.1" />
      <path d="M120 80V67M115 71.5H125" strokeWidth="1.4" />
      <path d="M120 162V270M112 176H128M106 190H134M100 204H140" strokeWidth="2" />
      <Mirror>
        <g transform="translate(120 300) rotate(-34)">
          <Key p={p} />
        </g>
      </Mirror>
    </>
  );
}

const LOVERS_WING = "M106 100C92 86 66 80 40 88C52 92 60 96 66 100C58 102 52 106 48 112C60 110 70 110 78 110C70 114 64 120 62 126C76 120 92 116 106 112Z";
const TREE_FLAMES = [[188, 216, 12, 4.4], [177, 224, 10, 3.8], [199, 224, 10, 3.8], [170, 238, 9, 3.4], [206, 238, 9, 3.4], [182, 236, 9, 3.4], [194, 236, 9, 3.4]]
  .map(([x, y, h, w]) => dropPath(x, y, h, w))
  .join("");

/**
 * A standing figure in a long gown, one arm reaching toward the middle of the
 * card (`toward` is 1 to the right, -1 to the left); the woman's gown flares
 * more and she wears long hair.
 */
function Figure({ x, toward, woman = false, p }) {
  const flare = woman ? 17 : 13;
  const gown = `M${x - 9} 247Q${x} 242 ${x + 9} 247L${x + 11} 280L${x + flare} 318H${x - flare}L${x - 11} 280Z`;
  const arm = `M${x + toward * 8} 249L${x + toward * 16} 266L${x + toward * 24} 270`;
  return (
    <>
      <path d={gown} fill={NIGHT} strokeWidth="1.5" />
      <path d={gown} {...wash(p, 0.08)} stroke="none" />
      <path d={`M${x - toward * 8} 250L${x - toward * 10} 282M${x} 284V316`} strokeWidth=".9" />
      <path d={arm} strokeWidth="1.5" />
      <path d={`M${x} 238.5V243`} strokeWidth="1.5" />
      <circle cx={x} cy="232" r="6.5" fill={NIGHT} strokeWidth="1.5" />
      {woman && <path d={`M${x - 6} 229C${x - 10} 238 ${x - 10} 248 ${x - 8} 258M${x + 6} 229C${x + 10} 238 ${x + 10} 248 ${x + 8} 258`} strokeWidth="1.1" />}
    </>
  );
}

const TREE_CROWN = "M34 222Q29 208 41 204Q43 192 56 194Q67 190 71 202Q80 208 74 220Q72 230 61 228Q53 234 45 228Q35 230 34 222Z";

/* 6 · The Lovers: the winged, radiant sun above two figures, the tree of fruit and serpent, the tree of flames, the mountain between. */
function Lovers({ p }) {
  return (
    <>
      <Mirror>
        <path d={LOVERS_WING} {...wash(p, 0.1)} strokeWidth="1.3" />
        <path d="M102 105C86 99 68 98 54 102" strokeWidth=".9" />
      </Mirror>
      <path d={raysPath(120, 104, 16, 15, 23, 19)} strokeWidth="1.2" />
      <circle cx="120" cy="104" r="12" {...wash(p, 0.38)} strokeWidth="1.5" />
      <path d="M92 318L120 246L148 318" {...wash(p, 0.05)} strokeWidth="1.2" />
      <path d="M112 266L120 260L128 266" strokeWidth="1" />
      <path d="M53 318C51 290 55 262 53 230M53 252L44 238M54 244L64 232" strokeWidth="1.6" />
      <path d={TREE_CROWN} fill={NIGHT} strokeWidth="1.3" />
      <path d={TREE_CROWN} {...wash(p, 0.12)} stroke="none" />
      <path d={dotsPath([[45, 211, 2.4], [60, 205, 2.4], [53, 218, 2.4], [42, 222, 2.4], [65, 219, 2.4]])} {...wash(p, 0.9)} stroke="none" />
      <path d="M46 304C62 296 44 284 60 276C68 270 50 260 58 252" strokeWidth="1.3" />
      <path d="M188 318V236M188 262L176 248M188 254L200 242" strokeWidth="1.5" />
      <path d={TREE_FLAMES} {...wash(p, 0.5)} strokeWidth="1" />
      <Figure x={86} toward={1} woman p={p} />
      <Figure x={154} toward={-1} p={p} />
      <path d="M34 318H206" strokeWidth="1.2" />
    </>
  );
}

const CANOPY_STARS = [[92, 125], [106, 116], [120, 112], [134, 116], [148, 125], [120, 127]].map(([x, y]) => starPath(x, y, 6, 3.6, 1.5)).join("");
const WINGLET = "M114 233C104 223 92 222 84 226C92 228 97 231 100 235C94 236 90 239 88 243C98 242 107 239 114 236Z";

/* 7 · The Chariot: the starry canopy on two posts, the car with its winged disc, two wheels, two sphinxes, one dark, one light. */
function Chariot({ p }) {
  return (
    <>
      <path d="M66 136C72 112 96 100 120 100C144 100 168 112 174 136Z" {...wash(p, 0.1)} strokeWidth="1.6" />
      <path d={scallopPath(66, 174, 136, 8, 4)} strokeWidth="1.3" />
      <path d={CANOPY_STARS} {...wash(p, 0.85)} strokeWidth=".8" />
      <path d="M72 141V206M168 141V206" strokeWidth="1.8" />
      <path d={raysPath(120, 170, 16, 15, 24, 19)} strokeWidth="1" />
      <path d={starPath(120, 170, 8, 12, 4.6)} {...wash(p, 0.7)} strokeWidth="1.1" />
      <SpokedWheel cx={60} cy={262} r={21} p={p} />
      <SpokedWheel cx={180} cy={262} r={21} p={p} />
      <path d="M66 204H174V268H66Z" fill={NIGHT} strokeWidth="1.8" />
      <path d="M74 212H166V260H74Z" {...wash(p, 0.06)} strokeWidth=".9" />
      <Mirror>
        <path d={WINGLET} {...wash(p, 0.25)} strokeWidth="1.1" />
      </Mirror>
      <circle cx="120" cy="234" r="6" {...wash(p, 0.5)} strokeWidth="1.3" />
      <SphinxHead x={92} y={312} dark p={p} />
      <SphinxHead x={148} y={312} p={p} />
      <path d="M34 340H206" strokeWidth="1.2" />
    </>
  );
}

/** A lion's mane: flame-like locks all round, each swept a little the same way. */
function manePath(cx, cy, n, r1, r2out) {
  const half = 180 / n;
  let d = "";
  for (let i = 0; i < n; i++) {
    const a = -90 + i * (360 / n);
    const mid = (r1 + r2out) / 2;
    d += `M${xy(polar(cx, cy, r1, a - half))}Q${xy(polar(cx, cy, mid, a - half * 0.9))} ${xy(polar(cx, cy, r2out, a + half * 0.6))}`;
    d += `Q${xy(polar(cx, cy, mid, a + half * 1.2))} ${xy(polar(cx, cy, r1, a + half))}`;
  }
  return d;
}

const MANE = manePath(120, 204, 22, 25, 56);
const LION_FACE = "M120 176C136 176 146 186 146 200C146 214 138 226 128 234Q120 240 112 234C102 226 94 214 94 200C94 186 104 176 120 176Z";
const GARLAND = [[60, 272], [120, 322], [180, 272]];
const GARLAND_TS = [0.06, 0.2, 0.35, 0.5, 0.65, 0.8, 0.94];
const GARLAND_FLOWERS = dotsPath(
  GARLAND_TS.flatMap((t) => {
    const [x, y] = onCurve(...GARLAND, t);
    return [0, 1, 2, 3, 4].map((k) => [...polar(x, y, 3.4, -90 + k * 72), 2.4]);
  }),
);
const GARLAND_HEARTS = dotsPath(GARLAND_TS.map((t) => [...onCurve(...GARLAND, t), 1.5]));
const GARLAND_LEAVES = GARLAND_TS.slice(1)
  .map((t, i) => {
    const mid = (t + GARLAND_TS[i]) / 2;
    const [x, y] = onCurve(...GARLAND, mid);
    const heading = curveHeading(...GARLAND, mid);
    return leafPath(x, y, 8, heading - 40) + leafPath(x, y, 8, heading + 140);
  })
  .join("");

/* 8 · Strength: the lemniscate, a calm lion's head in its mane of rays, the garland of flowers. */
function Strength({ p }) {
  return (
    <>
      <path d={lemniscatePath(120, 88, 22, 15)} {...wash(p, 0.1)} strokeWidth="1.8" />
      <path d={MANE} {...wash(p, 0.12)} strokeWidth="1.2" />
      <Mirror>
        <path d="M99 188Q92 172 107 176Z" {...wash(p, 0.3)} strokeWidth="1.2" />
      </Mirror>
      <path d={LION_FACE} fill={NIGHT} strokeWidth="1.8" />
      <Mirror>
        <path d="M103 200Q109 194 115 200Q109 203 103 200Z" {...wash(p, 0.8)} strokeWidth="1" />
      </Mirror>
      <path d="M115 214H125L120 221Z" {...wash(p, 0.7)} strokeWidth="1" />
      <path d="M117 203L116 214M123 203L124 214M120 221V225M112 227Q116 231 120 225Q124 231 128 227" strokeWidth="1" />
      <path d={`M${xy(GARLAND[0])}Q${xy(GARLAND[1])} ${xy(GARLAND[2])}`} strokeWidth="1.2" />
      <path d={GARLAND_LEAVES} {...wash(p, 0.3)} strokeWidth=".8" />
      <path d={GARLAND_FLOWERS} fill={IVORY} fillOpacity=".85" strokeWidth=".6" />
      <path d={GARLAND_HEARTS} fill={p.gold} stroke="none" />
    </>
  );
}

const HEXAGRAM = `${starPath(116, 185, 3, 11, 5.5)}${starPath(116, 185, 3, 11, 5.5, 90)}`;

/* 9 · The Hermit: the lantern holding a six-pointed star, hung from his staff, on the snowy peak. */
function Hermit({ p }) {
  return (
    <>
      <path d="M36 352L90 292L102 302L120 272L138 296L150 288L204 352" {...wash(p, 0.06)} strokeWidth="1.5" />
      <path d="M106 292L113 287L120 294L128 284L134 290" strokeWidth="1.1" />
      <path d={raysPath(116, 186, 16, 36, 52, 44)} strokeWidth="1.1" />
      <path d="M148 290V130C148 112 128 106 118 116C113 121 113 126 116 130V139" strokeWidth="2.4" />
      <circle cx="116" cy="143" r="3.4" strokeWidth="1.3" />
      <path d="M106 156H126L122 147H110Z" {...wash(p, 0.3)} strokeWidth="1.4" />
      <path d="M102 156H130V214H102Z" fill={NIGHT} strokeWidth="1.8" />
      <path d="M102 156H130V214H102Z" {...wash(p, 0.12)} stroke="none" />
      <path d={HEXAGRAM} {...wash(p, 0.85)} strokeWidth="1" />
      <path d="M104 214H128L124 222H108Z" {...wash(p, 0.3)} strokeWidth="1.4" />
    </>
  );
}

const WHEEL_MARKS = Array.from({ length: 8 }, (_, k) => starPath(...polar(120, 216, 44.5, -67.5 + k * 45), 4, 3.6, 1.2)).join("");

/* 10 · The Wheel of Fortune: the eight-spoked wheel, rings within rings, the serpent going down, the sphinx on top, the four winged beings. */
function Wheel({ p }) {
  return (
    <>
      <path d="M48 146C36 164 60 180 48 198C36 216 60 232 48 250C40 262 44 274 54 282" strokeWidth="1.7" />
      <ellipse cx="48" cy="141" rx="3.4" ry="5.2" {...wash(p, 0.5)} strokeWidth="1.2" />
      <circle cx="120" cy="216" r="60" fill={NIGHT} strokeWidth="2.2" />
      <circle cx="120" cy="216" r="53" strokeWidth=".9" />
      <circle cx="120" cy="216" r="36" {...wash(p, 0.07)} strokeWidth="1.4" />
      <path d={raysPath(120, 216, 8, 12, 36)} strokeWidth="1.6" />
      <path d={WHEEL_MARKS} {...wash(p, 0.7)} strokeWidth=".8" />
      <circle cx="120" cy="216" r="12" {...wash(p, 0.3)} strokeWidth="1.4" />
      <circle cx="120" cy="216" r="4" fill={p.gold} stroke="none" />
      <SphinxHead x={120} y={138} scale={0.8} p={p} />
      <Being kind="angel" x={46} y={86} p={p} />
      <Being kind="eagle" x={194} y={86} p={p} />
      <Being kind="bull" x={46} y={330} p={p} />
      <Being kind="lion" x={194} y={330} p={p} />
    </>
  );
}

/* 11 · Justice: the upright sword, the scales hung from it, the two pillars, the dais. */
function Justice({ p }) {
  return (
    <>
      <Pillar x={40} top={112} bottom={334} w={16} p={p} />
      <Pillar x={200} top={112} bottom={334} w={16} p={p} />
      <path d="M74 128H166" strokeWidth="1.8" />
      <path d="M74 128L60 186M74 128L88 186M166 128L152 186M166 128L180 186" strokeWidth="1" />
      <path d="M57 186Q74 203 91 186ZM149 186Q166 203 183 186Z" {...wash(p, 0.26)} strokeWidth="1.4" />
      <path d="M120 72L125 86V250H115V86Z" {...wash(p, 0.2)} strokeWidth="1.5" />
      <path d="M120 84V246" strokeWidth=".9" />
      <rect x="96" y="250" width="48" height="6" rx="3" {...wash(p, 0.4)} strokeWidth="1.4" />
      <rect x="116.5" y="256" width="7" height="22" fill={NIGHT} strokeWidth="1.3" />
      <circle cx="120" cy="284" r="5.5" {...wash(p, 0.4)} strokeWidth="1.4" />
      <circle cx="120" cy="128" r="3.4" fill={p.gold} stroke="none" />
      <path d="M92 304H148L154 314H86ZM80 314H160L166 324H74Z" {...wash(p, 0.08)} strokeWidth="1.3" />
    </>
  );
}

/** The Hanged Man's body: opaque, a little lighter than the night, so his shape reads against the tree. */
const BODY = "#3a3166";

/** A limb drawn as a gold-edged band. */
function Band({ d, w = 9 }) {
  return (
    <>
      <path d={d} strokeWidth={w} />
      <path d={d} stroke={BODY} strokeWidth={r2(w - 2.8)} />
    </>
  );
}

const TAU_LEAVES = [leafPath(52, 102, 13, -120), leafPath(50, 108, 12, -165), leafPath(188, 102, 13, -60), leafPath(190, 108, 12, -15), leafPath(117, 318, 13, -150), leafPath(123, 302, 13, -30)].join("");

/* 12 · The Hanged Man: the living tau, the figure hanging by one foot, legs crossed in a 4, a halo round his head. */
function HangedMan({ p }) {
  return (
    <>
      <path d="M117 114V338M123 114V338" strokeWidth="1.3" />
      <path d="M50 102H190V114H50Z" {...wash(p, 0.16)} strokeWidth="1.6" />
      <path d={TAU_LEAVES} {...wash(p, 0.3)} strokeWidth="1" />
      <path d={raysPath(120, 265, 24, 23, 34, 28)} strokeWidth="1.1" />
      <circle cx="120" cy="265" r="20" fill={NIGHT} strokeWidth="1.4" />
      <circle cx="120" cy="265" r="20" {...wash(p, 0.22)} stroke="none" />
      <Band d="M123 189L151 163L115 154" w={10} />
      <Band d="M120 120V193" w={10} />
      <path d="M106 188H134L140 244Q120 251 100 244Z" fill={BODY} strokeWidth="1.6" />
      <path d="M105 199H135" strokeWidth="1.2" />
      <ellipse cx="120" cy="112" rx="5.5" ry="8" strokeWidth="1.3" />
      <path d="M120 246V254" strokeWidth="2.4" />
      <circle cx="120" cy="264" r="10.5" fill={BODY} strokeWidth="1.6" />
      <path d="M112 271Q110 278 112 284M120 274V285M128 271Q130 278 128 284" strokeWidth="1.1" />
    </>
  );
}

/* 13 · Death: the dark banner bearing the white rose, the sun rising between two towers, the river. */
function Death({ p }) {
  return (
    <>
      <path d="M120 70L124.5 79L120 88L115.5 79Z" {...wash(p, 0.6)} strokeWidth="1.2" />
      <path d="M120 88V104" strokeWidth="2" />
      <path d="M72 104H168" strokeWidth="2.2" />
      <path d={dotsPath([[69, 104, 3.2], [171, 104, 3.2]])} fill={p.gold} stroke="none" />
      <path d="M78 106H162V238L120 214L78 238Z" fill={INK} fillOpacity=".92" strokeWidth="1.8" />
      <path d="M84 112H156V228L120 207L84 228Z" strokeWidth=".9" />
      <Rose cx={120} cy={160} r={24} p={p} />
      <path d={raysPath(120, 322, 9, 30, 46, 38, -170, 160)} strokeWidth="1.2" />
      <path d="M94 322A26 26 0 0 1 146 322Z" {...wash(p, 0.35)} strokeWidth="1.5" />
      <Turret x={58} base={322} h={58} p={p} />
      <Turret x={182} base={322} h={58} p={p} />
      <path d="M34 322H206" strokeWidth="1.4" />
      <path d={wavesPath(44, 196, 336, 8, 2)} strokeWidth="1" />
    </>
  );
}

const TEMPERANCE_WING = "M110 154C92 126 66 106 40 104Q38.5 119.5 50 130Q51.3 144 64 150Q67.1 162.9 80 166Q85.6 177.1 98 176L110 168Z";
const TEMPERANCE_FEATHERS = "M107 158L50 130M107 161L64 150M107 164L80 166M106 150C88 130 68 116 48 112";

/* 14 · Temperance: wide wings, the square holding the triangle, water flowing between two cups, the path to the crowned sun. */
function Temperance({ p }) {
  return (
    <>
      <Mirror>
        <path d={TEMPERANCE_WING} {...wash(p, 0.1)} strokeWidth="1.3" />
        <path d={TEMPERANCE_FEATHERS} strokeWidth=".8" />
      </Mirror>
      <circle cx="120" cy="128" r="12" {...wash(p, 0.12)} strokeWidth="1.2" />
      <path d={starPath(120, 128, 4, 5, 1.6)} {...wash(p, 0.8)} strokeWidth=".7" />
      <rect x="106" y="150" width="28" height="28" fill={NIGHT} strokeWidth="1.6" />
      <path d="M120 155L131.5 174H108.5Z" {...wash(p, 0.45)} strokeWidth="1.3" />
      <path d="M97 203C120 186 148 206 156 232" strokeWidth="1.5" />
      <path d="M99 208C118 194 141 211 150 233" strokeWidth="1" />
      <SuitGlyph suit="cups" x={80} y={214} size={46} rotate={28} p={p} />
      <SuitGlyph suit="cups" x={160} y={252} size={46} rotate={-12} p={p} />
      <path d="M40 304Q78 284 112 304M128 304Q162 284 200 304" {...wash(p, 0.05)} strokeWidth="1.2" />
      <path d="M112 304A8 8 0 0 1 128 304Z" {...wash(p, 0.5)} strokeWidth="1.2" />
      <path d={crownPath(120, 292, 14, 8, 3)} {...wash(p, 0.5)} strokeWidth="1" />
      <Road road={TEMPERANCE_ROAD} p={p} />
    </>
  );
}

const BAT_WING = "M112 150C98 120 70 106 38 112Q58 128 46 142Q70 148 70 170Q92 166 104 186Q108 170 112 162Z";

/** A chain of links along the curve from a to b, alternately seen flat and edge-on. */
function chainPath(a, c, b, links) {
  let d = "";
  for (let i = 0; i < links; i++) {
    const t = (i + 0.5) / links;
    const [x, y] = onCurve(a, c, b, t);
    const deg = r2(curveHeading(a, c, b, t));
    const [half, ry] = i % 2 ? [3.8, 1.3] : [4.8, 2.7];
    const end1 = xy(polar(x, y, half, deg));
    const end2 = xy(polar(x, y, half, deg + 180));
    d += `M${end1}A${half} ${ry} ${deg} 1 0 ${end2}A${half} ${ry} ${deg} 1 0 ${end1}`;
  }
  return d;
}

const CHAIN = chainPath([120, 243], [84, 262], [64, 312], 11);

/* 15 · The Devil: the inverted pentagram between horns, the bat wings, the dark pedestal with its two chains. */
function Devil({ p }) {
  return (
    <>
      <Mirror>
        <path d={BAT_WING} fill={INK} fillOpacity=".75" strokeWidth="1.4" />
        <path d="M112 152L40 113M112 156L46 142M112 159L70 170M112 162L104 186" strokeWidth=".8" />
        <path d="M106 108C96 100 92 88 98 76C100 88 106 96 114 99" {...wash(p, 0.2)} strokeWidth="1.3" />
      </Mirror>
      <circle cx="120" cy="116" r="22" fill={NIGHT} strokeWidth="1.2" />
      <path d={pentagramPath(120, 116, 20, 90)} {...wash(p, 0.12)} strokeWidth="1.6" />
      <path d="M84 206H156V216H84Z" {...wash(p, 0.2)} strokeWidth="1.4" />
      <path d="M90 216H150V296H90Z" fill={NIGHT} strokeWidth="1.8" />
      <circle cx="120" cy="238" r="5.5" strokeWidth="1.6" />
      <Mirror>
        <path d={CHAIN} strokeWidth="1.1" />
        <circle cx="60" cy="320" r="8" strokeWidth="1.6" />
      </Mirror>
      <path d="M34 334H206" strokeWidth="1.2" />
    </>
  );
}

const TOWER_FLAMES = [[104, 137, 14, 5], [114, 135, 19, 6], [127, 137, 13, 5], [112, 190, 9, 3.5], [128, 190, 9, 3.5], [120, 240, 9, 3.5]]
  .map(([x, y, h, w]) => dropPath(x, y, h, w))
  .join("");
const TOWER_YODS = [[56, 150], [86, 160], [72, 188], [52, 216], [70, 246], [56, 280], [176, 168], [194, 200], [170, 232], [190, 262], [174, 290]]
  .map(([x, y]) => dropPath(x, y, 9, 3.2))
  .join("");

/* 16 · The Tower: the tower on its rock, lightning striking the crown off, flames at the windows, falling drops. */
function TowerCard({ p }) {
  return (
    <>
      <path d="M48 352L62 330L76 322L88 306H152L166 320L180 326L194 352" {...wash(p, 0.08)} strokeWidth="1.4" />
      <path d="M98 306L102 146H138L142 306Z" fill={NIGHT} strokeWidth="1.8" />
      <path d="M101 146V136H108.5V141H116V136H123.5V141H131V136H139V146" {...wash(p, 0.1)} strokeWidth="1.5" />
      <path d="M108 200v-9a4 4 0 0 1 8 0v9ZM124 200v-9a4 4 0 0 1 8 0v9ZM116 250v-9a4 4 0 0 1 8 0v9Z" {...wash(p, 0.55)} strokeWidth="1.1" />
      <path d="M113 306v-14a7 7 0 0 1 14 0v14" strokeWidth="1.3" />
      <path d={TOWER_FLAMES} {...wash(p, 0.55)} strokeWidth="1" />
      <path d="M206 60L170 100L184 102L146 142L162 108L148 106L184 64Z" {...wash(p, 0.85)} strokeWidth="1.2" />
      <g transform="translate(80 108) rotate(-30)">
        <path d={crownPath(0, 4, 26, 14, 3)} {...wash(p, 0.4)} strokeWidth="1.3" />
        <rect x="-13" y="4" width="26" height="5" {...wash(p, 0.3)} strokeWidth="1.2" />
      </g>
      <path d={TOWER_YODS} {...wash(p, 0.6)} strokeWidth=".8" />
    </>
  );
}

const SMALL_STARS = [[66, 86], [174, 86], [48, 126], [192, 126], [66, 166], [174, 166], [120, 168]].map(([x, y]) => starPath(x, y, 8, 7.5, 2.8)).join("");

const STAR_TREE_CROWN = "M30 232Q26 222 35 219Q37 210 46 212Q55 210 58 219Q64 226 57 233Q53 240 45 237Q36 241 30 232Z";

/** A jug with a handle, its mouth up before it is turned to pour. */
function Jug({ x, y, deg, p }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${deg})`} strokeWidth="1.3">
      <path d="M-4 -9C-13 -6 -14 8 -6 14H6C14 8 13 -6 4 -9Z" {...wash(p, 0.22)} />
      <path d="M-4 -9L-3 -17M4 -9L3 -17" />
      <path d="M-5.5 -18.5H5.5" strokeWidth="1.6" />
      <path d="M3.5 -14C11 -15 13 -6 9 -1" strokeWidth="1.1" />
      <path d="M-11 3H11" strokeWidth=".7" />
    </g>
  );
}

/* 17 · The Star: the great eight-pointed star and seven small ones, two jugs pouring into the pool, the bird on its tree. */
function StarCard({ p }) {
  return (
    <>
      <path d={starPath(120, 114, 8, 21, 8.5, -67.5)} {...wash(p, 0.25)} strokeWidth="1" />
      <path d={starPath(120, 114, 8, 32, 11)} {...wash(p, 0.6)} strokeWidth="1.5" />
      <path d={SMALL_STARS} {...wash(p, 0.7)} strokeWidth="1" />
      <ellipse cx="120" cy="304" rx="64" ry="13" {...wash(p, 0.07)} strokeWidth="1.3" />
      <ellipse cx="120" cy="304" rx="38" ry="7" strokeWidth=".8" />
      <ellipse cx="120" cy="304" rx="14" ry="2.6" strokeWidth=".8" />
      <Mirror>
        <path d="M104 234C112 246 114 270 113 298M101 236C108 252 108 276 107 298" strokeWidth="1" />
        <Jug x={86} y={228} deg={105} p={p} />
      </Mirror>
      <path d="M44 318C43 290 45 262 44 236M44 262L36 250M45 254L53 244" strokeWidth="1.5" />
      <path d={STAR_TREE_CROWN} fill={NIGHT} strokeWidth="1.2" />
      <path d={STAR_TREE_CROWN} {...wash(p, 0.12)} stroke="none" />
      <path d="M36 205Q42 197 52 201Q48 208 36 205Z" {...wash(p, 0.6)} strokeWidth="1" />
      <path d="M50 201Q54 195 58 198Q63 201 65 208M36 205L30 208M43 206V211M47 206V211" strokeWidth="1" />
      <path d="M30 324H210" strokeWidth="1.1" />
    </>
  );
}

const MOON_DROPS = Array.from({ length: 9 }, (_, i) => polar(120, 118, 62, 50 + i * 10))
  .map(([x, y]) => dropPath(x, y + 4, 9, 3.2))
  .join("");

/* 18 · The Moon: the crescent inside the sun's disc, its falling drops, two towers, the winding path, the waves. */
function MoonCard({ p }) {
  return (
    <>
      <path d={raysPath(120, 118, 32, 33, 46, 39)} strokeWidth="1.1" />
      <circle cx="120" cy="118" r="29" fill={NIGHT} strokeWidth="1.8" />
      <circle cx="120" cy="118" r="29" {...wash(p, 0.12)} stroke="none" />
      <path d="M126 94A24 24 0 1 0 126 142A10 24 0 1 1 126 94Z" {...wash(p, 0.6)} strokeWidth="1.2" />
      <path d={MOON_DROPS} {...wash(p, 0.6)} strokeWidth=".8" />
      <Turret x={50} base={292} h={86} p={p} />
      <Turret x={190} base={292} h={86} p={p} />
      <path d="M92 244L106 230L116 238L128 224L148 244" {...wash(p, 0.05)} strokeWidth="1.1" />
      <Road road={MOON_ROAD} p={p} />
      <path d="M32 292H70M170 292H208" strokeWidth="1" />
      <path d={`${wavesPath(34, 206, 324, 8, 2.4)}${wavesPath(34, 206, 334, 8, 2.4)}${wavesPath(46, 194, 344, 7, 2.4)}`} strokeWidth="1.1" />
    </>
  );
}

const SUN_WAVES = Array.from({ length: 12 }, (_, k) => wavyRayPath(120, 136, -75 + k * 30, 40, 62, 2.6)).join("");
const SUNFLOWERS = [[56, 228], [88, 216], [152, 216], [184, 228]];
const SUNFLOWER_PETALS = SUNFLOWERS.flatMap(([x, y]) => Array.from({ length: 10 }, (_, k) => leafPath(...polar(x, y, 4.4, k * 36), 7.5, k * 36, 2.6))).join("");
const SUNFLOWER_HEARTS = dotsPath(SUNFLOWERS.map(([x, y]) => [x, y, 4.4]));
const SUNFLOWER_STEMS = SUNFLOWERS.map(([x, y]) => `M${x} ${y + 5}V252`).join("");
const SUNFLOWER_LEAVES = SUNFLOWERS.map(([x, y], i) => leafPath(x, 246 - (y - 216) / 2, 10, i < 2 ? -150 : -30)).join("");
const WALL_JOINTS = "M36 262H204M64 252V262M92 252V262M120 252V262M148 252V262M176 252V262M50 262V272M78 262V272M106 262V272M134 262V272M162 262V272M190 262V272";

/* 19 · The Sun: the great sun with straight and waving rays, sunflowers over the wall, the banner. */
function SunCard({ p }) {
  return (
    <>
      <path d={raysPath(120, 136, 12, 40, 66)} strokeWidth="1.4" />
      <path d={SUN_WAVES} strokeWidth="1.2" />
      <circle cx="120" cy="136" r="33" {...wash(p, 0.22)} strokeWidth="2" />
      <circle cx="120" cy="136" r="26" strokeWidth=".9" />
      <path d={SUNFLOWER_STEMS} strokeWidth="1.2" />
      <path d={SUNFLOWER_LEAVES} {...wash(p, 0.25)} strokeWidth=".9" />
      <path d={SUNFLOWER_PETALS} {...wash(p, 0.45)} strokeWidth=".7" />
      <path d={SUNFLOWER_HEARTS} {...wash(p, 0.85)} strokeWidth=".8" />
      <path d="M36 252H204V272H36Z" {...wash(p, 0.06)} strokeWidth="1.4" />
      <path d={WALL_JOINTS} strokeWidth=".8" />
      <path d="M58 300Q120 322 182 300L200 296L192 307L200 318L182 314Q120 336 58 314L40 318L48 307L40 296Z" {...wash(p, 0.16)} strokeWidth="1.4" />
      <path d="M66 307Q120 328 174 307" strokeWidth=".8" />
    </>
  );
}

/** One of the dead rising, arms up, from an open coffin. */
function Riser({ x, y, p }) {
  return (
    <>
      <path d={`M${x - 6} ${y - 20}L${x - 15} ${y - 40}M${x + 6} ${y - 20}L${x + 15} ${y - 40}`} strokeWidth="1.5" />
      <path d={`M${x - 6.5} ${y - 21}L${x - 5} ${y + 4}H${x + 5}L${x + 6.5} ${y - 21}Z`} fill={NIGHT} strokeWidth="1.4" />
      <circle cx={x} cy={y - 29} r="6" fill={NIGHT} strokeWidth="1.4" />
      <path d={`M${x - 15} ${y + 2}H${x + 15}V${y + 14}H${x - 15}Z`} {...wash(p, 0.14)} strokeWidth="1.3" />
    </>
  );
}

const JUDGEMENT_CLOUD = "M50 112Q46 98 60 96Q62 82 78 84Q88 70 104 78Q116 66 130 76Q146 68 156 82Q172 80 174 94Q190 96 188 112Z";

/* 20 · Judgement: the trumpet with its cross banner sounding from the clouds, three figures rising, the mountains, the water. */
function Judgement({ p }) {
  return (
    <>
      <path d="M84 114L64 170M102 116L94 182M138 116L146 182M156 114L176 170" strokeWidth=".9" strokeOpacity=".7" />
      <path d="M30 306L52 256L64 272L78 248L100 306M140 306L162 248L176 272L188 256L210 306" {...wash(p, 0.05)} strokeWidth="1.2" />
      <path d="M70 256L78 248L86 258M154 258L162 248L170 256" strokeWidth="1" />
      <path d={JUDGEMENT_CLOUD} fill={NIGHT} strokeWidth="1.6" />
      <path d={JUDGEMENT_CLOUD} {...wash(p, 0.16)} stroke="none" />
      <path d="M58 104Q120 112 182 104" strokeWidth=".8" />
      <path d="M136.2 128L122.4 150.1V176L136.2 154Z" {...wash(p, 0.2)} strokeWidth="1.2" />
      <path d="M129.3 141V163M123.5 152H135" strokeWidth="1.6" />
      <g transform="translate(150 106) rotate(122)">
        <path d="M0 -1.8L62 -3Q74 -4 82 -13V13Q74 4 62 3L0 1.8Z" {...wash(p, 0.35)} strokeWidth="1.3" />
        <ellipse cx="82" rx="3" ry="13" {...wash(p, 0.4)} strokeWidth="1.2" />
      </g>
      <Riser x={78} y={296} p={p} />
      <Riser x={120} y={286} p={p} />
      <Riser x={162} y={296} p={p} />
      <path d={`${wavesPath(34, 206, 324, 9, 2)}${wavesPath(44, 196, 336, 8, 2)}`} strokeWidth="1" />
    </>
  );
}

/** The right half of the laurel wreath: leaves in pairs climbing from the bottom tie to the top one. */
function wreathHalf(cx, cy, rx, ry, count) {
  let d = "";
  for (let i = 0; i < count; i++) {
    const t = 80 - (i * 160) / (count - 1);
    const [x, y] = polar(0, 0, 1, t);
    const at = [cx + rx * x, cy + ry * y];
    const heading = Math.atan2(-ry * x, rx * y) * (180 / Math.PI);
    d += leafPath(at[0], at[1], 13, heading + 32, 4.8) + leafPath(at[0], at[1], 13, heading - 32, 4.8);
  }
  return d;
}

const WREATH = wreathHalf(120, 210, 52, 86, 12);
const COMPASS_STAR = `M${Array.from({ length: 16 }, (_, i) => xy(polar(120, 210, i % 2 ? 5.5 : (i / 2) % 2 ? 15 : 32, -90 + i * 22.5))).join("L")}Z`;

/* 21 · The World: the laurel wreath tied with ribbons, a star at its centre, the four winged beings in the corners. */
function World({ p }) {
  return (
    <>
      <Being kind="angel" x={44} y={84} p={p} />
      <Being kind="eagle" x={196} y={84} p={p} />
      <Being kind="bull" x={44} y={330} p={p} />
      <Being kind="lion" x={196} y={330} p={p} />
      <ellipse cx="120" cy="210" rx="52" ry="86" strokeWidth=".9" />
      <Mirror>
        <path d={WREATH} {...wash(p, 0.3)} strokeWidth=".9" />
      </Mirror>
      <path d="M118 128C112 138 104 140 98 138M122 128C128 138 136 140 142 138M118 298C114 310 108 316 100 318M122 298C126 310 132 316 140 318" strokeWidth="1.2" />
      <path d={`${lemniscatePath(120, 124, 13, 8)}${lemniscatePath(120, 296, 13, 8)}`} {...wash(p, 0.3)} strokeWidth="1.4" />
      <circle cx="120" cy="210" r="42" strokeWidth="1.3" strokeDasharray=".1 5" />
      <path d={COMPASS_STAR} {...wash(p, 0.55)} strokeWidth="1.3" />
      <circle cx="120" cy="210" r="3" fill={IVORY} stroke="none" />
    </>
  );
}

/** The emblems in Rider-Waite-Smith order, 0 (The Fool) to 21 (The World). */
export const MAJOR_EMBLEMS = Object.freeze([
  Fool, Magician, Priestess, Empress, Emperor, Hierophant, Lovers, Chariot, Strength, Hermit, Wheel,
  Justice, HangedMan, Death, Temperance, Devil, TowerCard, StarCard, MoonCard, SunCard, Judgement, World,
]);
