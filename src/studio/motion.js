/** Shared motion for the Studio: the reduced-motion check, a short vibration, screen transitions and the gold ripple. */

/** True when the device asks for less motion. A missing matchMedia counts as motion allowed. */
export const prefersReducedMotion = (win = window) => Boolean(win.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);

/** A short vibration on phones that support it; nothing anywhere else. @returns {boolean} whether it vibrated */
export function vibrate(ms, nav = navigator) {
  if (prefersReducedMotion()) return false;
  try {
    return Boolean(nav.vibrate?.(ms));
  } catch {
    return false; // some browsers refuse it outside a user gesture
  }
}

/** Runs `update` inside a view transition where the browser has one and motion is welcome; otherwise directly. */
export function withViewTransition(update, doc = document) {
  if (doc.startViewTransition && !prefersReducedMotion()) return doc.startViewTransition(update);
  update();
  return null;
}

/**
 * One listener on `root` draws the gold ripple on any pressed element that
 * matches `selector` (`.fx` by default; the target needs position: relative
 * and overflow: hidden). @returns {() => void} a function that removes it
 */
export function attachRipple(root = document, selector = ".fx") {
  const onDown = (e) => {
    const el = e.target.closest?.(selector);
    if (!el || prefersReducedMotion()) return;
    const r = el.getBoundingClientRect();
    const ripple = document.createElement("span");
    ripple.className = "st-ripple";
    ripple.setAttribute("aria-hidden", "true");
    ripple.style.setProperty("--s", `${Math.max(r.width, r.height) * 2.2}px`);
    ripple.style.setProperty("--x", `${e.clientX - r.left}px`);
    ripple.style.setProperty("--y", `${e.clientY - r.top}px`);
    el.append(ripple);
    setTimeout(() => ripple.remove(), 750);
  };
  root.addEventListener("pointerdown", onDown);
  return () => root.removeEventListener("pointerdown", onDown);
}
