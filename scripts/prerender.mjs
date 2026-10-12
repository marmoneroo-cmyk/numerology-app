// The last step of `npm run build`: the sales page, rendered by the server build of src/prerender.jsx, is written
// into dist/index.html's empty <div id="root">, the page's own stylesheet is written into the page (the first paint
// waits for no request), and the server build is removed (it never ships). It also checks that every inline script
// the built page runs is allowed by its hash in vercel.json's Content-Security-Policy: a page whose script the policy
// blocks must not ship. The steps are in prerender-lib.mjs.
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { fillRoot, blockedInlineScripts, inlineStylesheets, lowerAppScripts } from "./prerender-lib.mjs";

const SERVER_BUILD = new URL("../dist-prerender/", import.meta.url);
const DIST = new URL("../dist/", import.meta.url);
const PAGE = new URL("index.html", DIST);

const { render } = await import(new URL("prerender.js", SERVER_BUILD));
const markup = render();
const page = readFileSync(PAGE, "utf8");

const vercel = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
const policy = vercel.headers.flatMap((h) => h.headers).find((h) => h.key === "Content-Security-Policy").value;
const blocked = blockedInlineScripts(page, policy);
if (blocked.length) throw new Error(`prerender: an inline script in dist/index.html is not allowed by the policy (${blocked.join(", ")})`);

const readAsset = (href) => readFileSync(new URL(href.slice(1), DIST), "utf8");
writeFileSync(PAGE, lowerAppScripts(inlineStylesheets(fillRoot(page, markup), readAsset)));
rmSync(SERVER_BUILD, { recursive: true, force: true });
console.log(`prerender: the sales page (${Math.round(markup.length / 1024)} KB of HTML) and its stylesheet are in dist/index.html`);
