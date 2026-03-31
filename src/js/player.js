/**
 * Player and Playlist Logic
 */
import { state } from './state.js';
import { fmt, showToast } from './utils.js';
import { updateActive, updatePlayUI } from './ui.js';

const { convertFileSrc } = window.__TAURI__.core;

// ─── Persistence ──────────────────────────────────────────────────────────────
export function savePlaylist() {
  const paths = state.tracks.map(t => t.path);
  localStorage.setItem('af_playlist', JSON.stringify(paths));
}

// ─── Shuffle order ────────────────────────────────────────────────────────────
export function buildShuffleOrder() {
  const arr = state.tracks.map((_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const pos = arr.indexOf(state.current);
  if (pos > 0) { arr.splice(pos, 1); arr.unshift(state.current); }
  state.shuffleOrder = arr;
}

// ─── Audio Controls ───────────────────────────────────────────────────────────
export function playAudio(audio, albumArt, vinylCenter, artGlow, playlistEl) {
  audio.volume = state.muted ? 0 : state.volume;
  audio.play().then(() => {
    state.playing = true;
    updatePlayUI(true);
    if (albumArt) {
      albumArt.classList.add('spinning');
      albumArt.classList.remove('paused');
    }
    if (vinylCenter) vinylCenter.classList.add('show');
    if (artGlow) artGlow.classList.add('active');
    updateActive(playlistEl);
  }).catch(e => {
    console.error(e);
    showToast('再生に失敗しました');
  });
}

export function pauseAudio(audio, albumArt, playlistEl) {
  audio.pause();
  state.playing = false;
  updatePlayUI(false);
  if (albumArt) {
    albumArt.classList.add('paused');
  }
  updateActive(playlistEl);
}

// ─── Track Metadata ───────────────────────────────────────────────────────────
export function preloadMeta(index, path, playlistEl) {
  const tmp = new Audio();
  tmp.src = convertFileSrc(path);
  tmp.addEventListener('loadedmetadata', () => {
    state.tracks[index].duration = tmp.duration;
    if (playlistEl) {
      // Find the specific LI because indices might have changed due to filtering
      const li = Array.from(playlistEl.children).find(el => parseInt(el.dataset.index) === index);
      if (li) li.querySelector('.pl-dur').textContent = fmt(tmp.duration);
    }
    tmp.src = '';
  });
}
