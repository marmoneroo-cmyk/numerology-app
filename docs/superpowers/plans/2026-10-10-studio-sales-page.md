# The Studio's sales page — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking. This plan runs inline (executing-plans), because the owner delegated the whole stage.

**Goal:** `/` becomes a light sales page for the Studio. The Studio, its demo and Shani's page load on demand at `#studio`, `#demo` and `#customer`. The address is studio.shani-cohen.com.

**Architecture:**
- **`Root`** reads the hash through the pure rules in `routes.js`. It renders either the sales world (`SalesPage`, or `LegalPage` over it) or a lazily imported `AppWorld`: the providers plus the existing `App`, given `view` and `navigate`.
- **The demo** is the real Studio over an in-memory subscriber account (`demoService`), the same sample data the dev lab uses.
- **Shared pieces leave `App.jsx`** (`Icon`, `BUSINESS_EMAIL`), so the sales page never imports the 2,300-line app.

**Tech stack:** React 18, Vite 8, Vitest 5 with jsdom and Testing Library, Vercel (static, a strict CSP), Supabase (the admin Edge Function).

**Spec:** `docs/superpowers/specs/2026-10-10-studio-sales-page-design.md`.

**Ground rules for every task:**
- **Hebrew copy:** plural or impersonal forms only.
- **No `\u` escapes in files or tool calls;** after editing Hebrew, run the hidden-character scan in Task 12.
- **Commit messages** end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **The repo is public:** no personal data beyond the business email and number already on the site.

---

## File map

| File | Status | Responsibility |
|---|---|---|
| `src/routes.js` | new | the hash to a view; the next route; a view to its hash; the saved-login check |
| `src/Root.jsx` | new | the route state; the hashchange listener; `navigate`; the sales or app world; a failed load |
| `src/AppWorld.jsx` | new, lazy | `AccountProvider` (real or demo) + `ToastProvider` + `App` |
| `src/main.jsx` | modify | render `Root` |
| `src/ui/Icon.jsx` | new (moved) | the line icons (`ICON_PATHS` and `Icon`), out of `App.jsx` |
| `src/business.js` | new (moved) | `BUSINESS_EMAIL`, out of `App.jsx` |
| `src/demo/sampleData.js` | new (moved) | the sample clients and `memoryClient()` (was `labClient`) |
| `src/demo/sampleAccount.js` | new | `sampleService(client, profile)`, `DEMO_PROFILE`, `demoService()` |
| `src/demo/DemoBanner.jsx` | new | the banner across the demo |
| `src/lab/labAccount.js` | modify | thin: `LAB_PROFILE`, plus `labService` and `labClient` built on the demo modules |
| `src/App.jsx` | modify | the `view` and `navigate` props; demo: banner, no customer preview, no local-copy offer; import `Icon` and `BUSINESS_EMAIL` |
| `src/sales/config.js` | new | `SALES_WHATSAPP`, `PRICE_MONTHLY`, `TRIAL_DAYS`, `contactLink()` |
| `src/sales/content.js` | new | every word of the sales page, in Hebrew and English |
| `src/sales/sections.jsx` | new | `ContactButton`, `Hero`, `Features`, `Join`, `Privacy`, `Price`, `Faq` |
| `src/sales/SalesPage.jsx` | new | the top bar, the sections and the footer |
| `src/sales/sales.css` | new | the dark style, with its own `--s-*` tokens |
| `src/analytics.js` | modify | keep the app's own route hashes |
| `index.html` | modify | the title, description and Open Graph tags for the Studio; a canonical link |
| `public/sales/studio-today.webp` | new | the hero screenshot (demo data) |
| `public/sales/og.jpg` | new | the 1200x630 share image |
| `supabase/functions/admin-accounts/index.ts` | modify | allow `https://studio.shani-cohen.com` |
| tests | new and modified | listed per task |

---

### Task 1: The routing rules (`src/routes.js`)

**Files:** create `src/routes.js` and `src/__tests__/routes.test.js`.

- [ ] **Step 1: Write the failing test** in `src/__tests__/routes.test.js`:

```js
/* Which screen an address shows: the rules, apart from React. */
import { describe, it, expect } from "vitest";
import { viewOf, nextRoute, hashFor, hasSavedLogin, SAVED_LOGIN_KEY, ROUTE_HASHES } from "../routes.js";

const HOME = { world: "sales", view: "home", legal: null };
const app = (view) => ({ world: "app", view, legal: null });

describe("routes", () => {
  it("names the view of each address, and nothing for a fragment it does not route", () => {
    expect(viewOf("")).toBe("home");
    expect(viewOf("#")).toBe("home");
    expect(viewOf(undefined)).toBe("home");
    for (const hash of ["#studio", "#owner", "#admin"]) expect(viewOf(hash)).toBe("studio");
    expect(viewOf("#customer")).toBe("customer");
    expect(viewOf("#demo")).toBe("demo");
    for (const hash of ["#terms", "#privacy", "#refunds"]) expect(viewOf(hash)).toBe("legal");
    for (const hash of ["#reading-section", "#__proto__", "#constructor", "#toString", "#Studio"]) expect(viewOf(hash)).toBeNull();
  });

  it("opens the sales page on a plain address, and the Studio only on the first load of a browser that keeps a login", () => {
    expect(nextRoute(null, "", { initial: true })).toEqual(HOME);
    expect(nextRoute(null, "", { initial: true, signedIn: true })).toEqual(app("studio"));
    expect(nextRoute(app("studio"), "", { signedIn: true })).toEqual(HOME); // leaving the Studio goes home, login or not
  });

  it("opens the app's views in the app", () => {
    for (const view of ["studio", "customer", "demo"]) expect(nextRoute(HOME, `#${view}`)).toEqual(app(view));
  });

  it("opens a legal page over the view the visitor came from, and closes it back to that view", () => {
    expect(nextRoute(HOME, "#privacy")).toEqual({ ...HOME, legal: "privacy" });
    expect(nextRoute(app("customer"), "#terms")).toEqual({ ...app("customer"), legal: "terms" });
    expect(nextRoute(null, "#refunds", { initial: true, signedIn: true })).toEqual({ ...HOME, legal: "refunds" });
    expect(nextRoute({ ...app("customer"), legal: "terms" }, "#customer")).toEqual(app("customer"));
  });

  it("changes nothing for a fragment it does not route", () => {
    const customer = app("customer");
    expect(nextRoute(customer, "#reading-section")).toBe(customer);
    expect(nextRoute(null, "#nothing", { initial: true })).toEqual(HOME);
  });

  it("gives each view its address", () => {
    expect(hashFor("home")).toBe("");
    expect(hashFor("demo")).toBe("#demo");
    expect(hashFor("studio")).toBe("#studio");
    expect(ROUTE_HASHES).toEqual(expect.arrayContaining(["studio", "demo", "customer", "terms", "privacy", "refunds"]));
  });

  it("knows a kept login only by its key, and takes unreadable storage as none", () => {
    expect(SAVED_LOGIN_KEY).toBe("sb-kcgjdxubcdmbrjlftxyv-auth-token");
    const store = (value) => ({ getItem: (key) => (key === SAVED_LOGIN_KEY ? value : null) });
    expect(hasSavedLogin(store('{"access_token":"x"}'))).toBe(true);
    expect(hasSavedLogin(store(null))).toBe(false);
    expect(hasSavedLogin({ getItem: () => { throw new Error("blocked"); } })).toBe(false);
    expect(hasSavedLogin(undefined)).toBe(false);
  });
});
```

- [ ] **Step 2: Run it.** Command: `npx vitest run src/__tests__/routes.test.js`. Expected: FAIL, because `../routes.js` cannot be found.

- [ ] **Step 3: Implement** `src/routes.js`:

```js
/**
 * Which screen an address shows. Only the hash is read: it names a view (#studio, #customer, #demo) or a
 * legal page (#terms, #privacy, #refunds). Pure, so the rules are tested on their own.
 */
