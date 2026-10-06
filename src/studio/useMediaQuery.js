import { useEffect, useState } from "react";

/** Phone below 640px, tablet from 640px, computer from 1024px. */
export const BREAKPOINTS = { tablet: 640, desk: 1024 };

/** Whether a media query matches, kept up to date. False where the browser cannot say. */
export function useMediaQuery(query) {
  const read = () => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia(query).matches : false);
  const [matches, setMatches] = useState(read);
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const list = window.matchMedia(query);
    const update = () => setMatches(list.matches);
    update();
    list.addEventListener?.("change", update);
    return () => list.removeEventListener?.("change", update);
  }, [query]);
  return matches;
}

/** "phone", "tablet" or "desk". */
export function useLayout() {
  const desk = useMediaQuery(`(min-width: ${BREAKPOINTS.desk}px)`);
  const tablet = useMediaQuery(`(min-width: ${BREAKPOINTS.tablet}px)`);
  return desk ? "desk" : tablet ? "tablet" : "phone";
}
