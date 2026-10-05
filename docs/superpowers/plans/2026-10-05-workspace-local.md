# Workspace v1 (local) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A "לקוחות" (Clients) workspace inside the Studio: client files, every reading saved to the client with its full result, session notes and follow-ups, file attachments, and backup/restore. It works today, on one device, with no account and no server.

**Architecture:**
- **Data:** one domain API, `createStore(backend)`, owns all the rules: validation, ids, timestamps, search, cascading deletes and backup. Backends are dumb persistence.
  - `memoryBackend` is used in tests and as a fallback when the browser blocks storage.
  - `idbBackend` uses IndexedDB in the browser.
  - When the server exists (Supabase, step 3), a server store implements the same API and must pass the same contract tests. Nothing in the UI changes.
- **Saved readings:** each one stores its input, the engine result snapshot, `ENGINE_VERSION` and the date it was made for. The history never changes when the engine changes.
- **UI:** new components under `src/workspace/`, styled with the app's global classes (`gc`, `gb`, `gi`, `ghost`, `chip`, `ti`, `rrow`).
- **Content:** interpretation content (`D`, `MASTER`, `KARMA`, `YEAR_ENERGY`, `LP_COMPAT`, `getCompat`, `exportReport`) reaches the workspace through a React context provided by App.jsx. Nothing is moved, and the editable interpretation library can later swap the provider.

**Tech Stack:** React 18, Vite 5, the engine (`src/engine`), IndexedDB. Tests use Vitest with `fake-indexeddb`, `jsdom` and `@testing-library/react`.

