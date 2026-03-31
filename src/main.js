/**
 * Audion — Tauri Desktop Music Player
 * Main Entry: Events and DOM Glue
 */
import { state } from './js/state.js';
import { fmt, esc, showToast } from './js/utils.js';
import * as player from './js/player.js';
import * as ui from './js/ui.js';

const { invoke, convertFileSrc } = window.__TAURI__.core;
const { open: dialogOpen } = window.__TAURI__.dialog;
const { getCurrentWindow } = window.__TAURI__.window;
const { register: registerShortcut, unregisterAll } = window.__TAURI__.globalShortcut;

const appWindow = getCurrentWindow();

// ─── Cache ────────────────────────────────────────────────────────────────────
const metaCache = new Map();

// ─── DOM ──────────────────────────────────────────────────────────────────────
const audio       = document.getElementById('audio');
const playBtn     = document.getElementById('playBtn');
const prevBtn     = document.getElementById('prevBtn');
const nextBtn     = document.getElementById('nextBtn');
const shuffleBtn  = document.getElementById('shuffleBtn');
const repeatBtn   = document.getElementById('repeatBtn');
const repeatBadge = document.getElementById('repeatBadge');
const muteBtn     = document.getElementById('muteBtn');
const volIcon     = document.getElementById('volIcon');
const seeker      = document.getElementById('seeker');
const seekFill    = document.getElementById('seekFill');
const seekBuf     = document.getElementById('seekBuf');
const seekThumb   = document.getElementById('seekThumb');
const curTime     = document.getElementById('curTime');
const durTime     = document.getElementById('durTime');
const volBar      = document.getElementById('volBar');
const volFill     = document.getElementById('volFill');
const volThumb    = document.getElementById('volThumb');
const trackTitle  = document.getElementById('trackTitle');
const albumArt    = document.getElementById('albumArt');
const artGlow     = document.getElementById('artGlow');
const vinylCenter = document.getElementById('vinylCenter');
const playlist    = document.getElementById('playlist');
const plCount     = document.getElementById('playlistCount');
const btnOpenFiles= document.getElementById('btnOpenFiles');
const btnOpenFolder=document.getElementById('btnOpenFolder');
const btnClearAll = document.getElementById('btnClearAll');
const btnSavePlaylist = document.getElementById('btnSavePlaylist');
const btnLoadPlaylist = document.getElementById('btnLoadPlaylist');
const btnMiniMode = document.getElementById('btnMiniMode');
const dropHint    = document.getElementById('dropHint');
const dropOverlay = document.getElementById('dropOverlay');
const plSearch    = document.getElementById('plSearch');
const sidebarResizer = document.getElementById('sidebarResizer');

// Titlebar
const tbMin       = document.getElementById('tbMin');
const tbMax       = document.getElementById('tbMax');
const tbClose     = document.getElementById('tbClose');
// Settings
const btnSettings = document.getElementById('btnSettings');
const settingsModal = document.getElementById('settingsModal');
const btnCloseSettings = document.getElementById('btnCloseSettings');
const checkOnTop  = document.getElementById('checkOnTop');
const btnReportBug = document.getElementById('btnReportBug');
const bugModal = document.getElementById('bugModal');
const btnCloseBug = document.getElementById('btnCloseBug');
const btnSubmitBug = document.getElementById('btnSubmitBug');
const bugTitle = document.getElementById('bugTitle');
const bugDesc = document.getElementById('bugDesc');
const bugError = document.getElementById('bugError');

// ─── Titlebar Controls ────────────────────────────────────────────────────────
tbMin.addEventListener('click', () => appWindow.minimize());
tbMax.addEventListener('click', async () => {
  const maximized = await appWindow.isMaximized();
  if (maximized) appWindow.unmaximize();
  else appWindow.maximize();
});
tbClose.addEventListener('click', () => appWindow.close());

// ─── Sidebar Resizing ────────────────────────────────────────────────────────
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

// ─── Settings ─────────────────────────────────────────────────────────────────
btnSettings?.addEventListener('click', () => settingsModal.classList.add('active'));
btnCloseSettings?.addEventListener('click', () => settingsModal.classList.remove('active'));
settingsModal?.addEventListener('click', (e) => { if (e.target === settingsModal) settingsModal.classList.remove('active'); });

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

