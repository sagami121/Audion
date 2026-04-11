import { state } from './state.js';
import { fmt, esc } from './utils.js';
import { setVisualizerColors } from './visualizer.js';
import { Track } from '../types';

export function updateActive(playlistEl: HTMLElement | null): void {
  if (!playlistEl) return;
  Array.from(playlistEl.children).forEach((child) => {
    const li = child as HTMLElement;
    const idx = parseInt(li.dataset.index || '-1');
    li.classList.toggle('active', idx === state.current);
    li.classList.toggle('paused', idx === state.current && !state.playing);
    li.setAttribute('aria-selected', idx === state.current ? 'true' : 'false');
  });
}

export function updatePlayUI(playing: boolean): void {
  const playBtn = document.getElementById('playBtn');
  if (!playBtn) return;
  const icPlay = playBtn.querySelector('.ic-play') as HTMLElement | null;
  const icPause = playBtn.querySelector('.ic-pause') as HTMLElement | null;
  if (icPlay) icPlay.style.display = playing ? 'none' : 'block';
  if (icPause) icPause.style.display = playing ? 'block' : 'none';
  playBtn.classList.toggle('playing', playing);
}

export function updateTrackUI(track: Track): void {
  const trackTitle = document.getElementById('trackTitle');
  const trackSub = document.getElementById('trackSub');
  const artImg = document.getElementById('artImg') as HTMLImageElement | null;
  const artDefault = document.getElementById('artDefault');

  if (!trackTitle || !trackSub) return;

  // Remove i18n attributes so translation updates don't overwrite track info
  trackTitle.removeAttribute('data-i18n');
  trackSub.removeAttribute('data-i18n');

  trackTitle.textContent = track.name || 'Unknown Track';
  trackTitle.classList.remove('marquee');

  let subText = track.artist || 'Unknown Artist';
  if (track.album) subText += ` — ${track.album}`;
  trackSub.textContent = subText;

  if (track.cover) {
    if (artImg) {
      artImg.src = track.cover;
      artImg.style.display = 'block';
    }
    if (artDefault) artDefault.style.display = 'none';

    resetThemeColors();
  } else {
    if (artImg) artImg.style.display = 'none';
    if (artDefault) artDefault.style.display = 'flex';
    resetThemeColors();
  }

  setTimeout(() => {
    const wrap = trackTitle.parentElement;
    if (wrap && trackTitle.scrollWidth > wrap.clientWidth + 2) trackTitle.classList.add('marquee');

    trackTitle.querySelectorAll('.pl-badge').forEach(b => b.remove());
    const ext = track.path.split('.').pop()?.toUpperCase();
    if (ext && ext.length < 5) {
      const badge = document.createElement('span');
      badge.className = 'pl-badge';
      badge.textContent = ext;
      trackTitle.appendChild(badge);
    }
  }, 80);
}

export function createPlaylistRow(
  globalIdx: number,
  displayIdx: number,
  track: Track,
  onRowClick: (e: MouseEvent, index: number) => void
): HTMLLIElement {
  const li = document.createElement('li');
  li.className = 'pl-item';
  li.setAttribute('role', 'option');
  li.dataset.index = globalIdx.toString();

  const displayName = track.name;
  const displaySub = track.artist ? track.artist : '';
  li.innerHTML = `
    <span class="pl-num">${displayIdx + 1}</span>
    <span class="pl-bars">
      <span class="pl-bar"></span><span class="pl-bar"></span><span class="pl-bar"></span>
    </span>
    <div class="pl-info">
      <span class="pl-name" title="${esc(displayName)}">
        ${esc(displayName)}
        <span class="pl-badge">${esc(track.path.split('.').pop()?.toUpperCase() || '')}</span>
      </span>
      ${displaySub ? `<span class="pl-sub">${esc(displaySub)}</span>` : ''}
    </div>
    <span class="pl-dur">${track.duration ? fmt(track.duration) : '—'}</span>
    <button class="pl-del" title="削除">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M9 3L3 9M3 3l6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      </svg>
    </button>`;

  li.addEventListener('click', (e) => onRowClick(e, globalIdx));
  return li;
}