**Out of scope here (step 3, needs the owner's free Supabase account):** login, single active session, device approval, admin panel, server sync. The SQL and adapters for those are the next plan.

---

## Decisions

| Question | Decision | Why |
|---|---|---|
| Where it lives | A first Studio tab, "לקוחות", rendering `<WorkspaceApp/>` | The Studio is the practitioner's tool; no router needed |
| Storage | IndexedDB, with persistent storage requested | It holds files, it's large, and it is async like the future server |
| Birth date | Optional on the client, required to run a reading | Practitioners add a contact before they know the date |
| Reading types | `map` (fullCalc), `match` (matchReading: love/twin/biz/parent), `parentChild`, `yearCycle` | Every engine reading the Studio has today |
| Snapshot | `{input, result, engineVersion, computedFor}` stored verbatim | A saved reading must read the same forever |
| Navigation | A small view-state machine in `WorkspaceApp` | Five screens, no deep links needed yet |
| Data loss on one device | Backup to a JSON file (attachments inlined), restore by merge only, and a reminder after 14 days without a backup | Browser storage can be cleared |
| Multi-record changes | One all-or-nothing `backend.batch(ops)` per change (one IndexedDB transaction) | A failure half-way must never leave half a client or half a restore |
| Restoring | The whole backup is validated first. Timestamps are normalised, and future or pre-1970 ones are refused. Readings and files are only ever added, never replaced or moved. A client is replaced only by a newer copy of itself. | A backup file can be old, edited or forged |
| Deleting a client | Their readings and files go too, and their name and date are wiped from other clients' readings that link them (shown as "(נמחק)") | Deleting a person must delete their personal data |
| Snapshot shape | Each reading type has an exact schema, and the snapshot is rebuilt from known fields only. Map insights are saved with the reading. | A bad record must not crash a screen or smuggle data; the history must read the same forever |
| Data at rest | Not encrypted on the device in v1; protected by the device's own lock. Accounts and server storage arrive in step 3. | Owner decision, reported with this step |
| Browser hardening | CSP (scripts only from the site itself), nosniff, no framing, Referrer-Policy, Permissions-Policy; attachments always download as `application/octet-stream` | Client data lives in this origin |

## Store API (async)

```
clients.list({search, includeArchived}) clients.get(id) clients.create(input) clients.update(id, patch) clients.remove(id)  // cascades
readings.listByClient(clientId) readings.listRecent(limit) readings.get(id) readings.create(input) readings.update(id, {title, notes, followUp}) readings.remove(id)
attachments.listByClient(clientId) attachments.add({clientId, readingId, name, type, bytes}) attachments.getBlob(id) attachments.remove(id)
summary(today) -> {clients, readings, followUps[], birthdays[]}
exportAll() -> backup (+ missingFiles)   importAll(backup) -> counts   // merge only
```

Errors are `ValidationError` (with `errors: [{field, code}]`) and `NotFoundError`.

## File structure

| File | Responsibility |
|---|---|
| `src/data/validation.js` | `validateClient`, `validateReading`, `validateAttachment`, field limits |
| `src/data/store.js` | `createStore(backend, {now, newId})` — the domain API |
| `src/data/memoryBackend.js` | Map-based backend, structured-clone isolation |
| `src/data/idbBackend.js` | IndexedDB backend: stores `clients`, `readings`, `attachments`, `blobs` |
| `src/data/bytes.js` | base64 <-> bytes for backups |
| `src/data/__tests__/*.test.js` | validation, and the store contract run over both backends |
| `src/workspace/WorkspaceApp.jsx` | Store bootstrap, view state, theme colors |
| `src/workspace/ClientsScreen.jsx` | Search, list, today's follow-ups, birthdays, backup and restore |
| `src/workspace/ClientForm.jsx` | Create and edit a client |
| `src/workspace/ClientFile.jsx` | Client details, readings history, notes, attachments |
| `src/workspace/NewReading.jsx` | Choose a type, enter the other person, compute with the engine, save |
| `src/workspace/ReadingView.jsx` | Render a saved snapshot, notes, follow-up, PDF, delete |
| `src/workspace/content.js` | `ContentContext`, `useContent` |
| `src/workspace/format.js` | dd.mm.yyyy <-> YYYY-MM-DD, labels, one-line summaries |
| `src/workspace/files.js` | Reading picked files; saving downloads (backup JSON, attachments as octet-stream) |
| `src/workspace/ui.jsx` | Shared pieces: `useLoad`, `Field`, `ScreenTitle`, `ScreenBoundary`, cards |
| `src/workspace/__tests__/*.test.jsx` | User flows on a memory store |
| `src/data/open.js` | Opens the device store once per page (IndexedDB, else memory) |
| `src/App.jsx` | The Studio tab, and the content provider |
| `vercel.json`, `public/analytics.js` | Security headers; the analytics bootstrap moved out of `index.html` so the CSP needs no inline script |
| `src/__tests__/security-headers.test.js` | Pins the headers, and keeps inline scripts out of `index.html` |

## Tasks

- [x] **1. Setup:** branch `feat/workspace-local`; dev deps `fake-indexeddb`, `jsdom`, `@testing-library/react`, `@testing-library/dom`.
- [x] **2. Validation (TDD):**
  - Name is required, at most 120 characters.
  - The birth date is a real calendar date between 1900 and next year (`2001-02-29` is rejected).
  - The phone uses only allowed characters; the email has a basic shape.
  - Tags are trimmed, deduplicated, at most 12, each at most 30 characters.
  - Notes are at most 20,000 characters; unknown fields are dropped.
  - A reading's type must be a known one; `input` and `result` are objects; `computedFor` is an ISO date; `followUp` is a date or null.
  - An attachment is at most 20 MB, and path separators are stripped from its name.
- [x] **3. Store over the memory backend (TDD contract):**
  - create, list, search (name, birth name, phone, email, tag), update and archive.
  - Readings need an existing client; a reading's history keeps the snapshot.
  - `update` changes only title, notes and followUp; `remove` of a client cascades to its readings and attachments.
  - Attachments round-trip their bytes; `summary` returns due follow-ups and this month's birthdays.
  - Returned records are copies, so mutating them does not touch the store.
- [x] **4. IndexedDB backend:** the same contract suite runs on `idbBackend` over `fake-indexeddb`.
- [x] **5. Backup:**
  - Export and then import into an empty store reproduces the data exactly, including bytes.
  - Merge keeps the newer client copy; readings and files are insert-only (replace mode was dropped in step 10).
  - A malformed backup is rejected before anything is written.
- [x] **6. Workspace shell, clients list, client form (RTL tests):**
  - Empty state, add a client, see it listed with its life path, search, edit, and validation messages in Hebrew.
- [x] **7. Client file and readings:**
  - Run a full map, then a match against another client, then a parent-child and a year-cycle reading.
  - Each appears in the history; opening one shows the stored numbers and engine version; notes and follow-up save.
- [x] **8. Attachments, follow-ups, birthdays, backup UI.**
- [x] **9. Wire into App.jsx:** the "לקוחות" tab and the content provider. Then build, test, check in the browser, run the code-reviewer agent, and deploy.
- [x] **10. Review fixes** (code review + security review of steps 1-9):
  - Data:
    - `backend.batch`; every multi-record change made atomic.
    - Per-type snapshot schemas; file names without control or format characters.
    - Hardened restore; no replace mode.
    - A deleted client is wiped from other clients' readings.
    - `lastActivityAt`; missing file bytes are skipped (and counted) on export.
    - `randomId` fallback; the store is opened once per page and `persist()` is never awaited.
    - 15 planted bugs, each caught by the contract tests.
  - UI:
    - Error boundary per screen and damaged-reading-safe summaries.
    - A latest-call guard in `useLoad`; restore errors explained.
    - Oversized files refused before reading them.
    - Back auto-saves the summary; two-step file delete; follow-up "בוצע".
    - Octet-stream downloads; insights snapshot.
    - Focus moves to each screen's title; `aria-invalid`/`aria-describedby`; focusable file inputs.
  - Headers:
    - CSP and friends, checked on the built site served with the exact headers.
    - The browser's own violation reports were collected: none for page load, the public page's images and fonts, the workspace, attachments or the PDF.
- [x] **11. Second review round** (review of step 10: approved, 3 medium and 6 low; all fixed):
  - Restore and validation:
    - Inherited names (`constructor`, `__proto__`) are not reading types.
    - A backup may hold each id only once.
    - Backups are read in one consistent snapshot (`backend.snapshot()`).
    - Timestamps from the future are brought back to the time of the restore instead of failing it, and never count as newer.
    - Restored readings move their client up the list.
  - Storage:
    - Batches stay all-or-nothing even when a value cannot be stored half-way.
    - Every change runs under a write lock (`src/data/lock.js`: Web Locks across tabs, a queue within the page), so a save in one tab cannot bring back a client deleted in another.
    - `backup.js` was split out of `store.js`.
    - The unused `clear()` was removed.
    - A connection closed by an upgrade in another tab now asks for a reload.
  - Focus is kept when a delete turns into its confirmation and when a follow-up row leaves (`ConfirmAction`).
  - 23 planted bugs, each caught.
- [x] **12. Ship (2026-10-05, `d10348f`):** the branch was pushed and Vercel's preview build (tests included) passed.
  - Preview deployments sit behind Vercel's login, so the live checks ran on production after a fast-forward of `main`:
    - the headers are present;
    - the public page loads all 13 images and its fonts;
    - in the workspace: a client, a map with insights, the PDF, an octet-stream attachment and the delete, through Web Locks;
    - no CSP violations or console errors;
    - the test data was removed.
  - Production dependencies audit clean. The dev-server advisories (Vite 5 / Vitest 3) need major upgrades, a separate task.
