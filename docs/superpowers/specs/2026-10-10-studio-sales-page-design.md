# The Studio's sales page (stage B) — design

**Date:** 2026-10-10. **Status:** approved by delegation. On 2026-10-10 the owner said "ב תעשה את כולו לבד" (do all of stage B yourself), after deciding the questions below on 2026-10-07.

## Goal

The app's public face sells the Studio to numerology practitioners. Shani's own numerology page stays where it is, at `#customer`. Her personal brand lives at shani-cohen.com, a separate project.

## Decisions (the owner's answers)

| Question | Decision |
|---|---|
| Where the sales page lives | In the app itself: `/` becomes the sales page. No separate marketing site. |
| How a practitioner joins | Contacting the owner, who opens the account (as today). No online payment. |
| Pricing | One plan: a monthly price and a free trial period. The amounts are not given yet. |
| What a visitor can try | A tour of the real Studio with sample clients, with no account. |
| Shani's page | Stays at `#customer`, unchanged. |
| Name | Simply "הסטודיו" ("the Studio"). |
| Address | studio.shani-cohen.com. The old address keeps working. |
| Style | Dark, like the Studio: the `--st-*` tokens in `src/studio/studio.css`. |
| Build approach | Inside the app, with lazy loading so the sales page loads light. |

Inputs still missing, each a single constant in `src/sales/config.js`:
- **`SALES_WHATSAPP`:** the owner's WhatsApp number. While it is `null`, "contact us" is an email to `BUSINESS_EMAIL`, never Shani's number.
- **`PRICE_MONTHLY`:** while `null`, the card says "מחיר בפנייה".
- **`TRIAL_DAYS`:** while `null`, the card says "תקופת ניסיון חינם".

## Addresses (routing)

`src/routes.js` turns the address into a view. It is pure and tested.

| Address | View | Loads |
|---|---|---|
| `/` | the sales page; in a browser with a saved login, the Studio | the light sales bundle; the Studio lazily |
| `#studio` (`#owner`, `#admin`) | the Studio, behind sign-in | the app bundle, lazily |
| `#demo` | the Studio on sample data | the app bundle and the demo account, lazily |
| `#customer` | Shani's page, as today | the app bundle, lazily |
| `#terms` `#privacy` `#refunds` | the legal page, over the view you came from | from the sales page: light; inside the app: the app shows it, as today |

