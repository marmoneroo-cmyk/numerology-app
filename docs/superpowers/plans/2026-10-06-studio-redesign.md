# Studio Redesign (stage A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Studio becomes wide on a computer and right on a phone. It gains one motion layer (ripple, transitions, haptics), a new 3D card with a deck ritual, and four new features: a "היום" home, quick search (Ctrl+K), a meeting mode and toasts. Colours, fonts, content, calculations and data stay as they are.

**Architecture:** New self-contained units live in `src/studio/`. Each unit has its own CSS file imported by the component, tests next to it, and no knowledge of `App.jsx`. `App.jsx` and the existing screens only wire them in and change layout. A development-only lab page (`lab.html`) renders every unit with sample data, so screens can be checked without signing in. It stays outside the production build.

**Tech Stack:** React 18, Vite 5, Vitest + Testing Library (jsdom), plain CSS with custom properties. No new runtime libraries.

**Spec:** `docs/superpowers/specs/2026-10-06-studio-redesign-design.md`

**House rules for every task**
- Never type backslash escapes (`\u…`, `\n`, `\"`) into a tool call. They can arrive as real characters; see the memory note "tool-escape-transport". Use plain characters, `String.fromCharCode`, or character classes such as `[0-9]`.
- After writing files, scan them for invisible characters with the node one-liner from Task 15.
- Hebrew copy: plural or infinitive forms ("לוחצים", "בחרו"), never a gendered "you".
- Reduced motion: every animation checks `prefersReducedMotion()`, or sits under the CSS `@media (prefers-reduced-motion: reduce)` reset in `studio.css`.
- Run `npx vitest run <the task's tests>` red first, then green. Commit per task with `feat(studio): …` and the Co-Authored-By line.

---

## File structure

| File | Responsibility |
|---|---|
| `lab.html`, `src/lab/main.jsx`, `src/lab/Lab.jsx` | Dev-only lab: every new unit and screen with sample data, at phone, tablet and computer widths |
| `src/studio/motion.js` | `prefersReducedMotion`, `vibrate`, `withViewTransition`, `attachRipple` |
| `src/studio/useMediaQuery.js` | `useMediaQuery`, `useLayout` ("phone", "tablet", "desk"), `BREAKPOINTS` |
| `src/studio/Toasts.jsx`, `toasts.css` | `ToastProvider`, `useToast` |
| `src/studio/studio.css` | Theme tokens (dark and light), the ripple, `.fx` press, the reduced-motion reset, layout helpers |
| `src/studio/cards/Card.jsx`, `card.css` | The 3D card: flip, shine, glow, sparks, tilt |
| `src/studio/cards/Deck.jsx`, `deck.css` | Shuffle, deal 3, pick 1 |
| `src/studio/CommandPalette.jsx`, `palette.css` | The Ctrl/Cmd+K dialog and `useCommandShortcut` |
| `src/studio/MeetingMode.jsx`, `meeting.css` | The full-window reading for a client |
| `src/studio/today.js` | Pure: `upcomingBirthdays`, `recentClients`, `greetingLink` |
| `src/studio/Today.jsx`, `today.css` | The "היום" home |
| `src/App.jsx` | Wiring: theme tokens, toasts, ripple, the 1240px column, "היום" as default, palette, meeting mode, the new cards, per-tool layout |
| `src/workspace/WorkspaceApp.jsx`, `ClientsScreen.jsx` | List beside the open client on a computer; an `openRequest` prop for opening a client from outside |
| `src/account/AccountScreen.jsx`, `AdminScreen.jsx` | Two columns on a computer |

---

## Task 0: Lab page (dev only)

**Files:** Create `lab.html`, `src/lab/main.jsx`, `src/lab/Lab.jsx`.

- [ ] **Step 1:** `lab.html` (root) mirrors `index.html` but loads `/src/lab/main.jsx`. Vite serves it in dev at `/lab.html`. It is not in `build.rollupOptions.input` (the default is `index.html` only), so `vite build` ignores it.

