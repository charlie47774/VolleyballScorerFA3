// pages/live-view.js
// Full-screen, read-only scoreboard for up to 3 matches tagged "Live View"
// from Match Detail / Live View Config. Uses CSS flexbox (each .live-card
// has flex: 1) so the layout reflows automatically as matches are
// tagged/untagged — 1 match fills the whole screen, 2 split it evenly, 3
// divide it into thirds — with font sizes driven by `clamp()` + viewport
// units so they scale with however much room each card actually has.

import { guardPage, signOut } from "../auth.js";
import { listenToMatch, listenToScore, listenToLiveDisplayMatchIds } from "../firestore.js";
import { escapeHtml } from "../utils.js";

const session = await guardPage();

const contentEl = document.getElementById("live-content");
document.getElementById("close-btn").addEventListener("click", () => window.close());

// The "live" role lands here straight from login and can't reach any other
// page (guardPage bounces it back), so it needs its own way to sign out —
// window.close() only works on tabs a script opened, which isn't the case
// when this page is someone's login landing page rather than something
// opened via the Live View link from Home.
if (session) {
  const signOutLink = document.createElement("button");
  signOutLink.textContent = "Sign out";
  signOutLink.className = "live-sign-out-link";
  signOutLink.addEventListener("click", async () => {
    await signOut();
    window.location.href = "index.html";
  });
  document.body.appendChild(signOutLink);
}

const entries = new Map(); // matchDocId -> { match, score }
const matchListeners = new Map(); // matchDocId -> unsubscribe
const scoreListeners = new Map(); // matchDocId -> unsubscribe

function render() {
  if (entries.size === 0) {
    contentEl.innerHTML = `
      <div class="live-view-empty">
        <div style="font-size:48px;">📡</div>
        <div style="font-size:22px;">No matches tagged for Live View</div>
        <div style="font-size:14px; opacity:0.7;">Tag up to 3 matches from Home → Live View Config.</div>
      </div>`;
    return;
  }

  const cards = Array.from(entries.values())
    .map((entry) => {
      if (!entry.match) {
        return `<div class="live-card"><div class="spinner"></div></div>`;
      }
      const score = entry.score;
      const isFinal = entry.match.status === "completed";
      const aSets = score?.teamASetsWon ?? 0;
      const bSets = score?.teamBSetsWon ?? 0;
      const winner = isFinal ? (aSets > bSets ? "a" : bSets > aSets ? "b" : null) : null;

      const statusBadge = isFinal
        ? `<div class="live-status-badge final">🏁 Final</div>`
        : `<div class="live-status-badge live"><span class="dot"></span>Live</div>`;

      return `
        <div class="live-card ${isFinal ? "is-final" : ""}">
          ${statusBadge}
          <div class="court-label">Court ${escapeHtml(String(entry.match.courtId))}</div>
          ${teamBlockHtml(entry.match.teamA, score?.teamAScore ?? 0, aSets, winner === "a")}
          <hr />
          ${teamBlockHtml(entry.match.teamB, score?.teamBScore ?? 0, bSets, winner === "b")}
        </div>`;
    })
    .join("");

  contentEl.innerHTML = `<div class="live-view-grid">${cards}</div>`;
}

function teamBlockHtml(name, score, sets, isWinner) {
  // Best-of-3, 2 sets needed to win the match — 2 dots is the full range,
  // a 3rd dot would never fill.
  const dots = [0, 1]
    .map(
      (i) =>
        `<span class="set-dot" style="border-color:rgba(255,255,255,0.4); ${i < sets ? "background:#0a84ff;border-color:#0a84ff;" : ""}"></span>`
    )
    .join("");
  return `
    <div class="team-block ${isWinner ? "winner" : ""}">
      <div class="team-name">${isWinner ? "🏆 " : ""}${escapeHtml(name.toUpperCase())}</div>
      <div class="team-score">${score}</div>
      <div class="set-dots">${dots}</div>
    </div>`;
}

function syncEntries(ids) {
  const idSet = new Set(ids);

  for (const [id, unsubscribe] of matchListeners) {
    if (!idSet.has(id)) {
      unsubscribe();
      matchListeners.delete(id);
    }
  }
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
    matchListeners.set(
      id,
      // A real-time listener (not a one-time fetch) so this card's status
      // updates the instant a match is marked Completed elsewhere in the
      // app, instead of staying frozen at whatever it was when tagged.
      listenToMatch(id, (match) => {
        const entry = entries.get(id);
        if (entry) {
          entry.match = match;
          render();
        }
      })
    );
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
