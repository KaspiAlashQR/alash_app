import RNBlobUtil from 'react-native-blob-util';
import { GITHUB_CONFIG } from '../api/config';
import { getAppVersion } from '../utils/version';
import { KioskModule } from '../utils/KioskModule';

interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  assets: Array<{
    name: string;
    browser_download_url: string;
    size: number;
  }>;
}

export interface UpdateInfo {
  hasUpdate: boolean;
  latestVersion: string;
  currentVersion: string;
  downloadUrl: string;
  releaseNotes: string;
  assetSize: number;
}

export async function checkForUpdate(): Promise<UpdateInfo> {
  const { OWNER, REPO } = GITHUB_CONFIG;
  const response = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`,
    {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    },
  );

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  const release: GitHubRelease = await response.json();
  const latestVersion = release.tag_name.replace(/^v/, '');
  const currentVersion = getAppVersion();

  const apkAsset = release.assets.find(a => a.name.endsWith('.apk'));
  if (!apkAsset) {
    throw new Error('APK не найден в релизе');
  }

  return {
    hasUpdate: isNewerVersion(latestVersion, currentVersion),
    latestVersion,
    currentVersion,
    downloadUrl: apkAsset.browser_download_url,
    releaseNotes: release.body || '',
    assetSize: apkAsset.size,
  };
}

function isNewerVersion(latest: string, current: string): boolean {
  const toNum = (v: string) => v.split('.').map(n => parseInt(n, 10));
  const l = toNum(latest);
  const c = toNum(current);
  for (let i = 0; i < 3; i++) {
    const lv = l[i] ?? 0;
    const cv = c[i] ?? 0;
    if (lv !== cv) { return lv > cv; }
  }
  return false;
}

export async function downloadAndInstallApk(
  downloadUrl: string,
  onProgress?: (percent: number) => void,
): Promise<void> {
  const destPath = `${RNBlobUtil.fs.dirs.CacheDir}/update.apk`;

  const exists = await RNBlobUtil.fs.exists(destPath);
  if (exists) {
    await RNBlobUtil.fs.unlink(destPath);
  }

  await RNBlobUtil.config({ path: destPath })
    .fetch('GET', downloadUrl, { Accept: 'application/octet-stream' })
    .progress((received, total) => {
      const r = Number(received);
      const t = Number(total);
      if (onProgress && t > 0) {
        onProgress(Math.round((r / t) * 100));
      }
    });

  await KioskModule.installApk(destPath);
}
