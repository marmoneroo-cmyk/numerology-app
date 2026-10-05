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
| Data loss on one device | Backup to a JSON file (attachments inlined), restore by merge or replace, and a reminder after 14 days without a backup | Browser storage can be cleared |

## Store API (async)

```
clients.list({search, includeArchived}) clients.get(id) clients.create(input) clients.update(id, patch) clients.remove(id)  // cascades
readings.listByClient(clientId) readings.listRecent(limit) readings.get(id) readings.create(input) readings.update(id, {title, notes, followUp}) readings.remove(id)
attachments.listByClient(clientId) attachments.add({clientId, readingId, name, type, bytes}) attachments.getBlob(id) attachments.remove(id)
summary(today) -> {clients, readings, followUps[], birthdays[]}
exportAll() -> backup   importAll(backup, {mode: "merge"|"replace"}) -> counts
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
| `src/workspace/format.js` | dd.mm.yyyy <-> YYYY-MM-DD, labels |
| `src/workspace/__tests__/*.test.jsx` | User flows on a memory store |
| `src/App.jsx` | The Studio tab, and the content provider |

## Tasks

- [ ] **1. Setup:** branch `feat/workspace-local`; dev deps `fake-indexeddb`, `jsdom`, `@testing-library/react`, `@testing-library/dom`.
- [ ] **2. Validation (TDD):**
  - Name is required, at most 120 characters.
  - The birth date is a real calendar date between 1900 and next year (`2001-02-29` is rejected).
  - The phone uses only allowed characters; the email has a basic shape.
  - Tags are trimmed, deduplicated, at most 12, each at most 30 characters.
  - Notes are at most 20,000 characters; unknown fields are dropped.
  - A reading's type must be a known one; `input` and `result` are objects; `computedFor` is an ISO date; `followUp` is a date or null.
  - An attachment is at most 20 MB, and path separators are stripped from its name.
- [ ] **3. Store over the memory backend (TDD contract):**
  - create, list, search (name, birth name, phone, email, tag), update and archive.
  - Readings need an existing client; a reading's history keeps the snapshot.
  - `update` changes only title, notes and followUp; `remove` of a client cascades to its readings and attachments.
  - Attachments round-trip their bytes; `summary` returns due follow-ups and this month's birthdays.
  - Returned records are copies, so mutating them does not touch the store.
- [ ] **4. IndexedDB backend:** the same contract suite runs on `idbBackend` over `fake-indexeddb`.
- [ ] **5. Backup:**
  - Export and then import into an empty store reproduces the data exactly, including bytes.
  - Merge keeps the newer `updatedAt`; replace clears first.
  - A malformed backup is rejected before anything is written.
- [ ] **6. Workspace shell, clients list, client form (RTL tests):**
  - Empty state, add a client, see it listed with its life path, search, edit, and validation messages in Hebrew.
- [ ] **7. Client file and readings:**
  - Run a full map, then a match against another client, then a parent-child and a year-cycle reading.
  - Each appears in the history; opening one shows the stored numbers and engine version; notes and follow-up save.
- [ ] **8. Attachments, follow-ups, birthdays, backup UI.**
- [ ] **9. Wire into App.jsx:** the "לקוחות" tab and the content provider. Then build, test, check in the browser, run the code-reviewer agent, and deploy.
