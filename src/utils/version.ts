import { NativeModules } from 'react-native';
import packageJson from '../../package.json';

// Prefer native BuildConfig.VERSION_NAME — always matches the installed APK.
// Falls back to package.json if native constant is unavailable (e.g. iOS / tests).
export function getAppVersion(): string {
  const nativeVersion: string | undefined = NativeModules.KioskModule?.versionName;
  if (nativeVersion && nativeVersion.length > 0) {
    return nativeVersion;
  }
  return packageJson.version;
}

export function getInstalledAppVersion() {
  const native = NativeModules.KioskModule;
  return {
    app_version: native?.versionName || null,
    app_version_code: Number.isInteger(native?.versionCode) ? native.versionCode : null,
  };
}
