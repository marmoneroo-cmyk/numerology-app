/**
 * A tarot card's face: the art (TarotArt) in a card with a gold edge. On a computer it leans toward the mouse and a
 * foil light follows it; a large card also has a slow shine of its own. A reversed card shows its art upside down.
 * No motion under reduced motion. Decorative: whatever holds it names the card.
 * @param {{ card: import("./deck.js").TarotCard, reversed?: boolean, size?: "sm"|"md"|"lg" }} props
 */
import { useRef } from "react";
import TarotArt from "./TarotArt.jsx";
import { prefersReducedMotion } from "../motion.js";
import "./tarot.css";

const LEAN_ACROSS = 16; // degrees, from side to side
const LEAN_DOWN = 12; // degrees, from top to bottom

export default function TarotFace({ card, reversed = false, size = "md" }) {
  const ref = useRef(null);

  const lean = (e) => {
    const el = ref.current;
    if (!el || e.pointerType === "touch" || prefersReducedMotion()) return;
    const box = el.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const x = (e.clientX - box.left) / box.width;
    const y = (e.clientY - box.top) / box.height;
    el.style.setProperty("--tf-rx", `${((0.5 - y) * LEAN_DOWN).toFixed(2)}deg`);
    el.style.setProperty("--tf-ry", `${((x - 0.5) * LEAN_ACROSS).toFixed(2)}deg`);
    el.style.setProperty("--tf-mx", `${(x * 100).toFixed(1)}%`);
    el.style.setProperty("--tf-my", `${(y * 100).toFixed(1)}%`);
  };
  const rest = () => {
    const el = ref.current;
    if (!el) return;
    ["--tf-rx", "--tf-ry", "--tf-mx", "--tf-my"].forEach((name) => el.style.removeProperty(name));
  };

  return (
    <div ref={ref} className={`tf tf-${size}${reversed ? " tf-reversed" : ""}`} onPointerMove={lean} onPointerLeave={rest} aria-hidden="true">
      <div className="tf-card">
        <div className="tf-art">
          <TarotArt card={card} />
        </div>
        <span className="tf-shine" />
      </div>
    </div>
  );
}
