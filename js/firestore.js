// firestore.js
// Central data-access layer — the JS equivalent of Services/FirestoreService.swift.
// Collections mirror the FA3 Data Dictionary: Officials / Divisions / Courts /
// Teams / Matches / Matches/{id}/Scores/{id} / Matches/{id}/Sets / DisplaySettings.

import { db } from "./firebase-init.js";
import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const COLLECTIONS = {
  officials: "Officials",
  divisions: "Divisions",
  courts: "Courts",
  teams: "Teams",
  matches: "Matches",
  scores: "Scores",       // subcollection of Matches
  sets: "Sets",           // subcollection of Matches
  displaySettings: "DisplaySettings"
};

const MAX_LIVE_DISPLAY_MATCHES = 3;

function randomId() {
  return Math.floor(100000 + Math.random() * 900000);
}

/** Converts a Firestore Timestamp (or already-a-Date) into a JS Date. */
function toJSDate(value) {
  if (!value) return new Date();
  if (typeof value.toDate === "function") return value.toDate();
  return new Date(value);
}

function matchFromDoc(docSnap) {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    matchId: data.match_id,
    divisionId: data.division_id,
    courtId: data.court_id,
    teamA: data.team_a,
    teamB: data.team_b,
    matchTime: toJSDate(data.match_time),
    status: data.status,
    officialId: data.official_id ?? null
  };
}

function scoreFromDoc(docSnap) {
  if (!docSnap.exists()) return null;
  const data = docSnap.data();
  return {
    id: docSnap.id,
    scoreId: data.score_id,
    matchId: data.match_id,
    teamAScore: data.team_a_score ?? 0,
    teamBScore: data.team_b_score ?? 0,
    lastUpdated: toJSDate(data.last_updated),
    teamASetsWon: data.team_a_sets_won ?? 0,
    teamBSetsWon: data.team_b_sets_won ?? 0,
    currentSetNumber: data.current_set_number ?? 1
  };
}

function setScoreFromDoc(docSnap) {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    setNumber: data.set_number,
    teamAScore: data.team_a_score,
    teamBScore: data.team_b_score,
    winner: data.winner ?? null,
    completedAt: toJSDate(data.completed_at)
  };
}

// ---------- Officials / Users & Roles ----------
// Note: this is the app's own user directory, not a live listing of
// Firebase Authentication accounts — see js/pages/users-roles.js for why.

export const ROLES = ["admin", "scorer", "live"];

function officialFromDoc(docSnap) {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    officialId: data.official_id,
    email: data.email ?? "",
    firstName: data.first_name ?? "",
    lastName: data.last_name ?? "",
    role: data.role || "admin"
  };
}

export async function fetchOfficials() {
  const snapshot = await getDocs(query(collection(db, COLLECTIONS.officials), orderBy("email")));
  return snapshot.docs.map(officialFromDoc);
}

export async function createOfficial({ email, firstName, lastName, role }) {
  return addDoc(collection(db, COLLECTIONS.officials), {
    official_id: randomId(),
    email: email.trim().toLowerCase(),
    first_name: firstName || "",
    last_name: lastName || "",
    role: role || "admin"
  });
}

export async function updateOfficialRole(officialDocId, role) {
  await updateDoc(doc(db, COLLECTIONS.officials, officialDocId), { role });
}

export async function deleteOfficial(officialDocId) {
  await deleteDoc(doc(db, COLLECTIONS.officials, officialDocId));
}

// ---------- Divisions ----------

export async function fetchDivisions() {
  const snapshot = await getDocs(query(collection(db, COLLECTIONS.divisions), orderBy("division_name")));
  return snapshot.docs.map((d) => ({ id: d.id, divisionId: d.data().division_id, divisionName: d.data().division_name, ageGroup: d.data().age_group }));
}

export async function createDivision(name, ageGroup) {
  return addDoc(collection(db, COLLECTIONS.divisions), {
    division_id: randomId(),
    division_name: name,
    age_group: ageGroup
  });
}

export async function deleteDivision(docId) {
  await deleteDoc(doc(db, COLLECTIONS.divisions, docId));
}

// ---------- Courts ----------

export async function fetchCourts() {
  const snapshot = await getDocs(query(collection(db, COLLECTIONS.courts), orderBy("court_name")));
  return snapshot.docs.map((d) => ({ id: d.id, courtId: d.data().court_id, courtName: d.data().court_name, location: d.data().location ?? null }));
}

