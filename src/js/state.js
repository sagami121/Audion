const saved = JSON.parse(localStorage.getItem('af_settings') || '{}');

export const state = {
  tracks: [],
  current: -1,
  playing: false,
  shuffle: saved.shuffle || false,
  repeat: saved.repeat || 'none',
  volume: saved.volume !== undefined ? saved.volume : 0.8,
  muted: saved.muted || false,
  seekDrag: false,
  volDrag: false,
  alwaysOnTop: localStorage.getItem('af_on_top') === 'true',
  miniPlayer: false,
  shuffleOrder: [],
  lang: saved.lang || 'ja',
  theme: saved.theme || 'dark',
  speed: saved.speed || 1.0,
  version: '0.0.0',
  lyrics: [],
  currentLyricIndex: -1,
  eqEnabled: false,
  eqGains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 10-band EQ
  compEnabled: false,
  compSettings: {
    threshold: -24,
    knee: 30,
    ratio: 12,
    attack: 0.003,
    release: 0.25,
    makeup: 0
  },
  restoreSession: true,
  sidebarWidth: 270,
  showLyrics: false,
  eqPresets: {
    bass: [6, 5, 3, 1, 0, -1, -2, -3, -4, -5],
    reggae: [3, 2, 1, 0, 0, -1, -2, -3, -3, -2],
    pop: [-2, -1, 0, 2, 4, 3, 1, -1, -2, -3],
    techno: [5, 4, 2, 0, -2, 0, 3, 5, 4, 2],
    live: [3, 2, 1, 0, 0, 1, 3, 4, 4, 3],
    rock: [4, 3, 1, -1, -2, 0, 2, 4, 5, 5],
    jazz: [2, 1, 0, -1, -2, -1, 1, 3, 3, 2],
    classical: [1, 2, 1, 0, -1, 0, 2, 3, 3, 1]
  }
};