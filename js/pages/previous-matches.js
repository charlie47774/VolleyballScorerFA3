// pages/previous-matches.js
import { requireAuth } from "../auth.js";
import { fetchCompletedMatches, fetchSets } from "../firestore.js";
import { escapeHtml } from "../utils.js";

await requireAuth();

const listEl = document.getElementById("matches-list");
const modal = document.getElementById("detail-modal");
const detailTitle = document.getElementById("detail-title");
const detailSetsList = document.getElementById("detail-sets-list");

document.getElementById("detail-close").addEventListener("click", () => modal.classList.add("hidden"));
modal.addEventListener("click", (e) => {
  if (e.target === modal) modal.classList.add("hidden");
});

try {
  const completed = await fetchCompletedMatches();

  if (completed.length === 0) {
    listEl.innerHTML = `<p class="hint-text">No completed matches yet.</p>`;
  } else {
    const displays = await Promise.all(
      completed.map(async (match) => ({ match, sets: await fetchSets(match.id) }))
    );

    listEl.innerHTML = `<ul class="row-list">${displays.map(rowHtml).join("")}</ul>`;

    displays.forEach((display) => {
      document.getElementById(`detail-btn-${display.match.id}`)?.addEventListener("click", () => {
        showDetail(display);
      });
    });
  }
} catch (error) {
  console.warn("⚠️ previous-matches: failed to load completed matches", error);
  listEl.innerHTML = `<p class="error-text">Couldn't load past matches: ${error.message}</p>`;
}

function rowHtml(display) {
  const setsSummary = display.sets
    .map((s) => `<span class="hint-text">Set ${s.setNumber}: ${s.teamAScore}-${s.teamBScore}</span>`)
    .join(" &nbsp; ");
  return `
    <li class="row-item">
      <div class="row-main">
        <div class="row-title">${escapeHtml(display.match.teamA)} vs ${escapeHtml(display.match.teamB)}</div>
        <div class="row-meta">${setsSummary || "No set data"}</div>
      </div>
      <div class="row-actions">
        <button class="btn" id="detail-btn-${display.match.id}">See Detail</button>
      </div>
    </li>`;
}

function showDetail(display) {
  detailTitle.textContent = `${display.match.teamA} vs ${display.match.teamB}`;
  detailSetsList.innerHTML = display.sets
    .map((s) => {
      const winnerName = s.winner === "A" ? display.match.teamA : display.match.teamB;
      return `
        <li class="row-item">
          <span>Set ${s.setNumber}</span>
          <span>${s.teamAScore} - ${s.teamBScore}</span>
          <span class="hint-text">${s.winner ? escapeHtml(winnerName) : ""}</span>
        </li>`;
    })
    .join("");
  modal.classList.remove("hidden");
}