export async function createCourt(name, location) {
  return addDoc(collection(db, COLLECTIONS.courts), {
    court_id: randomId(),
    court_name: name,
    location: location || null
  });
}

export async function deleteCourt(docId) {
  await deleteDoc(doc(db, COLLECTIONS.courts, docId));
}

// ---------- Teams ----------

export async function fetchTeams() {
  const snapshot = await getDocs(query(collection(db, COLLECTIONS.teams), orderBy("team_name")));
  return snapshot.docs.map((d) => ({ id: d.id, teamId: d.data().team_id, teamName: d.data().team_name, divisionId: d.data().division_id ?? null }));
}

export async function createTeam(name, divisionId) {
  return addDoc(collection(db, COLLECTIONS.teams), {
    team_id: randomId(),
    team_name: name,
    division_id: divisionId ?? null
  });
}

export async function deleteTeam(docId) {
  await deleteDoc(doc(db, COLLECTIONS.teams, docId));
}

// ---------- Matches ----------

/** Real-time listener over all matches (optionally filtered by status), sorted by match_time. */
export function listenToMatches(statusFilter, onChange) {
  // Filtering by `status` and ordering by `match_time` at the same time
  // needs a composite index that doesn't exist on a fresh Firebase project
  // (Firestore throws "The query requires an index" until someone manually
  // creates it in the console). Rather than depend on that being set up,
  // only `where` on the server when there's a status filter, and always
  // sort client-side — the match list is small enough that this costs
  // nothing in practice and needs zero Firestore console configuration.
  const q = statusFilter
    ? query(collection(db, COLLECTIONS.matches), where("status", "==", statusFilter))
    : query(collection(db, COLLECTIONS.matches));
  return onSnapshot(
    q,
    (snapshot) => {
      const matches = [];
      snapshot.forEach((docSnap) => {
        try {
          matches.push(matchFromDoc(docSnap));
        } catch (error) {
          console.warn("⚠️ listenToMatches: failed to decode", docSnap.id, error);
        }
      });
      matches.sort((a, b) => a.matchTime - b.matchTime);
      onChange(matches);
    },
    (error) => {
      // Don't wipe already-loaded matches on a transient error (e.g. a
      // permission hiccup right after sign-in) — just log it and keep
      // whatever the UI already has; onSnapshot will retry automatically.
      console.warn("⚠️ listenToMatches error (keeping existing data):", error);
    }
  );
}

