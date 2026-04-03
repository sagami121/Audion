import { state } from './js/state.js';
import { fmt, esc, showToast } from './js/utils.js';
import * as player from './js/player.js';
import * as ui from './js/ui.js';
import { translations } from './js/translations.js';
import { CONFIG } from './js/config.js';
import { initVisualizer, stopVisualizer, updateEqGains, updateCompSettings } from './js/visualizer.js';

const isTauri = !!window.__TAURI__;
if (!isTauri) {
  console.warn("Audion is running in a browser. Native features (Tray, File System, Metadata) will be disabled.");
  document.addEventListener('DOMContentLoaded', () => {
    showToast("Please run 'npm run tauri dev' for full functionality", 5000);
  });
}

const tauriCore = isTauri ? window.__TAURI__.core : null;
const tauriDialog = isTauri ? window.__TAURI__.dialog : null;
const tauriWindow = isTauri ? window.__TAURI__.window : null;
const tauriShortcut = isTauri ? window.__TAURI__.globalShortcut : null;
const tauriEvent = isTauri ? window.__TAURI__.event : null;

const invoke = tauriCore?.invoke;
const tauriApp = isTauri ? window.__TAURI__.app : null;
const convertFileSrc = tauriCore?.convertFileSrc || ((s) => s);
const dialogOpen = tauriDialog?.open;
const dialogSave = tauriDialog?.save;
const tauriGetCurrent = tauriWindow?.getCurrentWindow;
const registerShortcut = tauriShortcut?.register;
const unregisterAll = tauriShortcut?.unregisterAll;
const listen = tauriEvent?.listen;

// DOM Element Declarations
const audio = document.getElementById('audio');
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const repeatBtn = document.getElementById('repeatBtn');
const repeatBadge = document.getElementById('repeatBadge');
const muteBtn = document.getElementById('muteBtn');
const volIcon = document.getElementById('volIcon');
const seeker = document.getElementById('seeker');
const seekFill = document.getElementById('seekFill');
const seekBuf = document.getElementById('seekBuf');
const seekThumb = document.getElementById('seekThumb');
const curTime = document.getElementById('curTime');
const durTime = document.getElementById('durTime');
const volBar = document.getElementById('volBar');
const volFill = document.getElementById('volFill');
const volThumb = document.getElementById('volThumb');
const trackTitle = document.getElementById('trackTitle');
const trackSub = document.getElementById('trackSub');
const albumArt = document.getElementById('albumArt');
const artImg = document.getElementById('artImg');
const artDefault = document.getElementById('artDefault');
const artGlow = document.getElementById('artGlow');
const vinylCenter = document.getElementById('vinylCenter');
const playlist = document.getElementById('playlist');
const plCount = document.getElementById('playlistCount');
const btnOpenFiles = document.getElementById('btnOpenFiles');
const btnOpenFolder = document.getElementById('btnOpenFolder');
const btnClearAll = document.getElementById('btnClearAll');
const btnSavePlaylist = document.getElementById('btnSavePlaylist');
const btnLoadPlaylist = document.getElementById('btnLoadPlaylist');
const btnMiniMode = document.getElementById('btnMiniMode');
const dropHint = document.getElementById('dropHint');
const dropOverlay = document.getElementById('dropOverlay');
const plSearch = document.getElementById('plSearch');
const sidebarResizer = document.getElementById('sidebarResizer');
const speedSlider = document.getElementById('speedSlider');
const speedLbl = document.getElementById('speedLbl');
const langSelect = document.getElementById('langSelect');
const btnThemeDark = document.getElementById('btnThemeDark');
const btnThemeLight = document.getElementById('btnThemeLight');

const tbMin = document.getElementById('tbMin');
const tbMax = document.getElementById('tbMax');
const tbClose = document.getElementById('tbClose');

const btnSettings = document.getElementById('btnSettings');
const settingsModal = document.getElementById('settingsModal');
const btnCloseSettings = document.getElementById('btnCloseSettings');
const btnSaveSettings = document.getElementById('btnSaveSettings');
const checkOnTop = document.getElementById('checkOnTop');
const checkRestoreSession = document.getElementById('checkRestoreSession');
const checkShowLyrics = document.getElementById('checkShowLyrics');
const btnReportBug = document.getElementById('btnReportBug');
const bugModal = document.getElementById('bugModal');
const btnCloseBug = document.getElementById('btnCloseBug');
const btnSubmitBug = document.getElementById('btnSubmitBug');
const bugTitle = document.getElementById('bugTitle');
const bugCategory = document.getElementById('bugCategory');
const bugDesc = document.getElementById('bugDesc');
const bugError = document.getElementById('bugError');

const lyricsInner = document.getElementById('lyricsInner');
const checkEq = document.getElementById('checkEq');
const eqContainer = document.getElementById('eqContainer');
const eqOverlay = document.getElementById('eqOverlay');
const eqStatusText = document.getElementById('eqStatusText');
const btnEqReset = document.getElementById('btnEqReset');
const btnShowEq = document.getElementById('btnShowEq');
const eqSliders = document.querySelectorAll('.eq-slider');

