// pages/manage-data.js
import { guardPage } from "../auth.js";
import {
  fetchTeams, createTeam, deleteTeam,
  fetchDivisions, createDivision, deleteDivision,
  fetchCourts, createCourt, deleteCourt
} from "../firestore.js";
import { escapeHtml } from "../utils.js";

await guardPage();

const errorEl = document.getElementById("manage-error");
function showError(message) {
  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
}

let teams = [];
let divisions = [];
let courts = [];

async function reloadAll() {
  [teams, divisions, courts] = await Promise.all([fetchTeams(), fetchDivisions(), fetchCourts()]);
  renderTeams();
  renderDivisions();
  renderCourts();
  renderDivisionOptions();
}

function divisionName(divisionId) {
  return divisions.find((d) => d.divisionId === divisionId)?.divisionName ?? null;
}

// ---------- Teams ----------

function renderTeams() {
  const list = document.getElementById("teams-list");
  if (teams.length === 0) {
    list.innerHTML = `<li class="row-item"><span class="hint-text">No teams yet.</span></li>`;
    return;
  }
  list.innerHTML = teams
    .map((team) => {
      const div = divisionName(team.divisionId);
      return `
        <li class="row-item">
          <div class="row-main">
            <div class="row-title">${escapeHtml(team.teamName)}</div>
            ${div ? `<div class="row-meta">${escapeHtml(div)}</div>` : ""}
          </div>
          <div class="row-actions">
            <button class="btn btn-destructive" data-delete-team="${team.id}">Delete</button>
          </div>
        </li>`;
    })
    .join("");

  list.querySelectorAll("[data-delete-team]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await deleteTeam(btn.dataset.deleteTeam);
        await reloadAll();
      } catch (error) {
        showError(error.message);
      }
    });
  });
}

function renderDivisionOptions() {
  const select = document.getElementById("new-team-division");
  select.innerHTML =
    `<option value="">Division (optional)</option>` +
    divisions.map((d) => `<option value="${d.divisionId}">${escapeHtml(d.divisionName)}</option>`).join("");
}

document.getElementById("add-team-btn").addEventListener("click", async () => {
  const nameInput = document.getElementById("new-team-name");
  const divisionSelect = document.getElementById("new-team-division");
  const name = nameInput.value.trim();
  if (!name) return;
  try {
    await createTeam(name, divisionSelect.value ? Number(divisionSelect.value) : null);
    nameInput.value = "";
    divisionSelect.value = "";
    await reloadAll();
  } catch (error) {
    showError(error.message);
  }
});

// ---------- Divisions ----------

function renderDivisions() {
  const list = document.getElementById("divisions-list");
  if (divisions.length === 0) {
    list.innerHTML = `<li class="row-item"><span class="hint-text">No divisions yet.</span></li>`;
    return;
  }
  list.innerHTML = divisions
    .map(
      (division) => `
        <li class="row-item">
          <div class="row-main">
            <div class="row-title">${escapeHtml(division.divisionName)}</div>
          </div>
          <div class="row-meta">${escapeHtml(division.ageGroup)}</div>
          <div class="row-actions">
            <button class="btn btn-destructive" data-delete-division="${division.id}">Delete</button>
          </div>
        </li>`
    )
    .join("");

  list.querySelectorAll("[data-delete-division]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await deleteDivision(btn.dataset.deleteDivision);
        await reloadAll();
      } catch (error) {
        showError(error.message);
      }
    });
  });
}

document.getElementById("add-division-btn").addEventListener("click", async () => {
  const nameInput = document.getElementById("new-division-name");
  const ageInput = document.getElementById("new-division-age");
  const name = nameInput.value.trim();
  const age = ageInput.value.trim();
  if (!name || !age) return;
  try {
    await createDivision(name, age);
    nameInput.value = "";
    ageInput.value = "";
    await reloadAll();
  } catch (error) {
    showError(error.message);
  }
});

// ---------- Courts ----------

function renderCourts() {
  const list = document.getElementById("courts-list");
  if (courts.length === 0) {
    list.innerHTML = `<li class="row-item"><span class="hint-text">No courts yet.</span></li>`;
    return;
  }
  list.innerHTML = courts
    .map(
      (court) => `
        <li class="row-item">
          <div class="row-main">
            <div class="row-title">${escapeHtml(court.courtName)}</div>
          </div>
          <div class="row-meta">${court.location ? escapeHtml(court.location) : ""}</div>
          <div class="row-actions">
            <button class="btn btn-destructive" data-delete-court="${court.id}">Delete</button>
          </div>
        </li>`
    )
    .join("");

  list.querySelectorAll("[data-delete-court]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await deleteCourt(btn.dataset.deleteCourt);
        await reloadAll();
      } catch (error) {
        showError(error.message);
      }
    });
  });
}

document.getElementById("add-court-btn").addEventListener("click", async () => {
  const nameInput = document.getElementById("new-court-name");
  const locationInput = document.getElementById("new-court-location");
  const name = nameInput.value.trim();
  if (!name) return;
  try {
    await createCourt(name, locationInput.value.trim());
    nameInput.value = "";
    locationInput.value = "";
    await reloadAll();
  } catch (error) {
    showError(error.message);
  }
});

reloadAll();
