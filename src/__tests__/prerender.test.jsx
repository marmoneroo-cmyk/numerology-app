// @vitest-environment jsdom
/*
 * The sales page the build draws into index.html (src/prerender.jsx, scripts/prerender.mjs): it holds the page's
 * words for search engines and link previews, and the browser takes it over as it is, with no error and without
 * drawing it again (main.jsx hydrates it).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { StrictMode } from "react";
import { act } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render } from "../prerender.jsx";
import Root from "../Root.jsx";
import { SALES } from "../sales/content.js";

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("the pre-drawn sales page", () => {
  it("is the Hebrew sales page: its heading, its sections and the call to try the demo", () => {
    const html = render();
    expect(html).toContain(SALES.he.hero.title);
    expect(html).toMatch(/<main\b/);
    expect(html).toContain('href="#demo"');
    expect(html).toContain('id="sales-faq"');
  });

  it("is taken over by the browser as it is: no hydration error, and the same heading element", async () => {
    // Arrange: the page as the build leaves it
    const container = document.body.appendChild(document.createElement("div"));
    container.innerHTML = render();
    const heading = container.querySelector("h1");
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});

    // Act: the tree main.jsx hydrates, so a wrapper added around the sales page in Root fails here
    await act(async () => {
      hydrateRoot(
        container,
        <StrictMode>
          <Root storage={null} />
        </StrictMode>,
      );
    });

    // Assert
    expect(errors).not.toHaveBeenCalled();
    expect(container.querySelector("h1")).toBe(heading); // kept, not redrawn
  });

  it("leaves an empty root in index.html for the build to fill, and a rule to hide it on app addresses", () => {
    const html = readFileSync(join(process.cwd(), "index.html"), "utf8"); // the tests run from the project folder
    expect(html).toContain('<div id="root"></div>'); // scripts/prerender.mjs fills exactly this
    expect(html).toContain('html[data-first-screen="app"] #root > .sales'); // firstScreen.test.js tests the script
  });
});
