/**
 * Common utilities and helpers
 */

/**
 * Seconds to string (e.g. 125 -> "2:05")
 */
export function fmt(s) {
  if (!s || isNaN(s)) return '0:00';
  return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
}

/**
 * Simple HTML Escaper
 */
export function esc(s) {
  return s.toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/**
 * Toast notification
 */
let toastTimer;
export function showToast(msg, ms = 2500) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), ms);
}