btnSubmitBug?.addEventListener('click', async () => {
  const title = bugTitle.value.trim();
  const desc = bugDesc.value.trim();

  if (!title || !desc) {
    showBugError('タイトルと詳細を入力してください');
    if (!title) bugTitle.classList.add('input-error');
    if (!desc) bugDesc.classList.add('input-error');
    if (!title) bugTitle.focus();
    else bugDesc.focus();
    return;
  }

  // 実際にはAPIなどで送信しますが、ここでは演出のみ行います
  console.log('Bug Reported:', { title, desc });
  
  btnSubmitBug.disabled = true;
  btnSubmitBug.textContent = '送信中...';
  
  setTimeout(() => {
    showToast('報告を送信しました。ありがとうございます！');
    clearBugError();
    bugTitle.value = '';
    bugDesc.value = '';
    bugModal.classList.remove('active');
    btnSubmitBug.disabled = false;
    btnSubmitBug.textContent = '送信する';
  }, 1000);
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

checkOnTop?.addEventListener('change', (e) => {
  state.alwaysOnTop = e.target.checked;
  appWindow.setAlwaysOnTop(state.alwaysOnTop);
  localStorage.setItem('af_on_top', state.alwaysOnTop);
});

// ─── Persistence ──────────────────────────────────────────────────────────────
function saveSettings() {
  const settings = {
    volume: state.volume,
    shuffle: state.shuffle,
    repeat: state.repeat,
    current: state.current,
    currentTime: audio.currentTime,
    muted: state.muted,
  };
  localStorage.setItem('af_settings', JSON.stringify(settings));
}

async function loadPlaylist() {
  const stored = localStorage.getItem('af_playlist');
  if (stored) {
    try {
      const paths = JSON.parse(stored);
      if (paths.length) await addPaths(paths, true);
    } catch (e) { console.error('Load failed', e); }
  }
  
  // Restore Settings
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
  if (settings.current !== undefined && state.tracks[settings.current]) {
    loadTrack(settings.current, false);
    if (settings.currentTime) {
      audio.currentTime = settings.currentTime;
    }
  }

  // Restore Sidebar Width
  const savedW = localStorage.getItem('af_sidebar_w');
  if (savedW) {
    document.documentElement.style.setProperty('--sidebar-w', savedW);
  }
}

function updateVolBarUI() {
  const ratio = state.volume;
  volFill.style.width  = (ratio * 100) + '%';
  volThumb.style.left  = (ratio * 100) + '%';
  volBar.setAttribute('aria-valuenow', Math.round(ratio * 100));
  updateVolIcon();
}

// ─── Global Shortcuts ────────────────────────────────────────────────────────
async function setupShortcuts() {
  try {
    await unregisterAll();
    
    // Register Play/Pause
    const playPauseKeys = ['MediaPlayPause', 'MediaPlay', 'MediaPause'];
    for (const k of playPauseKeys) {
      try {
        await registerShortcut(k, (e) => { if (e.state === 'Pressed') togglePlay(); });
      } catch {}
    }

    // Register Next
    const nextKeys = ['MediaNextTrack', 'MediaNext'];
    for (const k of nextKeys) {
      try {
        await registerShortcut(k, (e) => { if (e.state === 'Pressed') playNext(); });
      } catch {}
    }

    // Register Prev
    const prevKeys = ['MediaPrevTrack', 'MediaPrevious', 'MediaPrev'];
    for (const k of prevKeys) {
      try {
        await registerShortcut(k, (e) => { if (e.state === 'Pressed') playPrev(); });
      } catch {}
    }

    // Register Stop
    const stopKeys = ['MediaStop', 'MediaStopTrack'];
    for (const k of stopKeys) {
      try {
        await registerShortcut(k, (e) => { 
          if (e.state === 'Pressed') resetPlayer();
        });
      } catch {}
    }

  } catch (e) {
    console.error('Global shortcut setup failed', e);
  }
}

// ─── File Operations ─────────────────────────────────────────────────────────
btnSavePlaylist?.addEventListener('click', async () => {
  if (!state.tracks.length) { showToast('保存する曲がありません'); return; }
  try {
    const filePath = await window.__TAURI__.dialog.save({
      title: 'プレイリストを保存',
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
    // Use Rust command instead of JS plugin
    await invoke('save_text_file', { path: filePath, content: jsonStr });
    showToast('プレイリストを保存しました');
  } catch (e) { 
    console.error('Save failed', e);
    showToast('保存に失敗しました');
  }
});

btnLoadPlaylist?.addEventListener('click', async () => {
  try {
    const file = await dialogOpen({
      title: 'プレイリストを読み込む',
      multiple: false,
      filters: [{ name: 'Audion Playlist', extensions: ['json'] }],
    });
    if (!file) return;
    
    // Use Rust command instead of JS plugin
    const content = await invoke('read_text_file', { path: file });
    const tracks = JSON.parse(content);
    
    if (Array.isArray(tracks)) {
      const paths = tracks.map(t => t.path).filter(p => !!p);
      if (paths.length) {
        await addPaths(paths);
        showToast(`${paths.length} 曲を読み込みました`);
      }
    } else {
      throw new Error('Invalid format');
    }
  } catch (e) { 
    console.error('Load failed', e);
    showToast('読み込みに失敗しました');
  }
});

btnOpenFiles.addEventListener('click', async () => {
  try {
    const files = await dialogOpen({
      title: '音楽ファイルを選択',
      multiple: true,
      filters: [{ name: '音楽', extensions: ['mp3','flac','wav','ogg','aac','m4a','opus','wma'] }],
    });
    if (!files) return;
    const paths = Array.isArray(files) ? files : [files];
    await addPaths(paths);
  } catch (e) {
    console.error(e);
    showToast('ファイルを開けませんでした');
  }
});

btnOpenFolder?.addEventListener('click', async () => {
  try {
    const folder = await dialogOpen({
      title: 'フォルダを選択',
      directory: true,
      multiple: false,
    });
    if (!folder) return;
    const entries = await window.__TAURI__.fs.readDir(folder);
    const paths = entries
      .filter(e => !e.isDirectory && /\.(mp3|flac|wav|ogg|aac|m4a|opus|wma)$/i.test(e.name))
      .map(e => `${folder}/${e.name}`);
    if (paths.length) await addPaths(paths);
    else showToast('音楽ファイルが見つかりませんでした');
  } catch (e) {
    console.error(e);
    showToast('フォルダを開けませんでした');
  }
});

btnClearAll.addEventListener('click', () => {
  if (!state.tracks.length) return;
  resetPlayer();
  state.tracks = [];
  playlist.innerHTML = '';
  updateCount();
  dropHint.classList.remove('hidden');
  player.savePlaylist();
  showToast('プレイリストをクリアしました');
});

async function addPaths(paths, isInitial = false) {
  let added = 0;
  let skipped = 0;
  for (const path of paths) {
    if (state.tracks.some(t => t.path === path)) {
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
        duration: 0,
        addedAt: Date.now()
      });
      
      const idx = state.tracks.length - 1;
      const row = ui.createPlaylistRow(idx, state.tracks[idx], onPlaylistRowClick);
      playlist.appendChild(row);
      
      player.preloadMeta(idx, path, playlist);
      added++;
    } catch (e) {
      console.warn('Failed to add', path, e);
    }
  }
  updateCount();
  if (added > 0) {
    dropHint.classList.add('hidden');
    if (!isInitial) showToast(`${added} 曲を追加しました${skipped ? `（${skipped}曲重複スキップ）` : ''}`);
    if (state.current === -1) loadTrack(0, false);
    player.savePlaylist();
  } else if (skipped > 0 && !isInitial) {
    showToast(`${skipped} 曲すべて重複していたためスキップしました`);
  }
  player.buildShuffleOrder();
}

// ─── Mini Mode ────────────────────────────────────────────────────────────────
let normalSize = { width: 1000, height: 660 };

async function toggleMiniMode() {
  state.miniPlayer = !state.miniPlayer;
  document.body.classList.toggle('mini-view', state.miniPlayer);
  
  if (state.miniPlayer) {
    normalSize = await appWindow.innerSize();
    await appWindow.setSize(new window.__TAURI__.window.LogicalSize(360, 180));
    await appWindow.setAlwaysOnTop(true);
    btnMiniMode.classList.add('active');
  } else {
    await appWindow.setSize(normalSize);
    await appWindow.setAlwaysOnTop(state.alwaysOnTop);
    btnMiniMode.classList.remove('active');
  }
}
btnMiniMode?.addEventListener('click', toggleMiniMode);

// ─── Playlist UI ──────────────────────────────────────────────────────────────
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
  plCount.textContent = `${state.tracks.length} 曲`;
}

plSearch?.addEventListener('input', (e) => {
  ui.renderPlaylist(playlist, state.tracks, onPlaylistRowClick, e.target.value);
});

// ─── Track loading ────────────────────────────────────────────────────────────
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
  if (autoplay) player.playAudio(audio, albumArt, vinylCenter, artGlow, playlist);
  else ui.updatePlayUI(false);
}

