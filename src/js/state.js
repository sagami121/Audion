/**
 * Global application state
 */
export const state = {
  tracks: [],
  current: -1,
  playing: false,
  shuffle: false,
  repeat: 'none', // none | all | one
  volume: 0.8,
  muted: false,
  seekDrag: false,
  volDrag: false,
  alwaysOnTop: false,
  miniPlayer: false,
  shuffleOrder: [],
  lang: 'ja',
  theme: 'dark',
  speed: 1.0,
  version: '0.0.0', // Will be updated from Tauri v2 on init
};
