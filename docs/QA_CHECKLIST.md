# Windows Manual QA Checklist

Use this checklist before publishing a release or merging a PR that touches playback, updates, window behavior, deep links, shortcuts, or installer settings.

## Install and Launch

- Install the generated `.msi` on a clean Windows user profile.
- Launch Audion from the Start menu and from the installed executable.
- Relaunch while Audion is already open and confirm the existing window receives focus.
- Confirm the app icon appears correctly in the taskbar, Start menu, and installer.

## Playback

- Open MP3, WAV, FLAC, M4A, OGG, OPUS, and AIFF files.
- Confirm play, pause, previous, next, seek, volume, mute, repeat, and shuffle work.
- Confirm metadata fallback works for files without title, artist, album, cover art, or duration.
- Confirm `.lrc` lyrics load when placed next to the audio file.

## Windows Integration

- Confirm media keys trigger play/pause, next, previous, and stop.
- Confirm taskbar thumbnail buttons trigger previous, play/pause, and next.
- Confirm tray menu items show, quit, play/pause, previous, and next work.
- Confirm `audion://home`, `audion://settings`, and `audion://report` open the expected views.

## Settings

- Change appearance, audio effects, hardware acceleration, and other settings.
- Restart Audion and confirm settings persist.
- Disable hardware acceleration, restart, and confirm the app still launches.

## Updates

- Check for updates manually from settings.
- Confirm release notes open and close correctly.
- Confirm update install is blocked if the installer has no SHA-256 checksum.
- Confirm update install is blocked if the downloaded installer hash does not match.
- Confirm update install proceeds when the checksum matches.

## Release Smoke Test

- Run `npm run lint`.
- Run `npm run format:check`.
- Run `npm run build`.
- Run `cargo check --manifest-path src-tauri/Cargo.toml --locked`.
