// pages/court-scoring.js
// Mirrors ViewModels/ScoringViewModel.swift: best of 3 sets, sets 1-2 to 25
// (deciding 3rd set to 15), win by 2. Undo Last Point / End Set / End Match.

import { requireAuth } from "../auth.js";
import {
  fetchMatch,
  listenToScore,
  updateScore,
  addCompletedSet,
  fetchSets,
  updateMatchStatus
} from "../firestore.js";
import { getQueryParam, escapeHtml } from "../utils.js";

await requireAuth();

const matchDocId = getQueryParam("id");
if (!matchDocId) {
  window.location.href = "current-matches.html";
}

const SETS_TO_WIN_MATCH = 2;

const teamANameEl = document.getElementById("team-a-name");
const teamBNameEl = document.getElementById("team-b-name");
const teamAScoreEl = document.getElementById("team-a-score");
const teamBScoreEl = document.getElementById("team-b-score");
const teamADotsEl = document.getElementById("team-a-dots");
const teamBDotsEl = document.getElementById("team-b-dots");
const setsHistoryEl = document.getElementById("sets-history");
const errorEl = document.getElementById("scoring-error");
const courtTitleEl = document.getElementById("court-title");

let match = null;
let score = {
  scoreId: Math.floor(Math.random() * 900000) + 100000,
  matchId: null,
  teamAScore: 0,
  teamBScore: 0,
  teamASetsWon: 0,
  teamBSetsWon: 0,
  currentSetNumber: 1
};
let completedSets = [];
let undoStack = [];
let matchComplete = false;

match = await fetchMatch(matchDocId);
if (!match) {
  errorEl.textContent = "Match not found.";
  errorEl.classList.remove("hidden");
} else {
  courtTitleEl.textContent = `Court ${match.courtId}`;
  teamANameEl.textContent = match.teamA.toUpperCase();
  teamBNameEl.textContent = match.teamB.toUpperCase();
  score.matchId = match.matchId;
  matchComplete = match.status === "completed";
}

completedSets = await fetchSets(matchDocId);

listenToScore(matchDocId, (updated) => {
  if (updated) {
    score = updated;
    render();
  }
});

function render() {
  teamAScoreEl.textContent = score.teamAScore;
  teamBScoreEl.textContent = score.teamBScore;
  teamADotsEl.innerHTML = dotsHtml(score.teamASetsWon);
  teamBDotsEl.innerHTML = dotsHtml(score.teamBSetsWon);
  setsHistoryEl.innerHTML = completedSets
    .map(
      (set) => `
        <div class="set-chip">
          <div class="hint-text">Set ${set.setNumber}</div>
          <div>${set.teamAScore} - ${set.teamBScore}</div>
        </div>`
    )
    .join("");
}

function dotsHtml(filled) {
  return [0, 1, 2].map((i) => `<span class="set-dot ${i < filled ? "filled" : ""}"></span>`).join("");
}

function targetPoints() {
  const isDecider = score.teamASetsWon === score.teamBSetsWon && score.teamASetsWon === SETS_TO_WIN_MATCH - 1;
  return isDecider ? 15 : 25;
}

async function persistScore() {
  await updateScore(matchDocId, score);
}

async function addPoint(team) {
  if (matchComplete) return;
  if (team === "a") score.teamAScore += 1;
  else score.teamBScore += 1;
  undoStack.push(team);
  render();
  await persistScore();
  await checkForSetCompletion();
}

async function subtractPoint(team) {
  if (team === "a") score.teamAScore = Math.max(0, score.teamAScore - 1);
  else score.teamBScore = Math.max(0, score.teamBScore - 1);
  render();
  await persistScore();
}

async function undoLastPoint() {
  const last = undoStack.pop();
  if (!last) return;
  if (last === "a") score.teamAScore = Math.max(0, score.teamAScore - 1);
  else score.teamBScore = Math.max(0, score.teamBScore - 1);
  render();
  await persistScore();
}

async function checkForSetCompletion() {
  const a = score.teamAScore;
  const b = score.teamBScore;
  const target = targetPoints();
  const reachedTarget = Math.max(a, b) >= target;
  const twoPointLead = Math.abs(a - b) >= 2;
  if (reachedTarget && twoPointLead) {
    await endSet();
  }
}

async function endSet() {
  const winner = score.teamAScore > score.teamBScore ? "A" : "B";
  const finishedSet = {
    setNumber: score.currentSetNumber,
    teamAScore: score.teamAScore,
    teamBScore: score.teamBScore,
    winner
  };
  try {
    await addCompletedSet(matchDocId, finishedSet);
  } catch (error) {
    showError(error.message);
  }
  completedSets.push(finishedSet);

  if (winner === "A") score.teamASetsWon += 1;
  else score.teamBSetsWon += 1;
  score.currentSetNumber += 1;
  score.teamAScore = 0;
  score.teamBScore = 0;
  undoStack = [];
  render();
  await persistScore();

  if (score.teamASetsWon === SETS_TO_WIN_MATCH || score.teamBSetsWon === SETS_TO_WIN_MATCH) {
    const winnerName = score.teamASetsWon === SETS_TO_WIN_MATCH ? match.teamA : match.teamB;
    await endMatch(winnerName);
  }
}

async function endMatch(winnerName) {
  matchComplete = true;
  try {
    await updateMatchStatus(matchDocId, "completed");
  } catch (error) {
    showError(error.message);
    return;
  }
  alert(`${winnerName} wins the match!`);
  window.location.href = "current-matches.html";
}

function showError(message) {
  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
}

document.getElementById("team-a-plus").addEventListener("click", () => addPoint("a"));
document.getElementById("team-b-plus").addEventListener("click", () => addPoint("b"));
document.getElementById("team-a-minus").addEventListener("click", () => subtractPoint("a"));
document.getElementById("team-b-minus").addEventListener("click", () => subtractPoint("b"));
document.getElementById("undo-btn").addEventListener("click", undoLastPoint);
document.getElementById("end-set-btn").addEventListener("click", endSet);
document.getElementById("end-match-btn").addEventListener("click", async () => {
  if (!confirm("End match early with the current score? This can't be undone.")) return;
  const winnerName = score.teamAScore > score.teamBScore ? match.teamA : match.teamB;
  await endMatch(winnerName);
});

render();