import { SUPABASE_URL } from "./account/config.js";

/** The legal pages a link opens by name. */
export const LEGAL_HASHES = ["terms", "privacy", "refunds"];

/** The hashes that name a view of the app; #owner and #admin are older names of the Studio. */
const APP_VIEWS = { studio: "studio", owner: "studio", admin: "studio", customer: "customer", demo: "demo" };

/** Every hash the app routes: analytics keeps these and drops any other fragment. */
export const ROUTE_HASHES = [...Object.keys(APP_VIEWS), ...LEGAL_HASHES];

/**
 * The view a hash names: "home" (no hash), "studio", "customer", "demo" or "legal"; null for a fragment the
 * app does not route, such as an anchor on a page.
 */
export function viewOf(hash) {
  const name = String(hash ?? "").replace(/^#/, "");
  if (!name) return "home";
  if (LEGAL_HASHES.includes(name)) return "legal";
  return Object.hasOwn(APP_VIEWS, name) ? APP_VIEWS[name] : null;
}

/**
 * Where the page is after the address changed to `hash`.
 * - A legal page opens over the view the visitor came from.
 * - A fragment the app does not route changes nothing.
 * - No hash is the sales page, except on the first load of a browser that keeps a login: that opens the Studio.
 * @returns {{ world: "sales" | "app", view: "home" | "studio" | "customer" | "demo", legal: string | null }}
 */
export function nextRoute(current, hash, { initial = false, signedIn = false } = {}) {
  const view = viewOf(hash);
  const here = current ?? { world: "sales", view: "home", legal: null };
  if (view === "legal") return { ...here, legal: String(hash).replace(/^#/, "") };
  if (view === null) return here;
  if (view === "home") return initial && signedIn ? { world: "app", view: "studio", legal: null } : { world: "sales", view: "home", legal: null };
  return { world: "app", view, legal: null };
}

/** The address of a view: the sales page has none. */
export const hashFor = (view) => (view === "home" ? "" : `#${view}`);

/** supabase-js keeps a login under this key (its default for the project); only whether it is there is read. */
export const SAVED_LOGIN_KEY = `sb-${new URL(SUPABASE_URL).hostname.split(".")[0]}-auth-token`;

/** Whether this browser keeps a Studio login. Storage that throws (blocked, private mode) means no. */
export function hasSavedLogin(storage) {
  try {
    return Boolean(storage?.getItem(SAVED_LOGIN_KEY));
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run it.** Command: `npx vitest run src/__tests__/routes.test.js`. Expected: PASS (7 tests).
- [ ] **Step 5: Commit:** `feat(routes): the address-to-view rules for the sales page`.

---

### Task 2: Move `Icon` and `BUSINESS_EMAIL` out of `App.jsx`

**Files:** create `src/ui/Icon.jsx` and `src/business.js`. Modify `src/App.jsx` (lines 53-121 and the `BUSINESS_EMAIL` line) and `src/__tests__/frontend.attack.test.jsx` (the "contact details" describe reads the email's source).

- [ ] **Step 1: Point the email test at the new file.** In `frontend.attack.test.jsx`, in `describe("contact details customers rely on")`, replace `const app = read(join(ROOT, "src", "App.jsx"));` with `const app = read(join(ROOT, "src", "business.js"));`. Run `npx vitest run src/__tests__/frontend.attack.test.jsx`. Expected: FAIL (ENOENT for `business.js`).
- [ ] **Step 2: Create `src/business.js`:**

```js
/** The business's contact address, shown on the site; null hides the email links. */
export const BUSINESS_EMAIL = "shlomi.cohen4444@gmail.com"; // the owner's choice for now
```

- [ ] **Step 3: Move the icons** with a node script that cuts App.jsx lines 53-121 (`const ICON_PATHS = {` through the closing brace of `function Icon`). It checks that line 53 starts with `const ICON_PATHS` and line 122 is blank or starts with `//`, writes them to `src/ui/Icon.jsx` under this header, and adds `export default` before `function Icon`:

```js
/** The app's line icons: 24x24 paths drawn in the current text colour. Out of App.jsx so the sales page can use them. */
```

- [ ] **Step 4: Update App.jsx's imports:**
  - delete `const BUSINESS_EMAIL = ...`;
  - add `import Icon from "./ui/Icon.jsx";` and `import { BUSINESS_EMAIL } from "./business.js";` after the existing imports.
- [ ] **Step 5: Run everything.** Command: `npx vitest run`. Expected: all green; `npm run build` builds.
- [ ] **Step 6: Commit:** `refactor: the icons and the business email leave App.jsx, for the sales page`.

---

### Task 3: The demo account (`src/demo/`)

**Files:**
- create `src/demo/sampleData.js`, `src/demo/sampleAccount.js` and `src/demo/__tests__/sampleAccount.test.js`;
- modify `src/lab/labAccount.js`.

- [ ] **Step 1: Write the failing test** in `src/demo/__tests__/sampleAccount.test.js`:

```js
/* The demo's account: a signed-in subscriber over sample clients, in memory. The lab keeps its admin. */
import { describe, it, expect } from "vitest";
import { demoService, DEMO_PROFILE } from "../sampleAccount.js";
import { labService, LAB_PROFILE } from "../../lab/labAccount.js";

const ids = async (svc) => (await svc.client.rpc("ws_all", { p_store: "clients" })).data.map((c) => c.id);

describe("the demo account", () => {
  it("is a signed-in subscriber past two-step verification, never an admin", async () => {
    const svc = demoService();
    expect(await svc.savedSession()).toBeTruthy();
    expect(await svc.mfaState()).toMatchObject({ level: "aal2", needsCode: false });
    const claimed = await svc.claim();
    expect(claimed).toMatchObject({ status: "ok", profile: DEMO_PROFILE });
    expect(claimed.profile.role).toBe("subscriber");
  });

  it("starts each copy from the same sample clients, in memory", async () => {
    const first = demoService();
    const second = demoService();
    await first.client.rpc("ws_batch", { p_ops: [{ type: "delete", store: "clients", id: "c1" }] });
    expect(await ids(first)).not.toContain("c1");
    expect(await ids(second)).toContain("c1");
  });

  it("leaves the lab an admin over the same sample data", async () => {
    expect(LAB_PROFILE.role).toBe("admin");
    expect((await labService().claim()).profile).toEqual(LAB_PROFILE);
    expect(await ids(labService())).toEqual(await ids(demoService()));
  });
});
```

- [ ] **Step 2: Run it.** Command: `npx vitest run src/demo`. Expected: FAIL (module not found).
- [ ] **Step 3: Move the data.** Create `src/demo/sampleData.js` holding `birthdayIn`, `sampleClients` and the client factory from `labAccount.js` (its lines 19-78), unchanged except that the factory is exported as `memoryClient`. Header:

```js
/**
 * The sample clients and an in-memory stand-in for the supabase-js client (the four workspace RPCs and the
 * file bucket), for the public demo and the developer lab. Nothing leaves the page.
 */
import { toYmd } from "../data/store.js";
```

- [ ] **Step 4: Generalize the service** into `src/demo/sampleAccount.js`. It is `labService`'s body (labAccount.js lines 81-116) with three changes:
  - it takes `(client, profile)`;
  - `LAB_PROFILE` becomes `profile`;
  - `"lab-device"` and `"lab-factor"` become `"sample-device"` and `"sample-factor"`.

  Then add:

```js
/** The demo's subscriber: no admin screen. */
export const DEMO_PROFILE = { id: "demo-user", email: "demo@example.com", fullName: "הסטודיו לדוגמה", phone: "", role: "subscriber", plan: "pro", deviceLimit: 2 };

/** The demo's account service, over a fresh copy of the sample clients. */
export const demoService = () => sampleService(memoryClient(), DEMO_PROFILE);
```

- [ ] **Step 5: Thin out `src/lab/labAccount.js`:**

```js
/** Development only: the lab's sample admin, over the same in-memory sample clients as the public demo. */
import { memoryClient } from "../demo/sampleData.js";
import { sampleService } from "../demo/sampleAccount.js";

export { memoryClient as labClient } from "../demo/sampleData.js";

export const LAB_PROFILE = {
  id: "lab-user",
  email: "lab@example.com",
  fullName: "סטודיו לדוגמה",
  phone: "050-0000000",
  role: "admin",
  plan: "pro",
  deviceLimit: 2,
};

/** The account service of the sample admin. */
export const labService = (client = memoryClient()) => sampleService(client, LAB_PROFILE);
```

- [ ] **Step 6: Run it.** Command: `npx vitest run`. Expected: all green, including the tests that use `labService` (`App.studio`, `frontend.attack`).
- [ ] **Step 7: Commit:** `feat(demo): a subscriber account over the sample clients, shared with the lab`.

---

### Task 4: `App` takes `view` and `navigate`; the demo banner

**Files:**
- create `src/demo/DemoBanner.jsx` and `src/__tests__/App.views.test.jsx`;
- modify `src/App.jsx` and `src/studio/studio.css` (banner styles).

- [ ] **Step 1: Write the failing test** in `src/__tests__/App.views.test.jsx`. Use the jsdom stand-ins the other App tests use: a canvas proxy, `IntersectionObserver`, `matchMedia` via `vi.stubGlobal`, and `scrollTo`.

```js
// @vitest-environment jsdom
/* App inside Root: entering and leaving the Studio go through `navigate`; the demo shows what it is. */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import App from "../App.jsx";
import { AccountProvider } from "../account/AccountContext.jsx";
import { ToastProvider } from "../studio/Toasts.jsx";
import { demoService } from "../demo/sampleAccount.js";

const canvas2d = new Proxy({}, { get: (store, key) => (key in store ? store[key] : () => canvas2d), set: (store, key, value) => ((store[key] = value), true) });
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("matchMedia", vi.fn((q) => ({ matches: !q.includes("reduce") && 1300 >= Number((q.match(/min-width: ([0-9]+)px/) || [])[1] || 0), addEventListener() {}, removeEventListener() {} })));
  HTMLCanvasElement.prototype.getContext = () => canvas2d;
  window.IntersectionObserver = class { constructor(cb) { this.cb = cb; } observe() { this.cb([{ isIntersecting: true }]); } disconnect() {} };
  window.scrollTo = () => {};
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const never = () => new Promise(() => {}); // the real account service never answers here
function show(view, { loadService = never, active } = {}) {
  const navigate = vi.fn();
  render(<AccountProvider active={active} loadService={loadService}><ToastProvider><App view={view} navigate={navigate} /></ToastProvider></AccountProvider>);
  return navigate;
}

describe("App inside Root", () => {
  it("goes to the Studio through navigate from Shani's page", async () => {
    const navigate = show("customer");
    fireEvent.click(await screen.findByRole("button", { name: /סטודיו/ }));
    expect(navigate).toHaveBeenCalledWith("studio");
  });

  it("leaves the Studio for the sales page through navigate", async () => {
    const navigate = show("studio");
    fireEvent.click(await screen.findByRole("button", { name: "יציאה ממצב בעל עסק" }));
    expect(navigate).toHaveBeenCalledWith("home");
  });

  it("shows the demo as a demo: the banner, the sample clients, no admin screen and no customer preview", async () => {
    const navigate = show("demo", { active: true, loadService: async () => demoService() });
    const banner = await screen.findByRole("note", {}, { timeout: 5000 });
    expect(banner.textContent).toContain("זו הדגמה");
    expect(await screen.findByText(/רחל כהן/, {}, { timeout: 5000 })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "חשבונות" })).toBeNull();
    expect(screen.queryByRole("button", { name: "תצוגת לקוח" })).toBeNull();
    fireEvent.click(within(banner).getByRole("button", { name: "חזרה לעמוד" }));
    expect(navigate).toHaveBeenCalledWith("home");
  });
});
```

- [ ] **Step 2: Run it.** Command: `npx vitest run src/__tests__/App.views.test.jsx`. Expected: FAIL, because the old toggles set state and there is no banner. Adjust the button names to what the top bar renders if the first run shows other names; the crown toggle's labels are at App.jsx's top bar.
- [ ] **Step 3: Implement the banner,** `src/demo/DemoBanner.jsx`:

```jsx
/** Across the top of the demo: what it is, how to reach us, and the way back to the sales page. */
import { contactLink } from "../sales/config.js";

export default function DemoBanner({ he, onExit }) {
  const contact = contactLink(he);
  const external = contact?.kind === "whatsapp";
  return (
    <div role="note" className="demo-banner">
      <span>{he ? "זו הדגמה עם לקוחות לדוגמה. שום דבר לא נשמר." : "This is a demo with sample clients. Nothing is saved."}</span>
      <span className="demo-banner-actions">
        {contact && <a href={contact.href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}>{he ? "לדבר איתנו" : "Talk to us"}</a>}
        <button type="button" onClick={onExit}>{he ? "חזרה לעמוד" : "Back to the page"}</button>
      </span>
    </div>
  );
}
```

  Append to `src/studio/studio.css`:

```css
/* the demo's banner: under the top bar, above the Studio */
.demo-banner { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; margin: 0 0 16px; padding: 10px 16px; border-radius: 14px; background: var(--st-gold-wash); border: 1px solid var(--st-line-strong); color: var(--st-ink); font-size: 14px; }
.demo-banner-actions { display: inline-flex; gap: 10px; align-items: center; }
.demo-banner a, .demo-banner button { min-height: 36px; display: inline-flex; align-items: center; padding: 6px 14px; border-radius: 10px; border: 1px solid var(--st-line-strong); background: transparent; color: var(--st-gold-text); font: inherit; font-weight: 700; text-decoration: none; cursor: pointer; }
```

- [ ] **Step 4: Wire App:**
  - `export default function App({ view, navigate } = {})`.
  - The owner state's initializer starts with `if(view)return view!=="customer";`.
  - Add `useEffect(()=>{if(!view)return;setOwner(view!=="customer");setPreviewCustomer(false);},[view]);`.
  - `enterOwner`: after `AU.init();AU.p("reveal");` insert `if(navigate)return navigate("studio");`.
  - `exitOwner`: after `AU.init();AU.p("click");` insert `if(navigate)return navigate("home");`.
  - Add `const demo=view==="demo";`.
  - In the top bar, the customer-preview toggle `{owner&&<button className="tbtn act" ...` becomes `{owner&&!demo&&<button ...`.
  - The local-copy offer `<LocalDataOffer .../>` renders only when `!demo`.
  - Inside the main container, first child when `showOwnerUI&&studioReady`: `{demo&&<DemoBanner he={he} onExit={exitOwner}/>}`, with `import DemoBanner from "./demo/DemoBanner.jsx";`.
- [ ] **Step 5: Run everything.** Command: `npx vitest run`. Expected: all green.
- [ ] **Step 6: Commit:** `feat(app): view and navigate props for Root, and the demo's banner`.

---

### Task 5: The sales page (`src/sales/`)

**Files:**
- create `src/sales/config.js`, `content.js`, `sections.jsx`, `SalesPage.jsx` and `sales.css`;
- create the tests `src/sales/__tests__/config.test.js`, `content.test.js` and `SalesPage.test.jsx`.

- [ ] **Step 1: Write the failing tests.**

`src/sales/__tests__/config.test.js`:

```js
import { describe, it, expect } from "vitest";
import { contactLink } from "../config.js";

describe("how the sales page reaches the owner", () => {
  it("uses WhatsApp when there is a well-formed number, with a short Hebrew or English opening line", () => {
    const he = contactLink(true, { whatsapp: "972501234567", email: "a@b.co" });
    expect(he.kind).toBe("whatsapp");
    expect(he.href.startsWith("https://wa.me/972501234567?text=")).toBe(true);
    expect(decodeURIComponent(he.href.split("text=")[1])).toContain("הסטודיו");
    expect(decodeURIComponent(contactLink(false, { whatsapp: "972501234567", email: null }).href)).toContain("Studio");
  });

  it("falls back to an email for a missing or malformed number, and to nothing without either", () => {
    for (const whatsapp of [null, "", "+972501234567", "050-1234567", "97250abc4567", "0501234567"]) {
      expect(contactLink(true, { whatsapp, email: "a@b.co" })).toEqual({ kind: "email", href: `mailto:a@b.co?subject=${encodeURIComponent("הסטודיו לנומרולוגים")}` });
    }
    expect(contactLink(true, { whatsapp: null, email: null })).toBeNull();
  });
});
```

`src/sales/__tests__/content.test.js`:

```js
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { SALES } from "../content.js";

const texts = (value) => (typeof value === "string" ? [value] : Array.isArray(value) ? value.flatMap(texts) : value && typeof value === "object" ? Object.values(value).flatMap(texts) : []);
const SINGULAR_YOU = /(?<![א-ת])(אתה|את|שלך|לך|עליך|אליך|ממך|אותך|בך|תוכל|תוכלי|הנך|צור קשר|נסה|הירשם|לחץ)(?![א-ת])/;
const span = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const HIDDEN = [...span(0x200b, 0x200f), ...span(0x202a, 0x202e), ...span(0x2066, 0x2069), 0xfeff, 0x061c, 0x2060];

describe("the sales page's words", () => {
  it("speaks to readers in the plural or impersonally in Hebrew", () => {
    expect(SINGULAR_YOU.test("מה שלך?")).toBe(true); // the check itself works
    for (const line of texts(SALES.he)) expect(line).not.toMatch(SINGULAR_YOU);
  });

  it("has the same parts in Hebrew and English, and no placeholders or hidden characters", () => {
    const shape = (value) => (typeof value === "string" ? "s" : Array.isArray(value) ? value.map(shape) : Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shape(v)])));
    expect(shape(SALES.en)).toEqual(shape(SALES.he));
    for (const line of [...texts(SALES.he), ...texts(SALES.en)]) {
      expect(line.trim()).not.toBe("");
      expect(line).not.toMatch(/TBD|TODO|lorem|___/i);
      expect(HIDDEN.filter((code) => line.includes(String.fromCodePoint(code)))).toEqual([]);
    }
  });

  it("keeps text readable on the page: 4.5:1 or more for body text and buttons", () => {
    const css = readFileSync(new URL("../sales.css", import.meta.url), "utf8");
    const token = (name) => css.match(new RegExp(`--s-${name}:\\s*([^;]+);`))[1].trim();
    const rgb = (c) => (c.startsWith("#") ? [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) : c.match(/[\d.]+/g).slice(0, 3).map(Number));
    const alpha = (c) => (c.startsWith("rgba") ? Number(c.match(/[\d.]+/g)[3]) : 1);
    const over = (fg, bg) => rgb(fg).map((v, i) => v * alpha(fg) + rgb(bg)[i] * (1 - alpha(fg)));
    const lum = (channels) => { const [r, g, b] = channels.map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const ratio = (fg, bg) => { const [a, b] = [lum(over(fg, bg)), lum(rgb(bg))].sort((x, y) => y - x); return (a + 0.05) / (b + 0.05); };
    for (const bg of ["bg", "panel"]) {
      for (const fg of ["ink", "ink-soft", "gold"]) expect(ratio(token(fg), token(bg))).toBeGreaterThanOrEqual(4.5);
    }
    expect(ratio(token("on-gold"), token("gold"))).toBeGreaterThanOrEqual(4.5);
  });
});
```

`src/sales/__tests__/SalesPage.test.jsx`:

```js
// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import SalesPage from "../SalesPage.jsx";
import { Price } from "../sections.jsx";
import { SALES } from "../content.js";

afterEach(cleanup);

describe("the sales page", () => {
  it("says what the Studio is, and offers the demo, contact and the way in", () => {
    render(<SalesPage he onLanguage={() => {}} />);
    expect(screen.getByRole("heading", { level: 1, name: SALES.he.hero.title })).toBeTruthy();
    expect(screen.getByRole("link", { name: "לנסות את הסטודיו" }).getAttribute("href")).toBe("#demo");
    expect(screen.getByRole("link", { name: "כניסה למנויים" }).getAttribute("href")).toBe("#studio");
    const contact = screen.getAllByRole("link", { name: /לדבר איתנו/ })[0];
    expect(contact.getAttribute("href").startsWith("mailto:")).toBe(true); // no WhatsApp number yet: email
    for (const title of [SALES.he.features.title, SALES.he.join.title, SALES.he.privacy.title, SALES.he.price.title, SALES.he.faq.title]) {
      expect(screen.getByRole("heading", { level: 2, name: title })).toBeTruthy();
    }
  });

  it("links the legal pages and the privacy details", () => {
    render(<SalesPage he onLanguage={() => {}} />);
    expect(screen.getByRole("link", { name: "תקנון" }).getAttribute("href")).toBe("#terms");
    expect(screen.getByRole("link", { name: "מדיניות פרטיות" }).getAttribute("href")).toBe("#privacy");
    expect(screen.getByRole("link", { name: "ביטולים והחזרים" }).getAttribute("href")).toBe("#refunds");
    expect(screen.getByRole("link", { name: SALES.he.privacy.more }).getAttribute("href")).toBe("#privacy");
  });

  it("shows a price and trial once they are set, and words for them until then", () => {
    render(<Price t={SALES.he.price} contact={null} price={null} trialDays={null} />);
    expect(screen.getByText("מחיר בפנייה")).toBeTruthy();
    expect(screen.getByText("תקופת ניסיון חינם")).toBeTruthy();
    cleanup();
    render(<Price t={SALES.he.price} contact={null} price={149} trialDays={14} />);
    expect(screen.getByText("₪149")).toBeTruthy();
    expect(screen.getByText("14 ימי ניסיון חינם")).toBeTruthy();
  });

  it("switches language, right to left and back", () => {
    const onLanguage = vi.fn();
    const { container, rerender } = render(<SalesPage he onLanguage={onLanguage} />);
    expect(container.firstChild.getAttribute("dir")).toBe("rtl");
    fireEvent.click(screen.getByRole("button", { name: "English" }));
    expect(onLanguage).toHaveBeenCalled();
    rerender(<SalesPage he={false} onLanguage={onLanguage} />);
    expect(container.firstChild.getAttribute("dir")).toBe("ltr");
    expect(screen.getByRole("heading", { level: 1, name: SALES.en.hero.title })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run them.** Command: `npx vitest run src/sales`. Expected: FAIL (modules missing).
- [ ] **Step 3: Implement `src/sales/config.js`:**

```js
/**
 * The facts on the sales page that the owner decides. Each null leaves out, or words differently, the part
 * that needs it, so the page never shows a blank.
 */
import { BUSINESS_EMAIL } from "../business.js";

/** The owner's WhatsApp number for questions about the Studio: digits only, with the country code (972...). */
export const SALES_WHATSAPP = null;
/** The monthly price, in shekels. */
export const PRICE_MONTHLY = null;
/** Days of free trial. */
export const TRIAL_DAYS = null;

/**
 * How to reach the owner: WhatsApp when there is a well-formed number, else an email, else nothing.
 * @returns {{ kind: "whatsapp" | "email", href: string } | null}
 */
export function contactLink(he, { whatsapp = SALES_WHATSAPP, email = BUSINESS_EMAIL } = {}) {
  if (whatsapp && /^[1-9][0-9]{7,14}$/.test(whatsapp)) {
    const text = he ? "היי, אשמח לשמוע על הסטודיו לנומרולוגים" : "Hi, I would like to hear about the Studio";
    return { kind: "whatsapp", href: `https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}` };
  }
  if (email) return { kind: "email", href: `mailto:${email}?subject=${encodeURIComponent(he ? "הסטודיו לנומרולוגים" : "The Studio")}` };
  return null;
}
```

- [ ] **Step 4: Implement `src/sales/content.js`.** Every string the page shows, as two trees of the same shape:
  - `brand`, `language`, `languageLabel` and `signIn`;
  - `hero`: `kicker`, `title`, `subtitle`, `tryIt`, `contact`, `note` and `shotAlt`;
  - `features`: `title`, plus `items` of `{ icon, title, text }` (6);
  - `join`: `title`, plus `steps` of `{ title, text }` (3);
  - `privacy`: `title`, `items` (5) and `more`;
  - `price`: `title`, `plan`, `perMonth`, `onRequest`, `trialDays`, `trial`, `includes` (3) and `contact`;
  - `faq`: `title`, plus `items` of `{ q, a }` (6);
  - `footer`: `label`, `whatsapp`, `email`, `terms`, `privacy`, `refunds` and `rights`.

  The Hebrew is fixed in the spec's page section, and the English mirrors it. Feature claims follow the app:
  - Ctrl+K search;
  - life path, name numbers, personal year and month, pinnacles, karmic debts and Lo-Shu;
  - meeting mode;
  - PDF signed with the subscriber's name;
  - Today: birthdays this week, recent clients and the daily card;
  - matches, tables, calculators and cards.

  Privacy claims follow `src/legal/content.js`:
  - Frankfurt (EU);
  - only the subscriber's session reads the clients;
  - the admin screens show counts only;
  - two-step verification is available;
  - one session and a device list;
  - backup and export.

- [ ] **Step 5: Implement `src/sales/sections.jsx`:**
  - `ContactButton({ contact, label, className })`: an `<a>` with a WhatsApp or mail icon; `target="_blank"` and `rel="noopener noreferrer"` only for WhatsApp; `null` without a contact.
  - `Hero`: the kicker, the `h1`, the subtitle, `<a href="#demo">` plus `ContactButton`, the note, and `<figure><img src="/sales/studio-today.webp" alt={t.shotAlt}>` with its real width and height.
  - `Features`: an `h2` and a `ul` of cards, each with an icon (`aria-hidden`), an `h3` and text.
  - `Join`: an `h2` and an `ol` of three numbered cards.
  - `Privacy`: an `h2`, a `ul` with lock icons, and `<a href="#privacy">`.
  - `Price({ t, contact, price = PRICE_MONTHLY, trialDays = TRIAL_DAYS })`:
    - the price: `<span dir="ltr">₪{price}</span> {t.perMonth}`, or `t.onRequest`;
    - the trial: `${trialDays} ${t.trialDays}`, or `t.trial`;
    - the `includes` list and the contact button.
  - `Faq`: `details` and `summary` for each question (no script needed; keyboard and screen readers come free).
- [ ] **Step 6: Implement `src/sales/SalesPage.jsx`** (`SalesPage({ he = true, onLanguage })`):
  - a `div.sales` with `dir` and `lang`;
  - a sticky header: the brand; a language button (`aria-label={t.languageLabel}`, text `t.language`); `<a href="#studio">` with `t.signIn`;
  - `main` with the six sections;
  - a footer: a nav with the contact link and the three legal links, then `t.footer.rights`;
  - it imports `./sales.css`.
- [ ] **Step 7: Implement `src/sales/sales.css`:**
  - the `--s-*` tokens on `.sales` (bg `#080812`, panel `#10102a`, line, gold `#c8a96a`, gold-hi `#f1dfb4`, ink `#ece4d4`, ink-soft `rgba(236, 228, 212, 0.78)`, on-gold `#14110a`), so the Studio's light theme never repaints the page;
  - the Google Fonts `@import` (Frank Ruhl Libre and Heebo, plus Cormorant Garamond for the English headings);
  - the hero's radial glow;
  - cards and grids with `auto-fit`, `minmax(260px, 1fr)`;
  - buttons at least 44px tall, and focus rings;
  - a reduced-motion guard on the button hover;
  - full-width buttons under 520px.
- [ ] **Step 8: Run them.** Command: `npx vitest run src/sales`. Expected: PASS.
- [ ] **Step 9: Commit:** `feat(sales): the Studio's sales page`.

---

### Task 6: `Root`, `AppWorld` and `main.jsx`

**Files:**
- create `src/Root.jsx`, `src/AppWorld.jsx`, `src/__tests__/Root.test.jsx`, `src/__tests__/Root.loadFailure.test.jsx` and `src/__tests__/bundle.test.js`;
- modify `src/main.jsx`.

- [ ] **Step 1: Write the failing tests.**

`src/__tests__/bundle.test.js`:

```js
/* The sales page loads alone: from Root.jsx the static imports never reach the app, the PDF library,
   Supabase or the demo. Those load on demand, with import(). */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..");
const FROM = /^\s*(?:import|export)\s+(?:[^"'`;]*?\s+from\s+)?["']([^"']+)["']/gm;

function staticGraph(entry) {
  const seen = new Set();
  const packages = new Set();
  const queue = [entry];
  while (queue.length) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    if (!/\.(js|jsx)$/.test(file)) continue;
    for (const [, spec] of readFileSync(file, "utf8").matchAll(FROM)) {
      if (!spec.startsWith(".")) {
        packages.add(spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0]);
        continue;
      }
      const target = resolve(dirname(file), spec);
      if (existsSync(target)) queue.push(target);
    }
  }
  return { files: [...seen].map((f) => f.slice(SRC.length + 1).split("\\").join("/")), packages: [...packages] };
}

describe("what the sales page loads", () => {
  it("leaves the app, the PDF library, Supabase and the demo to load on demand", () => {
    const { files, packages } = staticGraph(join(SRC, "Root.jsx"));
    expect(files).toContain("sales/SalesPage.jsx");
    for (const heavy of ["App.jsx", "AppWorld.jsx", "account/AccountContext.jsx", "account/service.js", "demo/sampleAccount.js", "demo/sampleData.js"]) expect(files).not.toContain(heavy);
    for (const pkg of ["jspdf", "@supabase/supabase-js", "uqr"]) expect(packages).not.toContain(pkg);
  });
});
```

`src/__tests__/Root.test.jsx` (the same jsdom stand-ins as Task 4, plus a `fetch` that fails and is recorded):

```js
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import Root from "../Root.jsx";
import { SAVED_LOGIN_KEY } from "../routes.js";
import { SALES } from "../sales/content.js";

const canvas2d = new Proxy({}, { get: (store, key) => (key in store ? store[key] : () => canvas2d), set: (store, key, value) => ((store[key] = value), true) });
let fetches;
beforeEach(() => {
  localStorage.clear();
  history.replaceState(null, "", "/");
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })));
  HTMLCanvasElement.prototype.getContext = () => canvas2d;
  window.IntersectionObserver = class { constructor(cb) { this.cb = cb; } observe() { this.cb([{ isIntersecting: true }]); } disconnect() {} };
  window.scrollTo = () => {};
  fetches = [];
  vi.stubGlobal("fetch", vi.fn(async (url) => { fetches.push(String(url)); throw new Error("offline in tests"); }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); history.replaceState(null, "", "/"); });

