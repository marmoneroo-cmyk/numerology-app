/**
 * A tarot card that turns over in 3D. Face down it shows the gold back; face
 * up, the number, the art, the title and the subtitle, with a glow, a shine
 * and a burst of sparks. On a computer, a closed card leans toward the mouse.
 *
 * Without `open` the card keeps its own state. With `open` the parent decides,
 * and a press only asks for the change through `onToggle(next)`. A `dimmed`
 * card has stepped back (one of the cards not chosen): it is also disabled, so a
 * screen reader announces it as unavailable and a press does nothing.
 */
import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion, vibrate } from "../motion.js";
import "./card.css";

const SPARK_COUNT = 18;
const SPARK_LIFE_MS = 1700;
const SPARK_JITTER = 0.4; // radians added to each evenly spaced direction
const SPARK_REACH_PX = [70, 130];
const SPARK_DELAY_S = [0.35, 0.5]; // they leave as the flip lands
const OPEN_BUZZ_MS = 14;
const TILT_ACROSS_MAX = 9; // degrees in --tx, from where the mouse is side to side
const TILT_DOWN_MAX = 7; // degrees in --ty, from where the mouse is top to bottom

const between = ([min, max]) => min + Math.random() * (max - min);
const clamp = (value, max) => Math.max(-max, Math.min(max, value));

/** One burst: evenly spaced directions with a little jitter, each spark with its own reach and start. */
function makeSparks(firstId) {
  return Array.from({ length: SPARK_COUNT }, (_, i) => {
    const angle = (Math.PI * 2 * i) / SPARK_COUNT + Math.random() * SPARK_JITTER;
    const reach = between(SPARK_REACH_PX);
    return {
      id: firstId + i,
      dx: (Math.cos(angle) * reach).toFixed(1),
      dy: (Math.sin(angle) * reach).toFixed(1),
      delay: between(SPARK_DELAY_S).toFixed(2),
    };
  });
}

/**
 * The sparks and the short vibration when the card turns face up, whoever turned it.
 * A card that arrives open stays quiet, and a new burst replaces one still flying (18 at most).
 */
function useSparkBurst(isOpen) {
  const [sparks, setSparks] = useState([]);
  const nextId = useRef(0);
  const wasOpen = useRef(isOpen);
  const timers = useRef(new Set());

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  useEffect(() => {
    const turnedUp = isOpen && !wasOpen.current;
    wasOpen.current = isOpen;
    if (!turnedUp) return;
    vibrate(OPEN_BUZZ_MS);
    if (prefersReducedMotion()) return;
    const burst = makeSparks(nextId.current);
    nextId.current += SPARK_COUNT;
    setSparks(burst);
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      setSparks((list) => list.filter((spark) => !burst.includes(spark)));
    }, SPARK_LIFE_MS);
    timers.current.add(timer);
  }, [isOpen]);

  return sparks;
}

/**
 * Leans the card toward the mouse through --tx (side to side) and --ty (top to bottom),
 * which .st-card-tilt reads; not for touch, nor under reduced motion.
 */
function lean(e) {
  if (e.pointerType !== "mouse" || prefersReducedMotion()) return;
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return;
  const across = (e.clientX - r.left) / r.width - 0.5; // -0.5 at the left edge, 0.5 at the right
  const down = (e.clientY - r.top) / r.height - 0.5; // -0.5 at the top, 0.5 at the bottom
  el.style.setProperty("--tx", `${clamp(across * 2 * TILT_ACROSS_MAX, TILT_ACROSS_MAX).toFixed(2)}deg`);
  el.style.setProperty("--ty", `${clamp(-down * 2 * TILT_DOWN_MAX, TILT_DOWN_MAX).toFixed(2)}deg`);
}

function letGo(el) {
  el.style.removeProperty("--tx");
  el.style.removeProperty("--ty");
}

/**
 * The lean, while the card may lean (closed and not dimmed). When it opens or steps
 * back, whoever caused it, the card lets go: the mouse may still rest on it, and no
 * pointer event would come to put it straight.
 */
function useLean(canLean) {
  const ref = useRef(null);
  useEffect(() => {
    if (!canLean && ref.current) letGo(ref.current);
  }, [canLean]);
  return { ref, onPointerMove: canLean ? lean : undefined };
}

/**
 * @param {{ number: number, title: string, subtitle?: string, art?: import("react").ReactNode, accent?: string,
 *   open?: boolean, onToggle?: (next: boolean) => void, dimmed?: boolean, he?: boolean, size?: "md" | "lg" }} props
 */
export default function Card({ number, title, subtitle, art, accent, open, onToggle, dimmed = false, he = true, size = "md" }) {
  const controlled = typeof open === "boolean";
  const [ownOpen, setOwnOpen] = useState(false);
  const isOpen = controlled ? open : ownOpen;
  const sparks = useSparkBurst(isOpen);
  const tilt = useLean(!isOpen && !dimmed);

  const toggle = (e) => {
    letGo(e.currentTarget);
    const next = !isOpen;
    if (!controlled) setOwnOpen(next);
    onToggle?.(next);
  };

  let label = he ? "קלף סגור" : "Face-down card";
  if (isOpen) label = he ? `קלף ${number}: ${title}` : `Card ${number}: ${title}`;
  const className = ["st-card", size === "lg" ? "st-card-lg" : "st-card-md", isOpen && "st-open", dimmed && "st-dim"].filter(Boolean).join(" ");

  return (
    <button
      ref={tilt.ref}
      type="button"
      className={className}
      aria-pressed={isOpen}
      aria-label={label}
      disabled={dimmed}
      style={accent ? { "--st-accent": accent } : undefined}
      onClick={toggle}
      onPointerMove={tilt.onPointerMove}
      onPointerLeave={(e) => letGo(e.currentTarget)}
    >
      <span className="st-card-tilt">
        <span className="st-card-inner">
          <span className="st-card-face st-card-back st-card-pattern" aria-hidden="true">✦</span>
          <span className="st-card-face st-card-front">
            <span className="st-card-num">{number}</span>
            <span className="st-card-art" aria-hidden="true">{art}</span>
            <span className="st-card-title">{title}</span>
            <span className="st-card-sub">{subtitle}</span>
          </span>
        </span>
        <span className="st-card-shine" aria-hidden="true" />
      </span>
      <span className="st-card-sparks" aria-hidden="true">
        {sparks.map((spark) => (
          <span key={spark.id} className="st-spark" style={{ "--dx": `${spark.dx}px`, "--dy": `${spark.dy}px`, "--delay": `${spark.delay}s` }} />
        ))}
      </span>
    </button>
  );
}
