import ReactDOM from 'react-dom/client';
import App from './App';
import { state } from './ts/state';
import { fmt, showToast } from './ts/utils';
import * as player from './ts/player';
import * as ui from './ts/ui';
import { translations } from './ts/translations';
import { CONFIG } from './ts/config';
import { initVisualizer, updateEqGains, updateCompSettings, updateEffectsSettings } from './ts/visualizer';
import { initUpdater } from './ts/update';
import { updateDiscordRPC } from './ts/discord';
import { updateLyrics } from './ts/lyrics';
import { addPaths as addPathsLogic, getPlaylistView, toggleFavorite, loadPlaylist as loadPlaylistLogic } from './ts/playlist';
import { updateEqUI as updateEqUILogic, updateCompValuesUI as updateCompValuesUILogic } from './ts/audio-settings';
import muteIcon from './assets/mute.png';

import { invoke } from '@tauri-apps/api/core';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { listen } from '@tauri-apps/api/event';
import { open as dialogOpen, save as dialogSave } from '@tauri-apps/plugin-dialog';
import { readDir as readDirectoryRaw } from '@tauri-apps/plugin-fs';
import { register as registerShortcut, unregisterAll } from '@tauri-apps/plugin-global-shortcut';
import { LogicalSize, PhysicalSize } from '@tauri-apps/api/dpi';

const isTauri = typeof window !== 'undefined' && (!!(window as any).__TAURI__ || !!(window as any).__TAURI_METADATA__);

// DOM variables (to be initialized after React mount)
let audio: HTMLAudioElement | null = null;
let playBtn: HTMLButtonElement | null = null;
let prevBtn: HTMLButtonElement | null = null;
let nextBtn: HTMLButtonElement | null = null;
let shuffleBtn: HTMLButtonElement | null = null;
let repeatBtn: HTMLButtonElement | null = null;
let repeatBadge: HTMLSpanElement | null = null;
let muteBtn: HTMLButtonElement | null = null;
let volIcon: HTMLDivElement | null = null;
let seeker: HTMLDivElement | null = null;
let seekFill: HTMLDivElement | null = null;
let seekThumb: HTMLDivElement | null = null;
let curTime: HTMLSpanElement | null = null;
let durTime: HTMLSpanElement | null = null;
let volBar: HTMLDivElement | null = null;
let volFill: HTMLDivElement | null = null;
let volThumb: HTMLDivElement | null = null;
let volLbl: HTMLSpanElement | null = null;

let trackTitle: HTMLHeadingElement | null = null;
let trackSub: HTMLParagraphElement | null = null;
let albumArt: HTMLDivElement | null = null;
let artGlow: HTMLDivElement | null = null;
let vinylCenter: HTMLDivElement | null = null;
let playlist: HTMLUListElement | null = null;
let plCount: HTMLSpanElement | null = null;
let btnOpenFiles: HTMLButtonElement | null = null;
let btnOpenFolder: HTMLButtonElement | null = null;
let btnClearAll: HTMLButtonElement | null = null;
let btnSavePlaylist: HTMLButtonElement | null = null;
let btnLoadPlaylist: HTMLButtonElement | null = null;
let btnMiniMode: HTMLButtonElement | null = null;
let dropHint: HTMLDivElement | null = null;
let dropOverlay: HTMLDivElement | null = null;
let plSearch: HTMLInputElement | null = null;
let sidebarResizer: HTMLDivElement | null = null;
let speedSlider: HTMLInputElement | null = null;
let speedLbl: HTMLSpanElement | null = null;
let langSelect: HTMLSelectElement | null = null;
let btnThemeDark: HTMLButtonElement | null = null;
let btnThemeLight: HTMLButtonElement | null = null;

let tbMin: HTMLButtonElement | null = null;
let tbMax: HTMLButtonElement | null = null;
let tbClose: HTMLButtonElement | null = null;

let btnSettings: HTMLButtonElement | null = null;
let settingsModal: HTMLDivElement | null = null;
let btnCloseSettings: HTMLButtonElement | null = null;
let btnSaveSettings: HTMLButtonElement | null = null;
let checkOnTop: HTMLInputElement | null = null;
let checkRestoreSession: HTMLInputElement | null = null;
let checkShowLyrics: HTMLInputElement | null = null;
let checkDiscordRPC: HTMLInputElement | null = null;
let btnReportBug: HTMLButtonElement | null = null;
let bugModal: HTMLDivElement | null = null;
let btnCloseBug: HTMLButtonElement | null = null;
let btnSubmitBug: HTMLButtonElement | null = null;
let bugTitle: HTMLInputElement | null = null;
let bugCategory: HTMLSelectElement | null = null;
let bugDesc: HTMLTextAreaElement | null = null;
let bugError: HTMLDivElement | null = null;

let lyricsInner: HTMLDivElement | null = null;
let checkEq: HTMLInputElement | null = null;
let eqContainer: HTMLDivElement | null = null;
let eqOverlay: HTMLDivElement | null = null;
let eqStatusText: HTMLSpanElement | null = null;
let btnEqReset: HTMLButtonElement | null = null;
let btnShowEq: HTMLButtonElement | null = null;
let eqSliders: NodeListOf<HTMLInputElement> | null = null;

let eqTabBtns: NodeListOf<HTMLButtonElement> | null = null;
let tabContents: NodeListOf<HTMLDivElement> | null = null;

let compThreshold: HTMLInputElement | null = null;
let compKnee: HTMLInputElement | null = null;
let compRatio: HTMLInputElement | null = null;
let compAttack: HTMLInputElement | null = null;
let compRelease: HTMLInputElement | null = null;
let compMakeup: HTMLInputElement | null = null;

let valThreshold: HTMLSpanElement | null = null;
let valKnee: HTMLSpanElement | null = null;
let valRatio: HTMLSpanElement | null = null;
let valAttack: HTMLSpanElement | null = null;
let valRelease: HTMLSpanElement | null = null;
let valMakeup: HTMLSpanElement | null = null;

let eqPresetsSelect: HTMLSelectElement | null = null;
let verEl: HTMLSpanElement | null = null;

let plViewBtns: NodeListOf<HTMLButtonElement> | null = null;
let checkReverb: HTMLInputElement | null = null;
let reverbLevel: HTMLInputElement | null = null;
let reverbType: HTMLSelectElement | null = null;
let checkDelay: HTMLInputElement | null = null;
let delayLevel: HTMLInputElement | null = null;
let delayTime: HTMLInputElement | null = null;
let delayFeedback: HTMLInputElement | null = null;
let btnReverbReset: HTMLButtonElement | null = null;
let btnDelayReset: HTMLButtonElement | null = null;

let normalSize: LogicalSize | PhysicalSize = new LogicalSize(1000, 660);

async function getAppVersionSafe(): Promise<string> {
  try {
    if (invoke) {
      return await invoke('get_version');
    }
  } catch (e) {
    console.warn("Failed to get app version:", e);
  }
  return state.version;
}

function clearBugError() {
  if (!bugError) return;
  bugError.textContent = '';
  bugError.hidden = true;
  bugTitle?.classList.remove('input-error');
  bugDesc?.classList.remove('input-error');
}

function showBugError(msg: string) {
  if (!bugError) return;
  bugError.textContent = msg;
  bugError.hidden = false;
}

function setTheme(theme: string) {
  state.theme = theme as 'dark' | 'light';
  document.body.classList.remove('dark-theme', 'light-theme');
  document.body.classList.add(`${theme}-theme`);

  btnThemeDark?.classList.toggle('active', theme === 'dark');
  btnThemeLight?.classList.toggle('active', theme === 'light');

  saveSettings();
}