```html
<!doctype html>
<html lang="he" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Studio lab</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/lab/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 2:** `src/lab/main.jsx` renders `<Lab />`. `Lab.jsx` starts with a toolbar: width (phone 390, tablet 768, desk 1240), theme (dark, light) and a section picker. Each later task adds its section. Sample data is clearly fake (רחל כהן, יוסי לוי and so on).
- [ ] **Step 3:** `npm run build`, then confirm that `dist/lab.html` does not exist. Commit: `chore(studio): a dev-only lab page`.

## Task 1: motion.js

**Files:** Create `src/studio/motion.js` and `src/studio/__tests__/motion.test.js`.

- [ ] **Step 1: Failing tests** (jsdom).

```js
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { prefersReducedMotion, vibrate, withViewTransition, attachRipple } from "../motion.js";

const motion = (reduce) => vi.spyOn(window, "matchMedia").mockImplementation((q) => ({ matches: reduce && q.includes("reduce"), addEventListener() {}, removeEventListener() {} }));
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); document.body.innerHTML = ""; });

describe("motion", () => {
  it("reads the reduced-motion setting, and treats a missing matchMedia as motion allowed", () => {
    expect(prefersReducedMotion({ matchMedia: () => ({ matches: true }) })).toBe(true);
    expect(prefersReducedMotion({ matchMedia: () => ({ matches: false }) })).toBe(false);
    expect(prefersReducedMotion({})).toBe(false);
  });

  it("vibrates only where the phone can and motion is welcome, and never throws", () => {
    motion(false);
    const nav = { vibrate: vi.fn(() => true) };
    expect(vibrate(12, nav)).toBe(true);
    expect(nav.vibrate).toHaveBeenCalledWith(12);
    expect(vibrate(12, {})).toBe(false);
    expect(vibrate(12, { vibrate: () => { throw new Error("blocked"); } })).toBe(false);
    vi.restoreAllMocks();
    motion(true);
    expect(vibrate(12, nav)).toBe(false);
    expect(nav.vibrate).toHaveBeenCalledTimes(1);
  });

  it("runs a screen change inside a view transition when there is one, and directly otherwise", () => {
    motion(false);
    const update = vi.fn();
    const doc = { startViewTransition: vi.fn((fn) => { fn(); return "t"; }) };
    expect(withViewTransition(update, doc)).toBe("t");
    expect(update).toHaveBeenCalledTimes(1);
    expect(withViewTransition(update, {})).toBe(null);
    expect(update).toHaveBeenCalledTimes(2);
    vi.restoreAllMocks();
    motion(true);
    withViewTransition(update, doc);
    expect(doc.startViewTransition).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(3);
  });

  it("draws the gold ripple on .fx elements only, removes it, and can be detached", () => {
    motion(false);
    vi.useFakeTimers();
    document.body.innerHTML = '<button class="fx" id="a">a</button><button id="b">b</button>';
    const detach = attachRipple(document);
    const press = (id) => document.getElementById(id).dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, clientX: 10, clientY: 5 }));
    press("a");
    const ripple = document.querySelector("#a .st-ripple");
    expect(ripple).toBeTruthy();
    expect(ripple.getAttribute("aria-hidden")).toBe("true");
    expect(ripple.style.getPropertyValue("--x")).toBe("10px");
    press("b");
    expect(document.querySelector("#b .st-ripple")).toBeNull();
    vi.advanceTimersByTime(800);
    expect(document.querySelector(".st-ripple")).toBeNull();
    detach();
    press("a");
    expect(document.querySelector(".st-ripple")).toBeNull();
  });

  it("draws no ripple under reduced motion", () => {
    motion(true);
    document.body.innerHTML = '<button class="fx" id="a">a</button>';
    attachRipple(document);
    document.getElementById("a").dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    expect(document.querySelector(".st-ripple")).toBeNull();
  });
});
```

- [ ] **Step 2: Implementation.**

```js
/** Shared motion for the Studio: the reduced-motion check, a short vibration, screen transitions and the gold ripple. */

/** True when the device asks for less motion. A missing matchMedia counts as motion allowed. */
export const prefersReducedMotion = (win = window) => Boolean(win.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);

/** A short vibration on phones that support it; nothing anywhere else. @returns whether it vibrated */
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