// ─── Playback ─────────────────────────────────────────────────────────────────
function togglePlay() {
  if (!state.tracks.length) { showToast('曲を追加してください'); return; }
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
  
  // 完全なオーディオリセット
  audio.pause();
  audio.removeAttribute('src'); // srcを削除
  audio.load(); // 読み込みを中断
  
  trackTitle.textContent = '曲を選択してください';
  trackTitle.classList.remove('marquee');
  const trackSub = document.getElementById('trackSub');
  if (trackSub) trackSub.textContent = 'Audion へようこそ';
  curTime.textContent = '0:00'; durTime.textContent = '0:00';
  seekFill.style.width = '0'; seekThumb.style.left = '0';
  ui.updatePlayUI(false);
  if (albumArt) {
    albumArt.classList.remove('spinning');
    albumArt.classList.remove('paused');
  }
  vinylCenter.classList.remove('show');
  artGlow.classList.remove('active');
  const artImg = document.getElementById('artImg');
  const artDefault = document.getElementById('artDefault');
  if (artImg) artImg.style.display = 'none';
  if (artDefault) artDefault.style.display = 'flex';
  appWindow.setProgressBar({ progress: 0 });
}

// ─── Audio Events ─────────────────────────────────────────────────────────────
audio.addEventListener('timeupdate', () => {
  if (state.seekDrag || !audio.duration) return;
  const pct = (audio.currentTime / audio.duration) * 100;
  seekFill.style.width  = pct + '%';
  seekThumb.style.left  = pct + '%';
  seeker.setAttribute('aria-valuenow', Math.round(pct));
  curTime.textContent = fmt(audio.currentTime);
  appWindow.setProgressBar({ progress: pct / 100 });
  
  if (Math.floor(audio.currentTime) % 5 === 0) saveSettings();
});