export async function fetchCompletedMatches() {
  // Deliberately a single-field `where` with no `orderBy` on a different
  // field — combining the two needs a composite index that doesn't exist
  // until someone manually creates it in the Firebase console (that's what
  // threw "The query requires an index" on a fresh project). Sorting the
  // small "completed matches" list client-side avoids needing that index
  // at all.
  const q = query(collection(db, COLLECTIONS.matches), where("status", "==", "completed"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(matchFromDoc).sort((a, b) => b.matchTime - a.matchTime);
}

export async function fetchMatch(matchDocId) {
  const snapshot = await getDoc(doc(db, COLLECTIONS.matches, matchDocId));
  return snapshot.exists() ? matchFromDoc(snapshot) : null;
}

/** Real-time listener on a single match doc — used by Live View so a
 *  match's status (e.g. going from "live" to "completed") shows up
 *  immediately instead of only reflecting whatever it was when the match
 *  was first tagged for display. */
export function listenToMatch(matchDocId, onChange) {
  const ref = doc(db, COLLECTIONS.matches, matchDocId);
  return onSnapshot(
    ref,
    (snapshot) => onChange(snapshot.exists() ? matchFromDoc(snapshot) : null),
    (error) => console.warn("⚠️ listenToMatch error:", error)
  );
}

/** Creates a match + its starting Scores subdocument (one score record per match). */
export async function createMatch({ teamA, teamB, divisionId, courtId, matchTime }) {
  const matchRef = doc(collection(db, COLLECTIONS.matches));
  await setDoc(matchRef, {
    match_id: randomId(),
    division_id: divisionId,
    court_id: courtId,
    team_a: teamA,
    team_b: teamB,
    match_time: Timestamp.fromDate(matchTime),
    status: "scheduled",
    official_id: null
  });
  await setDoc(doc(db, COLLECTIONS.matches, matchRef.id, COLLECTIONS.scores, matchRef.id), {
    score_id: randomId(),
    match_id: matchRef.id,
    team_a_score: 0,
    team_b_score: 0,
    last_updated: Timestamp.now(),
    team_a_sets_won: 0,
    team_b_sets_won: 0,
    current_set_number: 1
  });
  return matchRef.id;
}

export async function updateMatchStatus(matchDocId, status) {
  await updateDoc(doc(db, COLLECTIONS.matches, matchDocId), { status });
}

export async function updateMatch(matchDocId, { teamA, teamB, divisionId, courtId, matchTime }) {
  await updateDoc(doc(db, COLLECTIONS.matches, matchDocId), {
    team_a: teamA,
    team_b: teamB,
    division_id: divisionId,
    court_id: courtId,
    match_time: Timestamp.fromDate(matchTime)
  });
}

export async function deleteMatch(matchDocId) {
  await deleteDoc(doc(db, COLLECTIONS.matches, matchDocId));
  try {
    await deleteDoc(doc(db, COLLECTIONS.displaySettings, matchDocId));
  } catch (error) {
    // best-effort cleanup only
  }
}

// ---------- Scores ----------

export function listenToScore(matchDocId, onChange) {
  const ref = doc(db, COLLECTIONS.matches, matchDocId, COLLECTIONS.scores, matchDocId);
  return onSnapshot(ref, (snapshot) => onChange(scoreFromDoc(snapshot)), (error) => {
    console.warn("⚠️ listenToScore error:", error);
  });
}

export async function updateScore(matchDocId, score) {
  const ref = doc(db, COLLECTIONS.matches, matchDocId, COLLECTIONS.scores, matchDocId);
  await setDoc(
    ref,
    {
      score_id: score.scoreId,
      match_id: score.matchId,
      team_a_score: score.teamAScore,
      team_b_score: score.teamBScore,
      last_updated: Timestamp.now(),
      team_a_sets_won: score.teamASetsWon,
      team_b_sets_won: score.teamBSetsWon,
      current_set_number: score.currentSetNumber
    },
    { merge: true }
  );
}

// ---------- Sets (per-set history, extension beyond the base dictionary) ----------

export async function addCompletedSet(matchDocId, set) {
  const ref = doc(collection(db, COLLECTIONS.matches, matchDocId, COLLECTIONS.sets));
  await setDoc(ref, {
    set_number: set.setNumber,
    team_a_score: set.teamAScore,
    team_b_score: set.teamBScore,
    winner: set.winner,
    completed_at: Timestamp.now()
  });
}

export async function fetchSets(matchDocId) {
  const q = query(collection(db, COLLECTIONS.matches, matchDocId, COLLECTIONS.sets), orderBy("set_number"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(setScoreFromDoc);
}

// ---------- Display Settings (Live View tagging, max 3 matches at once) ----------

export async function isLiveDisplay(matchDocId) {
  const snapshot = await getDoc(doc(db, COLLECTIONS.displaySettings, matchDocId));
  if (!snapshot.exists()) return false;
  return !!snapshot.data().is_live_display;
}

export async function fetchLiveDisplayCount() {
  const q = query(collection(db, COLLECTIONS.displaySettings), where("is_live_display", "==", true));
  const snapshot = await getDocs(q);
  return snapshot.size;
}

/** Tags/untags a match for the full-screen Live View. Throws if already at the 3-match cap. */
export async function setLiveDisplay(matchDocId, isLive) {
  if (isLive) {
    const alreadyTagged = await isLiveDisplay(matchDocId);
    if (!alreadyTagged) {
      const count = await fetchLiveDisplayCount();
      if (count >= MAX_LIVE_DISPLAY_MATCHES) {
        throw new Error(`Only ${MAX_LIVE_DISPLAY_MATCHES} matches can be tagged for Live View at once. Remove one before adding another.`);
      }
    }
  }
  await setDoc(
    doc(db, COLLECTIONS.displaySettings, matchDocId),
    { match_id: matchDocId, is_live_display: isLive },
    { merge: true }
  );
}

export function listenToLiveDisplayMatchIds(onChange) {
  const q = query(collection(db, COLLECTIONS.displaySettings), where("is_live_display", "==", true));
  return onSnapshot(
    q,
    (snapshot) => onChange(snapshot.docs.map((d) => d.id)),
    (error) => console.warn("⚠️ listenToLiveDisplayMatchIds error (keeping existing data):", error)
  );
}
