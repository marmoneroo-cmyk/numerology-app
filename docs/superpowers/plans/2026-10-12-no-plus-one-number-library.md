# No +1, and the number library in place of the tarot — plan

The owner's requests and answers of 2026-10-12, after the audit deploy (main 9dbc631).

## Decisions (the owner, 2026-10-12)

1. **The +1 goes, everywhere.** The personal year is the birth day + birth month + the current year, always; it
   changes on January 1. With it go the personal month and day built on it, the years table, the "+1" note
   (`src/ui/PlusOneNote.jsx`) and the +1 lines in the "how was this calculated" texts and on the sales page.
2. **Saved readings are recalculated without the +1** (the owner's choice over "keep as saved"): a saved map or years
   table whose input recorded `add: true` is shown with its +1-dependent numbers worked out again without it, for the
   date it was made for: the personal year, month and day, the years table, the psychological map (it reads the
   personal year) and the insights (some read the personal year). Everything else stays as saved. The stored rows
   are not rewritten (a backup still holds what was saved); the workspace recalculates as it loads a reading.
3. **The "new personal year" list in Today moves from July to January**, with the same message.
4. **The tarot goes; the number library takes its tab** ("מספרים"): 1–9, the masters 11, 22, 33 and the karmic debts
   13, 14, 16, 19. A number opens a page with everything the Studio already says about it (no new text):
   keywords and essence, the story of "אנשי N", strengths, challenges and the lesson, shadow and growth, as a
   personal year, stone, element, ritual and a question to reflect on; the masters' and debts' own texts.
5. **Today's card becomes today's number**: the universal day of the date as a card, which opens its page in the
   library (numerology, not a draw).
6. **Privacy policy**: the fonts are the site's own; Google Fonts leaves the text and the providers list.

## Work

- Engine (`src/engine/core.js`, version 3.0.0): `PY(d, m, year)`, `personalYearOn`, `yearCycle(d, m, now)`,
  `PM(d, m, now)`, `PD(d, m, now)`, `fullCalc(d, m, y, name, now)`; `addsOne` goes. A new `withoutPlusOne(reading)`
  for saved readings. Tests: the equivalence and known values compare with the reference without +1; the +1 tests
  become "no +1" tests; hand-worked values for July–December dates.
- Screens: App.jsx (map, years, Today's personal years), workspace (new reading, reading view, client file list),
  demo data, how.js, ReadingSummary, Today (January), lab sections.
- Tarot: `src/studio/tarot/`, its tests, `App.tarotLoad.test.jsx`, the deck switch, help texts, the lab section and
  `llms.txt` go. `src/studio/library/` holds the library; the tool's key becomes `numbers`.
- Sales page: the +1 lines, the tools card ("קלפים והיום האוניברסלי"), and the "how" screenshot (a new file name:
  browsers keep `/sales/` files for 30 days, `long-cache.test.js`).
- Docs: `docs/calculation-rules.md`, the HANDOFF and the memories.