- **The "saved login" check** looks only at whether localStorage holds `sb-kcgjdxubcdmbrjlftxyv-auth-token`, supabase-js's default key. It loads nothing. It runs only on the first load. When it sends a visitor to the Studio, the address becomes `#studio` (replaceState).
- **Navigation** pushes a history entry, so the browser's back button works. Going home removes the hash with pushState, not `location.hash = ""`, which would leave a bare `#`.
- **Inside the app:**
  - Leaving the Studio (the top bar's exit, or "leave" on the sign-in screen) goes to the sales page. Before, it went to Shani's page, which stays reachable from the Studio's "customer view" toggle.
  - The customer page's way into the Studio goes to `#studio`.

## Units

- `src/routes.js`:
  - `viewOf(hash)` returns `home`, `studio`, `customer`, `demo` or `legal`.
  - `nextRoute(current, hash, { initial, signedIn })` keeps the view under a legal page.
  - `hasSavedLogin(storage)`.
- `src/Root.jsx`: holds the route, listens to `hashchange`, and renders one of:
  - the sales world: `SalesPage`, or `LegalPage` over it;
  - the app world: a lazy `AppWorld`.
- `src/AppWorld.jsx` (lazy):
  - `AccountProvider` plus `ToastProvider` plus `App`, with `view` and `navigate`.
  - For `demo`, the provider is `active` with the demo service; `key` keeps the demo and the real provider apart.
- `src/demo/sampleData.js`: the sample clients and the in-memory client (`labClient`), moved out of `src/lab/labAccount.js` so the lab and the demo share them.
- `src/demo/demoAccount.js`: the demo service, a **subscriber** (no admin screen) called "הסטודיו לדוגמה". The account and device calls are no-ops.
- `src/ui/Icon.jsx`: the line icons, moved out of `App.jsx` so the sales page can use them without loading the app.
- `src/business.js`: `BUSINESS_EMAIL`, moved out of `App.jsx`, for the same reason.
- `src/sales/`:
  - `config.js`;
  - `content.js` (every text, in Hebrew and English);
  - `SalesPage.jsx`;
  - `sections/*.jsx`: the top bar, hero, features, how to join, privacy, price, FAQ and footer;
  - `sales.css`.
- **`App.jsx`, small changes:**
  - optional `view` and `navigate` props; without them, App behaves exactly as today (the tests and the lab);
  - a demo banner;
  - `Icon` and `BUSINESS_EMAIL` imported instead of defined.

## The page (top to bottom)

1. **Top bar:** "✦ הסטודיו", an EN/עב switch, and "כניסה למנויים" (to `#studio`).
2. **Hero:**
   - the headline "כל הלקוחות, הקריאות והמפות — במקום אחד", with a subline;
   - "לנסות את הסטודיו" (to `#demo`) and "לדבר איתנו" (contact);
   - a real screenshot of the demo Studio (`public/sales/`, WebP, sample data only).
3. **Features:** six tiles:
   - client files and quick search;
   - full reading;
   - meeting mode;
   - PDF reports in the subscriber's name;
   - "היום";
   - matches and cards.
4. **How to join:** three steps: contact us, we open an account with a free trial, sign in from any device.
5. **Privacy and security:**
   - servers in the EU;
   - only the subscriber sees their clients;
   - two-step verification;
   - one active session;
   - backup and export at any time;
   - the admin sees counts only.
6. **Price:** one card: the monthly price or "בפנייה", the trial, "ביטול בתוך 14 ימים", and the contact button.
7. **FAQ:**
   - devices;
   - who owns the data, and getting it out;
   - after the trial;
   - languages;
   - cancelling.
8. **Footer:** WhatsApp or email, the three legal links, and "© הסטודיו".

**Copy rules:**
- The Hebrew speaks in the plural or impersonally, never in a gendered singular "you". A test enforces it, as on the legal pages.
- No invented facts or testimonials.
- Claims match the privacy policy.

## The demo

- **No server:**
  - the demo provider's `loadService` returns the demo service, so supabase-js and `service.js` are never loaded;
  - the workspace runs on the in-memory client;
  - files go to an in-memory bucket.
- **Nothing persists:** changes live in memory only, and a reload starts over. Within one page load, the Studio's workspace cache, kept per user id, keeps the demo's changes between visits to `#demo`.
- **No IndexedDB:** the demo opens none. App hides the local-copy offer, which reads the browser's own local workspace, when `view` is `demo`.
- **A subscriber, so no admin screen.** "My account" works on no-ops.
- **A banner across the top:** "זו הדגמה עם לקוחות לדוגמה. שום דבר לא נשמר." with "לדבר איתנו" and "חזרה לעמוד".
- **Analytics:** a page view of `#demo` keeps its hash. See below.

## Analytics

`scrubbed()` keeps a hash only when it is one of the app's own route names: `#studio`, `#demo`, `#customer`, `#terms`, `#privacy` or `#refunds`. Any other fragment and any query is still dropped, so the funnel (sales page to demo) shows up without exposing a token.

## Loading

- `main.jsx` renders `Root`. The sales world imports no `App.jsx`, `jspdf`, `@supabase/supabase-js` or demo code: a test walks the static import graph from `Root.jsx` and checks it.
- The app world is one `import()`, as are the demo account and the account service (already lazy).
- Fonts: the same Google Fonts as the app (the CSP already allows them), imported by `sales.css`.

## The address studio.shani-cohen.com

- **Vercel:** add the domain to the `numerology-app` project. Its DNS is on Vercel because shani-cohen.com was bought there.
- **The admin function:** add `https://studio.shani-cohen.com` to `allowedOrigins` in `supabase/functions/admin-accounts/index.ts` and its tests. Redeploy from the Supabase dashboard; until then, creating accounts works from the old address only.
- **Per address:** localStorage and IndexedDB belong to one address. Moving means signing in again, and that registers a new device, which counts toward the device limit. A local copy of the workspace stays at the old address; export a backup there and restore it at the new one.
- **index.html:**
  - the title, description and Open Graph tags describe the Studio;
  - a canonical link to `https://studio.shani-cohen.com/` once the domain answers.

## Errors

- **The lazy app world fails to load** (offline, or a deploy changed the chunks): a small "לא הצלחנו לטעון. נסו לרענן." with a reload button, instead of a blank page.
- **Contact:** with no WhatsApp number, use the email link; with neither, hide the button. `BUSINESS_EMAIL` is set.

## Tests

1. **`routes.test.js`:** every address; a legal page over each view; the saved-login check on the first load only.
2. **`Root.test.jsx`:**
   - `/` shows the sales page;
   - `#studio` shows the sign-in;
   - `#demo` shows the banner and the sample clients, makes no request to `supabase.co`, and opens no IndexedDB workspace;
   - `#customer` shows Shani's page;
   - from the sales page, `#privacy` and back;
   - a saved login opens the Studio;
   - leaving the Studio returns to the sales page;
   - a failed lazy load shows the retry message.
3. **Sales page:**
   - every section;
   - the call-to-action targets for each config (WhatsApp or email; price or "בפנייה");
   - the legal links;
   - the English switch;
   - Hebrew with no gendered singular "you";
   - no placeholders;
   - contrast of at least 4.5:1 for text.
4. **The import graph:** the sales world loads none of the heavy or secret modules.
5. **App:** with `view` and `navigate`, entering and leaving the Studio navigates; without them, the old behaviour stays (the existing tests).
6. **Analytics:** route hashes are kept, everything else is dropped.
7. **Gates:** coverage stays at 80% or more; build; a browser check on desktop and phone width.

## Out of scope (YAGNI)

- Online payment.
- Self sign-up.
- Automatic trial expiry (the owner suspends or switches the plan by hand).
- A separate marketing site.
- Testimonials (none exist yet).
- A promo video.
