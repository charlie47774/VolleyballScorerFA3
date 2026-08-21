// pages/live-view-config.js
// Central place for a coordinator to see every match tagged for the Live
// View — plus every not-yet-completed match available to tag — and
// assign/remove it (up to 3 at once), instead of having to open each
// match's own detail screen one at a time.

import { guardPage } from "../auth.js";
import { listenToMatches, listenToLiveDisplayMatchIds, setLiveDisplay } from "../firestore.js";
import { formatDate, formatTime, escapeHtml, statusBadge } from "../utils.js";

await guardPage();

const listEl = document.getElementById("matches-list");
const countLabel = document.getElementById("live-count-label");
const errorEl = document.getElementById("config-error");

const MAX_LIVE = 3;

// Keep the full unfiltered match list — which matches are shown is
// recomputed on every render from `allMatches` + the current `liveIds`,
// not decided once up front. That's what makes a completed-but-still-tagged
// match keep showing here (with a Remove button) instead of disappearing
// the moment it's marked Completed, which previously left no way to untag
// it from this screen.
let allMatches = [];
let liveIds = new Set();

function visibleMatches() {
  return allMatches.filter((m) => m.status !== "completed" || liveIds.has(m.id));
}

function render() {
  countLabel.textContent = `${liveIds.size}/${MAX_LIVE} tagged`;

  const matches = visibleMatches();

  if (matches.length === 0) {
    listEl.innerHTML = `<p class="card-empty">No matches yet. Create one from Setup Matches.</p>`;
    return;
  }

  listEl.innerHTML = `<ul class="row-list">${matches.map(rowHtml).join("")}</ul>`;

  listEl.querySelectorAll("[data-toggle]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      errorEl.classList.add("hidden");
      const matchId = btn.dataset.toggle;
      const isTagged = liveIds.has(matchId);
      btn.disabled = true;
      try {
        await setLiveDisplay(matchId, !isTagged);
      } catch (error) {
        errorEl.textContent = error.message;
        errorEl.classList.remove("hidden");
      } finally {
        btn.disabled = false;
      }
    });
  });
}

function rowHtml(match) {
  const isTagged = liveIds.has(match.id);
  const atCap = liveIds.size >= MAX_LIVE;
  const disableAdd = !isTagged && atCap;

  const toggleBtn = isTagged
    ? `<button class="btn btn-destructive" data-toggle="${match.id}">Remove from Live View</button>`
    : `<button class="btn btn-tint-blue" data-toggle="${match.id}" ${disableAdd ? "disabled" : ""} title="${disableAdd ? `Remove another match first — only ${MAX_LIVE} can be tagged at once` : ""}">Add to Live View</button>`;

  const liveBadge = isTagged ? `<span class="badge badge-live-view">📡 Live View</span>` : "";

  return `
    <li class="row-item">
      <div class="row-main">
        <div class="row-title">${escapeHtml(match.teamA)} vs ${escapeHtml(match.teamB)}</div>
        <div class="row-meta">
          <span>${formatDate(match.matchTime)}</span>
          <span>${formatTime(match.matchTime)}</span>
          <span>Court ${escapeHtml(String(match.courtId))}</span>
          ${statusBadge(match.status)}
          ${liveBadge}
        </div>
      </div>
      <div class="row-actions">
        ${toggleBtn}
      </div>
    </li>`;
}

listenToMatches(null, (all) => {
  allMatches = all;
  render();
});

listenToLiveDisplayMatchIds((ids) => {
  liveIds = new Set(ids);
  render();
});
