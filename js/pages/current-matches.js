// pages/current-matches.js
// Wireframe: "Current Matches" — a grid of every court, live score or
// "No Current Match". Clicking a court opens its Court Scoring screen.

import { requireAuth } from "../auth.js";
import { fetchCourts, listenToMatches, listenToScore } from "../firestore.js";
import { escapeHtml } from "../utils.js";

await requireAuth();

const gridEl = document.getElementById("court-grid");

const courts = await fetchCourts();
let liveMatches = [];
const scoreListeners = new Map(); // matchDocId -> unsubscribe
const scoresByMatchId = new Map();

function render() {
  if (courts.length === 0) {
    gridEl.innerHTML = `<p class="hint-text">No courts set up yet — add some in Options → Manage Teams, Divisions &amp; Courts.</p>`;
    return;
  }

  gridEl.innerHTML = courts
    .map((court) => {
      const match = liveMatches.find((m) => m.courtId === court.courtId);
      if (!match) {
        return `
          <div class="court-card">
            <h3>${escapeHtml(court.courtName)}</h3>
            <p class="empty">No Current Match</p>
          </div>`;
      }
      const score = scoresByMatchId.get(match.id);
      return `
        <div class="court-card" data-open="${match.id}">
          <h3>${escapeHtml(court.courtName)}</h3>
          ${teamMiniHtml(match.teamA, score?.teamAScore ?? 0, score?.teamASetsWon ?? 0)}
          <hr class="card-divider" style="width:100%;" />
          ${teamMiniHtml(match.teamB, score?.teamBScore ?? 0, score?.teamBSetsWon ?? 0)}
        </div>`;
    })
    .join("");

  gridEl.querySelectorAll("[data-open]").forEach((card) => {
    card.addEventListener("click", () => {
      window.location.href = `court-scoring.html?id=${card.dataset.open}`;
    });
  });
}

function teamMiniHtml(name, score, sets) {
  const dots = [0, 1, 2]
    .map((i) => `<span class="set-dot ${i < sets ? "filled" : ""}"></span>`)
    .join("");
  return `
    <div class="team-mini">
      <span class="name">${escapeHtml(name.toUpperCase())}</span>
      <span class="score">${score}</span>
      <span class="set-dots">${dots}</span>
    </div>`;
}

function syncScoreListeners() {
  const currentIds = new Set(liveMatches.map((m) => m.id));
  for (const [id, unsubscribe] of scoreListeners) {
    if (!currentIds.has(id)) {
      unsubscribe();
      scoreListeners.delete(id);
      scoresByMatchId.delete(id);
    }
  }
  for (const match of liveMatches) {
    if (scoreListeners.has(match.id)) continue;
    scoreListeners.set(
      match.id,
      listenToScore(match.id, (score) => {
        scoresByMatchId.set(match.id, score);
        render();
      })
    );
  }
}

listenToMatches("live", (matches) => {
  liveMatches = matches;
  syncScoreListeners();
  render();
});
