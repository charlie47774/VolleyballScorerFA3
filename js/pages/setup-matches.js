// pages/setup-matches.js
import { requireAuth } from "../auth.js";
import { fetchTeams, fetchDivisions, fetchCourts, createMatch } from "../firestore.js";
import { toDatetimeLocalValue, fromDatetimeLocalValue, escapeHtml } from "../utils.js";

await requireAuth();

const teamASelect = document.getElementById("team-a");
const teamBSelect = document.getElementById("team-b");
const divisionSelect = document.getElementById("division");
const courtSelect = document.getElementById("court");
const matchTimeInput = document.getElementById("match-time");
const noTeamsHint = document.getElementById("no-teams-hint");
const errorEl = document.getElementById("form-error");
const saveBtn = document.getElementById("save-btn");

matchTimeInput.value = toDatetimeLocalValue(new Date());

function fillSelect(select, items, labelFn, valueField = "id") {
  select.innerHTML =
    `<option value="">Select…</option>` +
    items.map((item) => `<option value="${item[valueField]}">${escapeHtml(labelFn(item))}</option>`).join("");
}

const [teams, divisions, courts] = await Promise.all([fetchTeams(), fetchDivisions(), fetchCourts()]);

fillSelect(teamASelect, teams, (t) => t.teamName);
fillSelect(teamBSelect, teams, (t) => t.teamName);
fillSelect(divisionSelect, divisions, (d) => `${d.divisionName} (${d.ageGroup})`);
fillSelect(courtSelect, courts, (c) => c.courtName);

if (teams.length === 0) noTeamsHint.style.display = "block";

document.getElementById("setup-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  errorEl.classList.add("hidden");

  const teamAId = teamASelect.value;
  const teamBId = teamBSelect.value;
  const divisionId = divisionSelect.value;
  const courtId = courtSelect.value;

  if (!teamAId || !teamBId || !divisionId || !courtId) {
    errorEl.textContent = "Please choose both teams, a division, and a court.";
    errorEl.classList.remove("hidden");
    return;
  }
  if (teamAId === teamBId) {
    errorEl.textContent = "Team A and Team B must be different teams.";
    errorEl.classList.remove("hidden");
    return;
  }

  const teamA = teams.find((t) => t.id === teamAId);
  const teamB = teams.find((t) => t.id === teamBId);
  const division = divisions.find((d) => d.id === divisionId);
  const court = courts.find((c) => c.id === courtId);

  saveBtn.disabled = true;
  saveBtn.textContent = "Saving…";
  try {
    await createMatch({
      teamA: teamA.teamName,
      teamB: teamB.teamName,
      divisionId: division.divisionId,
      courtId: court.courtId,
      matchTime: fromDatetimeLocalValue(matchTimeInput.value)
    });
    window.location.href = "home.html";
  } catch (error) {
    errorEl.textContent = error.message;
    errorEl.classList.remove("hidden");
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save";
  }
});
