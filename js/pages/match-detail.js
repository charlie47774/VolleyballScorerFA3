// pages/match-detail.js
// Full view/edit screen for a single match — teams, division, court, time,
// plus lifecycle actions (Start, tag for Live View, Complete, Delete).

import { requireAuth } from "../auth.js";
import {
  fetchMatch,
  updateMatch,
  updateMatchStatus,
  deleteMatch,
  fetchTeams,
  fetchDivisions,
  fetchCourts,
  isLiveDisplay,
  setLiveDisplay
} from "../firestore.js";
import { getQueryParam, toDatetimeLocalValue, fromDatetimeLocalValue, escapeHtml } from "../utils.js";

await requireAuth();

const matchDocId = getQueryParam("id");
if (!matchDocId) window.location.href = "home.html";

const pageTitle = document.getElementById("page-title");
const statusLabel = document.getElementById("status-label");
const liveViewLabel = document.getElementById("live-view-label");
const teamASelect = document.getElementById("team-a");
const teamBSelect = document.getElementById("team-b");
const divisionSelect = document.getElementById("division");
const courtSelect = document.getElementById("court");
const matchTimeInput = document.getElementById("match-time");
const startBtn = document.getElementById("start-btn");
const liveToggleBtn = document.getElementById("live-toggle-btn");
const completeBtn = document.getElementById("complete-btn");
const deleteBtn = document.getElementById("delete-btn");
const errorEl = document.getElementById("detail-error");

function showError(message) {
  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
}

let match = await fetchMatch(matchDocId);
if (!match) {
  showError("Match not found.");
  throw new Error("Match not found");
}

const [teams, divisions, courts, initialLiveTagged] = await Promise.all([
  fetchTeams(),
  fetchDivisions(),
  fetchCourts(),
  isLiveDisplay(matchDocId)
]);

// A single mutable source of truth for the tag state, updated by the
// toggle handler below and read by renderStatus() every time it runs —
// previously renderStatus() read the one-time `isLiveDisplay` result
// directly, so calling it again later (e.g. after Start/Complete) would
// silently revert the Live View label/button to whatever it was when the
// page first loaded, undoing whatever the toggle button had just done.
let liveTaggedState = initialLiveTagged;

pageTitle.textContent = `${match.teamA} vs ${match.teamB}`;

function fillSelect(select, items, labelFn, matchValue) {
  select.innerHTML = items
    .map((item) => `<option value="${item.id}">${escapeHtml(labelFn(item))}</option>`)
    .join("");
  const match = items.find((item) => matchValue(item));
  if (match) select.value = match.id;
}

fillSelect(teamASelect, teams, (t) => t.teamName, (t) => t.teamName === match.teamA);
fillSelect(teamBSelect, teams, (t) => t.teamName, (t) => t.teamName === match.teamB);
fillSelect(divisionSelect, divisions, (d) => `${d.divisionName} (${d.ageGroup})`, (d) => d.divisionId === match.divisionId);
fillSelect(courtSelect, courts, (c) => c.courtName, (c) => c.courtId === match.courtId);
matchTimeInput.value = toDatetimeLocalValue(match.matchTime);

function renderStatus() {
  const labelMap = { scheduled: "Scheduled", live: "Live", completed: "Completed" };
  statusLabel.innerHTML = `<strong>Status:</strong> ${labelMap[match.status] ?? match.status}`;
  liveViewLabel.classList.toggle("hidden", !liveTaggedState);

  startBtn.classList.toggle("hidden", match.status !== "scheduled");
  // Keep the toggle visible on a completed match if it's still tagged, so
  // there's always a way to remove it from Live View — only hide it once
  // completed AND already untagged, when there's nothing left to do here.
  liveToggleBtn.classList.toggle("hidden", match.status === "completed" && !liveTaggedState);
  completeBtn.classList.toggle("hidden", match.status === "completed");
  liveToggleBtn.textContent = liveTaggedState ? "📡 Remove from Live View" : "📡 Add to Live View";
}
renderStatus();

document.getElementById("edit-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  errorEl.classList.add("hidden");

  const teamA = teams.find((t) => t.id === teamASelect.value);
  const teamB = teams.find((t) => t.id === teamBSelect.value);
  const division = divisions.find((d) => d.id === divisionSelect.value);
  const court = courts.find((c) => c.id === courtSelect.value);

  if (!teamA || !teamB || !division || !court) {
    showError("Please choose both teams, a division, and a court.");
    return;
  }
  if (teamA.id === teamB.id) {
    showError("Team A and Team B must be different teams.");
    return;
  }

  const saveBtn = document.getElementById("save-btn");
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving…";
  try {
    await updateMatch(matchDocId, {
      teamA: teamA.teamName,
      teamB: teamB.teamName,
      divisionId: division.divisionId,
      courtId: court.courtId,
      matchTime: fromDatetimeLocalValue(matchTimeInput.value)
    });
    match = { ...match, teamA: teamA.teamName, teamB: teamB.teamName, divisionId: division.divisionId, courtId: court.courtId };
    pageTitle.textContent = `${match.teamA} vs ${match.teamB}`;
    alert("Match details updated.");
  } catch (error) {
    showError(error.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save Changes";
  }
});

startBtn.addEventListener("click", async () => {
  try {
    await updateMatchStatus(matchDocId, "live");
    match.status = "live";
    renderStatus();
  } catch (error) {
    showError(error.message);
  }
});

completeBtn.addEventListener("click", async () => {
  try {
    await updateMatchStatus(matchDocId, "completed");
    match.status = "completed";
    renderStatus();
  } catch (error) {
    showError(error.message);
  }
});

liveToggleBtn.addEventListener("click", async () => {
  try {
    await setLiveDisplay(matchDocId, !liveTaggedState);
    liveTaggedState = !liveTaggedState;
    renderStatus();
  } catch (error) {
    showError(error.message);
  }
});

deleteBtn.addEventListener("click", async () => {
  if (!confirm("Delete this match and its scores? This can't be undone.")) return;
  try {
    await deleteMatch(matchDocId);
    window.location.href = "home.html";
  } catch (error) {
    showError(error.message);
  }
});