function updateLanguage(lang: string) {
  state.lang = lang as 'ja' | 'en' | 'ko' | 'zh';
  const dict = translations[lang] || translations.ja;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key && dict[key]) el.innerHTML = dict[key];
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key && dict[key]) (el as HTMLInputElement).placeholder = dict[key];
  });

  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (key && dict[key]) (el as HTMLElement).title = dict[key];
  });

  document.querySelectorAll('[data-i18n-label]').forEach(el => {
    const key = el.getAttribute('data-i18n-label');
    if (key && dict[key]) el.setAttribute('aria-label', dict[key]);
  });

  if (langSelect) langSelect.value = lang;
  saveSettings();
  updateCount();
  populatePresetSelect();
}

function setSpeed(val: number) {
  state.speed = val;
  if (audio) audio.playbackRate = val;
  if (speedLbl) speedLbl.textContent = `${val.toFixed(1)}x`;
  if (speedSlider) speedSlider.value = val.toString();
  saveSettings();
}

function updateEqUI() {
  updateEqUILogic(
    eqContainer,
    populatePresetSelect,
    checkEq,
    eqStatusText,
    eqSliders,
    compThreshold,
    compKnee,
    compRatio,
    compAttack,
    compRelease,
    compMakeup,
    checkReverb,
    reverbLevel,
    reverbType,
    checkDelay,
    delayLevel,
    delayTime,
    delayFeedback,
    updateCompValuesUI
  );
}

function updateCompValuesUI() {
  updateCompValuesUILogic(valThreshold, valKnee, valRatio, valAttack, valRelease, valMakeup);
}

function updateVolBarUI() {
  if (!volFill || !volThumb || !volBar || !volLbl) return;
  const ratio = state.muted ? 0 : state.volume;
  const pct = ratio * 100;
  volFill.style.width = pct + '%';
  volThumb.style.left = pct + '%';
  volBar.setAttribute('aria-valuenow', Math.round(pct).toString());
  volLbl.textContent = Math.round(pct) + '%';
  updateVolIcon();
}

async function toggleMiniMode() {
  const appWindow = getCurrentWebviewWindow();
  state.miniPlayer = !state.miniPlayer;
  document.body.classList.toggle('mini-view', state.miniPlayer);

  if (state.miniPlayer) {
    normalSize = await appWindow.innerSize();
    const miniSize = new LogicalSize(860, 80);

    await appWindow.setResizable(false);
    await appWindow.setMinSize(miniSize);
    await appWindow.setMaxSize(miniSize);
    await appWindow.setSize(miniSize);
    await appWindow.setAlwaysOnTop(true);

    if (tbMax) tbMax.style.display = 'none';
    btnMiniMode?.classList.add('active');
  } else {
    await appWindow.setResizable(true);
    await appWindow.setMinSize(new LogicalSize(760, 520));
    await appWindow.setMaxSize(null as any);

    await appWindow.setSize(normalSize);
    await appWindow.setAlwaysOnTop(state.alwaysOnTop);

    if (tbMax) tbMax.style.display = 'flex';
    btnMiniMode?.classList.remove('active');
  }
}

function onPlaylistRowClick(e: any, index: number) {
  if (e.target.closest('.pl-del')) { removeTrack(index); return; }
  if (e.target.closest('.pl-fav')) { 
    toggleFavorite(index, updatePlaylistUI);
    return; 
  }
  if (state.current === index) togglePlayWrapper();
  else loadTrackWrapper(index, true);
}

function togglePlayWrapper() {
  player.togglePlay(audio, albumArt, vinylCenter, artGlow, playlist, loadTrackWrapper);
}

function loadTrackWrapper(index: number, autoplay = false) {
  player.loadTrack(index, autoplay, audio, albumArt, vinylCenter, artGlow, playlist, lyricsInner, syncMediaSession);
}

function updatePlaylistUI() {
  if (playlist) {
    ui.renderPlaylist(playlist, getPlaylistView(), onPlaylistRowClick, plSearch?.value || "");
  }
}

function onReorder(from: number, to: number) {
  if (state.plView !== 'all') return; // Cannot reorder in smart playlists
  const movedTrack = state.tracks.splice(from, 1)[0];
  state.tracks.splice(to, 0, movedTrack);

  if (state.current === from) {
    state.current = to;
  } else if (from < state.current && to >= state.current) {
    state.current--;
  } else if (from > state.current && to <= state.current) {
    state.current++;
  }

  updatePlaylistUI();
  player.buildShuffleOrder();
  player.savePlaylist();
}

function removeTrack(index: number) {
  const removingCurrent = state.current === index;
  const wasPlaying = !!audio ? !audio.paused && !audio.ended : state.playing;

  if (removingCurrent && audio) {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    state.playing = false;
    if (curTime) curTime.textContent = '0:00';
    if (durTime) durTime.textContent = '0:00';
    if (seekFill) seekFill.style.width = '0%';
    if (seekThumb) seekThumb.style.left = '0%';
  }

  state.tracks.splice(index, 1);
  
  if (removingCurrent) {
    state.current = -1;
  } else if (state.current > index) {
    state.current--;
  }

  updatePlaylistUI();
  updateCount();
  player.buildShuffleOrder();
  player.savePlaylist();

  if (!state.tracks.length) { 
    resetPlayer(); 
    dropHint?.classList.remove('hidden'); 
    return; 
  }

  if (removingCurrent) {
    const next = Math.min(index, state.tracks.length - 1);
    loadTrackWrapper(next, wasPlaying);
  } else {
    if (playlist) ui.updateActive(playlist);
  }
}

function updateCount() {
  const dict = translations[state.lang] || translations.ja;
  if (plCount) plCount.textContent = `${state.tracks.length}${dict.tracks_count || ' 曲'}`;
}

async function addPathsWrapper(paths: any[], isInitial = false) {
  await addPathsLogic(paths, isInitial, playlist, plSearch, dropHint, onPlaylistRowClick, updateCount, loadTrackWrapper);
}

function loadTrack(index: number, autoplay = false) {
  loadTrackWrapper(index, autoplay);
}

function resetPlayer() {
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
    audio.removeAttribute('src');
    audio.load();
  }
  state.current = -1;
  state.playing = false;
  ui.updatePlayUI(false);
  if (albumArt) albumArt.classList.remove('spinning');
  if (trackTitle) trackTitle.textContent = 'Audion';
  if (trackSub) trackSub.textContent = 'Music Player';
  if (curTime) curTime.textContent = '0:00';
  if (durTime) durTime.textContent = '0:00';
  if (seekFill) seekFill.style.width = '0%';
  if (seekThumb) seekThumb.style.left = '0%';
  syncMediaSession();
}

function toggleMute() {
  state.muted = !state.muted;
  if (audio) {
    audio.volume = state.muted ? 0 : state.volume;
  }
  updateVolBarUI();
  saveSettings();
}

function togglePlay() {
  togglePlayWrapper();
}

function playOnly() {
  const dict = translations[state.lang] || translations.ja;
  if (!state.tracks.length) { showToast(dict.toast_no_tracks); return; }
  if (state.current === -1) {
    loadTrack(0, true);
    return;
  }
  if (audio && !state.playing) {
    player.playAudio(audio, albumArt, vinylCenter, artGlow, playlist);
    syncMediaSession();
  }
}

function pauseOnly() {
  if (audio && state.playing) {
    player.pauseAudio(audio, albumArt, playlist);
    syncMediaSession();
  }
}

function playNext() {
  player.playNext(loadTrackWrapper);
}

