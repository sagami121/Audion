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
};