const LONG = { timeout: 8000 };
const salesTitle = () => screen.findByRole("heading", { level: 1, name: SALES.he.hero.title });

describe("Root", () => {
  it("opens the sales page on the plain address", async () => {
    render(<Root storage={localStorage} />);
    expect(await salesTitle()).toBeTruthy();
  });

  it("runs the demo in memory: the banner and sample clients, no request to Supabase, no IndexedDB, and back to the page", async () => {
    const open = vi.fn(() => { throw new Error("the demo must not open IndexedDB"); });
    vi.stubGlobal("indexedDB", { open });
    render(<Root storage={localStorage} />);
    fireEvent.click(await screen.findByRole("link", { name: "לנסות את הסטודיו" }));
    const banner = await screen.findByRole("note", {}, LONG);
    expect(await screen.findByText(/רחל כהן/, {}, LONG)).toBeTruthy();
    expect(fetches.filter((u) => u.includes("supabase.co"))).toEqual([]);
    expect(open).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "חזרה לעמוד" }));
    expect(await salesTitle()).toBeTruthy();
    expect(location.hash).toBe("");
    expect(banner.isConnected).toBe(false);
  });

  it("opens Shani's page at #customer", async () => {
    history.replaceState(null, "", "/#customer");
    render(<Root storage={localStorage} />);
    expect(await screen.findByTitle("דברו איתי בוואטסאפ", {}, LONG)).toBeTruthy();
  });

  it("opens a legal page light from the sales page, and goes back to it", async () => {
    render(<Root storage={localStorage} />);
    fireEvent.click(await screen.findByRole("link", { name: "מדיניות פרטיות" }));
    expect(await screen.findByRole("heading", { level: 1, name: "מדיניות פרטיות" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "חזרה לאתר" }));
    expect(await salesTitle()).toBeTruthy();
  });

  it("opens a legal page asked for directly, and goes to the sales page from it", async () => {
    history.replaceState(null, "", "/#terms");
    render(<Root storage={localStorage} />);
    expect(await screen.findByRole("heading", { level: 1, name: "תנאי שימוש" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "חזרה לאתר" }));
    expect(await salesTitle()).toBeTruthy();
    expect(location.hash).toBe("");
  });

  it("opens the Studio's sign-in in a browser that keeps a login, and says #studio in the address", async () => {
    const storage = { getItem: (key) => (key === SAVED_LOGIN_KEY ? "{}" : null) };
    render(<Root storage={storage} />);
    await waitFor(() => expect(location.hash).toBe("#studio"));
    expect(screen.queryByRole("heading", { level: 1, name: SALES.he.hero.title })).toBeNull();
  });
});
```

`src/__tests__/Root.loadFailure.test.jsx`:

```js
// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("../AppWorld.jsx", () => { throw new Error("a chunk this deploy no longer has"); });
const { default: Root } = await import("../Root.jsx");