audio.addEventListener('loadedmetadata', () => { durTime.textContent = fmt(audio.duration); });

audio.addEventListener('progress', () => {
  if (audio.buffered.length && audio.duration) {
    seekBuf.style.width = ((audio.buffered.end(audio.buffered.length - 1) / audio.duration) * 100) + '%';
  }
});

audio.addEventListener('ended', () => {
  if (state.repeat === 'one')       { audio.currentTime = 0; player.playAudio(audio, albumArt, vinylCenter, artGlow, playlist); }
  else if (state.repeat === 'all')  { playNext(); }
  else if (state.current < state.tracks.length - 1) { playNext(); }
  else { state.playing = false; ui.updatePlayUI(false); albumArt.classList.remove('spinning'); ui.updateActive(playlist); }
});

audio.addEventListener('error', () => { 
  if (state.current !== -1 && audio.src) {
    showToast('再生エラーが発生しました'); 
  }
});

// ─── Control Buttons ──────────────────────────────────────────────────────────
playBtn.addEventListener('click', togglePlay);
prevBtn.addEventListener('click', playPrev);
nextBtn.addEventListener('click', playNext);

shuffleBtn.addEventListener('click', () => {
  state.shuffle = !state.shuffle;
  shuffleBtn.classList.toggle('active', state.shuffle);
  player.buildShuffleOrder();
  saveSettings();
  showToast(state.shuffle ? 'シャッフル ON' : 'シャッフル OFF');
});

