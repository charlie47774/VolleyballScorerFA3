// pages/live-view.js
// Full-screen, read-only scoreboard for up to 3 matches tagged "Live View"
// from Match Detail. Uses CSS flexbox (each .live-card has flex: 1) so the
// layout reflows automatically as matches are tagged/untagged — 1 match
// fills the whole screen, 2 split it evenly, 3 divide it into thirds —
// with font sizes driven by `clamp()` + viewport units so they scale with
// however much room each card actually has.

import { requireAuth } from "../auth.js";
import { fetchMatch, listenToScore, listenToLiveDisplayMatchIds } from "../firestore.js";
import { escapeHtml } from "../utils.js";

await requireAuth();

const contentEl = document.getElementById("live-content");
document.getElementById("close-btn").addEventListener("click", () => window.close());

const entries = new Map(); // matchDocId -> { match, score }
const scoreListeners = new Map(); // matchDocId -> unsubscribe

function render() {
  if (entries.size === 0) {
    contentEl.innerHTML = `
      <div class="live-view-empty">
        <div style="font-size:48px;">📡</div>
        <div style="font-size:22px;">No matches tagged for Live View</div>
        <div style="font-size:14px; opacity:0.7;">Tag up to 3 matches from a match's "View / Edit" screen on Home.</div>
      </div>`;
    return;
  }

  const cards = Array.from(entries.values())
    .map((entry) => {
      if (!entry.match) {
        return `<div class="live-card"><div class="spinner"></div></div>`;
      }
      const score = entry.score;
      return `
        <div class="live-card">
          <div class="court-label">Court ${escapeHtml(String(entry.match.courtId))}</div>
          ${teamBlockHtml(entry.match.teamA, score?.teamAScore ?? 0, score?.teamASetsWon ?? 0)}
          <hr />
          ${teamBlockHtml(entry.match.teamB, score?.teamBScore ?? 0, score?.teamBSetsWon ?? 0)}
        </div>`;
    })
    .join("");

  contentEl.innerHTML = `<div class="live-view-grid">${cards}</div>`;
}

function teamBlockHtml(name, score, sets) {
  const dots = [0, 1, 2]
    .map(
      (i) =>
        `<span class="set-dot" style="border-color:rgba(255,255,255,0.4); ${i < sets ? "background:#0a84ff;border-color:#0a84ff;" : ""}"></span>`
    )
    .join("");
  return `
    <div class="team-block">
      <div class="team-name">${escapeHtml(name.toUpperCase())}</div>
      <div class="team-score">${score}</div>
      <div class="set-dots">${dots}</div>
    </div>`;
}

function syncEntries(ids) {
  const idSet = new Set(ids);

  for (const [id, unsubscribe] of scoreListeners) {
    if (!idSet.has(id)) {
      unsubscribe();
      scoreListeners.delete(id);
      entries.delete(id);
    }
  }

  for (const id of ids) {
    if (entries.has(id)) continue;
    entries.set(id, { match: null, score: null });
    fetchMatch(id).then((match) => {
      const entry = entries.get(id);
      if (entry) {
        entry.match = match;
        render();
      }
    });
    scoreListeners.set(
      id,
      listenToScore(id, (score) => {
        const entry = entries.get(id);
        if (entry) {
          entry.score = score;
          render();
        }
      })
    );
  }

  render();
}

listenToLiveDisplayMatchIds(syncEntries);
render();
