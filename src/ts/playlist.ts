import { invoke } from '@tauri-apps/api/core';
import { state } from './state';
import { translations } from './translations';
import * as ui from './ui';
import * as player from './player';
import { showToast } from './utils';
import { Track } from '../types';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';

const metaCache = new Map();

export function getPlaylistView(): {track: Track, globalIdx: number}[] {
  let list = state.tracks.map((track, globalIdx) => ({ track, globalIdx }));
  
  if (state.plView === 'recent') {
    list.sort((a, b) => b.track.addedAt - a.track.addedAt);
  } else if (state.plView === 'popular') {
    list.sort((a, b) => (b.track.playCount || 0) - (a.track.playCount || 0));
  } else if (state.plView === 'favorites') {
    list = list.filter(item => item.track.favorite);
  }
  
  return list;
}

export async function addPaths(
  paths: any[], 
  isInitial = false, 
  playlist: HTMLUListElement | null, 
  plSearch: HTMLInputElement | null,
  dropHint: HTMLDivElement | null,
  onRowClick: (e: any, index: number) => void,
  updateCount: () => void,
  loadTrack: (index: number, autoplay: boolean) => void
) {
  let added = 0;
  let skipped = 0;
  const normalizePath = (p: string) => p.replace(/\\/g, '/');

  for (const item of paths) {
    const isObj = typeof item === 'object';
    const pathValue = isObj ? item.path : item;
    const addedAt = isObj && item.addedAt ? item.addedAt : Date.now();
    const playCount = isObj && item.playCount ? item.playCount : 0;

    const normPath = normalizePath(pathValue).toLowerCase();
    if (state.tracks.some(t => normalizePath(t.path).toLowerCase() === normPath)) {
      skipped++;
      continue;
    }
    try {
      let meta: any;
      if (metaCache.has(pathValue)) {
        meta = metaCache.get(pathValue);
      } else {
        meta = await invoke('get_file_metadata', { path: pathValue });
        metaCache.set(pathValue, meta);
      }

      if (meta) {
        state.tracks.push({
          path: pathValue,
          name: meta.name,
          artist: meta.artist,
          album: meta.album,
          cover: meta.cover,
          duration: meta.duration || 0,
          addedAt,
          playCount
        });

        const idx = state.tracks.length - 1;
        const filter = plSearch?.value.toLowerCase() || "";
        const track = state.tracks[idx];
        const matchesFilter = !filter ||
          track.name.toLowerCase().includes(filter) ||
          (track.artist && track.artist.toLowerCase().includes(filter));

        if (state.plView === 'all' && matchesFilter && playlist) {
          const displayIdx = playlist.childElementCount;
          const row = ui.createPlaylistRow(idx, displayIdx, track, onRowClick);
          playlist.appendChild(row);
          ui.setupPlaylistRowEvents(row, idx);
        }
        added++;
      }
    } catch (e) {
      console.warn('Failed to add', pathValue, e);
    }
  }
  updateCount();
  if (added > 0) {
    if (state.plView !== 'all') ui.renderPlaylist(playlist, getPlaylistView(), onRowClick, plSearch?.value || "");
    const dict = translations[state.lang] || translations.ja;
    if (dropHint) dropHint.classList.add('hidden');
    if (!isInitial) {
      let msg = `${added}${dict.toast_added}`;
      if (skipped) msg += ` (${skipped}${dict.toast_skipped})`;
      showToast(msg);
    }
    if (!isInitial && state.current === -1) loadTrack(0, false);
    player.savePlaylist();
  } else if (skipped > 0 && !isInitial) {
    showToast(translations[state.lang].toast_all_skipped);
  }
  player.buildShuffleOrder();
}

export function toggleFavorite(index: number, updatePlaylistUI: () => void) {
  const t = state.tracks[index];
  if (!t) return;
  t.favorite = !t.favorite;
  updatePlaylistUI();
  player.savePlaylist();
}

export async function loadPlaylist(
  checkRestoreSession: HTMLInputElement | null,
  checkOnTop: HTMLInputElement | null,
  shuffleBtn: HTMLElement | null,
  repeatBtn: HTMLElement | null,
  repeatBadge: HTMLElement | null,
  loadTrack: (index: number, autoplay: boolean) => void,
  audio: HTMLAudioElement | null,
  updateLanguage: (lang: string) => void,
  setTheme: (theme: string) => void,
  setSpeed: (speed: number) => void,
  updateVolBarUI: () => void,
  updateEqUI: () => void,
  addPathsFn: (paths: any[], isInitial: boolean) => Promise<void>
) {
  state.restoreSession = localStorage.getItem('af_restore_session') !== 'false';
  if (checkRestoreSession) checkRestoreSession.checked = state.restoreSession;

  if (state.restoreSession) {
    const stored = localStorage.getItem('af_playlist');
    if (stored) {
      try {
        const storedItems = JSON.parse(stored);
        if (storedItems.length) {
          const items = storedItems.map((item: any) => 
            typeof item === 'string' ? { path: item, addedAt: Date.now(), playCount: 0 } : item
          );
          await addPathsFn(items, true);
        }
      } catch (e) { console.error('Load failed', e); }
    }
  }

  state.alwaysOnTop = localStorage.getItem('af_on_top') === 'true';
  if (checkOnTop) checkOnTop.checked = state.alwaysOnTop;
  const appWindow = getCurrentWebviewWindow();
  if (appWindow && (appWindow as any).setAlwaysOnTop) {
    (appWindow as any).setAlwaysOnTop(state.alwaysOnTop);
  }

  const settingsStr = localStorage.getItem('af_settings');
  const settings = settingsStr ? JSON.parse(settingsStr) : {};

  if (shuffleBtn) shuffleBtn.classList.toggle('active', state.shuffle);
  if (repeatBtn) repeatBtn.classList.toggle('active', state.repeat !== 'none');
  if (repeatBadge) repeatBadge.style.display = state.repeat === 'one' ? 'flex' : 'none';

  if (state.restoreSession && settings.current !== undefined && state.tracks[settings.current]) {
    loadTrack(settings.current, false);
    if (settings.currentTime && audio) {
      const curAudio = audio;
      const restoreTime = () => {
        curAudio.currentTime = settings.currentTime;
        curAudio.removeEventListener('loadedmetadata', restoreTime);
      };
      curAudio.addEventListener('loadedmetadata', restoreTime);
    }
  }

  if (settings.lang) updateLanguage(settings.lang);
  else updateLanguage('ja');

  if (settings.theme) setTheme(settings.theme);
  else setTheme('dark');

  if (settings.speed) setSpeed(settings.speed);

  state.showLyrics = settings.showLyrics !== undefined ? settings.showLyrics : false;
  const lyricsContainer = document.getElementById('lyricsContainer');
  if (lyricsContainer) {
    lyricsContainer.style.display = state.showLyrics ? 'flex' : 'none';
  }

  state.eqEnabled = settings.eqEnabled || false;
  state.eqGains = settings.eqGains || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

  state.compEnabled = settings.compEnabled || false;
  state.compSettings = settings.compSettings || {
    threshold: -24,
    knee: 30,
    ratio: 12,
    attack: 0.003,
    release: 0.25,
    makeup: 0
  };

  if (settings.volume !== undefined) {
    state.volume = settings.volume;
    if (audio) audio.volume = state.volume;
  }
  if (settings.muted !== undefined) state.muted = settings.muted;
  updateVolBarUI();

  updateEqUI();
}
