import { state } from './state';
import { translations } from './translations';
import { invoke } from '@tauri-apps/api/core';

let lyricsLoadId = 0;
const lyricStateClasses = ['active', 'near', 'distant', 'past', 'future'];

function parseTime(minutes: string, seconds: string): number {
  return parseInt(minutes, 10) * 60 + parseFloat(seconds);
}

export async function loadLyrics(path: string, lyricsInner: HTMLDivElement | null): Promise<void> {
  const loadId = ++lyricsLoadId;
  state.lyrics = [];
  state.currentLyricIndex = -1;
  if (lyricsInner) {
    lyricsInner.innerHTML = '';
    lyricsInner.style.transform = '';
    lyricsInner.classList.remove('empty');
  }

  try {
    const lrc: string = await invoke('get_lyrics', { path });
    if (loadId !== lyricsLoadId) return;

    const lines = lrc.split('\n');
    const timeReg = /\[(\d+):(\d+(?:\.\d+)?)\]/g;

    state.lyrics = lines
      .flatMap((line, lineIndex) => {
        const matches = [...line.matchAll(timeReg)];
        if (!matches.length) return [];

        const entries: { time: number; text: string; lineIndex: number; tagIndex: number }[] = [];
        const pendingTimes: { time: number; tagIndex: number }[] = [];

        matches.forEach((match, tagIndex) => {
          const matchIndex = match.index ?? 0;
          const nextMatchIndex = matches[tagIndex + 1]?.index ?? line.length;
          const textStart = matchIndex + match[0].length;
          const text = line.slice(textStart, nextMatchIndex).trim();

          pendingTimes.push({
            time: parseTime(match[1], match[2]),
            tagIndex
          });

          if (!text) return;

          pendingTimes.splice(0).forEach((pending) => {
            entries.push({
              time: pending.time,
              text,
              lineIndex,
              tagIndex: pending.tagIndex
            });
          });
        });

        return entries;
      })
      .sort((a, b) => {
        if (a.time === b.time) {
          if (a.lineIndex === b.lineIndex) return a.tagIndex - b.tagIndex;
          return a.lineIndex - b.lineIndex;
        }
        return a.time - b.time;
      })
      .map(({ time, text }) => ({ time, text }));

    state.lyrics.forEach((l, i) => {
      const div = document.createElement('div');
      div.className = 'lyric-line';
      div.textContent = l.text;
      div.dataset.index = i.toString();
      lyricsInner?.appendChild(div);
    });
  } catch (e) {
    if (loadId !== lyricsLoadId) return;

    const dict = translations[state.lang] || translations.ja;
    if (lyricsInner) {
      lyricsInner.classList.add('empty');
      const div = document.createElement('div');
      div.className = 'lyric-line lyric-empty';
      div.textContent = dict.no_lyrics;
      lyricsInner.appendChild(div);
    }
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
      line.classList.remove(...lyricStateClasses);

      if (index === -1) {
        line.classList.add('future');
        return;
      }

      const distance = Math.abs(i - index);
      if (distance === 0) {
        line.classList.add('active');
      } else if (distance <= 2) {
        line.classList.add('near', i < index ? 'past' : 'future');
      } else {
        line.classList.add('distant', i < index ? 'past' : 'future');
      }
    });

    if (index !== -1 && lines[index]) {
      const activeLine = lines[index];
      if (lyricsInner.parentElement) {
        const offset =
          lyricsInner.parentElement.clientHeight / 2 -
          lyricsInner.offsetTop -
          activeLine.offsetTop -
          activeLine.clientHeight / 2;
        lyricsInner.style.transform = `translateY(${offset}px)`;
      }
    }
  }
}
