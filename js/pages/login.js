// pages/login.js
import { signInWithEmail, signInWithGoogle, getCurrentUser } from "../auth.js";

// Already signed in? Skip straight to Home.
getCurrentUser().then((user) => {
  if (user) window.location.href = "home.html";
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
    await signInWithEmail(email, password);
    window.location.href = "home.html";
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
    await signInWithGoogle();
    window.location.href = "home.html";
  } catch (error) {
    showError(error.message);
  } finally {
    googleBtn.disabled = false;
  }
});
