/**
 * The 56 minor arcana, drawn from the suit's glyph: as pips (2 to 10, in the
 * classic playing-card columns, each pip marked data-pip), as one large ace in
 * a crown of rays, or under the court card's rank mark: the page's star over
 * the glyph held up on a stand, the knight's plumed helm, the queen's arched
 * crown between two branches, the king's crown with orb and cross over two
 * crossed sceptres. Same space and paint set as the major emblems.
 */
import {
  IVORY,
  NIGHT,
  Mirror,
  SuitGlyph,
  crownPath,
  crownPearls,
  dotsPath,
  dropPath,
  leafPath,
  lemniscatePath,
  polar,
  r2,
  raysPath,
  sprigPath,
  starPath,
  wash,
} from "./tarotArtShapes.jsx";

const TALL_SUITS = new Set(["wands", "swords"]);
/** The middle of the drawing area, between the ornaments above and below. */
const CY = 205;
const PIP_DX = 54;

/** Where the pips go, as [column, row]: columns -1, 0, 1; rows from -1 (top) to 1 (bottom). */
const PIP_LAYOUTS = {
  2: [[0, -1], [0, 1]],
  3: [[0, -1], [0, 0], [0, 1]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
  7: [[-1, -1], [1, -1], [0, -0.5], [-1, 0], [1, 0], [-1, 1], [1, 1]],
  8: [[-1, -1], [1, -1], [0, -0.5], [-1, 0], [1, 0], [0, 0.5], [-1, 1], [1, 1]],
  9: [[-1, -1], [1, -1], [-1, -1 / 3], [1, -1 / 3], [0, 0], [-1, 1 / 3], [1, 1 / 3], [-1, 1], [1, 1]],
  10: [[-1, -1], [1, -1], [0, -2 / 3], [-1, -1 / 3], [1, -1 / 3], [-1, 1 / 3], [1, 1 / 3], [0, 2 / 3], [-1, 1], [1, 1]],
};
/** How far the top and bottom rows sit from the middle, per layout. */
const PIP_REACH = { 2: 62, 3: 96, 4: 80, 5: 80, 6: 98, 7: 98, 8: 98, 9: 108, 10: 108 };
/** The glyph's height per layout: tall glyphs (wands, swords) and round ones (cups, pentacles). */
const PIP_SIZE = {
  tall: { 2: 110, 3: 84, 4: 100, 5: 92, 6: 86, 7: 84, 8: 84, 9: 64, 10: 64 },
  round: { 2: 74, 3: 64, 4: 70, 5: 62, 6: 62, 7: 58, 8: 58, 9: 52, 10: 52 },
};

/** The small rosette in the empty middle of the even pip cards; only its star where tall glyphs leave little room. */
function Rosette({ roomy, p }) {
  return (
    <>
      {roomy && <circle cx="120" cy={CY} r="10" strokeWidth="1.1" strokeDasharray=".1 3.6" />}
      <path d={starPath(120, CY, 8, roomy ? 6.5 : 5, roomy ? 2.4 : 1.9)} {...wash(p, 0.6)} strokeWidth=".8" />
    </>
  );
}

/** The two of cups' caduceus between the cups: a winged staff and two serpents. */
function Caduceus({ p }) {
  return (
    <>
      <path d="M120 186V230" strokeWidth="1.4" />
      <path d="M114 226C114 218 126 214 126 207C126 200 114 197 115 190M126 226C126 218 114 214 114 207C114 200 126 197 125 190" strokeWidth="1.1" />
      <Mirror>
        <path d={leafPath(118, 189, 14, -158, 4.6)} {...wash(p, 0.35)} strokeWidth=".9" />
      </Mirror>
      <circle cx="120" cy="184" r="2.6" fill={p.gold} stroke="none" />
    </>
  );
}

/** The two of pentacles' endless band: a ribbon in a figure of eight round both coins. */
function InfinityBand() {
  const band = lemniscatePath(120, CY, 96, 56);
  return (
    <g transform={`rotate(90 120 ${CY})`}>
      <path d={band} strokeWidth="5" />
      <path d={band} stroke={NIGHT} strokeWidth="2.4" />
    </g>
  );
}

/** What sits between the pips: the band or the caduceus on the twos that have one, a rosette in any other empty middle. */
function PipsMiddle({ suit, count, p }) {
  if (count === 2 && suit === "pentacles") return <InfinityBand />;
  if (count === 2 && suit === "cups") return <Caduceus p={p} />;
  if (count % 2) return null;
  return <Rosette roomy={!(TALL_SUITS.has(suit) && (count === 2 || count === 8))} p={p} />;
}

function Pips({ suit, count, p }) {
  const size = PIP_SIZE[TALL_SUITS.has(suit) ? "tall" : "round"][count];
  return (
    <>
      <PipsMiddle suit={suit} count={count} p={p} />
      {PIP_LAYOUTS[count].map(([col, row], i) => (
        <SuitGlyph key={i} data-pip={i + 1} suit={suit} x={120 + col * PIP_DX} y={CY + row * PIP_REACH[count]} size={size} p={p} />
      ))}
    </>
  );
}

const ACE_SIZE = { wands: 196, swords: 206, cups: 150, pentacles: 140 };
const ACE_RAYS = raysPath(120, CY, 40, 66, 96, 84);
const FALLING_LEAVES = [
  leafPath(52, 112, 10, 200),
  leafPath(190, 104, 10, -20),
  leafPath(30, 250, 10, 150),
  leafPath(210, 262, 10, 30),
  leafPath(66, 322, 10, 110),
  leafPath(176, 330, 10, 70),
].join("");
const FALLING_DROPS = [
  [62, 96],
  [178, 92],
  [34, 172],
  [206, 180],
  [40, 300],
  [200, 310],
]
  .map(([x, y]) => dropPath(x, y, 9, 3.2))
  .join("");
const DOVE_WING = leafPath(118, 106, 30, -148, 8);
const OLIVE = [[102, 138], [84, 142], [80, 180]];
const PALM = [[138, 138], [156, 142], [160, 180]];
/** The point at `deg` on the ellipse round (cx, cy). */
function onEllipse(cx, cy, rx, ry, deg) {
  const [cos, sin] = polar(0, 0, 1, deg);
  return [cx + rx * cos, cy + ry * sin];
}

const ARCH_ROSES = dotsPath([200, 230, 260, 280, 310, 340].map((deg) => [...onEllipse(120, 332, 32, 24, deg), 2.4]));

/** What each suit's ace adds to its glyph: below it, and over it. */
const ACE_EXTRAS = {
  wands: {
    under: (p) => <path d={FALLING_LEAVES} {...wash(p, 0.4)} strokeWidth=".9" />,
  },
  cups: {
    under: (p) => (
      <>
        <path d={FALLING_DROPS} {...wash(p, 0.6)} strokeWidth=".8" />
        <Mirror>
          <path d={DOVE_WING} fill={IVORY} fillOpacity=".85" strokeWidth="1.1" />
          <path d="M114 104L97 93M114 108L100 100" strokeWidth=".7" />
        </Mirror>
        <path d="M117 97L113 88L120 92L127 88L123 97" fill={IVORY} fillOpacity=".85" strokeWidth="1" />
        <path d="M120 95C123.5 101 123.5 112 120 120C116.5 112 116.5 101 120 95Z" fill={IVORY} strokeWidth="1.1" />
        <circle cx="120" cy="130" r="3.4" {...wash(p, 0.6)} strokeWidth=".9" />
      </>
    ),
  },
  swords: {
    over: (p) => (
      <>
        <path d="M102 138Q84 142 80 180M138 138Q156 142 160 180" strokeWidth="1.1" />
        <path d={sprigPath(...OLIVE, 5, 7, 40)} {...wash(p, 0.35)} strokeWidth=".8" />
        <path d={sprigPath(...PALM, 6, 10, 28)} {...wash(p, 0.3)} strokeWidth=".8" />
        <path d={crownPath(120, 134, 36, 16, 5)} {...wash(p, 0.3)} strokeWidth="1.3" />
        <rect x="102" y="134" width="36" height="6" rx="1.5" {...wash(p, 0.35)} strokeWidth="1.2" />
        <path d={crownPearls(120, 134, 36, 16, 5, 1.8)} fill={IVORY} strokeWidth=".7" />
      </>
    ),
  },
  pentacles: {
    under: (p) => (
      <>
        <path d="M88 354V332A32 24 0 0 1 152 332V354M96 354V332A24 18 0 0 1 144 332V354" strokeWidth="1.3" />
        <path d="M88 332A32 24 0 0 1 152 332H144A24 18 0 0 0 96 332Z" {...wash(p, 0.12)} stroke="none" />
        <path d={ARCH_ROSES} fill={IVORY} fillOpacity=".85" strokeWidth=".6" />
        <path d="M74 354H166" strokeWidth="1.1" />
      </>
    ),
  },
};

function Ace({ suit, p }) {
  const extras = ACE_EXTRAS[suit];
  return (
    <>
      <path d={ACE_RAYS} strokeWidth=".9" />
      <circle cx="120" cy={CY} r="62" fill={NIGHT} strokeWidth="1" />
      <circle cx="120" cy={CY} r="57" strokeWidth="1.2" strokeDasharray=".1 4.2" />
      {extras.under?.(p)}
      <SuitGlyph suit={suit} x={120} y={CY} size={ACE_SIZE[suit]} sw={1.9} p={p} />
      {extras.over?.(p)}
    </>
  );
}

/* ─── the court cards ─── */

const COURT_GLYPH = { wands: 148, swords: 148, cups: 112, pentacles: 104 };
const COURT_Y = 226;
const DAIS = "M86 314H154V321H86ZM76 321H164V328H76Z";

/** The page raises the glyph above his head: it sits higher and smaller, his left hand holds it here (the right mirrors it). */
const PAGE_GLYPH = { wands: 116, swords: 116, cups: 90, pentacles: 84 };
const PAGE_Y = 166;
const PAGE_HAND = { wands: [114, 222], swords: [114, 222], cups: [104, 207], pentacles: [101, 200] };
const PAGE_ROBE = "M108 265Q120 260 132 265L138 316H102Z";

/** The knight's horse, its head and neck in profile, facing left. */
const HORSE = "M2 -26L-1 -19C-6 -17 -12 -13 -16 -7C-19 -3 -23 1 -23 4C-23 7 -20 9 -17 8C-13 7 -9 5 -6 4C-8 9 -11 15 -13 22L-15 26H17L15 20C18 8 17 -6 10 -16C8 -19 6 -22 2 -26Z";
const QUEEN_BRANCH = [[100, 316], [62, 270], [74, 176]];

/** A sceptre `length` long, upright from its foot at (0, 0): a rod with an orb and a fleur at the top. */
function Sceptre({ length, p }) {
  const top = -length;
  return (
    <>
      <path d={`M0 0V${top + 8}`} strokeWidth="2" />
      <circle cy="2.5" r="2.8" {...wash(p, 0.4)} strokeWidth="1.1" />
      <circle cy={top + 4} r="4" {...wash(p, 0.45)} strokeWidth="1.2" />
      <path d={`${leafPath(0, top, 10, -90, 3.6)}${leafPath(0, top + 1, 9, -140, 3)}${leafPath(0, top + 1, 9, -40, 3)}`} {...wash(p, 0.45)} strokeWidth="1" />
    </>
  );
}

/** The page himself: a small figure on a step, arms up to the glyph's hands for this suit. */
function PageFigure({ suit, p }) {
  const [hx, hy] = PAGE_HAND[suit];
  const arm = `M108 267L${hx - 12} ${r2((266 + hy) / 2 + 6)}L${hx} ${hy}`;
  return (
    <>
      <path d="M92 316H148V323H92Z" {...wash(p, 0.12)} strokeWidth="1.3" />
      <path d={PAGE_ROBE} fill={NIGHT} strokeWidth="1.5" />
      <path d={PAGE_ROBE} {...wash(p, 0.1)} stroke="none" />
      <path d="M120 271V314" strokeWidth=".8" />
      <Mirror>
        <path d={arm} strokeWidth="1.8" />
      </Mirror>
      <path d="M120 259V264" strokeWidth="1.6" />
      <circle cx="120" cy="252" r="7.5" fill={NIGHT} strokeWidth="1.5" />
    </>
  );
}

/** Each rank's marks: what goes behind the glyph, and what goes over it. */
const COURT_MARKS = {
  11: {
    back: (p, suit) => <PageFigure suit={suit} p={p} />,
    front: (p) => (
      <>
        <path d={raysPath(120, 84, 8, 13, 18, 15.5, -67.5)} strokeWidth=".9" />
        <path d={starPath(120, 84, 8, 10, 3.8)} {...wash(p, 0.75)} strokeWidth="1" />
      </>
    ),
  },
  12: {
    back: (p) => <path d={DAIS} {...wash(p, 0.1)} strokeWidth="1.3" />,
    front: (p) => (
      <g transform="translate(122 108) scale(1.1)" strokeWidth="1.5">
        <path d={HORSE} {...wash(p, 0.22)} />
        <path d="M8 -12C12 -6 13 2 11 10M3 -15C7 -9 8 -1 6 7M-15 26H17" strokeWidth=".8" />
        <path d={dotsPath([[-9, -9, 1.6], [-19.5, 3, 0.9]])} fill={p.gold} stroke="none" />
      </g>
    ),
  },
  13: {
    back: (p) => (
      <>
        <Mirror>
          <path d={`M${QUEEN_BRANCH[0].join(" ")}Q${QUEEN_BRANCH[1].join(" ")} ${QUEEN_BRANCH[2].join(" ")}`} strokeWidth="1.2" />
          <path d={sprigPath(...QUEEN_BRANCH, 6, 10, 40)} {...wash(p, 0.3)} strokeWidth=".8" />
        </Mirror>
        <path d={DAIS} {...wash(p, 0.1)} strokeWidth="1.3" />
      </>
    ),
    front: (p) => (
      <>
        <path d="M96 124C96 102 110 92 120 92C130 92 144 102 144 124M108 124C108 106 114 98 120 98C126 98 132 106 132 124" strokeWidth="1.2" />
        <path d={crownPath(120, 126, 52, 16, 5)} {...wash(p, 0.22)} strokeWidth="1.4" />
        <path d={crownPearls(120, 126, 52, 16, 5, 2)} fill={IVORY} strokeWidth=".8" />
        <rect x="93" y="126" width="54" height="8" rx="2" {...wash(p, 0.3)} strokeWidth="1.4" />
        <path d={dotsPath([[104, 130, 1.6], [120, 130, 1.6], [136, 130, 1.6]])} fill={IVORY} stroke="none" />
        <circle cx="120" cy="88" r="4" {...wash(p, 0.6)} strokeWidth="1.1" />
      </>
    ),
  },
  14: {
    back: (p) => <path d={DAIS} {...wash(p, 0.1)} strokeWidth="1.3" />,
    front: (p) => (
      <>
        <Mirror>
          <g transform="translate(86 160) rotate(40)">
            <Sceptre length={100} p={p} />
          </g>
        </Mirror>
        <path d={crownPath(120, 130, 50, 18, 3)} {...wash(p, 0.25)} strokeWidth="1.5" />
        <path d={crownPearls(120, 130, 50, 18, 3, 2.2)} fill={IVORY} strokeWidth=".8" />
        <rect x="94" y="130" width="52" height="8" rx="2" {...wash(p, 0.32)} strokeWidth="1.4" />
        <circle cx="120" cy="104" r="6.5" {...wash(p, 0.45)} strokeWidth="1.4" />
        <path d="M113.5 104H126.5" strokeWidth="1" />
        <path d="M120 97.5V84M114.5 89H125.5" strokeWidth="1.6" />
      </>
    ),
  },
};

function Court({ suit, rank, p }) {
  const page = rank === 11;
  const size = (page ? PAGE_GLYPH : COURT_GLYPH)[suit];
  const y = page ? PAGE_Y : COURT_Y;
  const marks = COURT_MARKS[rank];
  return (
    <>
      {marks.back(p, suit)}
      <SuitGlyph suit={suit} x={120} y={y} size={size} sw={1.8} p={p} />
      {marks.front(p)}
    </>
  );
}

/** A minor card's emblem: 1 the ace, 2..10 the pips, 11..14 page, knight, queen and king. */
export function MinorEmblem({ suit, number, p }) {
  if (number === 1) return <Ace suit={suit} p={p} />;
  if (number <= 10) return <Pips suit={suit} count={number} p={p} />;
  return <Court suit={suit} rank={number} p={p} />;
}