const eqTabBtns = document.querySelectorAll('.eq-tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

const compThreshold = document.getElementById('compThreshold');
const compKnee = document.getElementById('compKnee');
const compRatio = document.getElementById('compRatio');
const compAttack = document.getElementById('compAttack');
const compRelease = document.getElementById('compRelease');
const compMakeup = document.getElementById('compMakeup');

const valThreshold = document.getElementById('valThreshold');
const valKnee = document.getElementById('valKnee');
const valRatio = document.getElementById('valRatio');
const valAttack = document.getElementById('valAttack');
const valRelease = document.getElementById('valRelease');
const valMakeup = document.getElementById('valMakeup');

const verEl = document.getElementById('appVersion');

const metaCache = new Map();
let normalSize = { width: 1000, height: 660 };

async function openDialog(options) {
  if (dialogOpen) return dialogOpen(options);
  if (invoke) return invoke('plugin:dialog|open', { options });
  throw new Error('Dialog API unavailable');
}

async function saveDialog(options) {
  if (dialogSave) return dialogSave(options);
  if (invoke) return invoke('plugin:dialog|save', { options });
  throw new Error('Dialog API unavailable');
}

async function readDirectory(path) {
  if (window.__TAURI__?.fs?.readDir) return window.__TAURI__.fs.readDir(path);
  if (invoke) return invoke('plugin:fs|read_dir', { path, options: {} });
  throw new Error('FS API unavailable');
}

async function getAppVersionSafe() {
  try {
    if (tauriApp?.getVersion) return await tauriApp.getVersion();
    if (invoke) return await invoke('plugin:app|version');
  } catch (e) {
    console.warn("Failed to get app version:", e);
  }
  return state.version;
}

let windowShown = false;
const showApp = async () => {
  if (windowShown || !isTauri) return;
  try {
    const win = tauriGetCurrent();
    await win.show();
    windowShown = true;
  } catch (e) {
    console.error("Failed to show window:", e);
  }
};

if (isTauri) setTimeout(showApp, 1000);

const appWindow = isTauri ? tauriGetCurrent() : {
  minimize: () => { },
  maximize: () => { },
  unmaximize: () => { },
  close: () => { },
  isMaximized: () => Promise.resolve(false),
  setAlwaysOnTop: () => { },
  setProgressBar: () => { },
  show: () => Promise.resolve(),
};

if (isTauri) showApp();

tbMin.addEventListener('click', () => appWindow.minimize());
tbMax.addEventListener('click', async () => {
  const maximized = await appWindow.isMaximized();
  if (maximized) appWindow.unmaximize();
  else appWindow.maximize();
});
tbClose.addEventListener('click', () => appWindow.close());

let isResizing = false;

sidebarResizer?.addEventListener('mousedown', (e) => {
  isResizing = true;
  sidebarResizer.classList.add('active');
  document.body.style.cursor = 'col-resize';
  e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
  if (!isResizing) return;
  const newWidth = e.clientX;
  if (newWidth >= 200 && newWidth <= 500) {
    document.documentElement.style.setProperty('--sidebar-w', `${newWidth}px`);
  }
});

document.addEventListener('mouseup', () => {
  if (isResizing) {
    isResizing = false;
    sidebarResizer.classList.remove('active');
    document.body.style.cursor = '';
    localStorage.setItem('af_sidebar_w', document.documentElement.style.getPropertyValue('--sidebar-w'));
  }
});

btnSettings?.addEventListener('click', () => {
  if (checkOnTop) checkOnTop.checked = state.alwaysOnTop;
  if (checkRestoreSession) checkRestoreSession.checked = state.restoreSession;
  if (checkShowLyrics) checkShowLyrics.checked = state.showLyrics;
  if (langSelect) langSelect.value = state.lang;
  btnThemeDark?.classList.toggle('active', state.theme === 'dark');
  btnThemeLight?.classList.toggle('active', state.theme === 'light');
  settingsModal.classList.add('active');
});
btnCloseSettings?.addEventListener('click', () => settingsModal.classList.remove('active'));
settingsModal?.addEventListener('click', (e) => { if (e.target === settingsModal) settingsModal.classList.remove('active'); });

btnSaveSettings?.addEventListener('click', () => {
  let needsLanguageUpdate = false;
  let needsThemeUpdate = false;

  if (checkOnTop && checkOnTop.checked !== state.alwaysOnTop) {
    state.alwaysOnTop = checkOnTop.checked;
    appWindow.setAlwaysOnTop(state.alwaysOnTop);
    localStorage.setItem('af_on_top', state.alwaysOnTop);
  }

  if (checkRestoreSession && checkRestoreSession.checked !== state.restoreSession) {
    state.restoreSession = checkRestoreSession.checked;
    localStorage.setItem('af_restore_session', state.restoreSession);
  }

  if (checkShowLyrics && checkShowLyrics.checked !== state.showLyrics) {
    state.showLyrics = checkShowLyrics.checked;
    const lyricsContainer = document.getElementById('lyricsContainer');
    if (lyricsContainer) {
      lyricsContainer.style.display = state.showLyrics ? 'flex' : 'none';
    }
  }

  const selectedTheme = btnThemeDark?.classList.contains('active') ? 'dark' : 'light';
  if (selectedTheme !== state.theme) {
    needsThemeUpdate = true;
  }

  if (langSelect && langSelect.value !== state.lang) {
    needsLanguageUpdate = true;
  }

  if (needsThemeUpdate) setTheme(selectedTheme);
  if (needsLanguageUpdate) updateLanguage(langSelect.value);

  saveSettings();
  settingsModal.classList.remove('active');
  const dict = translations[state.lang] || translations.ja;
  showToast(dict.toast_settings_saved || "設定を保存しました");
});

btnReportBug?.addEventListener('click', () => {
  settingsModal.classList.remove('active');
  clearBugError();
  bugModal.classList.add('active');
});

btnCloseBug?.addEventListener('click', () => {
  clearBugError();
  bugModal.classList.remove('active');
});
bugModal?.addEventListener('click', (e) => {
  if (e.target === bugModal) {
    clearBugError();
    bugModal.classList.remove('active');
  }
});

async function getSystemInfo() {
  return "";
}

btnSubmitBug?.addEventListener('click', async () => {
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
  btnSubmitBug.textContent = dict.sending;

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
      bugModal.classList.remove('active');
    } else {
      showToast(dict.toast_error_generic);
    }
  } catch (err) {
    console.error('Feedback Error:', err);
    showToast(dict.toast_error_generic);
  } finally {
    btnSubmitBug.disabled = false;
    btnSubmitBug.textContent = dict.submit;
    clearBugError();
  }
});