repeatBtn.addEventListener('click', () => {
  const next = { none: 'all', all: 'one', one: 'none' };
  state.repeat = next[state.repeat];
  repeatBtn.classList.toggle('active', state.repeat !== 'none');
  repeatBadge.style.display = state.repeat === 'one' ? 'flex' : 'none';
  const labels = { none: 'リピートなし', all: '全曲リピート', one: '1曲リピート' };
  saveSettings();
  showToast(labels[state.repeat]);
});

muteBtn.addEventListener('click', () => {
  state.muted = !state.muted;
  audio.volume = state.muted ? 0 : state.volume;
  saveSettings();
  updateVolIcon();
});

// ─── Seeker ───────────────────────────────────────────────────────────────────
let seekRAF;
function scrub(e) {
  const r = seeker.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
  
  cancelAnimationFrame(seekRAF);
  seekRAF = requestAnimationFrame(() => {
    seekFill.style.width  = (ratio * 100) + '%';
    seekThumb.style.left  = (ratio * 100) + '%';
    if (audio.duration) { 
      audio.currentTime = ratio * audio.duration; 
      curTime.textContent = fmt(audio.currentTime); 
    }
  });
}
seeker.addEventListener('mousedown',  e => { state.seekDrag = true; scrub(e); });
document.addEventListener('mousemove', e => { if (state.seekDrag) scrub(e); });
document.addEventListener('mouseup',   () => { state.seekDrag = false; saveSettings(); });

seeker.addEventListener('keydown', e => {
  if (!audio.duration) return;
  if (e.key === 'ArrowRight') audio.currentTime = Math.min(audio.duration, audio.currentTime + 5);
  if (e.key === 'ArrowLeft')  audio.currentTime = Math.max(0, audio.currentTime - 5);
  saveSettings();
});

// ─── Volume ───────────────────────────────────────────────────────────────────
function setVol(e) {
  const r = volBar.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
  state.volume = ratio; state.muted = ratio === 0;
  audio.volume = ratio;
  volFill.style.width  = (ratio * 100) + '%';
  volThumb.style.left  = (ratio * 100) + '%';
  volBar.setAttribute('aria-valuenow', Math.round(ratio * 100));
  updateVolIcon();
  saveSettings();
}
volBar.addEventListener('mousedown',  e => { state.volDrag = true; setVol(e); });
document.addEventListener('mousemove', e => { if (state.volDrag) setVol(e); });
document.addEventListener('mouseup',   () => { state.volDrag = false; });

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

// ─── Drag & Drop ──────────────────────────────────────────────────────────────
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

document.addEventListener('drop', async e => {
  e.preventDefault();
  dragCounter = 0;
  dropOverlay.classList.remove('active');
  if (!e.dataTransfer || !e.dataTransfer.files) return;
  const paths = Array.from(e.dataTransfer.files)
    .filter(f => /\.(mp3|flac|wav|ogg|aac|m4a|opus|wma)$/i.test(f.name))
    .map(f => f.path);
  if (paths.length) await addPaths(paths);
  else showToast('音楽ファイルではありません');
});

// ─── Keyboard Shortcuts ───────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (['INPUT','TEXTAREA'].includes(e.target.tagName)) return;
  switch (e.key) {
    case ' ': case 'k': e.preventDefault(); togglePlay(); break;
    case 'ArrowRight':
      if (!e.target.closest('.seeker')) { e.preventDefault(); audio.currentTime = Math.min(audio.duration||0, audio.currentTime+10); }
      break;
    case 'ArrowLeft':
      if (!e.target.closest('.seeker')) { e.preventDefault(); audio.currentTime = Math.max(0, audio.currentTime-10); }
      break;
    case 'n': playNext(); break;
    case 'p': case 'b': playPrev(); break;
    case 'm': muteBtn.click(); break;
    case 's': shuffleBtn.click(); break;
    case 'r': repeatBtn.click(); break;
  }
});

// ─── Init ─────────────────────────────────────────────────────────────────────
audio.volume = state.volume;
volFill.style.width  = '80%';
volThumb.style.left  = '80%';
player.buildShuffleOrder();
setupShortcuts();
loadPlaylist();
