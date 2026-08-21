// auth.js
// Mirrors Services/AuthService.swift + ViewModels/AuthViewModel.swift:
// organisation email/password login, Google Sign-In, and looking up the
// signed-in user's "Officials" record.

import { auth, db } from "./firebase-init.js";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  collection,
  query,
  where,
  limit,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

export async function signInWithEmail(email, password) {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function signOut() {
  await firebaseSignOut(auth);
}

/** Resolves once with the current user (or null), like a one-shot check. */
export function getCurrentUser() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

/** Fires `callback(user)` on every sign-in/sign-out change. Returns an unsubscribe fn. */
export function watchAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}

/** Looks up the "Officials" doc matching the signed-in user's email. */
export async function fetchOfficialForEmail(email) {
  if (!email) return null;
  const q = query(collection(db, "Officials"), where("email", "==", email), limit(1));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() };
}

/** Redirects to index.html (login) unless a user is already signed in.
 *  Call at the top of every protected page. Returns the signed-in user. */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = "index.html";
    return null;
  }
  return user;
}

// ---------- Roles ----------
// Three roles, driven entirely by the signed-in user's Officials.role field
// (set from Options → Users & Roles): "admin" has full access; "scorer" is
// locked to Score Matches (the court grid + the scoring screen); "live" is
// locked to the Live View scoreboard and lands there straight from login.
// A user with no matching Officials record, or no role set on it yet,
// defaults to "admin" — so existing setups and anyone not yet assigned a
// role keep full access rather than getting locked out.

export const ROLE = { ADMIN: "admin", SCORER: "scorer", LIVE: "live" };

const SCORER_PAGES = ["current-matches.html", "court-scoring.html"];
const LIVE_PAGE = "live-view.html";

function currentPageFile() {
  return window.location.pathname.split("/").pop() || "index.html";
}

/** Just the role, from an email — used by login.js to pick a landing page
 *  before any page-guarding is relevant yet. */
export async function fetchCurrentRole(email) {
  const official = await fetchOfficialForEmail(email);
  return official?.role || ROLE.ADMIN;
}

/** Where a just-signed-in (or already-signed-in) user should land. */
export function landingPageForRole(role) {
  if (role === ROLE.LIVE) return LIVE_PAGE;
  if (role === ROLE.SCORER) return "current-matches.html";
  return "home.html";
}

/** Call at the top of every protected page instead of requireAuth().
 *  Ensures the user is signed in AND allowed on this specific page for
 *  their role, redirecting them to where they belong otherwise. Returns
 *  `{ user, role, official }` on success, or null if it redirected away
 *  (in which case the rest of the page's script should do nothing further). */
export async function guardPage() {
  const user = await requireAuth();
  if (!user) return null;

  const official = await fetchOfficialForEmail(user.email);
  const role = official?.role || ROLE.ADMIN;
  const page = currentPageFile();

  if (role === ROLE.LIVE && page !== LIVE_PAGE) {
    window.location.href = LIVE_PAGE;
    return null;
  }
  if (role === ROLE.SCORER && !SCORER_PAGES.includes(page)) {
    window.location.href = "current-matches.html";
    return null;
  }

  return { user, role, official };
}
