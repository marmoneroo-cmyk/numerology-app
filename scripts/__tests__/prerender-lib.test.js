/* The build's last step (scripts/prerender.mjs): the sales page goes into the empty root, the page's own stylesheet is
   written into it, and every inline script must be allowed by the Content-Security-Policy. */
import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { fillRoot, blockedInlineScripts, inlineStylesheets, lowerAppScripts } from "../prerender-lib.mjs";

const hashOf = (body) => `'sha256-${createHash("sha256").update(body, "utf8").digest("base64")}'`;
const PAGE = '<head><script>go()</script><link rel="stylesheet" crossorigin href="/assets/index-abc.css"></head><body><div id="root"></div></body>';

describe("fillRoot", () => {
  it("puts the rendered page into the empty root", () => {
    expect(fillRoot(PAGE, "<main><h1>Hi</h1></main>")).toContain('<div id="root"><main><h1>Hi</h1></main></div>');
  });

  it("keeps a dollar sign in the page as it is (a replacement pattern would read \"$&\" as the matched text)", () => {
    expect(fillRoot(PAGE, "<h1>₪149 or $$ and $&</h1>")).toContain('<div id="root"><h1>₪149 or $$ and $&</h1></div>');
  });

  it("refuses a render without its heading, and a page without an empty root", () => {
    expect(() => fillRoot(PAGE, "<main></main>")).toThrow(/heading/);
    expect(() => fillRoot("<body><div id=\"root\">x</div></body>", "<h1>Hi</h1>")).toThrow(/empty root/);
  });
});

describe("blockedInlineScripts", () => {
  it("lists each inline script the policy does not allow by its hash", () => {
    expect(blockedInlineScripts(PAGE, `script-src 'self' ${hashOf("go()")}`)).toEqual([]);
    expect(blockedInlineScripts(PAGE, "script-src 'self'")).toEqual([hashOf("go()")]);
  });

  it("skips scripts with a source, structured data and empty scripts", () => {
    const page = '<script type="module" src="/a.js"></script><script type="application/ld+json">{"a":1}</script><script> </script>';
    expect(blockedInlineScripts(page, "script-src 'self'")).toEqual([]);
  });
});

describe("inlineStylesheets", () => {
  it("writes the page's own stylesheet into it, so the first paint waits for no request", () => {
    const page = inlineStylesheets(PAGE, (href) => (href === "/assets/index-abc.css" ? "body{color:red}" : null));
    expect(page).toContain("<style>body{color:red}</style>");
    expect(page).not.toContain('<link rel="stylesheet" crossorigin href="/assets/index-abc.css">'); // nothing to wait for
  });

  it("keeps a link to the file that never applies, so the app's later parts know it is loaded and do not add it again", () => {
    // Vite's loader adds each stylesheet a lazy part needs unless a <link rel="stylesheet"> to it is in the page; added
    // again, it would come after the app's own stylesheet and undo its rules
    const page = inlineStylesheets(PAGE, () => "body{color:red}");
    expect(page).toContain('<style>body{color:red}</style><link rel="stylesheet" crossorigin href="/assets/index-abc.css" media="not all">');
  });

  it("refuses a stylesheet that would end the style element early", () => {
    expect(() => inlineStylesheets(PAGE, () => "a{}</style><script>x()</script>")).toThrow(/style/);
  });

  it("refuses a stylesheet with a relative address, which would point elsewhere once inside the page", () => {
    expect(() => inlineStylesheets(PAGE, () => "a{background:url(./x.png)}")).toThrow(/relative/);
    expect(inlineStylesheets(PAGE, () => "a{background:url(/sales/x.webp)}")).toContain("url(/sales/x.webp)");
    expect(inlineStylesheets(PAGE, () => 'a{background:url("data:image/svg+xml,x")}')).toContain("data:image");
  });
});

describe("lowerAppScripts", () => {
  const built = '<script src="/analytics.js" defer></script><script type="module" crossorigin src="/assets/index-a1.js"></script><link rel="modulepreload" crossorigin href="/assets/runtime-b2.js"><link rel="stylesheet" crossorigin href="/assets/index-c3.css">';

  it("fetches the app's script and its preloads after the drawn page's picture and fonts", () => {
    const page = lowerAppScripts(built);
    expect(page).toContain('<script type="module" crossorigin fetchpriority="low" src="/assets/index-a1.js"></script>');
    expect(page).toContain('<link rel="modulepreload" crossorigin fetchpriority="low" href="/assets/runtime-b2.js">');
  });

  it("leaves every other tag as it was", () => {
    const page = lowerAppScripts(built);
    expect(page).toContain('<script src="/analytics.js" defer></script>');
    expect(page).toContain('<link rel="stylesheet" crossorigin href="/assets/index-c3.css">');
  });

  it("refuses a page with no app script to lower, so a change in the build's tags is noticed", () => {
    expect(() => lowerAppScripts('<script src="/analytics.js" defer></script>')).toThrow(/app script/);
  });
});