let cmIndex = -1;
let cmReorderFn: ((from: number, to: number) => void) | null = null;

export function initContextMenu(onReorder: (from: number, to: number) => void): void {
  cmReorderFn = onReorder;
  const cm = document.getElementById('contextMenu');
  if (!cm) return;

  document.addEventListener('click', () => {
    cm.style.display = 'none';
  });

  const items = [
    { id: 'cmMoveUp', action: () => cmReorderFn?.(cmIndex, cmIndex - 1) },
    { id: 'cmMoveDown', action: () => cmReorderFn?.(cmIndex, cmIndex + 1) },
    { id: 'cmMoveTop', action: () => cmReorderFn?.(cmIndex, 0) },
    { id: 'cmMoveBottom', action: () => cmReorderFn?.(cmIndex, state.tracks.length - 1) },
  ];

  items.forEach(item => {
    const el = document.getElementById(item.id);
    if (el) {
      el.onclick = (e) => {
        e.stopPropagation();
        cm.style.display = 'none';
        item.action();
      };
    }
  });
}

export function setupPlaylistRowEvents(
  row: HTMLLIElement,
  index: number
): void {
  row.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const cm = document.getElementById('contextMenu');
    if (!cm) return;

    cmIndex = index;
    
    // Disable buttons if move is not possible
    const btnUp = document.getElementById('cmMoveUp');
    const btnDown = document.getElementById('cmMoveDown');
    const btnTop = document.getElementById('cmMoveTop');
    const btnBottom = document.getElementById('cmMoveBottom');
    
    if (btnUp) (btnUp as HTMLElement).style.opacity = index === 0 ? '0.3' : '1';
    if (btnUp) (btnUp as HTMLElement).style.pointerEvents = index === 0 ? 'none' : 'auto';
    
    if (btnTop) (btnTop as HTMLElement).style.opacity = index === 0 ? '0.3' : '1';
    if (btnTop) (btnTop as HTMLElement).style.pointerEvents = index === 0 ? 'none' : 'auto';

    if (btnDown) (btnDown as HTMLElement).style.opacity = index === state.tracks.length - 1 ? '0.3' : '1';
    if (btnDown) (btnDown as HTMLElement).style.pointerEvents = index === state.tracks.length - 1 ? 'none' : 'auto';

    if (btnBottom) (btnBottom as HTMLElement).style.opacity = index === state.tracks.length - 1 ? '0.3' : '1';
    if (btnBottom) (btnBottom as HTMLElement).style.pointerEvents = index === state.tracks.length - 1 ? 'none' : 'auto';

    cm.style.display = 'block';
    
    const menuWidth = cm.offsetWidth;
    const menuHeight = cm.offsetHeight;
    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;

    let x = e.clientX;
    let y = e.clientY;

    if (x + menuWidth > winWidth) x = winWidth - menuWidth - 10;
    if (y + menuHeight > winHeight) y = winHeight - menuHeight - 10;
    if (x < 10) x = 10;
    if (y < 10) y = 10;

    cm.style.left = `${x}px`;
    cm.style.top = `${y}px`;
  });
}

export function renderPlaylist(
  playlistEl: HTMLElement | null,
  uiTracks: {track: Track, globalIdx: number}[],
  onRowClick: (e: MouseEvent, index: number) => void,
  filter = ''
): void {
  if (!playlistEl) return;
  playlistEl.innerHTML = '';
  uiTracks.forEach((item, displayIdx) => {
    const track = item.track;
    if (filter && !track.name.toLowerCase().includes(filter.toLowerCase()) &&
      !(track.artist && track.artist.toLowerCase().includes(filter.toLowerCase()))) {
      return;
    }
    const row = createPlaylistRow(item.globalIdx, displayIdx, track, onRowClick);
    playlistEl.appendChild(row);
    setupPlaylistRowEvents(row, item.globalIdx);
  });
  updateActive(playlistEl);
}

function resetThemeColors(): void {
  const root = document.documentElement;
  root.style.removeProperty('--accent-color');
  root.style.removeProperty('--glow-color');
  setVisualizerColors('#a78bfa', '#38bdf8');
}
