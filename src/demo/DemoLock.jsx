/**
 * The demo shows every title and number, but not the interpretations: those are what a subscription
 * buys. Inside the demo an interpretation is blurred, and its letters are swapped first, so the page
 * itself (its DOM: what copying, reading mode or a screen reader get) does not hold the text either.
 * This is a showcase lock, not access control: the texts ship with the app's script, which the public
 * customer page needs anyway.
 */
import { createContext, isValidElement, useContext } from "react";
import "./demoLock.css";

/** True inside the demo (AppWorld provides it). */
export const DemoLockContext = createContext(false);
export const useDemoLock = () => useContext(DemoLockContext);

const HEBREW = "אבגדהוזחטיכלמנסעפצקרשת";
const FINALS = "ךםןףץ";
const LATIN = "abcdefghijklmnopqrstuvwxyz";

/** `text` with every letter swapped for another: the same length, spaces and punctuation, and unreadable. */
export function scramble(text) {
  let seed = 7;
  const next = (n) => {
    seed = (seed * 31 + 17) % 9973;
    return seed % n;
  };
  return Array.from(String(text ?? ""), (ch) => {
    if (HEBREW.includes(ch) || FINALS.includes(ch)) return HEBREW[next(HEBREW.length)];
    const lower = ch.toLowerCase();
    if (LATIN.includes(lower)) {
      const swapped = LATIN[next(LATIN.length)];
      return ch === lower ? swapped : swapped.toUpperCase();
    }
    return ch;
  }).join("");
}

/** The text inside React children: strings and numbers, through any elements around them. */
export function textOf(node) {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement(node)) return textOf(node.props.children);
  return "";
}

/**
 * An interpretation: as it is, or, in the demo, blurred and unreadable. With `chip`, a label over it
 * says where the full one is; without, only screen readers hear it.
 */
export default function Locked({ children, he = true, chip = false }) {
  const locked = useDemoLock();
  if (!locked) return children;
  const text = textOf(children);
  if (!text.trim()) return children;
  return (
    <span className={chip ? "demo-lock demo-lock-chip" : "demo-lock"}>
      <span className="demo-locked" aria-hidden="true">
        {scramble(text)}
      </span>
      <span className="demo-lock-note">{he ? "הפירוש המלא נפתח במנוי" : "The full reading opens with a subscription"}</span>
    </span>
  );
}
