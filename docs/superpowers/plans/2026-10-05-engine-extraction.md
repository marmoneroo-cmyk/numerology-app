# Numerology Engine Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move every numerology calculation out of the 2,700-line `src/App.jsx` into a pure, tested module `src/engine/` without changing a single result the app shows.

**Architecture:** `src/engine/core.js` holds the arithmetic as pure functions; anything that depends on "today" takes an explicit `now` argument that defaults to the current date, so the app's calls stay unchanged while tests (and, later, saved readings) become reproducible. A verbatim copy of the original functions lives in `src/engine/__tests__/legacy.js` as an oracle, and an equivalence test compares engine and oracle over tens of thousands of inputs under frozen clocks. Interpretation content (`D`, `KARMA`, `YEAR_ENERGY`, `AFFIRMATIONS`, `LP_COMPAT`, `genNames`) stays in `App.jsx` — it moves later, with the editable interpretation library.

**Tech Stack:** React 18 + Vite 5 (existing), Vitest 3 (new, dev only), plain ES modules with JSDoc.

**Status (2026-10-05): done and in production** (commits a27e36f, 5c8b3db, 3fcec9c).
- **Added after the code review:** the calculations that still lived in event handlers moved too: `compat.js` and `yearCycle` / `dailyRitualNumber` / `masterBase`. The oracle for them is `legacy-handlers.js`.
- **Tests:** they now run the engine under a decoy clock. 57 tests pass locally and in the Vercel build.

**Spec:** the approved SaaS spec, section "תוכנית עבודה", step "שבוע 1 — מנוע חישוב נפרד ובדוק" (artifact `https://claude.ai/artifact/JrScUQXNxsW8bxjRx8Ggxn`).

---

## File structure

| File | Responsibility |
|---|---|
| `src/engine/core.js` (create) | All arithmetic: reductions, name numbers, date numbers, karmic debts, Lo Shu, `fullCalc`, `liveNum`, `ENGINE_VERSION` |
| `src/engine/recommendations.js` (create) | `getRecommendations` rules (moved verbatim) |
| `src/engine/index.js` (create) | Public surface of the engine |
| `src/engine/__tests__/legacy.js` (create) | Verbatim copy of the original App.jsx functions — the oracle. Never edit it. |
| `src/engine/__tests__/known-values.test.js` (create) | Hand-verified examples that document the method |
| `src/engine/__tests__/equivalence.test.js` (create) | Engine === oracle over large input sweeps and five frozen clocks |
| `src/App.jsx` (modify) | Delete the moved definitions, import them from `./engine` |
| `package.json` (modify) | `vitest` dev dependency, `test` script |

---

### Task 1: Test runner

**Files:** Modify `package.json`

- [ ] **Step 1: Branch and install**

```bash
git checkout -b feat/engine-extraction
npm install --save-dev vitest@^3.2.4
```

- [ ] **Step 2: Add the script** — in `package.json` `"scripts"` add `"test": "vitest run"`.

- [ ] **Step 3: Verify the runner starts**

Run: `npx vitest run`
Expected: `No test files found` (exit code 1). The runner works; there is nothing to run yet.

---

### Task 2: The oracle and the hand-verified examples

**Files:** Create `src/engine/__tests__/legacy.js`, `src/engine/__tests__/known-values.test.js`

- [ ] **Step 1: Copy the original functions verbatim** into `legacy.js`: `LV`, `VOW`, `R`, `Rm`, `NV`, `SU`, `EX`, `LP`, `CA`, `PY`, `PM`, `PD`, `CH`, `karmicDebt`, `loShu`, `fullCalc` (App.jsx lines 90–146), `getRecommendations` (250–264), `liveNum` (362–369), `LPm` (575). Only change: prefix each with `export`. Header comment: "Verbatim copy of App.jsx v7 — the oracle. Do not edit."

- [ ] **Step 2: Write the known-values test against the oracle first**

```js
import { describe, it, expect } from "vitest";
import * as legacy from "./legacy.js";

const OCT_5_2026 = new Date(2026, 9, 5, 12);

describe.each([["oracle", legacy]])("known values (%s)", (_, E) => {
  it("reduces to one digit; 0 stays 0", () => {
    expect([E.R(0), E.R(7), E.R(10), E.R(38), E.R(99)]).toEqual([0, 7, 1, 2, 9]);
  });
  // ...every example listed in Task 3, Step 1
});
```

- [ ] **Step 3: Run** `npx vitest run src/engine/__tests__/known-values.test.js` — Expected: PASS against the oracle (proves the hand calculations describe the real method).

---

### Task 3: The engine

**Files:** Create `src/engine/core.js`, `src/engine/recommendations.js`, `src/engine/index.js`, `src/engine/__tests__/equivalence.test.js`; extend `known-values.test.js` to run against the engine too.