function playPrev() {
  player.playPrev(audio, loadTrackWrapper);
}

function toggleShuffle() {
  player.toggleShuffle(shuffleBtn, saveSettings);
}

function toggleRepeat() {
  player.toggleRepeat(repeatBtn, repeatBadge, saveSettings);
}

function populatePresetSelect() {
  if (!eqPresetsSelect) return;
  const el = eqPresetsSelect;
  const dict = translations[state.lang] || translations.ja;
  const currentVal = el.value;
  el.innerHTML = '';

  const manualOpt = document.createElement('option');
  manualOpt.value = 'manual';
  manualOpt.textContent = dict.preset_manual || '手動';
  el.appendChild(manualOpt);

  const flatOpt = document.createElement('option');
  flatOpt.value = 'flat';
  flatOpt.textContent = dict.preset_flat || 'フラット';
  el.appendChild(flatOpt);

  Object.keys(state.eqPresets).forEach(presetName => {
    const opt = document.createElement('option');
    opt.value = presetName;
    opt.textContent = dict['preset_' + presetName] || presetName;
    el.appendChild(opt);
  });

  if (currentVal) el.value = currentVal;
}

function applyEqPreset(presetName: string) {
  const preset = state.eqPresets[presetName];
  if (!preset) return;

  state.eqGains = [...preset];
  state.eqEnabled = true;
  updateEqUI();
  saveSettings();

  const dict = translations[state.lang] || translations.ja;
  showToast(`${dict['preset_' + presetName] || presetName} を適用しました`);
}

async function loadPlaylist() {
  await loadPlaylistLogic(
    checkRestoreSession,
    checkOnTop,
    shuffleBtn,
    repeatBtn,
    repeatBadge,
    loadTrackWrapper,
    audio,
    updateLanguage,
    setTheme,
    setSpeed,
    updateVolBarUI,
    updateEqUI,
    addPathsWrapper
  );
}

function saveSettings() {
  const settings = {
    volume: state.volume,
    shuffle: state.shuffle,
    repeat: state.repeat,
    current: state.current,
    currentTime: audio?.currentTime || 0,
    muted: state.muted,
    lang: state.lang,
    theme: state.theme,
    speed: state.speed,
    showLyrics: state.showLyrics,
    eqEnabled: state.eqEnabled,
    eqGains: state.eqGains,
    compEnabled: state.compEnabled,
    compSettings: state.compSettings,
  };
  localStorage.setItem('af_settings', JSON.stringify(settings));
}


function updateVolIcon() {
  if (!volIcon) return;
  const v = state.muted ? 0 : state.volume;
  if (v === 0) {
    volIcon.innerHTML = `<img src="${muteIcon}" width="18" height="18" style="filter: brightness(0) invert(0.8); display: block;">`;
  } else if (v < 0.3) {
    volIcon.innerHTML = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M3 6.5H1.5A.5.5 0 001 7v4a.5.5 0 00.5.5H3l4 4v-13L3 6.5z" fill="currentColor"/>
    </svg>`;
  } else if (v < 0.7) {
    volIcon.innerHTML = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M3 6.5H1.5A.5.5 0 001 7v4a.5.5 0 00.5.5H3l4 4v-13L3 6.5z" fill="currentColor"/>
      <path d="M11 6a4 4 0 010 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`;
  } else {
    volIcon.innerHTML = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M3 6.5H1.5A.5.5 0 001 7v4a.5.5 0 00.5.5H3l4 4v-13L3 6.5z" fill="currentColor"/>
      <path d="M11 6a4 4 0 010 6M13.5 3.5a8 8 0 010 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`;
  }
}

let seekRAF: number;
function scrub(e: MouseEvent) {
  if (!seeker) return;
  const r = seeker.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));

  cancelAnimationFrame(seekRAF);
  seekRAF = requestAnimationFrame(() => {
    if (seekFill) seekFill.style.width = (ratio * 100) + '%';
    if (seekThumb) seekThumb.style.left = (ratio * 100) + '%';
    if (audio && audio.duration) {
      audio.currentTime = ratio * audio.duration;
      if (curTime) curTime.textContent = fmt(audio.currentTime);
    }
  });
}

function setVol(e: MouseEvent) {
  if (!volBar) return;
  const r = volBar.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
  state.volume = ratio; state.muted = ratio === 0;
  if (audio) audio.volume = ratio;
  updateVolBarUI();
  saveSettings();
}

function getCoverMimeType(cover?: string): string | undefined {
  if (!cover) return undefined;
  const match = /^data:(.*?);base64,/i.exec(cover);
  return match ? match[1] : undefined;
}

function syncTaskbarPlaybackButton() {
  if (!isTauri || !invoke) return;
  invoke('set_taskbar_playing', { isPlaying: state.playing }).catch((e) => {
    console.warn('Failed to sync taskbar playback button:', e);
  });
}

function syncMediaSession() {
  syncTaskbarPlaybackButton();
  if (!('mediaSession' in navigator)) return;
  const mediaSession = navigator.mediaSession;
  mediaSession.playbackState = state.playing ? 'playing' : 'paused';

  if (state.current < 0 || !state.tracks[state.current]) {
    mediaSession.metadata = null;
    return;
  }

  const currentTrack = state.tracks[state.current];
  const artwork = currentTrack.cover
    ? [{
      src: currentTrack.cover,
      sizes: '512x512',
      type: getCoverMimeType(currentTrack.cover),
    }]
    : undefined;

  mediaSession.metadata = new MediaMetadata({
    title: currentTrack.name || 'Unknown Track',
    artist: currentTrack.artist || 'Unknown Artist',
    album: currentTrack.album || 'Audion',
    artwork,
  });
}

function setupMediaSessionControls() {
  if (!('mediaSession' in navigator)) return;
  const mediaSession = navigator.mediaSession;
  const safeSetHandler = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
    try {
      mediaSession.setActionHandler(action, handler);
    } catch (e) {
      console.warn(`Media Session action not supported: ${action}`, e);
    }
  };

  safeSetHandler('play', () => {
    if (!state.playing) togglePlay();
  });
  safeSetHandler('pause', () => {
    if (state.playing) togglePlay();
  });
  safeSetHandler('stop', () => {
    resetPlayer();
  });
  safeSetHandler('nexttrack', () => {
    playNext();
  });
  safeSetHandler('previoustrack', () => {
    playPrev();
  });

  window.addEventListener('audion-play-state-changed', () => {
    syncMediaSession();
  });

  syncMediaSession();
}


let windowShown = false;
const showApp = async (): Promise<void> => {
  if (windowShown) return;
  try {
    const win = getCurrentWebviewWindow();
    await win.show();
    windowShown = true;
  } catch (e) {
    console.error("Failed to show window:", e);
  }
};

