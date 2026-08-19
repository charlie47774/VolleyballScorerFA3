// firebase-config.js
//
// Fill in YOUR Firebase project's config below (Firebase console →
// Project settings → General → "Your apps" → Web app → SDK setup and
// configuration → Config). This is the same Firebase project the iPad
// app uses, so both apps read/write the same Firestore data.
//
// This file is intentionally the ONLY place with project-specific values,
// so it's easy to find and safe to swap. The Firebase web config values
// (apiKey etc.) are not secret in the way a server API key is — they just
// identify which project to talk to; access is still controlled by your
// Firestore Security Rules and Authentication settings.

export const firebaseConfig = {
  apiKey: "AIzaSyD3DBNJTdcaL3A90Qe2pO8LgiFdVoGYWBg",
  authDomain: "fa3-volleyball-scorer.firebaseapp.com",
  projectId: "fa3-volleyball-scorer",
  storageBucket: "fa3-volleyball-scorer.firebasestorage.app",
  messagingSenderId: "179942348574",
  appId: "1:179942348574:web:0cc62944a4d74e8c0b1b0f"
};
