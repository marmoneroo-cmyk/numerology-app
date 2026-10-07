# Numerology Oracle

A Hebrew-first numerology site with the practitioner's Studio. Vite + React; static files on Vercel; subscriber accounts on Supabase (database rules in `supabase/migrations`, the admin Edge Function in `supabase/functions/admin-accounts`).

## Run it locally
```
npm install
npm run dev
```

## Deploy
Every push to `main` deploys to Vercel. Its build runs `npm test && npm run build`, so a failing test stops the deploy. Other branches get a preview, which only the project's Vercel login can open. Security headers and the CSP come from `vercel.json`; nothing else serves `dist/`.

## Project Structure
```
numerology-app/
├── index.html          ← HTML entry point (no inline scripts: the CSP forbids them)
├── package.json        ← Dependencies & scripts
├── vite.config.js      ← Vite build config
├── vercel.json         ← Vercel build (runs the tests first), SPA rewrite, security headers (CSP)
├── public/analytics.js ← analytics IDs (empty = off); turning one on needs its hosts in the CSP
├── docs/superpowers/plans/  ← implementation plans
└── src/
    ├── main.jsx        ← React mount point
    ├── App.jsx         ← The UI and the interpretation content
    ├── engine/         ← Every numerology calculation, as pure functions
    │   ├── core.js             ← reductions, name and date numbers, Lo Shu, fullCalc
    │   ├── compat.js           ← match, couple and parent-child readings
    │   ├── recommendations.js  ← smart recommendation rules
    │   ├── index.js            ← the engine's public surface
    │   └── __tests__/          ← oracle copies of the shipped code + tests
    ├── data/           ← The practitioner's client records on this device (IndexedDB)
    │   ├── store.js            ← the domain API: clients, saved readings, files, summary
    │   ├── backup.js           ← export and the checked, merge-only restore
    │   ├── lock.js             ← one change at a time, across tabs (Web Locks)
    │   ├── validation.js       ← every rule a record must meet, per-type reading snapshots
    │   ├── memoryBackend.js / idbBackend.js  ← storage, with all-or-nothing batches
    │   └── __tests__/          ← one contract suite run on every backend
    └── workspace/      ← The Studio's "לקוחות" tab: client files, readings, notes, files, backup
```

## Tests
```
npm test
```
The engine is checked against a verbatim copy of the code it replaced (`src/engine/__tests__/legacy*.js`) over every date 1900-2030, thousands of names and pairs, and several frozen clocks, plus hand-worked examples. The workspace's store passes one contract suite on both backends, and its screens are tested as a practitioner uses them. Vercel runs the tests before every build, so a change that alters a result does not deploy.

## Tech Stack
- **Vite** — Fast build tool
- **React 18** — UI framework
- **IndexedDB** — the workspace's storage on the device
- **Vitest**, Testing Library, fake-indexeddb — tests
- **Vercel** — hosting, deploys on push to `main`
