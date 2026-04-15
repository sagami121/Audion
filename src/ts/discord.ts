import { invoke } from '@tauri-apps/api/core';
import { state } from './state.js';

let lastUpdate = 0;
let pendingUpdate: NodeJS.Timeout | null = null;
const MIN_INTERVAL = 15000; // 15 seconds recommended for stability
let lastPresenceData = '';

export async function updateDiscordRPC(): Promise<void> {
  const track = state.tracks[state.current];
  const isPlaying = state.playing;

  const presenceData = JSON.stringify({
    enabled: state.discordRPCEnabled,
    playing: isPlaying,
    trackPath: track?.path
  });

  // Reset start time if the track has changed
  const lastPath = lastPresenceData ? JSON.parse(lastPresenceData).trackPath : null;
  if (track?.path !== lastPath) {
    state.trackStartTime = 0;
  }

  // Skip if data is the same
  if (presenceData === lastPresenceData) {
    return;
  }

  const now = Date.now();
  // Ensure we don't spam updates. If multiple calls happen in 15s, only the last one will be sent.
  if (now - lastUpdate < MIN_INTERVAL) {
    if (pendingUpdate) clearTimeout(pendingUpdate);
    pendingUpdate = setTimeout(() => updateDiscordRPC(), MIN_INTERVAL - (now - lastUpdate));
    return;
  }

  if (pendingUpdate) {
    clearTimeout(pendingUpdate);
    pendingUpdate = null;
  }

  lastUpdate = now;
  lastPresenceData = presenceData;
  console.log('updateDiscordRPC: Sending update to Discord.');

  try {
    if (!state.discordRPCEnabled) {
      await invoke('clear_discord_presence');
      return;
    }

    if (!track || !isPlaying) {
      if (!isPlaying && track) {
          console.log('Showing paused state on Discord');
          await invoke('set_discord_presence', {
              details: track.name || 'Unknown Track',
              presenceState: `Paused — ${track.artist || 'Unknown Artist'}`,
              isPlaying: false
          });
      } else {
          console.log('Clearing Discord presence');
          await invoke('clear_discord_presence');
      }
      return;
    }

    // Set stable start time if it's a new track or just resumed
    if (!state.trackStartTime) {
        state.trackStartTime = Math.floor(Date.now() / 1000);
    }

    console.log('Updating Discord presence to playing:', track.name);
    await invoke('set_discord_presence', {
      details: track.name || 'Unknown Track',
      presenceState: track.artist || 'Unknown Artist',
      startTimestamp: state.trackStartTime,
      isPlaying: true
    });
  } catch (error) {
    console.error('Failed to update Discord RPC:', error);
  }
}