function setupLegacyLogic() {
  console.log("Setting up legacy logic...");
  const appWindow = getCurrentWebviewWindow();

  tbMin?.addEventListener('click', () => appWindow.minimize());
  tbMax?.addEventListener('click', async () => {
    const maximized = await appWindow.isMaximized();
    if (maximized) appWindow.unmaximize();
    else appWindow.maximize();
  });
  tbClose?.addEventListener('click', () => appWindow.close());

  let isResizing = false;

  sidebarResizer?.addEventListener('mousedown', (e: MouseEvent) => {
    isResizing = true;
    sidebarResizer?.classList.add('active');
    document.body.style.cursor = 'col-resize';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e: MouseEvent) => {
    if (!isResizing) return;
    const newWidth = e.clientX;
    if (newWidth >= 200 && newWidth <= 500) {
      document.documentElement.style.setProperty('--sidebar-w', `${newWidth}px`);
    }
  });

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      sidebarResizer?.classList.remove('active');
      document.body.style.cursor = '';
      localStorage.setItem('af_sidebar_w', document.documentElement.style.getPropertyValue('--sidebar-w'));
    }
  });

  btnSettings?.addEventListener('click', () => {
    if (checkOnTop) checkOnTop.checked = state.alwaysOnTop;
    if (checkRestoreSession) checkRestoreSession.checked = state.restoreSession;
    if (checkShowLyrics) checkShowLyrics.checked = state.showLyrics;
    if (checkDiscordRPC) checkDiscordRPC.checked = state.discordRPCEnabled;
    if (langSelect) langSelect.value = state.lang;
    btnThemeDark?.classList.toggle('active', state.theme === 'dark');
    btnThemeLight?.classList.toggle('active', state.theme === 'light');
    settingsModal?.classList.add('active');
  });
  btnCloseSettings?.addEventListener('click', () => settingsModal?.classList.remove('active'));
  settingsModal?.addEventListener('click', (e: MouseEvent) => { if (e.target === settingsModal) settingsModal?.classList.remove('active'); });

  btnSaveSettings?.addEventListener('click', () => {
    let needsLanguageUpdate = false;
    let needsThemeUpdate = false;

    if (checkOnTop && checkOnTop.checked !== state.alwaysOnTop) {
      state.alwaysOnTop = checkOnTop.checked;
      appWindow.setAlwaysOnTop(state.alwaysOnTop);
      localStorage.setItem('af_on_top', state.alwaysOnTop.toString());
    }

    if (checkRestoreSession && checkRestoreSession.checked !== state.restoreSession) {
      state.restoreSession = checkRestoreSession.checked;
      localStorage.setItem('af_restore_session', state.restoreSession.toString());
    }

    if (checkShowLyrics && checkShowLyrics.checked !== state.showLyrics) {
      state.showLyrics = checkShowLyrics.checked;
      const lyricsContainer = document.getElementById('lyricsContainer');
      if (lyricsContainer) {
        lyricsContainer.style.display = state.showLyrics ? 'flex' : 'none';
      }
    }

    if (checkDiscordRPC && checkDiscordRPC.checked !== state.discordRPCEnabled) {
      state.discordRPCEnabled = checkDiscordRPC.checked;
      localStorage.setItem('af_discord_rpc', state.discordRPCEnabled.toString());
      updateDiscordRPC();
    }

    const selectedTheme = btnThemeDark?.classList.contains('active') ? 'dark' : 'light';
    if (selectedTheme !== state.theme) {
      needsThemeUpdate = true;
    }

    if (langSelect && langSelect.value !== state.lang) {
      needsLanguageUpdate = true;
    }

    if (needsThemeUpdate) setTheme(selectedTheme as 'dark' | 'light');
    if (needsLanguageUpdate && langSelect) updateLanguage(langSelect.value as any);

    saveSettings();
    settingsModal?.classList.remove('active');
    const dict = translations[state.lang] || translations.ja;
    showToast(dict.toast_settings_saved || "設定を保存しました");
  });

  btnReportBug?.addEventListener('click', () => {
    settingsModal?.classList.remove('active');
    clearBugError();
    bugModal?.classList.add('active');
  });

  btnCloseBug?.addEventListener('click', () => {
    clearBugError();
    bugModal?.classList.remove('active');
  });
  bugModal?.addEventListener('click', (e: MouseEvent) => {
    if (e.target === bugModal) {
      clearBugError();
      bugModal?.classList.remove('active');
    }
  });

  btnSubmitBug?.addEventListener('click', async () => {
    if (!bugTitle || !bugCategory || !bugDesc || !btnSubmitBug) return;
    const title = bugTitle.value.trim();
    const category = bugCategory.value;
    const desc = bugDesc.value.trim();

    const dict = translations[state.lang] || translations.ja;
    if (!title || !desc) {
      showBugError(dict.toast_bug_error);
      if (!title) bugTitle.classList.add('input-error');
      if (!desc) bugDesc.classList.add('input-error');
      if (!title) bugTitle.focus();
      else bugDesc.focus();
      return;
    }

    btnSubmitBug.disabled = true;
    btnSubmitBug.textContent = dict.sending || "Sending...";

    const markdown = `**Category: ${category}**\n\n**Description**\n${desc}`;

    try {
      const response = await fetch(CONFIG.REPORT_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': CONFIG.API_KEY
        },
        body: JSON.stringify({
          title: title,
          version: state.version,
          markdown: markdown,
          markdown_no_sys: desc
        })
      });

      if (response.ok) {
        showToast(dict.toast_bug_success);
        bugTitle.value = '';
        bugDesc.value = '';
        bugCategory.value = 'bug';
        bugModal?.classList.remove('active');
      } else {
        showToast(dict.toast_error_generic);
      }
    } catch (err) {
      console.error('Feedback Error:', err);
      showToast(dict.toast_error_generic);
    } finally {
      if (btnSubmitBug) {
        btnSubmitBug.disabled = false;
        btnSubmitBug.textContent = dict.submit || "Submit";
      }
      clearBugError();
    }
  });


  bugTitle?.addEventListener('input', () => {
    if (bugTitle && bugTitle.value.trim()) bugTitle.classList.remove('input-error');
    if (bugTitle && bugTitle.value.trim() && bugDesc && bugDesc.value.trim()) clearBugError();
  });
  bugDesc?.addEventListener('input', () => {
    if (bugDesc && bugDesc.value.trim()) bugDesc.classList.remove('input-error');
    if (bugTitle && bugTitle.value.trim() && bugDesc && bugDesc.value.trim()) clearBugError();
  });

  btnThemeDark?.addEventListener('click', () => {
    btnThemeDark?.classList.add('active');
    btnThemeLight?.classList.remove('active');
  });
  btnThemeLight?.addEventListener('click', () => {
    btnThemeLight?.classList.add('active');
    btnThemeDark?.classList.remove('active');
  });

  document.querySelectorAll('select.select-input').forEach(el => {
    const sel = el as HTMLSelectElement;
    sel.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      const len = sel.options.length;
      if (!len) return;

      let idx = sel.selectedIndex;
      if (e.deltaY < 0) idx = Math.max(0, idx - 1);
      else idx = Math.min(len - 1, idx + 1);

      if (idx !== sel.selectedIndex) {
        sel.selectedIndex = idx;
        sel.dispatchEvent(new Event('change'));
      }
    }, { passive: false });
  });

  btnMiniMode?.addEventListener('click', () => {
    toggleMiniMode();
  });

  playBtn?.addEventListener('click', () => {
    togglePlay();
  });

  muteBtn?.addEventListener('click', () => {
    toggleMute();
  });

  prevBtn?.addEventListener('click', () => {
    playPrev();
  });

  nextBtn?.addEventListener('click', () => {
    playNext();
  });

  shuffleBtn?.addEventListener('click', () => {
    toggleShuffle();
  });

  repeatBtn?.addEventListener('click', () => {
    toggleRepeat();
  });

  speedSlider?.addEventListener('input', (e: Event) => {
    const val = parseFloat((e.target as HTMLInputElement).value);
    setSpeed(val);
  });

  speedSlider?.addEventListener('wheel', (e: WheelEvent) => {
    e.preventDefault();
    let val = state.speed;
    const step = 0.1;
    if (e.deltaY < 0) val = Math.min(2.0, val + step);
    else val = Math.max(0.5, val - step);
    val = Math.round(val * 10) / 10;
    setSpeed(val);
  }, { passive: false });


  eqTabBtns?.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      eqTabBtns?.forEach(b => b.classList.toggle('active', b === btn));
      tabContents?.forEach(content => {
        content.classList.toggle('active', content.id === `${tabId}TabContent`);
      });
      updateEqUI();
    });
  });

  btnShowEq?.addEventListener('click', (e: MouseEvent) => {
    e.stopPropagation();
    eqOverlay?.classList.toggle('active');
    btnShowEq?.classList.toggle('active', eqOverlay?.classList.contains('active'));
    if (eqOverlay?.classList.contains('active')) {
      updateEqUI();
    }
  });

  document.addEventListener('click', (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (eqOverlay?.classList.contains('active') && !eqOverlay.contains(target) && e.target !== btnShowEq && !btnShowEq?.contains(target)) {
      eqOverlay?.classList.remove('active');
      btnShowEq?.classList.remove('active');
    }
  });


  checkEq?.addEventListener('change', (e: Event) => {
    const target = e.target as HTMLInputElement;
    const activeTabBtn = document.querySelector('.eq-tab-btn.active') as HTMLElement | null;
    const activeTab = activeTabBtn ? activeTabBtn.dataset.tab : 'eq';
    if (activeTab === 'eq') {
      state.eqEnabled = target.checked;
    } else {
      state.compEnabled = target.checked;
    }
    updateEqUI();
    saveSettings();
  });

  btnEqReset?.addEventListener('click', () => {
    const activeTabBtn = document.querySelector('.eq-tab-btn.active') as HTMLElement | null;
    const activeTab = activeTabBtn ? activeTabBtn.dataset.tab : 'eq';
    if (activeTab === 'eq') {
      state.eqGains = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    } else {
      state.compSettings = {
        threshold: -24,
        knee: 30,
        ratio: 12,
        attack: 0.003,
        release: 0.25,
        makeup: 0
      };
    }
    updateEqUI();
    saveSettings();
  });

  eqPresetsSelect?.addEventListener('change', (e: Event) => {
    const target = e.target as HTMLSelectElement;
    const val = target.value;
    if (val === 'manual') return;
    if (val === 'flat') {
      state.eqGains = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      state.eqEnabled = true;
      updateEqUI();
      saveSettings();
    } else {
      applyEqPreset(val);
    }
  });

  eqSliders?.forEach(slider => {
    slider.addEventListener('input', (e: Event) => {
      const target = e.target as HTMLInputElement;
      const idx = parseInt(target.dataset.index || "0");
      state.eqGains[idx] = parseFloat(target.value);
      if (eqPresetsSelect) eqPresetsSelect.value = 'manual';

      const animBar = target.parentElement?.querySelector('.eq-bar-anim') as HTMLElement | null;
      if (animBar) {
        const h = ((state.eqGains[idx] + 12) / 24) * 140;
        animBar.style.height = `${h}px`;
      }

      updateEqGains(state.eqGains, state.eqEnabled);
    });
    slider.addEventListener('dblclick', (e: MouseEvent) => {
      const target = e.target as HTMLInputElement;
      const idx = parseInt(target.dataset.index || "0");
      state.eqGains[idx] = 0;
      target.value = "0";
      updateEqUI();
      saveSettings();
    });
    slider.addEventListener('change', () => {
      saveSettings();
    });
  });

  compThreshold?.addEventListener('input', (e: Event) => {
    state.compSettings.threshold = parseFloat((e.target as HTMLInputElement).value);
    updateCompValuesUI();
    updateCompSettings(state.compSettings, state.compEnabled);
  });
  compKnee?.addEventListener('input', (e: Event) => {
    state.compSettings.knee = parseFloat((e.target as HTMLInputElement).value);
    updateCompValuesUI();
    updateCompSettings(state.compSettings, state.compEnabled);
  });
  compRatio?.addEventListener('input', (e: Event) => {
    state.compSettings.ratio = parseFloat((e.target as HTMLInputElement).value);
    updateCompValuesUI();
    updateCompSettings(state.compSettings, state.compEnabled);
  });
  compAttack?.addEventListener('input', (e: Event) => {
    state.compSettings.attack = parseFloat((e.target as HTMLInputElement).value);
    updateCompValuesUI();
    updateCompSettings(state.compSettings, state.compEnabled);
  });
  compRelease?.addEventListener('input', (e: Event) => {
    state.compSettings.release = parseFloat((e.target as HTMLInputElement).value);
    updateCompValuesUI();
    updateCompSettings(state.compSettings, state.compEnabled);
  });
  compMakeup?.addEventListener('input', (e: Event) => {
    state.compSettings.makeup = parseFloat((e.target as HTMLInputElement).value);
    updateCompValuesUI();
    updateCompSettings(state.compSettings, state.compEnabled);
  });

  [compThreshold, compKnee, compRatio, compAttack, compRelease, compMakeup].forEach(el => {
    el?.addEventListener('change', () => saveSettings());
  });

  const compDefaults: Record<string, number> = {
    compThreshold: -24, compKnee: 30, compRatio: 12,
    compAttack: 0.003, compRelease: 0.25, compMakeup: 0
  };
  [compThreshold, compKnee, compRatio, compAttack, compRelease, compMakeup].forEach(el => {
    el?.addEventListener('dblclick', () => {
      const key = el.id as keyof typeof compDefaults;
      const def = compDefaults[key];
      if (def === undefined) return;
      el.value = def.toString();
      // Map element id to state key
      if (key === 'compThreshold') state.compSettings.threshold = def;
      else if (key === 'compKnee') state.compSettings.knee = def;
      else if (key === 'compRatio') state.compSettings.ratio = def;
      else if (key === 'compAttack') state.compSettings.attack = def;
      else if (key === 'compRelease') state.compSettings.release = def;
      else if (key === 'compMakeup') state.compSettings.makeup = def;
      updateCompValuesUI();
      updateCompSettings(state.compSettings, state.compEnabled);
      saveSettings();
    });
  });

  const updateFx = () => {
    if (audio) {
      updateEffectsSettings(
        { enabled: state.reverbEnabled, level: state.reverbLevel, type: state.reverbType },
        { enabled: state.delayEnabled, level: state.delayLevel, time: state.delayTime, feedback: state.delayFeedback }
      );
    }
  };

  checkReverb?.addEventListener('change', (e: Event) => {
    state.reverbEnabled = (e.target as HTMLInputElement).checked;
    updateFx();
    saveSettings();
  });
  reverbLevel?.addEventListener('input', (e: Event) => {
    state.reverbLevel = parseFloat((e.target as HTMLInputElement).value);
    updateFx();
  });
  reverbType?.addEventListener('change', (e: Event) => {
    state.reverbType = (e.target as HTMLSelectElement).value as any;
    updateFx();
    saveSettings();
  });
  
  checkDelay?.addEventListener('change', (e: Event) => {
    state.delayEnabled = (e.target as HTMLInputElement).checked;
    updateFx();
    saveSettings();
  });
  delayLevel?.addEventListener('input', (e: Event) => {
    state.delayLevel = parseFloat((e.target as HTMLInputElement).value);
    updateFx();
  });
  delayTime?.addEventListener('input', (e: Event) => {
    state.delayTime = parseFloat((e.target as HTMLInputElement).value);
    updateFx();
  });
  delayFeedback?.addEventListener('input', (e: Event) => {
    state.delayFeedback = parseFloat((e.target as HTMLInputElement).value);
    updateFx();
  });

  [reverbLevel, delayLevel, delayTime, delayFeedback].forEach(el => {
    el?.addEventListener('change', () => saveSettings());
  });

  // FX dblclick-to-default
  reverbLevel?.addEventListener('dblclick', () => {
    state.reverbLevel = 0.4; updateEqUI(); updateFx(); saveSettings();
  });
  delayLevel?.addEventListener('dblclick', () => {
    state.delayLevel = 0.3; updateEqUI(); updateFx(); saveSettings();
  });
  delayTime?.addEventListener('dblclick', () => {
    state.delayTime = 0.4; updateEqUI(); updateFx(); saveSettings();
  });
  delayFeedback?.addEventListener('dblclick', () => {
    state.delayFeedback = 0.3; updateEqUI(); updateFx(); saveSettings();
  });

  // FX reset buttons
  btnReverbReset?.addEventListener('click', () => {
    state.reverbEnabled = false;
    state.reverbLevel = 0.4;
    state.reverbType = 'hall';
    updateEqUI(); updateFx(); saveSettings();
  });
  btnDelayReset?.addEventListener('click', () => {
    state.delayEnabled = false;
    state.delayLevel = 0.3;
    state.delayTime = 0.4;
    state.delayFeedback = 0.3;
    updateEqUI(); updateFx(); saveSettings();
  });

  // Speed slider dblclick-to-default
  speedSlider?.addEventListener('dblclick', () => { setSpeed(1.0); });

  // Volume bar dblclick-to-default (100%)
  volBar?.addEventListener('dblclick', () => {
    state.volume = 1.0;
    state.muted = false;
    if (audio) audio.volume = 1.0;
    updateVolBarUI();
    saveSettings();
  });

  plViewBtns?.forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view as 'all' | 'recent' | 'popular';
      if (!view) return;
      state.plView = view;
      
      plViewBtns?.forEach(b => b.classList.toggle('active', b === btn));
      updatePlaylistUI();
      saveSettings();
    });
  });

  plSearch?.addEventListener('input', () => {
    updatePlaylistUI();
  });

  btnSavePlaylist?.addEventListener('click', async () => {
    const dict = translations[state.lang] || translations.ja;
    if (!state.tracks.length) { showToast(dict.toast_no_tracks); return; }
    try {
      const filePath = await dialogSave({
        title: dict.save_playlist,
        defaultPath: 'playlist.json',
        filters: [{ name: 'Audion Playlist', extensions: ['json'] }],
      });
      if (!filePath) return;

      const playlistData = state.tracks.map(t => ({
        path: t.path,
        name: t.name,
        artist: t.artist || '',
        album: t.album || '',
        playCount: t.playCount || 0,
        addedAt: t.addedAt || Date.now()
      }));

      const jsonStr = JSON.stringify(playlistData, null, 2);
      if (invoke) await invoke('save_text_file', { path: filePath, content: jsonStr });
      showToast(dict.toast_saved);
    } catch (e) {
      console.error('Save failed', e);
      showToast(dict.toast_error_generic);
    }
  });

  btnLoadPlaylist?.addEventListener('click', async () => {
    const dict = translations[state.lang] || translations.ja;
    try {
      const file = await dialogOpen({
        title: dict.load_playlist,
        multiple: false,
        filters: [{ name: 'Audion Playlist', extensions: ['json'] }],
      });
      if (!file) return;

      if (!invoke) return;
      const content = await invoke('read_text_file', { path: file }) as string;
      const tracks = JSON.parse(content);

      if (Array.isArray(tracks)) {
        const paths = tracks.map((t: any) => t.path).filter((p: any) => !!p);
        if (paths.length) {
          await addPathsWrapper(paths);
          showToast(`${paths.length}${dict.toast_loaded}`);
        }
      } else {
        throw new Error('Invalid format');
      }
    } catch (e) {
      console.error('Load failed', e);
      showToast(dict.toast_error_generic);
    }
  });

  btnOpenFiles?.addEventListener('click', async () => {
    const dict = translations[state.lang] || translations.ja;
    try {
      const files = await dialogOpen({
        title: dict.select_music,
        multiple: true,
        filters: [{ name: dict.music, extensions: ['mp3', 'flac', 'wav', 'ogg', 'aac', 'm4a', 'opus', 'aiff', 'wma'] }],
      });
      if (!files) return;
      const paths = Array.isArray(files) ? files : [files];
      await addPathsWrapper(paths);
    } catch (e) {
      console.error(e);
      showToast(dict.toast_error_open);
    }
  });

  btnOpenFolder?.addEventListener('click', async () => {
    const dict = translations[state.lang] || translations.ja;
    try {
      const folder = await dialogOpen({
        title: dict.select_folder,
        directory: true,
        multiple: false,
      });
      if (!folder || Array.isArray(folder)) return;
      const entries = await readDirectoryRaw(folder);
      const normalizedFolder = folder.endsWith('/') || folder.endsWith('\\') ? folder : `${folder}/`;
      const paths = (entries as any[])
        .filter(e => !e.isDirectory && /\.(mp3|flac|wav|ogg|aac|m4a|opus|aiff|wma)$/i.test(e.name))
        .map(e => `${normalizedFolder}${e.name}`);
      if (paths.length) await addPathsWrapper(paths);
      else showToast(dict.toast_error_none);
    } catch (e) {
      console.error(e);
      showToast(dict.toast_error_folder);
    }
  });

  btnClearAll?.addEventListener('click', () => {
    if (!state.tracks.length) return;
    const dict = translations[state.lang] || translations.ja;
    resetPlayer();
    state.tracks = [];
    syncMediaSession();
    if (playlist) playlist.innerHTML = '';
    updateCount();
    dropHint?.classList.remove('hidden');
    player.savePlaylist();
    showToast(dict.toast_cleared);
  });

  seeker?.addEventListener('mousedown', (e: MouseEvent) => { state.seekDrag = true; scrub(e); });
  document.addEventListener('mousemove', (e: MouseEvent) => { if (state.seekDrag) scrub(e); });
  document.addEventListener('mouseup', () => { state.seekDrag = false; saveSettings(); });

  seeker?.addEventListener('keydown', (e: KeyboardEvent) => {
    if (!audio || !audio.duration) return;
    if (e.key === 'ArrowRight') audio.currentTime = Math.min(audio.duration, audio.currentTime + 5);
    if (e.key === 'ArrowLeft') audio.currentTime = Math.max(0, audio.currentTime - 5);
    saveSettings();
  });

  volBar?.addEventListener('mousedown', (e: MouseEvent) => { state.volDrag = true; setVol(e); });
  document.addEventListener('mousemove', (e: MouseEvent) => { if (state.volDrag) setVol(e); });
  document.addEventListener('mouseup', () => { state.volDrag = false; });

  volBar?.addEventListener('wheel', (e: WheelEvent) => {
    e.preventDefault();
    let v = state.volume;
    if (e.deltaY < 0) v = Math.min(1, v + 0.05);
    else v = Math.max(0, v - 0.05);
    v = Math.round(v * 100) / 100;

    state.volume = v;
    state.muted = v === 0;
    if (audio) audio.volume = v;
    updateVolBarUI();
    saveSettings();
  }, { passive: false });

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
    switch (e.key) {
      case ' ': case 'k': e.preventDefault(); togglePlay(); break;
      case 'ArrowRight':
        if (!target.closest('.seeker') && audio) { e.preventDefault(); audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10); }
        break;
      case 'ArrowLeft':
        if (!target.closest('.seeker') && audio) { e.preventDefault(); audio.currentTime = Math.max(0, audio.currentTime - 10); }
        break;
      case 'n': playNext(); break;
      case 'p': case 'b': playPrev(); break;
      case 'm': muteBtn?.click(); break;
      case 's': shuffleBtn?.click(); break;
      case 'r': repeatBtn?.click(); break;
    }
  });
}



