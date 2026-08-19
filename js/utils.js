// utils.js — small shared helpers used across pages.

export function clamp(value, lower, upper) {
  return Math.min(Math.max(value, lower), upper);
}

export function formatDate(date) {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatTime(date) {
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** For <input type="datetime-local">, which needs "YYYY-MM-DDTHH:mm" in LOCAL time. */
export function toDatetimeLocalValue(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDatetimeLocalValue(value) {
  return new Date(value);
}

export function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

export function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

export function statusBadge(status) {
  if (status === "live") return `<span class="badge badge-live">LIVE</span>`;
  if (status === "completed") return `<span class="badge badge-completed">Completed</span>`;
  return `<span class="badge badge-scheduled">Scheduled</span>`;
}
