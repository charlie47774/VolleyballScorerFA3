// firebase-init.js
// Boots the Firebase app + Auth + Firestore once, using the CDN-hosted
// modular SDK (no npm/build step needed — works as plain static files on
// GitHub Pages). Every other module imports `auth` and `db` from here.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getFirestore,
  enableIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Keep the official signed in across browser restarts (mirrors the
// persistent session behaviour of the iPad app).
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.warn("Auth persistence could not be set:", error);
});

// Best-effort offline cache, like Firestore's default behaviour on iOS.
// Fails silently in browsers/tabs that don't support it (e.g. multiple
// tabs open at once) — the app still works, just without offline cache.
enableIndexedDbPersistence(db).catch((error) => {
  console.warn("Firestore offline persistence not enabled:", error.code);
});