async function setupShortcuts() {
  try {
    if (!unregisterAll || !registerShortcut) return;
    await unregisterAll();

    const playPauseKeys = ['MediaPlayPause', 'MediaPlay', 'MediaPause'];
    for (const k of playPauseKeys) {
      try {
        await registerShortcut(k, () => { togglePlay(); });
      } catch { }
    }

    const nextKeys = ['MediaNextTrack', 'MediaNext'];
    for (const k of nextKeys) {
      try {
        await registerShortcut(k, () => { playNext(); });
      } catch { }
    }

    const prevKeys = ['MediaPrevTrack', 'MediaPrevious', 'MediaPrev'];
    for (const k of prevKeys) {
      try {
        await registerShortcut(k, () => { playPrev(); });
      } catch { }
    }

    const stopKeys = ['MediaStop', 'MediaStopTrack'];
    for (const k of stopKeys) {
      try {
        await registerShortcut(k, () => {
          resetPlayer();
        });
      } catch { }
    }

  } catch (e) {
    console.error('Global shortcut setup failed', e);
  }
}

async function setupTrayListeners() {
  if (!listen) return;
  await listen('tray-play', () => playOnly());
  await listen('tray-pause', () => pauseOnly());
  await listen('tray-play-pause', () => togglePlay());
  await listen('tray-stop', () => resetPlayer());
  await listen('tray-next', () => playNext());
  await listen('tray-prev', () => playPrev());
}

