# RGC Volleyball Scorekeeper — Web

A plain HTML/CSS/JavaScript port of the iPad app, built to run as static
files on GitHub Pages — no build step, no npm install, nothing to compile.
It reads and writes the **same Firebase project** (Auth + Firestore) as the
iPad app, so both can be used side by side against the same live data.

## What's included

Every screen from the iPad app, as its own page:

- `index.html` — Login (organisation email/password + Google Sign-In)
- `home.html` — "Good Morning" dashboard: every upcoming match, with quick
  actions (Start, Complete, tag for Live View) and a link into full detail
- `match-detail.html` — view/edit a match's teams/division/court/time, plus
  lifecycle actions and Delete
- `setup-matches.html` — create a new scheduled match
- `current-matches.html` — grid of courts with live scores ("Score Matches")
- `court-scoring.html` — the +/- scoring screen (best-of-3, 25/15 win-by-2)
- `previous-matches.html` — completed matches with per-set history
- `live-view.html` — full-screen, read-only scoreboard for up to 3 matches
  tagged "Live View", opened in a new tab; layout reflows automatically
  with CSS (1 match fills the screen, 2 split it, 3 divide it into thirds)
- `options.html` — signed-in profile + sign out
- `manage-data.html` — create/delete Teams, Divisions, Courts

## File structure

```
index.html, home.html, ... (one HTML file per screen)
css/styles.css              shared design system
js/firebase-config.js       YOUR Firebase project keys go here
js/firebase-init.js         boots the Firebase SDK (loaded from CDN, no npm)
js/auth.js                  sign in/out, "who's logged in", Officials lookup
js/firestore.js             all Firestore reads/writes — the data layer
js/utils.js                 small shared helpers (dates, escaping, etc.)
js/pages/*.js                one file per screen, imported by its HTML file
```

## One-time setup

### 1. Point it at your Firebase project

Open `js/firebase-config.js` and replace the placeholder values with your
real Firebase Web app config (Firebase console → Project settings →
General → "Your apps" → add a **Web** app if you haven't already → copy the
`firebaseConfig` object). This is the same Firebase project the iPad app
uses — just add a Web app to it, you don't need a second project.

```js
export const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

These values aren't secret the way a server API key is — they just say
which Firebase project to talk to. Real access control is your Firestore
Security Rules and Authentication settings (see below).

### 2. Enable Google Sign-In for the web

If you haven't already (the iPad app needed this too): Firebase console →
Authentication → Sign-in method → enable **Google**.

### 3. Authorize your GitHub Pages domain

Firebase console → Authentication → Settings → **Authorized domains** → add
your GitHub Pages domain, e.g. `yourusername.github.io`. Without this,
Google Sign-In (and some email/password flows) will fail on the live site
even though they work on `localhost`.

### 4. Turn on GitHub Pages

In this repo on GitHub: **Settings → Pages → Build and deployment → Source:
"Deploy from a branch"**, branch **main**, folder **/ (root)** → Save.
GitHub will publish the site at `https://yourusername.github.io/<repo-name>/`
within a minute or two. Because everything here is plain static files with
no build step, that's the entire deployment process — pushing to `main`
is enough to update the live site.

### 5. Seed some starter data

Same as the iPad app: create at least one `Officials` document matching the
email you'll sign in with (and a matching Firebase Auth user under
Authentication → Users), then add a few Teams/Divisions/Courts from
**Options → Manage Teams, Divisions & Courts** so Setup Matches has
something to pick from.

## Local testing before you push

Opening `index.html` directly via `file://` won't work — browsers block ES
module imports (`type="module"`) from the filesystem. Serve the folder over
HTTP instead, e.g. from this folder:

```
python3 -m http.server 8000
```

then visit `http://localhost:8000`. Add `localhost` to Firebase's
Authorized domains list too if you want Google Sign-In to work locally.

## Notes

- Firestore Security Rules apply exactly the same way as for the iPad app —
  if you followed the iPad README's example rules (`allow read, write: if
  request.auth != null;`), no changes are needed here.
- The scoring rules (best-of-3, 25/15 points, win-by-2) live in
  `js/pages/court-scoring.js` (`SETS_TO_WIN_MATCH` and `targetPoints()`) —
  same place iOS has them in `ScoringViewModel.swift`, change both if your
  rules differ.
- Swipe-to-act (Start/Complete on Home) isn't replicated as a swipe
  gesture — the web version uses plain inline buttons on each row instead,
  which is more natural for a mouse/trackpad and works identically on a
  touchscreen.
