/**
 * What the Studio's full-window dialogs (MeetingMode, TarotDetail) share: the page behind stays still, and Tab
 * goes round the dialog's own controls. The quick search (CommandPalette) has its own, for its list.
 */

/** The controls Tab can reach. */
export const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Stops the page behind a dialog from scrolling. The lock goes on <html>: the app clips overflow on html and
 * body, so <html> scrolls the window, and locking <body> would only turn it into a scroll box.
 * @returns {() => void} puts the page back as it was
 */
export function lockPage(doc = document) {
  const page = doc.documentElement;
  const { overflow } = page.style;
  page.style.overflow = "hidden";
  return () => {
    page.style.overflow = overflow;
  };
}

/**
 * For a Tab keydown: past the last control the focus comes back to the first, and the other way round; from
 * outside the dialog, or when it has a single control, it goes to `fallback`. Tab between controls is left to the
 * browser. A key another window already took (defaultPrevented) is left alone.
 * @param {KeyboardEvent} e
 * @param {HTMLElement|null} dialog
 * @param {HTMLElement|null} fallback
 */
export function keepTabInside(e, dialog, fallback) {
  if (e.key !== "Tab" || e.defaultPrevented) return;
  const controls = dialog ? [...dialog.querySelectorAll(FOCUSABLE)] : [];
  const active = dialog?.ownerDocument.activeElement;
  const first = controls[0];
  const last = controls[controls.length - 1];
  if (!dialog?.contains(active) || controls.length <= 1) {
    e.preventDefault();
    fallback?.focus();
  } else if (e.shiftKey && active === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus();
  }
}
