// pages/users-roles.js
// Admin-only screen (enforced by guardPage, same as Manage Data) for the
// app's user directory and each person's role.
//
// IMPORTANT: this manages the Officials collection — the same records the
// app already uses to match a signed-in email to a name — it is NOT a live
// query of Firebase Authentication. The Firebase client SDK has no API to
// list Auth users from a front-end app (that needs the Admin SDK running
// on a server, which this static site doesn't have). Add someone here with
// the exact email they sign in with, and guardPage() reads their role
// fresh on every page load, so it takes effect on their next sign-in.

import { guardPage } from "../auth.js";
import { fetchOfficials, createOfficial, updateOfficialRole, deleteOfficial } from "../firestore.js";
import { escapeHtml } from "../utils.js";

const session = await guardPage();

const listEl = document.getElementById("users-list");
const errorEl = document.getElementById("users-error");

function showError(message) {
  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
}

const ROLE_LABELS = { admin: "Admin", scorer: "Scorer", live: "Live" };

let officials = [];

async function reload() {
  try {
    officials = await fetchOfficials();
    render();
  } catch (error) {
    showError(error.message);
  }
}

function render() {
  if (officials.length === 0) {
    listEl.innerHTML = `<li class="row-item"><span class="hint-text">No users yet — add one below.</span></li>`;
    return;
  }

  listEl.innerHTML = officials.map(rowHtml).join("");

  listEl.querySelectorAll("[data-role-select]").forEach((select) => {
    select.addEventListener("change", async () => {
      const officialDocId = select.dataset.roleSelect;
      const official = officials.find((o) => o.id === officialDocId);
      const isSelf = session?.user?.email && official?.email === session.user.email;

      if (isSelf && select.value !== "admin") {
        const confirmed = confirm(
          "You're changing your own role — you'll immediately lose admin access and be redirected next time you load a page. Continue?"
        );
        if (!confirmed) {
          select.value = official.role;
          return;
        }
      }

      select.disabled = true;
      try {
        await updateOfficialRole(officialDocId, select.value);
        await reload();
      } catch (error) {
        showError(error.message);
        select.disabled = false;
      }
    });
  });

  listEl.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Remove this user? They'll lose access next time they try to sign in.")) return;
      try {
        await deleteOfficial(btn.dataset.delete);
        await reload();
      } catch (error) {
        showError(error.message);
      }
    });
  });
}

function rowHtml(official) {
  const isSelf = session?.user?.email && official.email === session.user.email;
  const roleOptions = Object.entries(ROLE_LABELS)
    .map(([value, label]) => `<option value="${value}" ${official.role === value ? "selected" : ""}>${label}</option>`)
    .join("");

  const displayName = `${official.firstName} ${official.lastName}`.trim() || "(no name)";

  return `
    <li class="row-item">
      <div class="row-main">
        <div class="row-title">${escapeHtml(displayName)}${isSelf ? ` <span class="hint-text">(you)</span>` : ""}</div>
        <div class="row-meta">${escapeHtml(official.email)}</div>
      </div>
      <div class="row-actions">
        <select data-role-select="${official.id}" style="width: auto;">${roleOptions}</select>
        <button class="btn btn-destructive" data-delete="${official.id}">Delete</button>
      </div>
    </li>`;
}

document.getElementById("add-user-btn").addEventListener("click", async () => {
  errorEl.classList.add("hidden");
  const emailInput = document.getElementById("new-user-email");
  const firstNameInput = document.getElementById("new-user-first-name");
  const lastNameInput = document.getElementById("new-user-last-name");
  const roleSelect = document.getElementById("new-user-role");

  const email = emailInput.value.trim();
  const firstName = firstNameInput.value.trim();
  if (!email || !firstName) {
    showError("Please enter at least an email and first name.");
    return;
  }

  try {
    await createOfficial({
      email,
      firstName,
      lastName: lastNameInput.value.trim(),
      role: roleSelect.value
    });
    emailInput.value = "";
    firstNameInput.value = "";
    lastNameInput.value = "";
    roleSelect.value = "admin";
    await reload();
  } catch (error) {
    showError(error.message);
  }
});

reload();
