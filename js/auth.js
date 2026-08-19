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
