import { state } from './state.js';
import { showToast } from './utils.js';
import { translations } from './translations.js';

interface ReleaseAsset {
  name: string;
  browser_download_url: string;
}

interface ReleaseInfo {
  tag_name: string;
  body: string;
  assets: ReleaseAsset[];
}

import { invoke } from '@tauri-apps/api/core';
import { exit } from '@tauri-apps/plugin-process';

export async function initUpdater(isTauri: boolean): Promise<void> {
  if (!isTauri || !invoke) return;

  const btnCheckUpdate = document.getElementById('btnCheckUpdate');
  if (btnCheckUpdate) {
    btnCheckUpdate.onclick = () => checkUpdate(true);
  }

  setTimeout(() => checkUpdate(false), 3000);
  setupModalEvents();
}

function setupModalEvents(): void {
  const releaseNotesModal = document.getElementById('releaseNotesModal');
  const btnCloseReleaseNotes = document.getElementById('btnCloseReleaseNotes');
  const btnReleaseNotesOk = document.getElementById('btnReleaseNotesOk');

  if (btnCloseReleaseNotes && releaseNotesModal) {
    btnCloseReleaseNotes.onclick = () => releaseNotesModal.classList.remove('active');
  }
  if (btnReleaseNotesOk && releaseNotesModal) {
    btnReleaseNotesOk.onclick = () => releaseNotesModal.classList.remove('active');
  }
  if (releaseNotesModal) {
    releaseNotesModal.onclick = (e) => {
      if (e.target === releaseNotesModal) releaseNotesModal.classList.remove('active');
    };
  }
}

async function checkUpdate(manual = false): Promise<void> {
  const dict = translations[state.lang] || translations.ja;
  if (manual) showToast(dict.toast_update_checking || 'Checking for updates...');

  try {
    const release = await fetchLatestRelease();
    const latestVersion = normalizeVersion(release.tag_name);
    const currentVersion = normalizeVersion(state.version);

    if (isNewerVersion(currentVersion, latestVersion)) {
      showUpdateToast(release);
    } else if (manual) {
      showToast(dict.toast_update_none || 'You are on the latest version', 3000);
    }
  } catch (error) {
    console.error('Update check error:', error);
    if (manual) {
      showToast(`更新の確認に失敗しました: ${formatUpdaterError(error)}`, 7000);
    }
  }
}

async function fetchLatestRelease(): Promise<ReleaseInfo> {
  if (!invoke) {
    throw new Error('Tauri invoke unavailable');
  }

  return invoke('fetch_latest_release_info');
}

function normalizeVersion(version: string): string {
  return String(version || '').trim().replace(/^v/i, '');
}

function isNewerVersion(current: string, latest: string): boolean {
  const currentParts = current.split('.').map(Number);
  const latestParts = latest.split('.').map(Number);

  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i += 1) {
    const currentValue = currentParts[i] || 0;
    const latestValue = latestParts[i] || 0;
    if (latestValue > currentValue) return true;
    if (latestValue < currentValue) return false;
  }

  return false;
}

function showUpdateToast(releaseInfo: ReleaseInfo): void {
  const updateToast = document.getElementById('updateToast');
  const btnUpdateNow = document.getElementById('btnUpdateNow');
  const btnUpdateLater = document.getElementById('btnUpdateLater');
  const btnUpdateInfo = document.getElementById('btnUpdateInfo');
  const releaseNotesContent = document.getElementById('releaseNotesContent');
  const releaseNotesModal = document.getElementById('releaseNotesModal');

  if (!updateToast) return;

  const dict = translations[state.lang] || translations.ja;
  const version = normalizeVersion(releaseInfo.tag_name);
  const updateTitleEl = updateToast.querySelector('.update-toast-title');
  if (updateTitleEl) {
    updateTitleEl.textContent = `${dict.update_available} (${version})`;
  }

  updateToast.classList.add('show');

  if (btnUpdateInfo) {
    btnUpdateInfo.onclick = () => {
      if (releaseNotesModal && releaseNotesContent) {
        releaseNotesContent.textContent = releaseInfo.body || 'No release notes provided.';
        releaseNotesModal.classList.add('active');
      }
    };
  }

  if (btnUpdateNow) {
    btnUpdateNow.onclick = async () => {
      updateToast.classList.remove('show');

      try {
        await downloadAndInstall(releaseInfo);
      } catch (error) {
        console.error('Auto update failed:', error);
        showToast(`アップデートのインストールに失敗しました: ${formatUpdaterError(error)}`, 7000);
      }
    };
  }

  if (btnUpdateLater) {
    btnUpdateLater.onclick = () => updateToast.classList.remove('show');
  }
}

function findInstallerAsset(releaseInfo: ReleaseInfo): ReleaseAsset | null {
  const version = normalizeVersion(releaseInfo.tag_name);
  const expectedNames = [
    `Audion_${version}_x64_ja-JP.msi`,
    `Audion_v${version}_x64_ja-JP.msi`
  ];

  return releaseInfo.assets?.find((asset) => expectedNames.includes(asset.name)) || null;
}

async function downloadAndInstall(releaseInfo: ReleaseInfo): Promise<void> {
  const dict = translations[state.lang] || translations.ja;
  const installerAsset = findInstallerAsset(releaseInfo);

  if (!installerAsset?.browser_download_url) {
    throw new Error(`MSI asset not found: Audion_${normalizeVersion(releaseInfo.tag_name)}_x64_ja-JP.msi`);
  }

  showToast(dict.toast_update_downloading || 'Downloading update...', 20000);

  if (!invoke) {
    throw new Error('Tauri invoke unavailable');
  }

  const tempPath = await invoke('download_installer', {
    assetUrl: installerAsset.browser_download_url,
    fileName: installerAsset.name
  });
  showToast('インストーラーを起動します...', 5000);

  await invoke('run_installer', { path: tempPath });

  setTimeout(async () => {
    try {
      await exit(0);
    } catch (error) {
      console.warn('App exit after installer launch failed:', error);
      window.close();
    }
  }, 1500);
}

function formatUpdaterError(error: any): string {
  const raw = String(error?.message || error || '').trim();
  const normalized = raw.toLowerCase();

  if (!raw) return '不明なエラー';
  if (normalized.includes('404')) {
    return 'GitHub Releases が見つかりません';
  }
  if (normalized.includes('rate limit')) {
    return 'GitHub の制限に達しました';
  }
  if (normalized.includes('latest release tag not found')) {
    return '最新リリースのタグを取得できません';
  }
  if (normalized.includes('msi asset not found')) {
    return '指定の MSI ファイルが Release にありません';
  }
  if (normalized.includes('download failed')) {
    return 'インストーラーのダウンロードに失敗しました';
  }
  if (normalized.includes('failed to fetch') || normalized.includes('network')) {
    return 'ネットワークに接続できません';
  }

  return raw.length > 80 ? `${raw.slice(0, 77)}...` : raw;
}
