import { state } from './state.js';
import { showToast } from './utils.js';
import { updateActive, updatePlayUI } from './ui.js';
import { startVisualizer, stopVisualizer } from './visualizer.js';
import { translations } from './translations.js';
import { updateDiscordRPC } from './discord.js';

export function savePlaylist(): void {
  const minimalTracks = state.tracks.map(t => ({
    path: t.path,
    addedAt: t.addedAt,
    playCount: t.playCount || 0
  }));
  localStorage.setItem('af_playlist', JSON.stringify(minimalTracks));
}

export function buildShuffleOrder(): void {
  const arr = state.tracks.map((_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const pos = arr.indexOf(state.current);
  if (pos > 0) { arr.splice(pos, 1); arr.unshift(state.current); }
  state.shuffleOrder = arr;
}

export function playAudio(
  audio: HTMLAudioElement,
  albumArt: HTMLElement | null,
  vinylCenter: HTMLElement | null,
  artGlow: HTMLElement | null,
  playlistEl: HTMLElement | null
): void {
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
    startVisualizer();
    updateDiscordRPC();
    window.dispatchEvent(new CustomEvent('audion-play-state-changed'));
  }).catch(e => {
    console.error(e);
    const dict = translations[state.lang] || translations.ja;
    showToast(dict.toast_error_play);
  });
}

export function pauseAudio(
  audio: HTMLAudioElement,
  albumArt: HTMLElement | null,
  playlistEl: HTMLElement | null
): void {
  audio.pause();
  state.playing = false;
  updatePlayUI(false);
  if (albumArt) {
    albumArt.classList.add('paused');
  }
  updateActive(playlistEl);
  stopVisualizer();
  updateDiscordRPC();
  window.dispatchEvent(new CustomEvent('audion-play-state-changed'));
}
