import { state } from './state';
import { translations } from './translations';
import { invoke } from '@tauri-apps/api/core';

export async function loadLyrics(path: string, lyricsInner: HTMLDivElement | null): Promise<void> {
  state.lyrics = [];
  state.currentLyricIndex = -1;
  if (lyricsInner) lyricsInner.innerHTML = '';

  try {
    const lrc: string = await invoke('get_lyrics', { path });
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
    }).filter((l: any): l is { time: number; text: string } => !!(l && l.text));

    state.lyrics.forEach((l, i) => {
      const div = document.createElement('div');
      div.className = 'lyric-line';
      div.textContent = l.text;
      div.dataset.index = i.toString();
      lyricsInner?.appendChild(div);
    });
  } catch (e) {
    const dict = translations[state.lang] || translations.ja;
    if (lyricsInner) lyricsInner.innerHTML = `<div class="lyric-line" style="opacity:0.5">${dict.no_lyrics}</div>`;
  }
}

export function updateLyrics(time: number, lyricsInner: HTMLDivElement | null): void {
  if (!state.lyrics.length || !lyricsInner) return;

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
    const lines = lyricsInner.querySelectorAll('.lyric-line') as NodeListOf<HTMLElement>;
    lines.forEach((line, i) => {
      line.classList.toggle('active', i === index);
    });

    if (index !== -1 && lines[index]) {
      const activeLine = lines[index];
      if (lyricsInner.parentElement) {
        const offset = lyricsInner.parentElement.clientHeight / 2 - activeLine.offsetTop - activeLine.clientHeight / 2;
        lyricsInner.style.transform = `translateY(${offset}px)`;
      }
    }
  }
}