function clearBugError() {
  if (!bugError) return;
  bugError.textContent = '';
  bugError.hidden = true;
  bugTitle?.classList.remove('input-error');
  bugDesc?.classList.remove('input-error');
}

function showBugError(msg) {
  if (!bugError) return;
  bugError.textContent = msg;
  bugError.hidden = false;
}

bugTitle?.addEventListener('input', () => {
  if (bugTitle.value.trim()) bugTitle.classList.remove('input-error');
  if (bugTitle.value.trim() && bugDesc.value.trim()) clearBugError();
});
bugDesc?.addEventListener('input', () => {
  if (bugDesc.value.trim()) bugDesc.classList.remove('input-error');
  if (bugTitle.value.trim() && bugDesc.value.trim()) clearBugError();
});

btnThemeDark?.addEventListener('click', () => {
  btnThemeDark.classList.add('active');
  btnThemeLight.classList.remove('active');
});
btnThemeLight?.addEventListener('click', () => {
  btnThemeLight.classList.add('active');
  btnThemeDark.classList.remove('active');
});

document.querySelectorAll('select.select-input').forEach(sel => {
  sel.addEventListener('wheel', (e) => {
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

function setTheme(theme) {
  state.theme = theme;
  document.body.classList.remove('dark-theme', 'light-theme');
  document.body.classList.add(`${theme}-theme`);

  btnThemeDark?.classList.toggle('active', theme === 'dark');
  btnThemeLight?.classList.toggle('active', theme === 'light');

  saveSettings();
}

function updateLanguage(lang) {
  state.lang = lang;
  const dict = translations[lang] || translations.ja;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) el.innerHTML = dict[key];
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (dict[key]) el.placeholder = dict[key];
  });

  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (dict[key]) el.title = dict[key];
  });

  document.querySelectorAll('[data-i18n-label]').forEach(el => {
    const key = el.getAttribute('data-i18n-label');
    if (dict[key]) el.setAttribute('aria-label', dict[key]);
  });

  if (langSelect) langSelect.value = lang;
  saveSettings();

  updateCount();
}

speedSlider?.addEventListener('input', (e) => {
  const val = parseFloat(e.target.value);
  setSpeed(val);
});

speedSlider?.addEventListener('wheel', (e) => {
  e.preventDefault();
  let val = state.speed;
  const step = 0.1;
  if (e.deltaY < 0) val = Math.min(2.0, val + step);
  else val = Math.max(0.5, val - step);
  val = Math.round(val * 10) / 10;
  setSpeed(val);
}, { passive: false });

function setSpeed(val) {
  state.speed = val;
  audio.playbackRate = val;
  if (speedLbl) speedLbl.textContent = `${val.toFixed(1)}x`;
  if (speedSlider) speedSlider.value = val;
  saveSettings();
}

eqTabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const tabId = btn.dataset.tab;
    eqTabBtns.forEach(b => b.classList.toggle('active', b === btn));
    tabContents.forEach(content => {
      content.classList.toggle('active', content.id === `${tabId}TabContent`);
    });
    updateEqUI();
  });
});

btnShowEq?.addEventListener('click', (e) => {
  e.stopPropagation();
  eqOverlay.classList.toggle('active');
  btnShowEq.classList.toggle('active', eqOverlay.classList.contains('active'));
  if (eqOverlay.classList.contains('active')) {
    updateEqUI();
  }
});

document.addEventListener('click', (e) => {
  if (eqOverlay?.classList.contains('active') && !eqOverlay.contains(e.target) && e.target !== btnShowEq && !btnShowEq.contains(e.target)) {
    eqOverlay.classList.remove('active');
    btnShowEq.classList.remove('active');
  }
});

function updateEqUI() {
  if (!eqContainer) return;
  
  // Update checkbox status based on active tab
  const activeTabBtn = document.querySelector('.eq-tab-btn.active');
  const activeTab = activeTabBtn ? activeTabBtn.dataset.tab : 'eq';
  const enabled = activeTab === 'eq' ? state.eqEnabled : state.compEnabled;
  
  if (checkEq) checkEq.checked = enabled;
  const dict = translations[state.lang] || translations.ja;
  if (eqStatusText) eqStatusText.textContent = enabled ? dict.eq_on : dict.eq_off;

  // EQ Sliders
  eqSliders.forEach((slider, i) => {
    slider.value = state.eqGains[i];
    const animBar = slider.parentElement.querySelector('.eq-bar-anim');
    if (animBar) {
      const h = ((state.eqGains[i] + 12) / 24) * 140;
      animBar.style.height = `${h}px`;
    }
  });

  // Comp Sliders
  if (compThreshold) compThreshold.value = state.compSettings.threshold;
  if (compKnee) compKnee.value = state.compSettings.knee;
  if (compRatio) compRatio.value = state.compSettings.ratio;
  if (compAttack) compAttack.value = state.compSettings.attack;
  if (compRelease) compRelease.value = state.compSettings.release;
  if (compMakeup) compMakeup.value = state.compSettings.makeup;

  updateCompValuesUI();

  updateEqGains(state.eqGains, state.eqEnabled);
  updateCompSettings(state.compSettings, state.compEnabled);
}

