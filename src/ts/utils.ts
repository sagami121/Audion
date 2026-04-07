export function fmt(s: number): string {
  if (!s || isNaN(s)) return '0:00';
  const hrs = Math.floor(s / 3600);
  const min = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (hrs > 0) {
    return `${hrs}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
  return `${min}:${String(sec).padStart(2, '0')}`;
}

export function esc(s: string | number): string {
  return s.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export function showToast(msg: string, ms = 2500): void {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), ms);
}