/** One listener on `root` draws the gold ripple on any pressed `.fx` element. @returns a function that removes it */
export function attachRipple(root = document) {
  const onDown = (e) => {
    const el = e.target.closest?.(".fx");
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
```

- [ ] **Step 3:** Tests green. Commit: `feat(studio): motion helpers (reduced motion, vibration, view transitions, ripple)`.

## Task 2: useMediaQuery.js

**Files:** Create `src/studio/useMediaQuery.js` and `src/studio/__tests__/useMediaQuery.test.jsx`.

- [ ] **Step 1: Failing tests.** A fake `matchMedia` driven by a `width` variable, with listeners. Rendering a probe that prints `useLayout()`:
  - 390 gives "phone", 800 gives "tablet", 1300 gives "desk";
  - changing the width and firing `change` re-renders;
  - unmounting removes the listeners;
  - with no `window.matchMedia`, the result is "phone".
- [ ] **Step 2: Implementation.**

```js
import { useEffect, useState } from "react";

/** Phone below 640px, tablet from 640px, computer from 1024px. */
export const BREAKPOINTS = { tablet: 640, desk: 1024 };

/** Whether a media query matches, kept up to date. */
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
```

- [ ] **Step 3:** Green. Commit.

## Task 3: Toasts

**Files:** Create `src/studio/Toasts.jsx`, `src/studio/toasts.css` and `src/studio/__tests__/Toasts.test.jsx`.

- [ ] **Step 1: Failing tests.**
  - a button calling `useToast()("נשמר")` shows "נשמר" inside `role="status"`;
  - it disappears after the duration (fake timers);
  - with 5 shown, only the last 3 remain;
  - `useToast()` outside the provider is a no-op that doesn't throw.
- [ ] **Step 2: Implementation.** `ToastProvider({ children, duration = 2600 })`:
  - keeps the last 3;
  - each toast removes itself after `duration`;
  - the region `div.st-toasts[role=status][aria-live=polite]` is always mounted.
  
  `toasts.css`: fixed bottom centre, above the safe area, with the toast's entrance animation.
- [ ] **Step 3:** Green. Commit.

## Task 4: studio.css (tokens and shared classes)

**Files:** Create `src/studio/studio.css`, imported once by `src/main.jsx` (and by the lab).

- [ ] **Tokens** on `:root`, dark by default, light under `:root[data-st-theme="light"]`:
  - `--st-void`, `--st-panel`, `--st-panel-2`, `--st-line`, `--st-line-strong`;
  - `--st-gold` (#c8a96a dark, #937640 light), `--st-gold-hi`, `--st-gold-wash`;
  - `--st-ink`, `--st-ink-soft`, `--st-ink-faint`, `--st-ok`, `--st-danger`;
  - `--st-display` ("Cormorant Garamond"), `--st-body` (Heebo, "Noto Sans Hebrew").
- [ ] **Shared classes:**
  - `.fx` (position relative, overflow hidden, press `scale(.97)`);
  - `.st-ripple` (the radial gold, animated with `--s`, `--x`, `--y`);
  - `.st-sr` (visually hidden);
  - `.st-panel`;
  - the grid helpers `.st-cols-2` (two columns from 1024px, one below) and `.st-cols-3`.
- [ ] **The reduced-motion reset:** `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important } }`, scoped to `.st-root, .st-root *` so the public site is untouched.
- [ ] Commit.

## Task 5: Card (subagent A, with Task 6)

**Files:** Create `src/studio/cards/Card.jsx`, `card.css` and `__tests__/Card.test.jsx`.

**Interface:**

```jsx
<Card number={7} title="המחפש" subtitle="..." art={<svg/>} accent="#9b8cff"
      open={bool} onToggle={(next) => {}} dimmed={bool} he size="md" />
```

`open` and `onToggle` are optional. Without them the card keeps its own state (uncontrolled).

**Behaviour:**
- **Element:** a `<button type="button" class="st-card">`. It has `aria-pressed`, and its `aria-label` is "קלף סגור" when closed, or `קלף 7: המחפש` when open (English: "Face-down card" / "Card 7: The Seeker").
- **Opening:**
  - adds `st-open`, which plays the CSS flip (0.95s overshoot), the glow and the shine;
  - adds 18 `.st-spark` elements (custom properties `--dx`/`--dy`), removed after 1.7s; none under reduced motion;
  - calls `vibrate(14)`.
- **Tilt:** on a closed card, pointer moves of `pointerType === "mouse"` set `--tx`/`--ty` (at most 9 and 7 degrees). Leaving resets them. None under reduced motion.
- **Dimmed:** `dimmed` adds `st-dim`.

**Tests:**
- closed label;
- a click opens it (aria, label, 18 sparks);
- a second click closes it;
- reduced motion gives no sparks;
- the controlled mode calls `onToggle(true)` without opening until `open` changes;
- `dimmed`;
- English labels.

## Task 6: Deck (subagent A)

**Files:** Create `src/studio/cards/Deck.jsx`, `deck.css` and `__tests__/Deck.test.jsx`.

**Interface:**

```jsx
<Deck pool={[{ number, title, subtitle, art, accent }]} he random={Math.random}
      onPick={(card) => {}} />