async function setupDragDrop() {
  if (isTauri && listen) {
    await listen('tauri://drag-drop', async (event: any) => {
      dropOverlay?.classList.remove('active');
      const { paths } = event.payload;
      if (paths && paths.length) {
        const musicPaths = paths.filter((p: string) => /\.(mp3|flac|wav|ogg|aac|m4a|opus|aiff|wma)$/i.test(p));
        if (musicPaths.length) await addPathsWrapper(musicPaths);
        else showToast(translations[state.lang].toast_error_generic);
      }
    });

    await listen('tauri://drag-enter', () => {
      dropOverlay?.classList.add('active');
    });

    await listen('tauri://drag-leave', () => {
      dropOverlay?.classList.remove('active');
    });
  } else {
    let dragCounter = 0;
    document.addEventListener('dragenter', e => {
      dragCounter++;
      e.preventDefault();
      dropOverlay?.classList.add('active');
    });
    document.addEventListener('dragleave', (_e: DragEvent) => {
      dragCounter--;
      if (dragCounter === 0) dropOverlay?.classList.remove('active');
    });
    document.addEventListener('dragover', e => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    });
    document.addEventListener('drop', e => {
      e.preventDefault();
      dragCounter = 0;
      dropOverlay?.classList.remove('active');
      showToast("Absolute paths are only available in Tauri. Use the 'Files' button or run via 'npm run tauri dev'.", 5000);
    });
  }
}

