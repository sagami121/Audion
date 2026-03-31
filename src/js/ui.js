/**
 * UI Manipulation Module
 */
import { state } from './state.js';
import { fmt, esc } from './utils.js';

/**
 * Update the active track highlighting in the playlist
 */
export function updateActive(playlistEl) {
  if (!playlistEl) return;
  Array.from(playlistEl.children).forEach((li, i) => {
    const idx = parseInt(li.dataset.index);
    li.classList.toggle('active', idx === state.current);
    li.classList.toggle('paused', idx === state.current && !state.playing);
    li.setAttribute('aria-selected', idx === state.current ? 'true' : 'false');
  });
}

/**
 * Update Play/Pause button icons
 */
export function updatePlayUI(playing) {
  const playBtn = document.getElementById('playBtn');
  if (!playBtn) return;
  const icPlay = playBtn.querySelector('.ic-play');
  const icPause = playBtn.querySelector('.ic-pause');
  if (icPlay) icPlay.style.display = playing ? 'none' : 'block';
  if (icPause) icPause.style.display = playing ? 'block' : 'none';
  playBtn.classList.toggle('playing', playing);
}

/**
 * Update the main player area with track info
 */
export function updateTrackUI(track) {
  const trackTitle = document.getElementById('trackTitle');
  const trackSub = document.getElementById('trackSub');
  const artImg = document.getElementById('artImg');
  const artDefault = document.getElementById('artDefault');

  if (!trackTitle || !trackSub) return;

  trackTitle.textContent = track.name;
  trackTitle.classList.remove('marquee');
  
  let subText = track.artist || 'Unknown Artist';
  if (track.album) subText += ` — ${track.album}`;
  trackSub.textContent = subText;

  if (track.cover) {
    artImg.src = track.cover;
    artImg.style.display = 'block';
    artDefault.style.display = 'none';
  } else {
    artImg.style.display = 'none';
    artDefault.style.display = 'flex';
  }

  setTimeout(() => {
    const wrap = trackTitle.parentElement;
    if (trackTitle.scrollWidth > wrap.clientWidth + 2) trackTitle.classList.add('marquee');
  }, 80);
}

/**
 * Create a playlist row element
 */
export function createPlaylistRow(index, track, onRowClick) {
  const li = document.createElement('li');
  li.className = 'pl-item';
  li.setAttribute('role', 'option');
  li.dataset.index = index;
  
  const displayName = track.name;
  const displaySub = track.artist ? track.artist : '';

  li.innerHTML = `
    <span class="pl-num">${index + 1}</span>
    <span class="pl-bars">
      <span class="pl-bar"></span><span class="pl-bar"></span><span class="pl-bar"></span>
    </span>
    <div class="pl-info">
      <span class="pl-name" title="${esc(displayName)}">${esc(displayName)}</span>
      ${displaySub ? `<span class="pl-sub">${esc(displaySub)}</span>` : ''}
    </div>
    <span class="pl-dur">${track.duration ? fmt(track.duration) : '—'}</span>
    <button class="pl-del" title="削除">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M9 3L3 9M3 3l6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      </svg>
    </button>`;
  
  li.addEventListener('click', (e) => onRowClick(e, index));
  return li;
}

/**
 * Render the entire playlist
 */
export function renderPlaylist(playlistEl, tracks, onRowClick, filter = '') {
  if (!playlistEl) return;
  playlistEl.innerHTML = '';
  tracks.forEach((track, i) => {
    if (filter && !track.name.toLowerCase().includes(filter.toLowerCase()) && 
        !(track.artist && track.artist.toLowerCase().includes(filter.toLowerCase()))) {
      return;
    }
    const row = createPlaylistRow(i, track, onRowClick);
    playlistEl.appendChild(row);
  });
  updateActive(playlistEl);
}
