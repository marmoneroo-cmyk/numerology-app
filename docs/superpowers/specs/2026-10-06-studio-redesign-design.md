# Studio Redesign (stage A) — Design

Approved by the owner on 2026-10-06, after an interactive demo: https://claude.ai/artifact/MoAhEcgxd8ds55HEDH97Na.
Stage B, the public site, gets the same treatment later and is out of scope here.

## Goal

Make the Studio feel like a modern, premium app.
- Use the computer's full width, and fit the phone properly.
- Give every click and every card a satisfying response.
- Add four ideas borrowed from tools the owner knows: a home screen, quick search, a meeting mode and toasts.

Nothing the owner relies on changes: the colours (dark cosmic, champagne gold), the fonts (Cormorant Garamond for numbers, Heebo for text), Hebrew and English, all content, every calculation and all data.

## Decisions

| Question | Decision | Why |
|---|---|---|
| Overall approach | Upgrade in place (option 1 of 3) | Lowest risk. Each screen can be tested on its own, and the toolbar stays at the top as the owner asked |
| Width | The Studio column grows from 600px to 1240px on a computer. Each screen sets its own layout inside it | The owner asked for a much bigger display on the computer |
| Breakpoints | Phone below 640px, tablet from 640px to 1023px, computer from 1024px | The usual device widths. The toolbar already wraps at 520px |
| Toolbar | Stays at the top and sticky on wide screens. A new first tool, "היום", becomes the default | The owner's earlier request; "היום" is the new home |
| Motion | One shared layer: a gold ripple and press on buttons, soft screen transitions, count-up numbers, vibration where the phone supports it | The same feel everywhere, built once |
| Reduced motion | `prefers-reduced-motion: reduce` turns every animation into an instant change | Accessibility; the demo already does this |
| Cards | One card component for the "קלפים" tool, today's card, and the cards inside readings | Card opening was named specifically |
| Verifying screens without signing in | A development-only "lab" page with sample data, outside the production build | The Studio sits behind a login, and Claude never types passwords |

## Components (new folder `src/studio/`)

| Unit | What it does | Depends on |
|---|---|---|
| `motion.js` | `prefersReducedMotion()`, `vibrate(ms)` (silent where unsupported), `withViewTransition(fn)`, and `attachRipple(root)`: one delegated `pointerdown` listener that draws the ripple on any `.fx` element | DOM only |
| `useMediaQuery.js` | `useMediaQuery(query)` and `useLayout()`, which returns `"phone"`, `"tablet"` or `"desk"` | `matchMedia` |
| `CountUp.jsx` | A number that counts up to its value once (instantly under reduced motion) | motion.js |
| `Toasts.jsx` | `ToastProvider` and `useToast()`: short messages at the bottom, announced politely to screen readers | React |
| `cards/Card.jsx` | A tarot card that flips in 3D, with shine, glow and sparks, and tilts under the mouse. A real `<button>` with `aria-pressed` and a label that names the card once open | motion.js, the existing card art |
| `cards/Deck.jsx` | Today's card ritual: shuffle, deal three, pick one; the others dim | Card |
| `Today.jsx` | The home screen. Details below | engine, workspace store, Card/Deck |
| `CommandPalette.jsx` | Ctrl/Cmd+K, or the search button in the top bar. It searches tools, clients (from the workspace store) and actions. Arrow keys move, Enter opens, Esc closes, and focus comes back to where it was | Toasts, workspace store |
| `MeetingMode.jsx` | A full-screen, large-type view of one reading for showing to a client: no admin buttons, Esc to leave | engine, ReadingView data |
| `studio.css` | Tokens and classes for all of the above. App.jsx sets the theme tokens for dark and light | — |

## Screens

| Tool | Computer (1024px+) | Phone |
|---|---|---|
| היום (new) | Today band (day number, date, meaning, "new reading"); three panels in a row (birthdays this week, recent clients, quick actions); today's card underneath | One column; the deck above the cards |
| לקוחות | The list and the open client side by side. The list stays put while a client, a reading or the form opens beside it | One screen at a time, as now |
| קריאה | Form and results side by side once there are results; the chapters in two columns | As now, with the motion layer |
| טבלאות, לידים | Full width, no sideways scrolling | Rows become cards |
| התאמה | The two people side by side, the match in the middle | Stacked |
| יומי | Affirmation and ritual side by side, as cards | Stacked |
| קלפים | The 9 new cards in an auto-filling grid | 3 per row |
| מחשבונים | A grid of calculator cards | One column |
| חנות | Products in 3 columns | One column |
| החשבון שלי | Two columns: details and password, then two-step and devices | One column |
| חשבונות | Accounts list beside the open account | One screen at a time |

## "היום" (Today)

- **Day number:** today's number from the engine (`dailyRitualNumber`), with its meaning from the existing content.
- **Birthdays this week:** clients whose birthday falls in the next 7 days, across New Year. Each shows the date, the age they turn, their life path (`LP`) and the personal year they enter (`PY`). A "ברכה" button opens WhatsApp with a ready greeting, in a new tab, only when the client has a phone number.
- **Recent clients:** the 4 most recently updated (`updatedAt`). A click opens the file.
- **Quick actions:** new reading, new client, meeting mode, quick search.
- **Today's card:** the Deck ritual.
- **Empty states:** with no clients yet, the panels say how to add the first one.

## Meeting mode

- **Opens from:** a reading (in the client file or the reading tool) and from quick search.
- **Shows:** the name, the life path in very large type, three more numbers and a short meaning.
- **Leaves on:** Esc or the button. The focus returns.
- **Never:** a full-screen request (it fails on phones and in some browsers). The overlay fills the window instead.

## Accessibility and performance

- **Keyboard:** every new control is a real button or link, with a visible focus ring. The toolbar keeps its buttons and `aria-current`.
- **Overlays:** the palette and meeting mode are `role="dialog"` with `aria-modal`. Focus moves in and comes back.
- **Reduced motion:** honoured everywhere.
- **Animation cost:** transform and opacity only, plus one `filter` glow on the opened card. At most 18 sparks per card, removed after 1.7s.
- **Loading:** no new libraries. The new code loads with the Studio, as the account code does now.

## Testing

- **Unit tests for every new unit:**
  - `motion`: reduced motion respected, no vibration where unsupported;
  - `useLayout` breakpoints;
  - Card: flip, aria, sparks only with motion;
  - Deck: three distinct cards, one pick dims the others;
  - Toasts: shown, announced, removed;
  - CommandPalette: filtering, keyboard, focus return, Hebrew search;
  - MeetingMode: content, Esc, focus;
  - Today: the birthday window across New Year, ages, an empty store, and the greeting link only with a phone.
- **Every existing test keeps passing.** Coverage stays at or above 80%.
- **Lab page:** every new screen in phone, tablet and computer widths, in both themes, checked in the browser pane.
- **The owner tests the real Studio at the end,** before anything is merged or deployed.

## Rollout

- **Branch:** `feat/studio-redesign`, branched from `feat/accounts`. One commit per task, each with its tests.
- **Before any merge:** the owner's test.
- **Then:** stage B (the public site) gets its own design and plan.

## Out of scope

- The public site (stage B).
- New calculations or changed content.
- Emails (they wait on custom SMTP; see the accounts plan).
- A sidebar or bottom navigation (option 2, not chosen).