function updateCompValuesUI() {
  if (valThreshold) valThreshold.textContent = `${state.compSettings.threshold} dB`;
  if (valKnee) valKnee.textContent = `${state.compSettings.knee} dB`;
  if (valRatio) valRatio.textContent = `${parseFloat(state.compSettings.ratio).toFixed(1)}:1`;
  if (valAttack) valAttack.textContent = `${Math.round(state.compSettings.attack * 1000)} ms`;
  if (valRelease) valRelease.textContent = `${Math.round(state.compSettings.release * 1000)} ms`;
  if (valMakeup) valMakeup.textContent = `${state.compSettings.makeup} dB`;
}

checkEq?.addEventListener('change', (e) => {
  const activeTabBtn = document.querySelector('.eq-tab-btn.active');
  const activeTab = activeTabBtn ? activeTabBtn.dataset.tab : 'eq';
  if (activeTab === 'eq') {
    state.eqEnabled = e.target.checked;
  } else {
    state.compEnabled = e.target.checked;
  }
  updateEqUI();
  saveSettings();
});

btnEqReset?.addEventListener('click', () => {
  const activeTabBtn = document.querySelector('.eq-tab-btn.active');
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

eqSliders.forEach(slider => {
  slider.addEventListener('input', (e) => {
    const idx = parseInt(e.target.dataset.index);
    state.eqGains[idx] = parseFloat(e.target.value);
    
    const animBar = e.target.parentElement.querySelector('.eq-bar-anim');
    if (animBar) {
      const h = ((state.eqGains[idx] + 12) / 24) * 140;
      animBar.style.height = `${h}px`;
    }
    
    updateEqGains(state.eqGains, state.eqEnabled);
  });
  slider.addEventListener('change', () => {
    saveSettings();
  });
});

[compThreshold, compKnee, compRatio, compAttack, compRelease, compMakeup].forEach(slider => {
  if (!slider) return;
  slider.addEventListener('input', (e) => {
    const id = e.target.id;
    const val = parseFloat(e.target.value);
    
    if (id === 'compThreshold') state.compSettings.threshold = val;
    if (id === 'compKnee') state.compSettings.knee = val;
    if (id === 'compRatio') state.compSettings.ratio = val;
    if (id === 'compAttack') state.compSettings.attack = val;
    if (id === 'compRelease') state.compSettings.release = val;
    if (id === 'compMakeup') state.compSettings.makeup = val;

    updateCompValuesUI();
    updateCompSettings(state.compSettings, state.compEnabled);
  });
  slider.addEventListener('change', () => {
    saveSettings();
  });
});

function saveSettings() {
  const settings = {
    volume: state.volume,
    shuffle: state.shuffle,
    repeat: state.repeat,
    current: state.current,
    currentTime: audio.currentTime,
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

async function loadPlaylist() {
  state.restoreSession = localStorage.getItem('af_restore_session') !== 'false';
  if (checkRestoreSession) checkRestoreSession.checked = state.restoreSession;

  if (state.restoreSession) {
    const stored = localStorage.getItem('af_playlist');
    if (stored) {
      try {
        const paths = JSON.parse(stored);
        if (paths.length) await addPaths(paths, true);
      } catch (e) { console.error('Load failed', e); }
    }
  }

  state.alwaysOnTop = localStorage.getItem('af_on_top') === 'true';
  if (checkOnTop) checkOnTop.checked = state.alwaysOnTop;
  appWindow.setAlwaysOnTop(state.alwaysOnTop);

  const settings = JSON.parse(localStorage.getItem('af_settings') || '{}');
  if (settings.volume !== undefined) {
    state.volume = settings.volume;
    audio.volume = state.muted ? 0 : state.volume;
    updateVolBarUI();
  }
  if (settings.shuffle !== undefined) {
    state.shuffle = settings.shuffle;
    shuffleBtn.classList.toggle('active', state.shuffle);
  }
  if (settings.repeat !== undefined) {
    state.repeat = settings.repeat;
    repeatBtn.classList.toggle('active', state.repeat !== 'none');
    repeatBadge.style.display = state.repeat === 'one' ? 'flex' : 'none';
  }

  if (state.restoreSession && settings.current !== undefined && state.tracks[settings.current]) {
    loadTrack(settings.current, false);
    if (settings.currentTime) {
      const restoreTime = () => {
        audio.currentTime = settings.currentTime;
        audio.removeEventListener('loadedmetadata', restoreTime);
      };
      audio.addEventListener('loadedmetadata', restoreTime);
    }
  }

  if (settings.lang) updateLanguage(settings.lang);
  else updateLanguage('ja');

  if (settings.theme) setTheme(settings.theme);
  else setTheme('dark');

  if (settings.speed) setSpeed(settings.speed);

  state.showLyrics = settings.showLyrics !== undefined ? settings.showLyrics : true;
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

  updateEqUI();

  const savedW = localStorage.getItem('af_sidebar_w');
  if (savedW) {
    document.documentElement.style.setProperty('--sidebar-w', savedW);
  }
}

function updateVolBarUI() {
  const ratio = state.volume;
  volFill.style.width = (ratio * 100) + '%';
  volThumb.style.left = (ratio * 100) + '%';
  volBar.setAttribute('aria-valuenow', Math.round(ratio * 100));
  updateVolIcon();
}

async function setupShortcuts() {
  try {
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
  await listen('tray-play-pause', () => togglePlay());
  await listen('tray-next', () => playNext());
  await listen('tray-prev', () => playPrev());
}

btnSavePlaylist?.addEventListener('click', async () => {
  const dict = translations[state.lang] || translations.ja;
  if (!state.tracks.length) { showToast(dict.toast_no_tracks); return; }
  try {
    const filePath = await saveDialog({
      title: dict.save_playlist,
      defaultPath: 'playlist.json',
      filters: [{ name: 'Audion Playlist', extensions: ['json'] }],
    });
    if (!filePath) return;

    const playlistData = state.tracks.map(t => ({
      path: t.path,
      name: t.name,
      artist: t.artist || '',
      album: t.album || ''
    }));

    const jsonStr = JSON.stringify(playlistData, null, 2);
    await invoke('save_text_file', { path: filePath, content: jsonStr });
    showToast(dict.toast_saved);
  } catch (e) {
    console.error('Save failed', e);
    showToast(dict.toast_error_generic);
  }
});

btnLoadPlaylist?.addEventListener('click', async () => {
  const dict = translations[state.lang] || translations.ja;
  try {
    const file = await openDialog({
      title: dict.load_playlist,
      multiple: false,
      filters: [{ name: 'Audion Playlist', extensions: ['json'] }],
    });
    if (!file) return;

    const content = await invoke('read_text_file', { path: file });
    const tracks = JSON.parse(content);

    if (Array.isArray(tracks)) {
      const paths = tracks.map(t => t.path).filter(p => !!p);
      if (paths.length) {
        await addPaths(paths);
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

btnOpenFiles.addEventListener('click', async () => {
  const dict = translations[state.lang] || translations.ja;
  try {
    const files = await openDialog({
      title: dict.select_music,
      multiple: true,
      filters: [{ name: dict.music, extensions: ['mp3', 'flac', 'wav', 'ogg', 'aac', 'm4a', 'opus', 'aiff', 'wma'] }],
    });
    if (!files) return;
    const paths = Array.isArray(files) ? files : [files];
    await addPaths(paths);
  } catch (e) {
    console.error(e);
    showToast(dict.toast_error_open);
  }
});

btnOpenFolder?.addEventListener('click', async () => {
  const dict = translations[state.lang] || translations.ja;
  try {
    const folder = await openDialog({
      title: dict.select_folder,
      directory: true,
      multiple: false,
    });
    if (!folder) return;
    const entries = await readDirectory(folder);
    const normalizedFolder = folder.endsWith('/') || folder.endsWith('\\') ? folder : `${folder}/`;
    const paths = entries
      .filter(e => !e.isDirectory && /\.(mp3|flac|wav|ogg|aac|m4a|opus|aiff|wma)$/i.test(e.name))
      .map(e => `${normalizedFolder}${e.name}`);
    if (paths.length) await addPaths(paths);
    else showToast(dict.toast_error_none);
  } catch (e) {
    console.error(e);
    showToast(dict.toast_error_folder);
  }
});

btnClearAll.addEventListener('click', () => {
  if (!state.tracks.length) return;
  const dict = translations[state.lang] || translations.ja;
  resetPlayer();
  state.tracks = [];
  playlist.innerHTML = '';
  updateCount();
  dropHint.classList.remove('hidden');
  player.savePlaylist();
  showToast(dict.toast_cleared);
});

async function addPaths(paths, isInitial = false) {
  let added = 0;
  let skipped = 0;
  
  const normalizePath = (p) => p.replace(/\\/g, '/');

  for (const path of paths) {
    const normPath = normalizePath(path).toLowerCase();
    if (state.tracks.some(t => normalizePath(t.path).toLowerCase() === normPath)) {
      skipped++;
      continue;
    }
    try {
      let meta;
      if (metaCache.has(path)) {
        meta = metaCache.get(path);
      } else {
        meta = await invoke('get_file_metadata', { path });
        metaCache.set(path, meta);
      }

      state.tracks.push({
        path,
        name: meta.name,
        artist: meta.artist,
        album: meta.album,
        cover: meta.cover,
        duration: meta.duration || 0,
        addedAt: Date.now()
      });

      const idx = state.tracks.length - 1;
      const filter = plSearch.value.toLowerCase();
      const track = state.tracks[idx];
      const matchesFilter = !filter || 
        track.name.toLowerCase().includes(filter) || 
        (track.artist && track.artist.toLowerCase().includes(filter));

      if (matchesFilter) {
        const row = ui.createPlaylistRow(idx, track, onPlaylistRowClick);
        playlist.appendChild(row);
      }
      added++;
    } catch (e) {
      console.warn('Failed to add', path, e);
    }
  }
  updateCount();
  if (added > 0) {
    const dict = translations[state.lang] || translations.ja;
    dropHint.classList.add('hidden');
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

async function toggleMiniMode() {
  if (!isTauri) {
    showToast("Mini Mode is only available in the desktop app.");
    return;
  }
  
  state.miniPlayer = !state.miniPlayer;
  document.body.classList.toggle('mini-view', state.miniPlayer);

  const LogicalSize = window.__TAURI__.window.LogicalSize;

  if (state.miniPlayer) {
    normalSize = await appWindow.innerSize();
    const miniSize = new LogicalSize(860, 80);
    
    await appWindow.setResizable(false);
    await appWindow.setMinSize(miniSize);
    await appWindow.setMaxSize(miniSize);
    await appWindow.setSize(miniSize);
    await appWindow.setAlwaysOnTop(true);
    
    if (tbMax) tbMax.style.display = 'none';
    btnMiniMode.classList.add('active');
  } else {
    await appWindow.setResizable(true);
    await appWindow.setMinSize(new LogicalSize(760, 520));
    await appWindow.setMaxSize(null);
    
    await appWindow.setSize(normalSize);
    await appWindow.setAlwaysOnTop(state.alwaysOnTop);
    
    if (tbMax) tbMax.style.display = 'flex';
    btnMiniMode.classList.remove('active');
  }
}
btnMiniMode?.addEventListener('click', toggleMiniMode);

function onPlaylistRowClick(e, index) {
  if (e.target.closest('.pl-del')) { removeTrack(index); return; }
  if (state.current === index) togglePlay();
  else loadTrack(index, true);
}

function removeTrack(index) {
  const wasPlaying = state.playing;
  state.tracks.splice(index, 1);
  ui.renderPlaylist(playlist, state.tracks, onPlaylistRowClick, plSearch.value);
  updateCount();
  player.buildShuffleOrder();
  player.savePlaylist();
  if (!state.tracks.length) { resetPlayer(); dropHint.classList.remove('hidden'); return; }
  if (state.current === index) {
    const next = Math.min(index, state.tracks.length - 1);
    loadTrack(next, wasPlaying);
  } else if (state.current > index) {
    state.current--;
    ui.updateActive(playlist);
  }
}

function updateCount() {
  const dict = translations[state.lang] || translations.ja;
  plCount.textContent = `${state.tracks.length}${dict.tracks_count || ' 曲'}`;
}

plSearch?.addEventListener('input', (e) => {
  ui.renderPlaylist(playlist, state.tracks, onPlaylistRowClick, e.target.value);
});

async function loadLyrics(path) {
  state.lyrics = [];
  state.currentLyricIndex = -1;
  lyricsInner.innerHTML = '';
  
  try {
    const lrc = await invoke('get_lyrics', { path });
    const lines = lrc.split('\n');
    const timeReg = /\[(\d+):(\d+\.\d+)\]/;
    
    state.lyrics = lines.map(line => {
      const match = timeReg.exec(line);
      if (match) {
        const time = parseInt(match[1]) * 60 + parseFloat(match[2]);
        const text = line.replace(timeReg, '').trim();
        return { time, text };
      }
      return null;
    }).filter(l => l && l.text);

    state.lyrics.forEach((l, i) => {
      const div = document.createElement('div');
      div.className = 'lyric-line';
      div.textContent = l.text;
      div.dataset.index = i;
      lyricsInner.appendChild(div);
    });
  } catch (e) {
    const dict = translations[state.lang] || translations.ja;
    lyricsInner.innerHTML = `<div class="lyric-line" style="opacity:0.5">${dict.no_lyrics}</div>`;
  }
}

function updateLyrics(time) {
  if (!state.lyrics.length) return;
  
  let index = -1;
  for (let i = 0; i < state.lyrics.length; i++) {
    if (time >= state.lyrics[i].time) {
      index = i;
    } else {
      break;
    }
  }

  if (index !== state.currentLyricIndex) {
    state.currentLyricIndex = index;
    const lines = lyricsInner.querySelectorAll('.lyric-line');
    lines.forEach((line, i) => {
      line.classList.toggle('active', i === index);
    });

    if (index !== -1) {
      const activeLine = lines[index];
      const offset = lyricsInner.parentElement.clientHeight / 2 - activeLine.offsetTop - activeLine.clientHeight / 2;
      lyricsInner.style.transform = `translateY(${offset}px)`;
    }
  }
}

function loadTrack(index, autoplay = false) {
  if (index < 0 || index >= state.tracks.length) return;
  state.current = index;
  const t = state.tracks[index];
  audio.src = convertFileSrc(t.path);
  audio.load();
  ui.updateTrackUI(t);
  ui.updateActive(playlist);
  vinylCenter.classList.remove('show');
  albumArt.classList.remove('spinning');
  albumArt.classList.remove('paused');
  artGlow.classList.remove('active');
  
  loadLyrics(t.path);

  if (autoplay) player.playAudio(audio, albumArt, vinylCenter, artGlow, playlist);
  else ui.updatePlayUI(false);
}

function togglePlay() {
  const dict = translations[state.lang] || translations.ja;
  if (!state.tracks.length) { showToast(dict.toast_no_tracks); return; }
  if (state.current === -1) { loadTrack(0, true); return; }
  state.playing ? player.pauseAudio(audio, albumArt, playlist) : player.playAudio(audio, albumArt, vinylCenter, artGlow, playlist);
}

function playNext() {
  if (!state.tracks.length) return;
  let next;
  if (state.shuffle) {
    const pos = state.shuffleOrder.indexOf(state.current);
    next = state.shuffleOrder[(pos + 1) % state.shuffleOrder.length];
  } else {
    next = (state.current + 1) % state.tracks.length;
  }
  loadTrack(next, true);
}

function playPrev() {
  if (!state.tracks.length) return;
  if (audio.currentTime > 3) { audio.currentTime = 0; return; }
  let prev;
  if (state.shuffle) {
    const pos = state.shuffleOrder.indexOf(state.current);
    prev = state.shuffleOrder[(pos - 1 + state.shuffleOrder.length) % state.shuffleOrder.length];
  } else {
    prev = (state.current - 1 + state.tracks.length) % state.tracks.length;
  }
  loadTrack(prev, true);
}

function resetPlayer() {
  state.current = -1;
  state.playing = false;

  audio.pause();
  audio.removeAttribute('src');
  audio.load();

  const dict = translations[state.lang] || translations.ja;
  trackTitle.textContent = dict.select_track;
  trackTitle.setAttribute('data-i18n', 'select_track');
  trackTitle.classList.remove('marquee');
  if (trackSub) {
    trackSub.textContent = dict.welcome;
    trackSub.setAttribute('data-i18n', 'welcome');
  }
  curTime.textContent = '0:00'; durTime.textContent = '0:00';
  seekFill.style.width = '0'; seekThumb.style.left = '0';
  ui.updatePlayUI(false);
  if (albumArt) {
    albumArt.classList.remove('spinning');
    albumArt.classList.remove('paused');
  }
  vinylCenter.classList.remove('show');
  artGlow.classList.remove('active');
  if (artImg) artImg.style.display = 'none';
  if (artDefault) artDefault.style.display = 'flex';
  appWindow.setProgressBar({ progress: 0 });
  
  lyricsInner.innerHTML = '';
  state.lyrics = [];
  state.currentLyricIndex = -1;

  stopVisualizer();
}

audio.addEventListener('timeupdate', () => {
  if (state.seekDrag || !audio.duration) return;
  const pct = (audio.currentTime / audio.duration) * 100;
  seekFill.style.width = pct + '%';
  seekThumb.style.left = pct + '%';
  seeker.setAttribute('aria-valuenow', Math.round(pct));
  curTime.textContent = fmt(audio.currentTime);
  appWindow.setProgressBar({ progress: pct / 100 });
  
  updateLyrics(audio.currentTime);

  if (Math.floor(audio.currentTime) % 5 === 0) saveSettings();
});

audio.addEventListener('loadedmetadata', () => { durTime.textContent = fmt(audio.duration); });

audio.addEventListener('progress', () => {
  if (audio.buffered.length && audio.duration) {
    seekBuf.style.width = ((audio.buffered.end(audio.buffered.length - 1) / audio.duration) * 100) + '%';
  }
});

audio.addEventListener('ended', () => {
  if (state.repeat === 'one') { audio.currentTime = 0; player.playAudio(audio, albumArt, vinylCenter, artGlow, playlist); }
  else if (state.repeat === 'all') { playNext(); }
  else if (state.current < state.tracks.length - 1) { playNext(); }
  else { state.playing = false; ui.updatePlayUI(false); albumArt.classList.remove('spinning'); ui.updateActive(playlist); }
});

audio.addEventListener('error', () => {
  const dict = translations[state.lang] || translations.ja;
  if (state.current !== -1 && audio.src) {
    showToast(dict.toast_error_play);
  }
});

playBtn.addEventListener('click', togglePlay);
prevBtn.addEventListener('click', playPrev);
nextBtn.addEventListener('click', playNext);

shuffleBtn.addEventListener('click', () => {
  state.shuffle = !state.shuffle;
  shuffleBtn.classList.toggle('active', state.shuffle);
  player.buildShuffleOrder();
  saveSettings();
  const dict = translations[state.lang] || translations.ja;
  showToast(state.shuffle ? dict.shuffle_on : dict.shuffle_off);
});

repeatBtn.addEventListener('click', () => {
  const next = { none: 'all', all: 'one', one: 'none' };
  state.repeat = next[state.repeat];
  repeatBtn.classList.toggle('active', state.repeat !== 'none');
  repeatBadge.style.display = state.repeat === 'one' ? 'flex' : 'none';
  const dict = translations[state.lang] || translations.ja;
  const labels = { none: dict.repeat_none, all: dict.repeat_all, one: dict.repeat_one };
  saveSettings();
  showToast(labels[state.repeat]);
});

muteBtn.addEventListener('click', () => {
  state.muted = !state.muted;
  audio.volume = state.muted ? 0 : state.volume;
  saveSettings();
  updateVolIcon();
});

let seekRAF;
function scrub(e) {
  const r = seeker.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));

  cancelAnimationFrame(seekRAF);
  seekRAF = requestAnimationFrame(() => {
    seekFill.style.width = (ratio * 100) + '%';
    seekThumb.style.left = (ratio * 100) + '%';
    if (audio.duration) {
      audio.currentTime = ratio * audio.duration;
      curTime.textContent = fmt(audio.currentTime);
    }
  });
}
seeker.addEventListener('mousedown', e => { state.seekDrag = true; scrub(e); });
document.addEventListener('mousemove', e => { if (state.seekDrag) scrub(e); });
document.addEventListener('mouseup', () => { state.seekDrag = false; saveSettings(); });

seeker.addEventListener('keydown', e => {
  if (!audio.duration) return;
  if (e.key === 'ArrowRight') audio.currentTime = Math.min(audio.duration, audio.currentTime + 5);
  if (e.key === 'ArrowLeft') audio.currentTime = Math.max(0, audio.currentTime - 5);
  saveSettings();
});

function setVol(e) {
  const r = volBar.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
  state.volume = ratio; state.muted = ratio === 0;
  audio.volume = ratio;
  volFill.style.width = (ratio * 100) + '%';
  volThumb.style.left = (ratio * 100) + '%';
  volBar.setAttribute('aria-valuenow', Math.round(ratio * 100));
  updateVolIcon();
  saveSettings();
}
volBar.addEventListener('mousedown', e => { state.volDrag = true; setVol(e); });
document.addEventListener('mousemove', e => { if (state.volDrag) setVol(e); });
document.addEventListener('mouseup', () => { state.volDrag = false; });

volBar.addEventListener('wheel', e => {
  e.preventDefault();
  let v = state.volume;
  if (e.deltaY < 0) v = Math.min(1, v + 0.05);
  else v = Math.max(0, v - 0.05);
  v = Math.round(v * 100) / 100;

  state.volume = v;
  state.muted = v === 0;
  audio.volume = v;
  updateVolBarUI();
  saveSettings();
}, { passive: false });

function updateVolIcon() {
  const v = state.muted ? 0 : state.volume;
  if (v === 0) {
    volIcon.innerHTML = `<path d="M3 6.5H1.5A.5.5 0 001 7v4a.5.5 0 00.5.5H3l4 4v-13L3 6.5z" fill="currentColor"/>
      <path d="M13 9h4M13 6.5l4 2.5-4 2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`;
  } else if (v < 0.3) {
    volIcon.innerHTML = `<path d="M3 6.5H1.5A.5.5 0 001 7v4a.5.5 0 00.5.5H3l4 4v-13L3 6.5z" fill="currentColor"/>`;
  } else if (v < 0.7) {
    volIcon.innerHTML = `<path d="M3 6.5H1.5A.5.5 0 001 7v4a.5.5 0 00.5.5H3l4 4v-13L3 6.5z" fill="currentColor"/>
      <path d="M11 6a4 4 0 010 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`;
  } else {
    volIcon.innerHTML = `<path d="M3 6.5H1.5A.5.5 0 001 7v4a.5.5 0 00.5.5H3l4 4v-13L3 6.5z" fill="currentColor"/>
      <path d="M11 6a4 4 0 010 6M13.5 3.5a8 8 0 010 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`;
  }
}

async function setupDragDrop() {
  if (isTauri && listen) {
    await listen('tauri://drag-drop', async (event) => {
      dropOverlay.classList.remove('active');
      const { paths } = event.payload;
      if (paths && paths.length) {
        const musicPaths = paths.filter(p => /\.(mp3|flac|wav|ogg|aac|m4a|opus|aiff|wma)$/i.test(p));
        if (musicPaths.length) await addPaths(musicPaths);
        else showToast(translations[state.lang].toast_error_generic);
      }
    });

    await listen('tauri://drag-enter', () => {
      dropOverlay.classList.add('active');
    });

    await listen('tauri://drag-leave', () => {
      dropOverlay.classList.remove('active');
    });
  } else {
    let dragCounter = 0;
    document.addEventListener('dragenter', e => {
      dragCounter++;
      e.preventDefault();
      dropOverlay.classList.add('active');
    });
    document.addEventListener('dragleave', e => {
      dragCounter--;
      if (dragCounter === 0) dropOverlay.classList.remove('active');
    });
    document.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });
    document.addEventListener('drop', e => {
      e.preventDefault();
      dragCounter = 0;
      dropOverlay.classList.remove('active');
      showToast("Absolute paths are only available in Tauri. Use the 'Files' button or run via 'npm run tauri dev'.", 5000);
    });
  }
}

document.addEventListener('keydown', e => {
  if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
  switch (e.key) {
    case ' ': case 'k': e.preventDefault(); togglePlay(); break;
    case 'ArrowRight':
      if (!e.target.closest('.seeker')) { e.preventDefault(); audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10); }
      break;
    case 'ArrowLeft':
      if (!e.target.closest('.seeker')) { e.preventDefault(); audio.currentTime = Math.max(0, audio.currentTime - 10); }
      break;
    case 'n': playNext(); break;
    case 'p': case 'b': playPrev(); break;
    case 'm': muteBtn.click(); break;
    case 's': shuffleBtn.click(); break;
    case 'r': repeatBtn.click(); break;
  }
});

(async () => {
  try {
    audio.volume = state.volume;
    updateVolBarUI();
    player.buildShuffleOrder();

    if (isTauri) {
      state.version = await getAppVersionSafe();
      console.log("Audion Version Initialized:", state.version);
      if (verEl) verEl.textContent = state.version;

      await setupShortcuts();
      await setupTrayListeners();
      await setupDragDrop();

      await tauriEvent.listen('file-open', async (event) => {
        handleFileOpen(event.payload);
      });

      const initialArgs = await invoke('get_initial_args');
      handleFileOpen(initialArgs);

      async function handleFileOpen(paths) {
        if (Array.isArray(paths) && paths.length > 0) {
          const filtered = paths.filter(p => !p.endsWith('.exe') && p.includes('.'));
          if (filtered.length > 0) {
            const oldLength = state.tracks.length;
            await addPaths(filtered);
            if (state.tracks.length > oldLength) {
              loadTrack(oldLength, true);
              const win = tauriWindow.getCurrentWindow();
              await win.show();
              await win.focus();
            }
          }
        }
      }
    } else {
      setupDragDrop();
    }

    initVisualizer(audio);
    await loadPlaylist();
  } catch (e) {
    console.error("Init Error:", e);
  } finally {
    if (isTauri) showApp();
  }
})();
