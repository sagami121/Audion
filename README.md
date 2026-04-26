# Audion

<div align="center">
  <img src="img/app_icon.jpg" width="128" height="128" alt="Audion Icon">
  <br>
  <p><strong>Tauri Base Music Player</strong></p>

  ![Version](https://img.shields.io/github/v/release/sagami121/Audion?style=for-the-badge&color=blue&label=version)
  ![Platform](https://img.shields.io/badge/platform-Windows-0078D4?style=for-the-badge&logo=windows)
  ![Tauri](https://img.shields.io/badge/Built%20with-Tauri%20v2-FFB13B?style=for-the-badge&logo=tauri)
  ![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
  ![winget](https://img.shields.io/github/v/release/sagami121/Audion?style=for-the-badge&label=winget&color=2C2C2C&logo=windows&logoColor=white)
  <br>
  ![Downloads (Latest)](https://img.shields.io/github/downloads/sagami121/Audion/latest/total?style=for-the-badge&color=8A2BE2&label=latest%20downloads)
  ![Downloads (Total)](https://img.shields.io/github/downloads/sagami121/Audion/total?style=for-the-badge&color=9370DB&label=total%20downloads)
</div>

## Audionについて

Audionは、Tauri v2 + Reactで作られたWindows向けの軽量音楽プレイヤーです。

- 対応フォーマット:
  <p>
    <img src="https://img.shields.io/badge/MP3-444?style=flat-square">
    <img src="https://img.shields.io/badge/WAV-444?style=flat-square">
    <img src="https://img.shields.io/badge/FLAC-444?style=flat-square">
    <img src="https://img.shields.io/badge/M4A-444?style=flat-square">
    <img src="https://img.shields.io/badge/OGG-444?style=flat-square">
    <img src="https://img.shields.io/badge/OPUS-444?style=flat-square">
    <img src="https://img.shields.io/badge/AIFF-444?style=flat-square">
  </p>
- インストーラー配布: `.msi`, `.exe`
- ライセンス: [MIT License](LICENSE)

## Deep Link

### AudionはDeep Linkに対応しています。

### 対応リンク

- `audion://home`
- `audion://settings`
- `audion://report`


## スクリーンショット

<div align="center">
  <h3>メイン画面</h3>
  <img src="docs/1.png" width="800" alt="メイン画面" style="border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); margin-bottom: 20px;">
  <br>

  <h3>設定画面</h3>
  <img src="docs/2.png" width="400" alt="設定画面" style="border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); margin-bottom: 20px;">
  <br>

  <h3>フィードバック画面</h3>
  <img src="docs/3.png" width="400" alt="フィードバック画面" style="border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); margin-bottom: 20px;">

  <h3>イコライザー</h3>
  <img src="docs/4.png" width="400" alt="イコライザー" style="border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); margin-bottom: 20px;">

  <h3>コンプレッサー</h3>
  <img src="docs/5.png" width="400" alt="コンプレッサー" style="border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); margin-bottom: 20px;">

  <h3>リバーブ・ディレイ</h3>
  <img src="docs/6.png" width="400" alt="リバーブ・ディレイ" style="border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); margin-bottom: 20px;">

  <h3>アプリの更新通知</h3>
  <img src="docs/7.png" width="400" alt="アプリの更新通知" style="border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); margin-bottom: 20px;">
</div>

---

## セットアップ

### 前提環境

1. [Rust](https://www.rust-lang.org/ja/tools/install) をインストール
2. [Node.js](https://nodejs.org/) をインストール
3. このリポジトリをクローン

### 開発・ビルド

```bash
# 依存関係をインストール
npm install

# 開発モードで起動
npm run tauri dev

# 本番ビルド (.msi) を作成
npm run tauri build
```

---

## リリース

- 最新版: [GitHub Releases](https://github.com/sagami121/Audion/releases)
- 変更履歴: [Changelog.txt](Changelog.txt)
