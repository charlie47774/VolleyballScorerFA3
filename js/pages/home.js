// pages/home.js
import { guardPage } from "../auth.js";
import { listenToMatches, listenToLiveDisplayMatchIds, updateMatchStatus } from "../firestore.js";
import { formatDate, formatTime, escapeHtml } from "../utils.js";

// Home is admin-only (scorer/live get bounced elsewhere by guardPage before
// any of this runs), but we still fall through to "if (session)" the same
// way requireAuth()'s caller used to, for consistency.
const session = await guardPage();
if (session) {
  document.getElementById("greeting").textContent = `Good Morning, ${session.official?.first_name ?? "there"}`;
}

const matchesListEl = document.getElementById("matches-list");
const matchCountLabel = document.getElementById("match-count-label");
const liveCountLabel = document.getElementById("live-count-label");
const errorEl = document.getElementById("home-error");

let liveDisplayIds = new Set();
let upcomingMatches = [];

function render() {
  matchCountLabel.textContent = `${upcomingMatches.length} Upcoming Matches`;
  liveCountLabel.textContent = `${liveDisplayIds.size}/3 in Live View`;

  if (upcomingMatches.length === 0) {
    matchesListEl.innerHTML = `<p class="card-empty">No upcoming matches. Create one from Setup Matches.</p>`;
    return;
  }

  matchesListEl.innerHTML = `<ul class="row-list">${upcomingMatches.map(rowHtml).join("")}</ul>`;

  matchesListEl.querySelectorAll("[data-start]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleAction(() => updateMatchStatus(btn.dataset.start, "live"));
    });
  });
  matchesListEl.querySelectorAll("[data-complete]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleAction(() => updateMatchStatus(btn.dataset.complete, "completed"));
    });
  });
}

function rowHtml(match) {
  const isLiveTagged = liveDisplayIds.has(match.id);
  const statusBadgeHtml =
    match.status === "live"
      ? `<span class="badge badge-live">LIVE</span>`
      : `<span class="badge badge-scheduled">Scheduled</span>`;
  const liveBadge = isLiveTagged ? `<span class="badge badge-live-view">📡 Live View</span>` : "";
  const startBtn =
    match.status === "scheduled"
      ? `<button class="btn btn-success" data-start="${match.id}" title="Start match">▶ Start</button>`
      : "";
  const completeBtn = `<button class="btn btn-warning" data-complete="${match.id}" title="Mark completed">✓ Complete</button>`;

  return `
    <li class="row-item clickable" onclick="window.location.href='match-detail.html?id=${match.id}'">
      <div class="row-main">
        <div class="row-title">${escapeHtml(match.teamA)} vs ${escapeHtml(match.teamB)}</div>
        <div class="row-meta">
          <span>${formatDate(match.matchTime)}</span>
          <span>${formatTime(match.matchTime)}</span>
          <span>Court ${escapeHtml(String(match.courtId))}</span>
          ${statusBadgeHtml}
          ${liveBadge}
        </div>
      </div>
      <div class="row-actions">
        ${startBtn}
        ${completeBtn}
        <span class="row-view-link">View / Edit ›</span>
      </div>
    </li>`;
}

async function handleAction(fn) {
  errorEl.classList.add("hidden");
  try {
    await fn();
  } catch (error) {
    errorEl.textContent = error.message;
    errorEl.classList.remove("hidden");
  }
}

listenToMatches(null, (matches) => {
  upcomingMatches = matches
    .filter((m) => m.status !== "completed")
    .sort((a, b) => a.matchTime - b.matchTime);
  render();
});

listenToLiveDisplayMatchIds((ids) => {
  liveDisplayIds = new Set(ids);
  render();
});