```

**Behaviour:**
- **Start:** the deck, three empty slots, a "ערבוב וחלוקה" button, and a status line (`role="status"`) inviting a shuffle.
- **Shuffle:**
  - the deck gets `st-shuffling` for 900ms (0 under reduced motion);
  - then 3 distinct cards from `pool` are dealt face down, chosen with `random`;
  - each flies from the deck (a FLIP transform), staggered 150ms;
  - the status says "בחרו קלף אחד".
- **Picking:** opens that card, dims the other two, calls `onPick`, and the status says `הקלף שלך היום: 7 · המחפש`.
- **Shuffling again:** resets.

**Tests:**
- three distinct cards with a seeded `random`;
- a pick opens one, dims two and calls `onPick` once;
- the status text;
- shuffling again resets;
- reduced motion deals without timers.

## Task 7: CommandPalette (subagent B)

**Files:** Create `src/studio/CommandPalette.jsx`, `palette.css` and `__tests__/CommandPalette.test.jsx`.

**Interface:**

```jsx
<CommandPalette open onClose={() => {}} he
  items={[{ id, label, hint, keywords: ["..."], run: () => {} }]} />
useCommandShortcut(onOpen) // Ctrl+K and Cmd+K, prevents the browser's default
```

**Behaviour:**
- **Dialog:** `role="dialog"`, `aria-modal`, labelled "חיפוש מהיר". The input has `aria-controls` pointing at a `role="listbox"`, and `aria-activedescendant` names the active option.
- **Filtering:** by label and keywords, case-insensitive. Hebrew final letters match their regular forms (ך כ, ם מ, ן נ, ף פ, ץ צ).
- **Keys:** arrows move (wrapping); Enter runs the item and closes; Esc closes.
- **Mouse:** a click on the backdrop closes it; a click on an option runs it.
- **Focus:** the input takes focus on open; on close, focus returns to the element focused before.
- **Empty state:** "לא נמצא. נסו מילה אחרת."

**Tests:**
- filtering;
- final-letter matching ("כספ" finds "כסף");
- keyboard navigation and Enter;
- Esc and focus return;
- backdrop click;
- the shortcut opens on Ctrl+K and Meta+K but not on K;
- the empty state;
- English labels.

## Task 8: MeetingMode (subagent C)

**Files:** Create `src/studio/MeetingMode.jsx`, `meeting.css` and `__tests__/MeetingMode.test.jsx`.

**Interface:**

```jsx
<MeetingMode open onClose he person="רחל כהן"
  main={{ value: 7, label: "מספר מסלול החיים" }}
  numbers={[{ value: 3, label: "ביטוי" }]} text="..." />
```

**Behaviour:**
- **Overlay:** fills the window (`position: fixed`, `inset: 0`). It never calls `requestFullscreen`.
- **Dialog:** `role="dialog"`, `aria-modal`, labelled "מצב פגישה". The close button reads "סיום הפגישה (Esc)" and takes focus on open. Esc closes, and focus returns to where it was.
- **Main number:** very large Cormorant numerals, with the number's entrance animation (instant under reduced motion).

**Tests:**
- content;
- focus on the close button;
- Esc and the button both close;
- focus return;
- nothing renders when `open` is false;
- English labels.

## Task 9: today.js and Today (subagent D)

**Files:** Create `src/studio/today.js`, `src/studio/Today.jsx`, `today.css`, `__tests__/today.test.js` and `__tests__/Today.test.jsx`.

**today.js (pure):**
- **`upcomingBirthdays(clients, now, days = 7)`:**
  - Returns `[{ client, date, age, inDays }]` for clients with a valid `birthDate` (ISO) whose next birthday is within `days` (today counts as 0), soonest first.
  - Works across New Year.
  - A 29 February birthday counts on 28 February in other years.
  - Archived clients are skipped.
- **`recentClients(clients, count = 4)`:** the first `count` by `lastActive` (from `src/data/store.js`), newest first. Archived clients are skipped.
- **`greetingLink(phone, text)`:**
  - keeps the digits;
  - a leading `0` becomes `972`;
  - 9 to 15 digits are required, otherwise it returns `null`;
  - returns `https://wa.me/<digits>?text=<encodeURIComponent(text)>`.

