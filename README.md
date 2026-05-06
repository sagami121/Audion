# Audion

<div align="center">
  <img src="img/app_icon.jpg" width="128" height="128" alt="Audion Icon">
  <br>
  <p><strong>Tauri-based Music Player</strong></p>

![Version](https://img.shields.io/github/v/release/sagami121/Audion?style=for-the-badge&color=blue&label=version)
![Platform](https://img.shields.io/badge/platform-Windows-0078D4?style=for-the-badge&logo=windows)
![Tauri](https://img.shields.io/badge/Built%20with-Tauri%20v2-FFB13B?style=for-the-badge&logo=tauri)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![winget](https://img.shields.io/github/v/release/sagami121/Audion?style=for-the-badge&label=winget&color=2C2C2C&logo=windows&logoColor=white)
<br>
![Downloads (Latest)](https://img.shields.io/github/downloads/sagami121/Audion/latest/total?style=for-the-badge&color=8A2BE2&label=latest%20downloads)
![Downloads (Total)](https://img.shields.io/github/downloads/sagami121/Audion/total?style=for-the-badge&color=9370DB&label=total%20downloads)

</div>

[日本語版のREADMEはこちら](README_ja.md)

## About Audion

Audion is a lightweight music player for Windows built with Tauri v2 and React.

- Supported formats
  <p>
    <img src="https://img.shields.io/badge/MP3-444?style=flat-square">
    <img src="https://img.shields.io/badge/WAV-444?style=flat-square">
    <img src="https://img.shields.io/badge/FLAC-444?style=flat-square">
    <img src="https://img.shields.io/badge/M4A-444?style=flat-square">
    <img src="https://img.shields.io/badge/OGG-444?style=flat-square">
    <img src="https://img.shields.io/badge/OPUS-444?style=flat-square">
    <img src="https://img.shields.io/badge/AIFF-444?style=flat-square">
  </p>
- Installer distribution: `.exe`
- License: [MIT License](LICENSE)

## Features

- Add songs from individual files or entire folders
- Drag and drop music files directly into the playlist
- Search by title or artist
- Switch playlist views between all tracks, recently added tracks, popular tracks, and favorites
- Save and load playlists
- Adjust playback speed, shuffle, repeat, and volume
- Show lyrics when available
- Use audio effects such as equalizer, compressor, reverb, and delay
- Customize the theme, language, UI opacity, and playlist position
- Check for updates from the app
- Show the currently playing track on Discord

## Deep Link

### Audion supports deep links.

### Supported Links

- `audion://home`
- `audion://settings`
- `audion://settings/general`
- `audion://settings/appearance`
- `audion://settings/other`
- `audion://settings/version`
- `audion://report`

## Screenshots

<div align="center">
  <h3>Main Screen</h3>
  <img src="docs/en/1.png" width="800" alt="Main Screen" style="border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); margin-bottom: 20px;">
  <br>

  <h3>Settings Screen</h3>
  <img src="docs/en/2.png" width="400" alt="Settings Screen" style="border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); margin-bottom: 20px;">
  <br>

  <h3>Feedback Screen</h3>
  <img src="docs/en/3.png" width="400" alt="Feedback Screen" style="border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); margin-bottom: 20px;">

  <h3>Equalizer</h3>
  <img src="docs/en/4.png" width="400" alt="Equalizer" style="border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); margin-bottom: 20px;">

  <h3>Compressor</h3>
  <img src="docs/en/5.png" width="400" alt="Compressor" style="border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); margin-bottom: 20px;">

  <h3>Reverb and Delay</h3>
  <img src="docs/en/6.png" width="400" alt="Reverb and Delay" style="border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); margin-bottom: 20px;">

  <h3>App Update Notification</h3>
  <img src="docs/en/7.png" width="400" alt="App Update Notification" style="border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); margin-bottom: 20px;">
</div>

---

## Setup

1. Install [Rust](https://www.rust-lang.org/tools/install)
2. Install [Node.js](https://nodejs.org/)
3. Clone this repository

### Development and Build

```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Create a production build (.exe)
npm run tauri build
```

---

## Release

- Latest version: [GitHub Releases](https://github.com/sagami121/Audion/releases)
- Changelog: [Changelog.txt](Changelog.txt)