afterEach(() => { cleanup(); history.replaceState(null, "", "/"); });

describe("Root when the app cannot load", () => {
  it("says so and offers a reload, instead of a blank page", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {}); // React reports the caught error
    history.replaceState(null, "", "/#studio");
    render(<Root storage={null} />);
    expect((await screen.findByRole("alert")).textContent).toContain("לא הצלחנו לטעון");
    expect(screen.getByRole("button", { name: "רענון" })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run them.** Command: `npx vitest run src/__tests__/Root.test.jsx src/__tests__/Root.loadFailure.test.jsx src/__tests__/bundle.test.js`. Expected: FAIL (`Root.jsx` missing).
- [ ] **Step 3: Implement `src/AppWorld.jsx`:**

```jsx
/** The app's world: the Studio (or its demo) and Shani's page, with the providers they need. Loaded on demand. */
import { AccountProvider } from "./account/AccountContext.jsx";
import { ToastProvider } from "./studio/Toasts.jsx";
import App from "./App.jsx";

/** The demo's account: a subscriber over sample clients, in memory. */
const loadDemo = async () => (await import("./demo/sampleAccount.js")).demoService();

export default function AppWorld({ view, navigate }) {
  const demo = view === "demo";
  return (
    // the demo and the real account never share a provider: switching between them starts a new one
    <AccountProvider key={demo ? "demo" : "live"} active={demo ? true : undefined} loadService={demo ? loadDemo : undefined}>
      <ToastProvider>
        <App view={view} navigate={navigate} />
      </ToastProvider>
    </AccountProvider>
  );
}
```

- [ ] **Step 4: Implement `src/Root.jsx`:**

```jsx
/**
 * What the address shows: the sales page (light, loaded at once) or the app (the Studio, its demo and
 * Shani's page, loaded on demand). The rules are in routes.js.
 */
import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { nextRoute, hasSavedLogin, hashFor } from "./routes.js";
import SalesPage from "./sales/SalesPage.jsx";
import LegalPage from "./legal/LegalPage.jsx";

const AppWorld = lazy(() => import("./AppWorld.jsx"));

const browserStorage = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

/** The app failed to load (offline, or a deploy replaced its files): a way to try again, not a blank page. */
class LoadFailure extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    const { he } = this.props;
    return (
      <div className="root-message" role="alert" dir={he ? "rtl" : "ltr"}>
        <p>{he ? "לא הצלחנו לטעון. נסו לרענן את העמוד." : "The page did not load. Try reloading it."}</p>
        <button type="button" onClick={() => window.location.reload()}>{he ? "רענון" : "Reload"}</button>
      </div>
    );
  }
}

export default function Root({ storage = browserStorage() }) {
  const [route, setRoute] = useState(() => nextRoute(null, window.location.hash, { initial: true, signedIn: hasSavedLogin(storage) }));
  const [he, setHe] = useState(true);
  const routeRef = useRef(route);
  routeRef.current = route;
  // a legal page opened by a link here: closing it goes back to where the visitor was
  const legalOpenedHere = useRef(false);

  useEffect(() => {
    // a kept login opened the Studio from the plain address: say so in the address, so back and reload agree
    const { world, view } = routeRef.current;
    if (world === "app" && view === "studio" && !window.location.hash) window.history.replaceState(null, "", "#studio");
    const follow = () => {
      const current = routeRef.current;
      const next = nextRoute(current, window.location.hash);
      if (next === current) return;
      if (next.legal && !current.legal) legalOpenedHere.current = true;
      if (next.world !== current.world || next.view !== current.view) window.scrollTo(0, 0);
      setRoute(next);
    };
    window.addEventListener("hashchange", follow);
    return () => window.removeEventListener("hashchange", follow);
  }, []);

  /** Goes to a view, as a new step in the browser's history. */
  const navigate = useCallback((view) => {
    const hash = hashFor(view);
    window.history.pushState(null, "", hash || window.location.pathname + window.location.search);
    setRoute(nextRoute(routeRef.current, hash));
    window.scrollTo(0, 0);
  }, []);

  const closeLegal = () => {
    if (legalOpenedHere.current) {
      legalOpenedHere.current = false;
      window.history.back(); // the hashchange that follows closes the page
      return;
    }
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    setRoute(nextRoute(routeRef.current, ""));
  };

  if (route.world === "app") {
    return (
      <LoadFailure he={he}>
        <Suspense fallback={<div className="root-message" aria-busy="true" />}>
          <AppWorld view={route.view} navigate={navigate} />
        </Suspense>
      </LoadFailure>
    );
  }
  if (route.legal) return <LegalPage doc={route.legal} he={he} dk onBack={closeLegal} />;
  return <SalesPage he={he} onLanguage={() => setHe((value) => !value)} />;
}
```

- [ ] **Step 5: Replace `src/main.jsx`'s tree:**

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import Root from './Root.jsx'
import { startAnalytics } from './analytics.js'
import './studio/studio.css'

startAnalytics()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
```

  Append to `studio.css`:

```css
/* Root's own messages: loading the app, or failing to */
.root-message { min-height: 60vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; color: var(--st-ink); font-family: var(--st-body); }
.root-message button { min-height: 44px; padding: 8px 20px; border-radius: 12px; border: 1px solid var(--st-line-strong); background: transparent; color: var(--st-gold-text); font: inherit; font-weight: 700; cursor: pointer; }
```

- [ ] **Step 6: Run them.** Command: `npx vitest run`. Expected: all green.
- [ ] **Step 7: Build and check the chunks.** `npm run build`, then confirm two things:
  - the entry chunk (`dist/assets/index-*.js` loaded by `index.html`) does not contain `jsPDF`;
  - it is far below the old 926 kB.

  Command: `node -e "const fs=require('fs');const h=fs.readFileSync('dist/index.html','utf8');const f=h.match(/assets\/index-[^\"]+\.js/)[0];const s=fs.readFileSync('dist/'+f,'utf8');console.log(f,s.length,s.includes('jsPDF'))"`.
- [ ] **Step 8: Commit:** `feat(root): the sales page at /, the Studio, demo and Shani's page loaded on demand`.

---

### Task 7: Analytics keeps the route names

**Files:** modify `src/analytics.js` and `src/__tests__/analytics.test.js`.

- [ ] **Step 1: Add the failing test:**

```js
  it("keeps the app's own route names, and drops any other fragment", () => {
    const at = (url) => scrubbed({ type: "pageview", url }).url;
    expect(at("https://studio.shani-cohen.com/#demo")).toBe("https://studio.shani-cohen.com/#demo");
    expect(at("https://studio.shani-cohen.com/?ref=x#privacy")).toBe("https://studio.shani-cohen.com/#privacy");
    expect(at("https://studio.shani-cohen.com/#access_token=abc")).toBe("https://studio.shani-cohen.com/");
    expect(at("https://studio.shani-cohen.com/#__proto__")).toBe("https://studio.shani-cohen.com/");
  });
```

- [ ] **Step 2: Run it.** Command: `npx vitest run src/__tests__/analytics.test.js`. Expected: FAIL on `#demo`.
- [ ] **Step 3: Implement.** `import { ROUTE_HASHES } from "./routes.js";`, then in `scrubbed`:

```js
    const url = new URL(event.url);
    const name = url.hash.slice(1);
    const hash = ROUTE_HASHES.includes(name) ? `#${name}` : "";
    return { ...event, url: `${url.origin}${url.pathname}${hash}` };
```

  Update the doc comment: "the page's origin and path, plus its hash when it is one of the app's own route names".
- [ ] **Step 4: Run it.** Expected: PASS.
- [ ] **Step 5: Commit:** `feat(analytics): count the demo and the Studio apart`.

---

### Task 8: The hero screenshot and the share image

**Files:** create `public/sales/studio-today.webp` and `public/sales/og.jpg`; update the `width` and `height` on the hero `img`.

- [ ] **Step 1:** Start the dev server (`numerology-dev`, port 5273) and open `http://localhost:5273/#demo` in Chrome at a 1280x800 viewport.
- [ ] **Step 2:** Hide the demo banner for the picture by injecting `.demo-banner{display:none}`. Wait for the motion to settle, then save a screenshot of the "היום" screen to disk. Only demo data shows: the sample clients are invented.
- [ ] **Step 3:** Convert it:
  - `ffmpeg -y -i shot.png -c:v libwebp -quality 82 public/sales/studio-today.webp`;
  - `ffmpeg -y -i shot.png -vf "scale=1200:-1,crop=1200:630:0:0" -q:v 3 public/sales/og.jpg`.

  Set the `img`'s width and height to the WebP's size (read with `ffprobe`).
- [ ] **Step 4:** Check the hero in the browser pane at desktop and phone width. Then commit: `feat(sales): a real screenshot of the demo in the hero`.

---

### Task 9: `index.html` describes the Studio

**Files:** modify `index.html`.

- [ ] **Step 1:** Change the following, keeping every other tag (no inline script is added; `security-headers.test.js` guards that):
  - title: `הסטודיו · תוכנה לנומרולוגים`;
  - description: `הסטודיו לנומרולוגים: תיקי לקוחות, קריאות מלאות, מצב פגישה ודוחות PDF בשם שלכם. אפשר לנסות עכשיו, בלי הרשמה.`;
  - `og:title`: `הסטודיו · תוכנה לנומרולוגים`, and `og:description` the same as the description;
  - `og:image`: `https://studio.shani-cohen.com/sales/og.jpg`;
  - add `<link rel="canonical" href="https://studio.shani-cohen.com/" />`.
- [ ] **Step 2:** `npx vitest run src/__tests__/security-headers.test.js`. Expected: PASS. Commit: `feat(seo): the page describes the Studio`.

---

### Task 10: The admin function trusts the new address

**Files:** modify `supabase/functions/admin-accounts/index.ts` and `handler.attack.test.js`.

- [ ] **Step 1: Add the failing test** next to "allows the production app's origin":

```js
  it("allows the Studio's own address", async () => {
    expect((await loadIndex(full)).allowedOrigins).toContain("https://studio.shani-cohen.com");
  });
```

- [ ] **Step 2: Run it.** Command: `npx vitest run supabase/functions/admin-accounts`. Expected: FAIL.
- [ ] **Step 3: Implement.** Add `"https://studio.shani-cohen.com",` first in `allowedOrigins`, and add "the Studio's address" to the comment above it.
- [ ] **Step 4: Run it.** Expected: PASS. Commit: `feat(admin-accounts): trust studio.shani-cohen.com`.
- [ ] **Step 5: Deploy.** Paste `index.ts` into the dashboard editor of `admin-accounts` and deploy. Before deploying, check that the editor's SHA-256 matches the repo file. This needs Chrome signed in to the project's Supabase account. If it is not, leave the deploy for the owner and say so. Until then, account creation works from the old address only.

---

### Task 11: studio.shani-cohen.com

- [ ] **Step 1:** `npx vercel domains add studio.shani-cohen.com numerology-app` (check `npx vercel domains --help` for the syntax first). The DNS of shani-cohen.com is on Vercel, so the record follows by itself.
- [ ] **Step 2:** Wait for the certificate. Then fetch `https://studio.shani-cohen.com/` and expect 200, the new title, the CSP header, and `nosniff`.

---

### Task 12: Verify, review, ship

- [ ] **Step 1:** Run each gate and check its result:
  - `npx vitest run`: all pass;
  - `npm run test:coverage`: 80% or more;
  - `npm run build`.
- [ ] **Step 2: Hidden-character scan** of every changed file. It builds the character class with `String.fromCodePoint`; the only known hit is the leads CSV's byte-order mark in App.jsx. Also a personal-data scan of `git diff origin/main..HEAD`.
- [ ] **Step 3: Browser checks** on the dev server, at desktop and 375px wide:
  - the sales page;
  - the demo (banner, sample clients, back);
  - `#studio` (the sign-in);
  - `#customer`;
  - a legal page from the sales footer, and back;
  - no console errors.
- [ ] **Step 4:** A `code-reviewer` agent on `origin/main..HEAD`. Fix CRITICAL, HIGH and MEDIUM findings test-first.
- [ ] **Step 5:** Push the branch and wait for the Vercel preview (its build runs the tests). Then fast-forward `main` (`git push origin feat/sales-page:main`) and check production:
  - the sales page at `/`;
  - `#demo` works;
  - `#studio` signs in;
  - the analytics view requests go out;
  - the new domain answers.
- [ ] **Step 6:** Update the memory notes `numerology-deploy.md` and `studio-redesign.md` with stage B's state and the inputs still missing.
