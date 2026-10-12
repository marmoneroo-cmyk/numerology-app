/**
 * The wheel of numbers 1 to 9 on the home screen: today's universal day lit on the ring and large in the
 * middle. A bubble inside the ring by each number counts the active clients on that life path, a master path
 * with the number it reduces to (the owner, 2026-10-12: real counts, and a wheel that stays easy to read).
 * It is a picture, so what it shows is said in its label for screen readers.
 */
import { useId } from "react";
import { WHEEL_NUMBERS, bubbleRadius, wheelPoint } from "./dashboard.js";

/** The wheel's radii in its 240-unit square: the outer ring, the numbers, the inner ring, the bubbles, and today's ring and glow. */
const R = { outer: 106, label: 89, inner: 72, bubble: 54, mark: 15, halo: 30 };

/** The three triangles that join every third number (3-6-9, 1-4-7, 2-5-8), drawn on the inner ring. */
const TRIANGLES = [
  [3, 6, 9],
  [1, 4, 7],
  [2, 5, 8],
]
  .map((corners) => `${corners.map((n, i) => `${i ? "L" : "M"}${wheelPoint(n, R.inner).x.toFixed(2)} ${wheelPoint(n, R.inner).y.toFixed(2)}`).join(" ")} Z`)
  .join(" ");

const clientsText = (count, he) => {
  if (he) return count === 1 ? "לקוח אחד" : `${count} לקוחות`;
  return count === 1 ? "1 client" : `${count} clients`;
};

/** What the wheel shows, in words. */
function describe(he, day, paths) {
  const head = he ? `גלגל המספרים 1 עד 9. היום האוניברסלי הוא ${day}.` : `The wheel of numbers 1 to 9. The universal day is ${day}.`;
  if (!paths) return head;
  if (!paths.counted) return `${head} ${he ? "עוד אין לקוחות עם תאריך לידה." : "No clients with a birth date yet."}`;
  const list = WHEEL_NUMBERS.filter((n) => paths.counts[n]).map((n) => `${n}: ${clientsText(paths.counts[n], he)}`);
  const masters = paths.masters ? ` ${he ? "11, 22 ו-33 נספרים עם 2, 4 ו-6." : "11, 22 and 33 count with 2, 4 and 6."}` : "";
  return `${head} ${he ? "לקוחות לפי שביל גורל" : "Clients by life path"}: ${list.join(", ")}.${masters}`;
}

/** Under the wheel: what the bubbles are, once the clients are in. */
function Key({ he, paths }) {
  if (!paths) return null;
  if (!paths.counted) return <span>{he ? "כאן יופיע כמה לקוחות יש בכל שביל גורל." : "How many clients walk each life path will show here."}</span>;
  return (
    <>
      <span className="st-wheel-key-item">
        <span className="st-wheel-dot" />
        {he ? "לקוחות בכל שביל גורל" : "Clients on each life path"}
      </span>
      {paths.masters > 0 && <span className="st-wheel-key-note">{he ? "11, 22 ו-33 נספרים עם 2, 4 ו-6" : "11, 22 and 33 count with 2, 4 and 6"}</span>}
    </>
  );
}

/**
 * @param {{he: boolean, day: number, paths: ReturnType<typeof import("./dashboard.js").lifePathCounts> | null, caption?: import("react").ReactNode}} props
 *   `day` the universal day (1 to 9); `paths` null while the clients load or when they failed to; `caption`
 *   under the wheel, outside the picture, so a button in it can be reached
 */
export default function NumberWheel({ he, day, paths, caption }) {
  const glow = `${useId().replace(/:/g, "")}-glow`;
  const most = paths ? Math.max(...paths.counts) : 0;
  const lit = wheelPoint(day, R.label);
  return (
    <div className="st-wheel">
      <div className="st-wheel-disc" role="img" aria-label={describe(he, day, paths)}>
        <svg className="st-wheel-svg" viewBox="-120 -120 240 240" aria-hidden="true" focusable="false">
          <defs>
            <radialGradient id={glow}>
              <stop offset="0" className="st-wheel-glow-in" />
              <stop offset="1" className="st-wheel-glow-out" />
            </radialGradient>
          </defs>
          <circle className="st-wheel-ring st-wheel-outer" r={R.outer} pathLength="1" />
          <circle className="st-wheel-ring st-wheel-inner" r={R.inner} />
          <path className="st-wheel-star" d={TRIANGLES} />
          <circle className="st-wheel-halo" cx={lit.x} cy={lit.y} r={R.halo} fill={`url(#${glow})`} />
          <circle className="st-wheel-mark" cx={lit.x} cy={lit.y} r={R.mark} />
          {WHEEL_NUMBERS.map((n) => {
            const p = wheelPoint(n, R.label);
            return (
              <text key={n} className={`st-wheel-num${n === day ? " is-today" : ""}`} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" style={{ "--n": n }}>
                {n}
              </text>
            );
          })}
          {paths &&
            WHEEL_NUMBERS.filter((n) => paths.counts[n]).map((n) => {
              const p = wheelPoint(n, R.bubble);
              const count = paths.counts[n];
              return (
                <g key={n} className={`st-wheel-count${n === day ? " is-today" : ""}`} style={{ "--n": n }}>
                  <title>{`${he ? "שביל גורל" : "Life path"} ${n}: ${clientsText(count, he)}`}</title>
                  <circle cx={p.x} cy={p.y} r={bubbleRadius(count, most)} />
                  <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central">
                    {count}
                  </text>
                </g>
              );
            })}
        </svg>
        <span className="st-today-num">{day}</span>
      </div>
      {caption}
      {/* the picture's label already says all this */}
      <p className="st-wheel-key" aria-hidden="true">
        <Key he={he} paths={paths} />
      </p>
    </div>
  );
}
