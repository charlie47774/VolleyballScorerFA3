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
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