// Mount React
const rootEl = document.getElementById('root');
if (rootEl) {
  const root = ReactDOM.createRoot(rootEl);
  root.render(<App />);
}

// Legacy initialization logic
(async () => {
  console.log("Initialization started...");
  if (isTauri) {
    try {
      const win = getCurrentWebviewWindow();
      await win.show();
      windowShown = true;
      console.log("Window shown.");
    } catch (e) {
      console.error("Failed to show window at start:", e);
    }
  }

  try {
    // Wait for React to render elements
    await new Promise(resolve => setTimeout(resolve, 50));
    console.log("DOM elements should be ready.");

    // Initialize top-level variables after elements are in the DOM
    audio = document.getElementById('audio') as HTMLAudioElement | null;
    playBtn = document.getElementById('playBtn') as HTMLButtonElement | null;
    prevBtn = document.getElementById('prevBtn') as HTMLButtonElement | null;
    nextBtn = document.getElementById('nextBtn') as HTMLButtonElement | null;
    shuffleBtn = document.getElementById('shuffleBtn') as HTMLButtonElement | null;
    repeatBtn = document.getElementById('repeatBtn') as HTMLButtonElement | null;
    repeatBadge = document.getElementById('repeatBadge') as HTMLSpanElement | null;
    muteBtn = document.getElementById('muteBtn') as HTMLButtonElement | null;
    volIcon = document.getElementById('volIcon') as HTMLDivElement | null;
    seeker = document.getElementById('seeker') as HTMLDivElement | null;
    seekFill = document.getElementById('seekFill') as HTMLDivElement | null;
    seekThumb = document.getElementById('seekThumb') as HTMLDivElement | null;
    curTime = document.getElementById('curTime') as HTMLSpanElement | null;
    durTime = document.getElementById('durTime') as HTMLSpanElement | null;
    volBar = document.getElementById('volBar') as HTMLDivElement | null;
    volFill = document.getElementById('volFill') as HTMLDivElement | null;
    volThumb = document.getElementById('volThumb') as HTMLDivElement | null;
    volLbl = document.getElementById('volLbl') as HTMLSpanElement | null;

    trackTitle = document.getElementById('trackTitle') as HTMLHeadingElement | null;
    trackSub = document.getElementById('trackSub') as HTMLParagraphElement | null;
    albumArt = document.getElementById('albumArt') as HTMLDivElement | null;
    artGlow = document.getElementById('artGlow') as HTMLDivElement | null;
    vinylCenter = document.getElementById('vinylCenter') as HTMLDivElement | null;
    playlist = document.getElementById('playlist') as HTMLUListElement | null;
    plCount = document.getElementById('playlistCount') as HTMLSpanElement | null;
    btnOpenFiles = document.getElementById('btnOpenFiles') as HTMLButtonElement | null;
    btnOpenFolder = document.getElementById('btnOpenFolder') as HTMLButtonElement | null;
    btnClearAll = document.getElementById('btnClearAll') as HTMLButtonElement | null;
    btnSavePlaylist = document.getElementById('btnSavePlaylist') as HTMLButtonElement | null;
    btnLoadPlaylist = document.getElementById('btnLoadPlaylist') as HTMLButtonElement | null;
    btnMiniMode = document.getElementById('btnMiniMode') as HTMLButtonElement | null;
    dropHint = document.getElementById('dropHint') as HTMLDivElement | null;
    dropOverlay = document.getElementById('dropOverlay') as HTMLDivElement | null;
    plSearch = document.getElementById('plSearch') as HTMLInputElement | null;
    sidebarResizer = document.getElementById('sidebarResizer') as HTMLDivElement | null;
    speedSlider = document.getElementById('speedSlider') as HTMLInputElement | null;
    speedLbl = document.getElementById('speedLbl') as HTMLSpanElement | null;
    langSelect = document.getElementById('langSelect') as HTMLSelectElement | null;
    btnThemeDark = document.getElementById('btnThemeDark') as HTMLButtonElement | null;
    btnThemeLight = document.getElementById('btnThemeLight') as HTMLButtonElement | null;

    tbMin = document.getElementById('tbMin') as HTMLButtonElement | null;
    tbMax = document.getElementById('tbMax') as HTMLButtonElement | null;
    tbClose = document.getElementById('tbClose') as HTMLButtonElement | null;

    btnSettings = document.getElementById('btnSettings') as HTMLButtonElement | null;
    settingsModal = document.getElementById('settingsModal') as HTMLDivElement | null;
    btnCloseSettings = document.getElementById('btnCloseSettings') as HTMLButtonElement | null;
    btnSaveSettings = document.getElementById('btnSaveSettings') as HTMLButtonElement | null;
    checkOnTop = document.getElementById('checkOnTop') as HTMLInputElement | null;
    checkRestoreSession = document.getElementById('checkRestoreSession') as HTMLInputElement | null;
    checkShowLyrics = document.getElementById('checkShowLyrics') as HTMLInputElement | null;
    checkDiscordRPC = document.getElementById('checkDiscordRPC') as HTMLInputElement | null;
    btnReportBug = document.getElementById('btnReportBug') as HTMLButtonElement | null;
    bugModal = document.getElementById('bugModal') as HTMLDivElement | null;
    btnCloseBug = document.getElementById('btnCloseBug') as HTMLButtonElement | null;
    btnSubmitBug = document.getElementById('btnSubmitBug') as HTMLButtonElement | null;
    bugTitle = document.getElementById('bugTitle') as HTMLInputElement | null;
    bugCategory = document.getElementById('bugCategory') as HTMLSelectElement | null;
    bugDesc = document.getElementById('bugDesc') as HTMLTextAreaElement | null;
    bugError = document.getElementById('bugError') as HTMLDivElement | null;

    lyricsInner = document.getElementById('lyricsInner') as HTMLDivElement | null;
    checkEq = document.getElementById('checkEq') as HTMLInputElement | null;
    eqContainer = document.getElementById('eqContainer') as HTMLDivElement | null;
    eqOverlay = document.getElementById('eqOverlay') as HTMLDivElement | null;
    eqStatusText = document.getElementById('eqStatusText') as HTMLSpanElement | null;
    btnEqReset = document.getElementById('btnEqReset') as HTMLButtonElement | null;
    btnShowEq = document.getElementById('btnShowEq') as HTMLButtonElement | null;
    eqSliders = document.querySelectorAll('.eq-slider') as NodeListOf<HTMLInputElement>;

    eqTabBtns = document.querySelectorAll('.eq-tab-btn') as NodeListOf<HTMLButtonElement>;
    tabContents = document.querySelectorAll('.tab-content') as NodeListOf<HTMLDivElement>;

    compThreshold = document.getElementById('compThreshold') as HTMLInputElement | null;
    compKnee = document.getElementById('compKnee') as HTMLInputElement | null;
    compRatio = document.getElementById('compRatio') as HTMLInputElement | null;
    compAttack = document.getElementById('compAttack') as HTMLInputElement | null;
    compRelease = document.getElementById('compRelease') as HTMLInputElement | null;
    compMakeup = document.getElementById('compMakeup') as HTMLInputElement | null;

    valThreshold = document.getElementById('valThreshold') as HTMLSpanElement | null;
    valKnee = document.getElementById('valKnee') as HTMLSpanElement | null;
    valRatio = document.getElementById('valRatio') as HTMLSpanElement | null;
    valAttack = document.getElementById('valAttack') as HTMLSpanElement | null;
    valRelease = document.getElementById('valRelease') as HTMLSpanElement | null;
    valMakeup = document.getElementById('valMakeup') as HTMLSpanElement | null;

    eqPresetsSelect = document.getElementById('eqPresetsSelect') as HTMLSelectElement | null;
    verEl = document.getElementById('appVersion') as HTMLSpanElement | null;

    plViewBtns = document.querySelectorAll('.pl-view-btn') as NodeListOf<HTMLButtonElement>;
    checkReverb = document.getElementById('checkReverb') as HTMLInputElement | null;
    reverbLevel = document.getElementById('reverbLevel') as HTMLInputElement | null;
    reverbType = document.getElementById('reverbType') as HTMLSelectElement | null;
    checkDelay = document.getElementById('checkDelay') as HTMLInputElement | null;
    delayLevel = document.getElementById('delayLevel') as HTMLInputElement | null;
    delayTime = document.getElementById('delayTime') as HTMLInputElement | null;
    delayFeedback = document.getElementById('delayFeedback') as HTMLInputElement | null;
    btnReverbReset = document.getElementById('btnReverbReset') as HTMLButtonElement | null;
    btnDelayReset = document.getElementById('btnDelayReset') as HTMLButtonElement | null;

    if (audio) {
      audio.volume = state.volume;
      audio.addEventListener('loadedmetadata', () => {
        if (audio && durTime) durTime.textContent = fmt(audio.duration);
        if (curTime) curTime.textContent = '0:00';
        if (seekFill) seekFill.style.width = '0%';
        if (seekThumb) seekThumb.style.left = '0%';
      });

      audio.addEventListener('timeupdate', () => {
        if (audio) {
          if (!state.seekDrag) {
            const pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
            if (seekFill) seekFill.style.width = pct + '%';
            if (seekThumb) seekThumb.style.left = pct + '%';
            if (curTime) curTime.textContent = fmt(audio.currentTime);
          }
          updateLyrics(audio.currentTime, lyricsInner);
        }
      });
      audio.addEventListener('ended', () => {
        if (state.current >= 0 && state.current < state.tracks.length) {
          state.tracks[state.current].playCount = (state.tracks[state.current].playCount || 0) + 1;
          player.savePlaylist();
          if (state.plView === 'popular') updatePlaylistUI();
        }
        if (state.repeat === 'one') {
          if (audio) {
            audio.currentTime = 0;
            audio.play();
          }
        } else {
          playNext();
        }
      });
    }

    updateVolBarUI();
    player.buildShuffleOrder();

    state.version = await getAppVersionSafe();
    console.log("Audion Version Initialized:", state.version);
    if (verEl) verEl.textContent = state.version;

    // Run legacy setup (attaches listeners to the now-available elements)
    setupLegacyLogic();

    await setupShortcuts();
    setupMediaSessionControls();
    await setupTrayListeners();
    ui.initContextMenu(onReorder);
    await setupDragDrop();

    initUpdater(isTauri);

    await listen('file-open', async (event: any) => {
      handleFileOpen(event.payload);
    });

    await listen('deep-link', (event: any) => {
      handleDeepLink(event.payload);
    });

    const initialArgs = await invoke('get_initial_args') as string[];
    handleFileOpen(initialArgs);
    handleDeepLink(initialArgs);

    function handleDeepLink(urls: any) {
      if (!urls) return;
      console.log("Deep link received:", urls);
      const urlList = Array.isArray(urls) ? urls : [urls];
      urlList.forEach(url => {
        if (!url || typeof url !== 'string') return;
        const lowerUrl = url.toLowerCase().replace(/\/$/, '');
        console.log("Processing URL:", lowerUrl);

        if (lowerUrl.includes('audion://settings') || lowerUrl.startsWith('audion:settings')) {
          console.log("Matched settings link");
          btnSettings?.click();
        } else if (lowerUrl.includes('audion://report') || lowerUrl.startsWith('audion:report')) {
          console.log("Matched report link");
          btnReportBug?.click();
        }
      });
    }

    async function handleFileOpen(paths: any) {
      if (Array.isArray(paths) && paths.length > 0) {
        const filtered = paths.filter(p => !p.endsWith('.exe') && p.includes('.'));
        if (filtered.length > 0) {
          const oldLength = state.tracks.length;
          await addPathsWrapper(filtered);
          if (state.tracks.length > oldLength) {
            loadTrack(oldLength, true);
            const win = getCurrentWebviewWindow();
            await win.show();
            await win.setFocus();
          }
        }
      }
    }

    if (audio) initVisualizer(audio);
    populatePresetSelect();
    await loadPlaylist();
  } catch (e) {
    console.error("Init Error:", e);
  } finally {
    if (isTauri) showApp();
  }
})();