- [ ] **Step 1: Hand-verified examples** (each computed by hand; all must hold for both oracle and engine)

| Call | Expected | Why |
|---|---|---|
| `NV("שני")`, `SU("שני")`, `EX("שני")` | 9, 1, 8 | ש3+נ5+י1; vowel י; consonants ש+נ |
| `NV/SU/EX("שני כהן אזולאי")` | 4, 1, 3 | raw sums 40 / 10 / 30 |
| `LP(15,8,1990)`, `LPm(15,8,1990)` | 6, 33 | 1+5+0+8+1+9+9+0 = 33 |
| `LP(19,9,1999)`, `LPm(19,9,1999)` | 2, 11 | 47 → 11 |
| `Rm(29)`, `Rm(13)`, `Rm(-29)` | 11, 4, 11 | master stop |
| `CA(15,8,1990, Oct 5 2026)`, `CA(15,12,1990, …)`, `CA(5,10,1990, …)` | 36, 35, 36 | birthday on the day counts |
| `PY(15,8,2026,false)`, `PY(15,8,2026,true)` | 6, 7 | 24 → 6, then +1 |
| `PM(15,8, Oct 5 2026)`, `PD(15,8, Oct 5 2026)` | 6, 3 | "1508"+"10" = 15; "1508"+"5"+"10"+"2026" = 30 |
| `CH(5,3)`, `CH(4,4)`, `CH(1,9)` | 2, 0, 8 | |
| `karmicDebt(13,4,1990,"")`, `(5,5,2001,"")`, `(1,1,2000,"זט")` | [13], [13], [16] | birth day; date sum 13; name sum 16 |
| `loShu(15,8,1990)` | miss [2,3,4,7], planes ["practical"] | digits 1,5,8,1,9,9 + LP 6 + day 6 |
| `liveNum("Shani")`, `liveNum("שני")`, `liveNum("")`, `liveNum("123")` | 6, 9, 0, 0 | Latin (code−65)%9+1 |
| `fullCalc(15,8,1990,"שני כהן אזולאי",false, Oct 5 2026)` | nv 4, lp 33, age 36, py 6, hy 6, su 1, ex 3, pm 6, pd 3, pk [5,7,3,9], ch [2,5,3,7], hp [7,3,6,7], hc [4,9,3,4], exit 21, kd [] | |

- [ ] **Step 2: Write `equivalence.test.js`** — for each of five frozen clocks (`vi.useFakeTimers(); vi.setSystemTime(now)`), assert `engine.X(...) toEqual legacy.X(...)` for: `R`/`Rm` over −1,000…100,000; `NV`/`SU`/`EX`/`liveNum`/`karmicDebt` name parts over 3,000 seeded random strings (Hebrew incl. final letters, Latin, digits, spaces, punctuation); `LP`/`LPm`/`loShu`/`karmicDebt`/`PY` over every day×month for 1900–2030; `fullCalc` (with and without explicit `now`) and `getRecommendations` (`he`/`en`) over 1,500 seeded random readings per clock. Plus: with an explicit `now`, the result does not depend on the system clock.

- [ ] **Step 3: Run** `npx vitest run` — Expected: FAIL, `Failed to resolve import "../index.js"`.

- [ ] **Step 4: Implement** `core.js`, `recommendations.js`, `index.js` (code as committed; every function keeps its original name so App.jsx call sites are untouched).

- [ ] **Step 5: Run** `npx vitest run` — Expected: all tests PASS.

- [ ] **Step 6: Commit** `feat(engine): pure, tested numerology engine module`

---

### Task 4: Wire the app to the engine

**Files:** Modify `src/App.jsx`

- [ ] **Step 1:** Add `import { R, Rm, NV, SU, EX, LP, LPm, CA, PY, PM, PD, CH, karmicDebt, loShu, fullCalc, liveNum, getRecommendations } from "./engine";` after the jsPDF import. Only names App.jsx still calls are imported.
- [ ] **Step 2:** Delete the moved definitions: the `NUMEROLOGY CORE` block (`LV` … `fullCalc`), `getRecommendations`, `liveNum`, `LPm`. Leave a one-line comment pointing to `src/engine/`.
- [ ] **Step 3:** `npm run build` — Expected: build succeeds, no "is not defined"/import warnings.
- [ ] **Step 4:** `npx vitest run` — Expected: PASS.
- [ ] **Step 5:** Dev server check: run a reading for `שני כהן אזולאי`, 15.08.1990 in Studio → Tables and Reading; numbers match the production site.
- [ ] **Step 6: Commit** `refactor: App.jsx uses the engine module`

---

### Task 5: Ship

- [ ] **Step 1:** `git push -u origin feat/engine-extraction` → Vercel preview build; confirm it is READY and renders.
- [ ] **Step 2:** Merge to `main` (fast-forward) and push → production auto-deploys; confirm the production bundle contains the engine and the page renders.
