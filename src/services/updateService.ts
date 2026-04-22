import RNBlobUtil from 'react-native-blob-util';
import { getAppVersion } from '../utils/version';
import { KioskModule } from '../utils/KioskModule';

const RELEASE_MANIFEST_URL = 'https://samarium-78.object.pscloud.io/releases/latest.json';

interface ReleaseManifest {
  version: string;
  versionCode?: number;
  apkUrl: string;
  apkKey?: string;
  fileName?: string;
  fileSize?: number;
  publishedAt?: string;
  notes?: string;
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
  const response = await fetch(RELEASE_MANIFEST_URL, {
    headers: {
      Accept: 'application/json',
      'Cache-Control': 'no-cache',
    },
  });

  if (!response.ok) {
    throw new Error(`Release manifest error: ${response.status} ${response.statusText}`);
  }

  const release: ReleaseManifest = await response.json();
  const latestVersion = release.version?.replace(/^v/, '');
  const currentVersion = getAppVersion();

  if (!latestVersion) {
    throw new Error('Версия не указана в latest.json');
  }

  if (!release.apkUrl) {
    throw new Error('URL APK не указан в latest.json');
  }

  return {
    hasUpdate: isNewerVersion(latestVersion, currentVersion),
    latestVersion,
    currentVersion,
    downloadUrl: release.apkUrl,
    releaseNotes: release.notes || '',
    assetSize: release.fileSize || 0,
  };
}

function isNewerVersion(latest: string, current: string): boolean {
  const toNum = (v: string) => v.split('.').map(n => parseInt(n, 10));
  const l = toNum(latest);
  const c = toNum(current);
  const maxLen = Math.max(l.length, c.length);

  for (let i = 0; i < maxLen; i++) {
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