**Today.jsx:**

```jsx
<Today he store={workspaceStore} now={() => new Date()}
  day={{ number: 8, title: "...", text: "..." }}
  lifePath={(isoDate) => number} personalYear={(isoDate, now) => number}
  deck={<Deck .../>} onOpenClient={(id) => {}} onNewReading={() => {}}
  onNewClient={() => {}} onMeeting={() => {}} onSearch={() => {}} />
```

- **Loading:** loads `store.clients.list()` once (the existing `useLoad` from `src/workspace/ui.jsx`).
- **Today band:** the day number, the date (`toLocaleDateString` he-IL or en-GB), the meaning, and a "קריאה חדשה" button.
- **Panels:**
  - birthdays this week, with the age, life path and personal year, plus a "ברכה" link (`target="_blank"`, `rel="noopener noreferrer"`) only when `greetingLink` returns a URL;
  - recent clients, each a button calling `onOpenClient`;
  - quick actions.
- **Deck:** underneath.
- **Empty states:**
  - with no clients: "עוד אין לקוחות. מוסיפים את הראשון ב'לקוח חדש'.";
  - with no birthdays: "אין ימי הולדת השבוע."
- **Layout:** `today.css` puts the three panels in a row from 1024px, two from 640px, one below that.

**Tests:**
- `upcomingBirthdays` across New Year (now 29.12, birthday 2.1);
- 29 February, ages, the window edges (7 out, 6 in), invalid dates and archived clients;
- `recentClients` order;
- `greetingLink` for Israeli and international numbers, and junk;
- Today with a memory store (`createStore(memoryBackend())`):
  - the panels render;
  - clicks call the handlers;
  - a greeting link appears only with a phone;
  - the empty states.

## Task 10: App wiring I (tokens, toasts, ripple, width, "היום")

**Files:** Modify `src/main.jsx` and `src/App.jsx`.

- [ ] **Wiring:**
  - `main.jsx` imports `./studio/studio.css`;
  - `App` sets `document.documentElement.dataset.stTheme = dk ? "dark" : "light"`;
  - the Studio container gets the `st-root` class;
  - the tree is wrapped in `ToastProvider`;
  - `attachRipple(document)` runs once in an effect.
- [ ] **Width:** the Studio container's `maxWidth` goes from 600 to 1240 when `showOwnerUI`. The reading screen keeps its own 620px form, and the other tools get their layouts in Tasks 12 to 14.
- [ ] **"היום":**
  - add `{k:"today", i:"sun", l: he?"היום":"Today"}` as the first tool, and make `useState("today")` the default tab;
  - render `<Today>` for `tab==="today"` with the workspace store;
  - `day` comes from `dailyRitualNumber()` and `D[n]` (title and subtitle);
  - `lifePath` and `personalYear` come from the engine's `LP`/`PY` on the ISO date, in the format those functions take;
  - `deck` is a `<Deck>` whose pool is 1 to 9 from `D` and `CardArt`.
  
  The handlers:
  - `onOpenClient`: the "לקוחות" tab, then the `openRequest` from Task 13;
  - `onNewReading`: the reading tab;
  - `onNewClient`: "לקוחות" with the new-client form;
  - `onMeeting` and `onSearch`: Task 11.
- [ ] **Clickable elements:** add the `fx` class to the toolbar buttons, the top bar buttons and the primary buttons (`.gb`). `StudioNav` takes `fx` in its button class.
- [ ] **Toasts:** shown for saved, copied and opened.
- [ ] **Checks:** all tests; the lab; `npm run build`. Commit.

## Task 11: App wiring II (quick search and meeting mode)

- [ ] **Top bar:** a search button (an icon, plus "חיפוש" and "Ctrl K" on wide screens) opens the palette. `useCommandShortcut` opens it too, but only in the Studio and only when signed in.
- [ ] **Palette items:**
  - every tool;
  - every client from `store.clients.list()` (hint: their life path), which opens the client file;
  - actions: new reading, new client, today's card (back to "היום" and a shuffle), meeting mode (when a reading is open).
