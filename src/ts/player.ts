import { state } from './state.js';
import { showToast } from './utils.js';
import { updateActive, updatePlayUI, updateTrackUI } from './ui.js';
import { startVisualizer, stopVisualizer } from './visualizer.js';
import { translations } from './translations.js';
import { updateDiscordRPC } from './discord.js';
import { convertFileSrc } from '@tauri-apps/api/core';
import { loadLyrics } from './lyrics.js';

export function savePlaylist(): void {
  const minimalTracks = state.tracks.map(t => ({
    path: t.path,
    addedAt: t.addedAt,
    playCount: t.playCount || 0,
    favorite: t.favorite || false
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

export function togglePlay(
  audio: HTMLAudioElement | null,
  albumArt: HTMLElement | null,
  vinylCenter: HTMLElement | null,
  artGlow: HTMLElement | null,
  playlistEl: HTMLElement | null,
  loadTrack: (index: number, autoplay: boolean) => void
): void {
  const dict = translations[state.lang] || translations.ja;
  if (!state.tracks.length) { showToast(dict.toast_no_tracks); return; }
  if (state.current === -1) { loadTrack(0, true); return; }
  if (audio) {
    state.playing ? pauseAudio(audio, albumArt, playlistEl) : playAudio(audio, albumArt, vinylCenter, artGlow, playlistEl);
  }
}

export function playNext(loadTrack: (index: number, autoplay: boolean) => void): void {
  if (!state.tracks.length) return;
  
  if (state.repeat === 'none' && !state.shuffle) {
    if (state.current === state.tracks.length - 1) return;
  }

  let next;
  if (state.shuffle) {
    const pos = state.shuffleOrder.indexOf(state.current);
    if (state.repeat === 'none' && pos === state.shuffleOrder.length - 1) return;
    next = state.shuffleOrder[(pos + 1) % state.shuffleOrder.length];
  } else {
    next = (state.current + 1) % state.tracks.length;
  }
  loadTrack(next, true);
}

export function playPrev(audio: HTMLAudioElement | null, loadTrack: (index: number, autoplay: boolean) => void): void {
  if (!state.tracks.length) return;
  if (audio && audio.currentTime > 3) { audio.currentTime = 0; return; }

  if (state.repeat === 'none' && !state.shuffle) {
    if (state.current === 0) return;
  }

  let prev;
  if (state.shuffle) {
    const pos = state.shuffleOrder.indexOf(state.current);
    if (state.repeat === 'none' && pos === 0) return;
    prev = state.shuffleOrder[(pos - 1 + state.shuffleOrder.length) % state.shuffleOrder.length];
  } else {
    prev = (state.current - 1 + state.tracks.length) % state.tracks.length;
  }
  loadTrack(prev, true);
}

export function loadTrack(
  index: number, 
  autoplay: boolean,
  audio: HTMLAudioElement | null,
  albumArt: HTMLElement | null,
  vinylCenter: HTMLElement | null,
  artGlow: HTMLElement | null,
  playlistEl: HTMLElement | null,
  lyricsInner: HTMLDivElement | null,
  syncMediaSession: () => void
): void {
  if (index < 0 || index >= state.tracks.length) return;
  state.current = index;
  const t = state.tracks[index];
  if (audio) {
    audio.src = convertFileSrc(t.path);
    audio.load();
  }
  updateTrackUI(t);
  if (playlistEl) updateActive(playlistEl);
  vinylCenter?.classList.remove('show');
  albumArt?.classList.remove('spinning');
  albumArt?.classList.remove('paused');
  artGlow?.classList.remove('active');

  loadLyrics(t.path, lyricsInner);

  if (autoplay && audio) playAudio(audio, albumArt, vinylCenter, artGlow, playlistEl);
  else updatePlayUI(false);
  syncMediaSession();
}

export function toggleShuffle(shuffleBtn: HTMLElement | null, saveSettings: () => void): void {
  state.shuffle = !state.shuffle;
  if (state.shuffle) buildShuffleOrder();
  if (shuffleBtn) shuffleBtn.classList.toggle('active', state.shuffle);
  saveSettings();
}

export function toggleRepeat(repeatBtn: HTMLElement | null, repeatBadge: HTMLElement | null, saveSettings: () => void): void {
  if (state.repeat === 'none') state.repeat = 'all';
  else if (state.repeat === 'all') state.repeat = 'one';
  else state.repeat = 'none';

  if (repeatBtn) repeatBtn.classList.toggle('active', state.repeat !== 'none');
  if (repeatBadge) repeatBadge.style.display = state.repeat === 'one' ? 'flex' : 'none';
  saveSettings();
}
