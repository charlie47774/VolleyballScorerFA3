// pages/login.js
import { signInWithEmail, signInWithGoogle, getCurrentUser, fetchCurrentRole, landingPageForRole } from "../auth.js";

// Already signed in? Skip straight to wherever this person's role lands
// them (Home for admin, Score Matches for scorer, Live View for live).
getCurrentUser().then(async (user) => {
  if (user) {
    const role = await fetchCurrentRole(user.email);
    window.location.href = landingPageForRole(role);
  }
});

const form = document.getElementById("login-form");
const loginBtn = document.getElementById("login-btn");
const googleBtn = document.getElementById("google-btn");
const errorText = document.getElementById("error-text");

function showError(message) {
  errorText.textContent = message;
  errorText.classList.remove("hidden");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorText.classList.add("hidden");
  loginBtn.disabled = true;
  loginBtn.textContent = "Signing in…";
  try {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const user = await signInWithEmail(email, password);
    const role = await fetchCurrentRole(user.email);
    window.location.href = landingPageForRole(role);
  } catch (error) {
    showError(error.message);
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Login";
  }
});

googleBtn.addEventListener("click", async () => {
  errorText.classList.add("hidden");
  googleBtn.disabled = true;
  try {
    const user = await signInWithGoogle();
    const role = await fetchCurrentRole(user.email);
    window.location.href = landingPageForRole(role);
  } catch (error) {
    showError(error.message);
  } finally {
    googleBtn.disabled = false;
  }
});