- [ ] **Meeting mode** opens from:
  - the reading tool's results (a "מצב פגישה" button beside the existing actions);
  - `ReadingView` in the workspace.
  
  It shows the person's name, the life path as `main`, then expression, soul urge and personal year as `numbers`, and the life path's narrative from `D` as `text`.
- [ ] **Checks:** tests, the lab, the build. Commit.

## Task 12: Tools layout

- [ ] **"קלפים":** the 9 new `Card`s in `.st-cards` (auto-fill, minmax 150px; 3 per row below 640px).
- [ ] **"יומי":** the affirmation and the ritual side by side (`.st-cols-2`).
- [ ] **"טבלאות" and "לידים":** full width. Below 640px, table rows become stacked cards (CSS on the existing tables with `data-label` cells).
- [ ] **"התאמה":** the two people's inputs side by side from 1024px.
- [ ] **"מחשבונים":** a grid of calculator cards.
- [ ] **"חנות":** 3 columns from 1024px.
- [ ] **"קריאה":** with results, the chapters sit in two columns from 1024px. The input step stays at 620px, centred.
- [ ] **Checks:** the lab at three widths, both themes; the tests; the build. Commit.

## Task 13: Clients on a computer

- [ ] **`WorkspaceApp`:**
  - from 1024px, a two-column grid: `ClientsScreen` (with `selectedId`) on one side, the current view (client, form, new reading, reading) on the other;
  - while the view is `list`, the other side shows "בחרו לקוח מהרשימה או פתחו לקוח חדש";
  - below 1024px, one screen at a time, as now.
- [ ] **`openRequest={{ clientId, nonce }}`** opens that client when the nonce changes. It is used by "היום" and quick search.
- [ ] **Tests:**
  - with matchMedia at 1300px, the list and the file are both visible, and a click in the list opens beside it;
  - at 390px, today's behaviour stays unchanged;
  - `openRequest` opens the client.
- [ ] Commit.

## Task 14: Account and admin on a computer

- [ ] **`AccountScreen`:** from 1024px, `.st-cols-2`: details and password on one side, two-step and devices on the other.
- [ ] **`AdminScreen`:** from 1024px, the list beside the open account (`go({name:"details"})` keeps the list visible); one screen at a time below that.
- [ ] **Tests:** the desk layout shows both columns; the phone layout is unchanged; the existing tests stay green.
- [ ] Commit.

## Task 15: Verification and handover

- [ ] **Tests and build:** `npm run test:coverage` (everything passes, at least 80%) and `npm run build`. `dist/lab.html` must not exist.
- [ ] **Hidden-character scan** of every changed file:

```bash
node -e 'const fs=require("fs");const {execSync}=require("child_process");const files=execSync("git diff --name-only feat/accounts && git ls-files --others --exclude-standard",{encoding:"utf8"}).split(/[\r\n]+/).filter((f)=>/[.](jsx?|css|html)$/.test(f));const r=[[1,8],[11,12],[14,31],[127,159],[0x200b,0x200f],[0x202a,0x202e],[0x2060,0x2069],[0xfeff,0xfeff]];const c=new RegExp("["+r.map(([a,b])=>String.fromCodePoint(a)+"-"+String.fromCodePoint(b)).join("")+"]","u");for(const f of files){if(c.test(fs.readFileSync(f,"utf8")))console.log("HIDDEN",f)}console.log("scanned",files.length)'
```

(`src/App.jsx` has one intended U+FEFF, in the CSV export.)
- [ ] **Lab check in the browser pane:** every section at 390, 768 and 1240, in dark and light. Screenshots go to the owner.
- [ ] **Code review:** a code-reviewer agent reviews the diff against `feat/accounts`. Fix the critical, high and medium findings.
- [ ] **Handover:** a checklist for the owner's own test of the real Studio:
  - sign in;
  - "היום" (birthdays need clients with birth dates this week);
  - Ctrl+K;
  - meeting mode;
  - cards;
  - clients side by side;
  - phone layout;
  - reduced motion (Windows: Settings → Accessibility → Visual effects → Animation effects off).
  
  Then wait for the owner's feedback before any merge.
