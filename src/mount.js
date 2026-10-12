import { opensOnSalesPage } from "./routes.js";

/**
 * Starts React in the page's root. The build draws the sales page into it (scripts/prerender.mjs): a visitor who
 * stays on it gets that page taken over as it is (`hydrate`); an address or a kept login that opens the app (or a
 * legal page) starts from an empty root (`create`). Then index.html's first-screen mark goes, which hid the drawn
 * page on an app address: from here React shows what is on screen, and the sales page must show when the visitor
 * goes back to it.
 */
export function mount(container, app, { hash, storage, hydrate, create }) {
  if (container.firstElementChild && opensOnSalesPage(hash, storage)) {
    hydrate(container, app);
  } else {
    container.replaceChildren();
    create(container).render(app);
  }
  document.documentElement.removeAttribute("data-first-screen");
}
