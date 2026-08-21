// pages/options.js
import { guardPage, signOut } from "../auth.js";
import { escapeHtml } from "../utils.js";

const session = await guardPage();

if (session) {
  const { user, official } = session;
  const infoEl = document.getElementById("profile-info");
  if (official) {
    infoEl.innerHTML = `
      <div class="form-field"><label>Name</label>${escapeHtml(official.first_name)} ${escapeHtml(official.last_name)}</div>
      <div class="form-field"><label>Email</label>${escapeHtml(official.email)}</div>
      <div class="form-field"><label>Role</label>${escapeHtml(official.role || "admin")}</div>
    `;
  } else {
    infoEl.innerHTML = `<p class="hint-text">Signed in as ${escapeHtml(user.email)} — no matching Officials record found.</p>`;
  }
}

document.getElementById("sign-out-btn").addEventListener("click", async () => {
  await signOut();
  window.location.href = "index.html";
});
