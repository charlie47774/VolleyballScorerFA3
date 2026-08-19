// pages/options.js
import { requireAuth, fetchOfficialForEmail, signOut } from "../auth.js";
import { escapeHtml } from "../utils.js";

const user = await requireAuth();

if (user) {
  const official = await fetchOfficialForEmail(user.email);
  const infoEl = document.getElementById("profile-info");
  if (official) {
    infoEl.innerHTML = `
      <div class="form-field"><label>Name</label>${escapeHtml(official.first_name)} ${escapeHtml(official.last_name)}</div>
      <div class="form-field"><label>Email</label>${escapeHtml(official.email)}</div>
      <div class="form-field"><label>Role</label>${escapeHtml(official.role)}</div>
    `;
  } else {
    infoEl.innerHTML = `<p class="hint-text">Signed in as ${escapeHtml(user.email)} — no matching Officials record found.</p>`;
  }
}

document.getElementById("sign-out-btn").addEventListener("click", async () => {
  await signOut();
  window.location.href = "index.html";
});
