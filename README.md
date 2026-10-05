# 🔮 Numerology Oracle — Railway Deployment Guide

## מדריך העלאה ל-Railway (בעברית)

### שלב 1: העלאה ל-GitHub
```bash
# צור ריפו חדש ב-GitHub (דרך github.com → New Repository)
# אח"כ בטרמינל:

cd numerology-app
git init
git add .
git commit -m "Numerology Oracle v7"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/numerology-app.git
git push -u origin main
```

### שלב 2: חיבור ל-Railway
1. היכנס ל-**[railway.app](https://railway.app)** (עם חשבון ה-GitHub שלך)
2. לחץ **"New Project"**
3. בחר **"Deploy from GitHub Repo"**
4. בחר את ה-repo **numerology-app**
5. **זהו!** Railway יזהה אוטומטית שזה Node.js ויריץ:
   - `npm install`
   - `npm run build`
   - `npm start`

### שלב 3: קבלת כתובת URL
1. לחץ על הפרויקט ב-Railway
2. לחץ **"Settings"** → **"Generate Domain"**
3. תקבל כתובת כמו: `numerology-app-production.up.railway.app`
4. **זה הכל — האפליקציה שלך באוויר!** 🎉

---

### שינויים עתידיים
כשאתה עושה `git push` — Railway עושה deploy אוטומטי תוך ~30 שניות.

```bash
# אחרי שינוי בקוד:
git add .
git commit -m "עדכון"
git push
# Railway יעדכן אוטומטית
```

---

## English Guide

### Step 1: Push to GitHub
```bash
cd numerology-app
git init
git add .
git commit -m "Numerology Oracle v7"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/numerology-app.git
git push -u origin main
```

### Step 2: Connect to Railway
1. Go to **[railway.app](https://railway.app)**
2. Click **"New Project"** → **"Deploy from GitHub Repo"**
3. Select **numerology-app**
4. Railway auto-detects Node.js and runs build + start

### Step 3: Get your URL
1. In Railway dashboard, click your project
2. Go to **Settings** → **Generate Domain**
3. You'll get something like: `numerology-app-production.up.railway.app`

### Updates
Every `git push` triggers automatic redeployment.

---

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
