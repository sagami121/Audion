export interface Track {
  path: string;
  name: string;
  artist: string;
  album: string;
  cover: string;
  duration: number;
  addedAt: number;
  playCount: number;
  favorite?: boolean;
}

export interface CompSettings {
  threshold: number;
  knee: number;
  ratio: number;
  attack: number;
  release: number;
  makeup: number;
}

export interface LyricLine {
  time: number;
  text: string;
}

export interface AppState {
  tracks: Track[];
  current: number;
  playing: boolean;
  shuffle: boolean;
  repeat: 'none' | 'all' | 'one';
  volume: number;
  muted: boolean;
  seekDrag: boolean;
  volDrag: boolean;
  alwaysOnTop: boolean;
  miniPlayer: boolean;
  shuffleOrder: number[];
  lang: 'ja' | 'en' | 'ko' | 'zh';
  theme: 'dark' | 'light';
  speed: number;
  version: string;
  lyrics: LyricLine[];
  currentLyricIndex: number;
  eqEnabled: boolean;
  eqGains: number[];
  compEnabled: boolean;
  compSettings: CompSettings;
  restoreSession: boolean;
  sidebarWidth: number;
  showLyrics: boolean;
  eqPresets: Record<string, number[]>;
  plView: 'all' | 'recent' | 'popular' | 'favorites';
  reverbEnabled: boolean;
  reverbLevel: number;
  reverbType: 'room' | 'hall' | 'cave';
  delayEnabled: boolean;
  delayLevel: number;
  delayTime: number;
  delayFeedback: number;
  discordRPCEnabled: boolean;
  trackStartTime: number;
}
