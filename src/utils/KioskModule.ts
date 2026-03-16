import { NativeModules } from 'react-native';

export interface KioskStatus {
  lockTaskMode: boolean;
  fullscreenMode: boolean;
  homeButtonBlocked: boolean;
  backButtonBlocked: boolean;
  menuButtonBlocked: boolean;
  recentAppsBlocked: boolean;
  landscapeOrientation: boolean;
  keyguardDisabled: boolean;
  defaultLauncher: boolean;
  autoStart: boolean;
}

interface KioskModuleInterface {
  enableKioskMode(): Promise<string>;
  disableKioskMode(): Promise<string>;
  isKioskModeEnabled(): Promise<boolean>;
  getKioskStatus(): Promise<KioskStatus>;
  toggleFullScreenMode(enable: boolean): Promise<string>;
  toggleLockTaskMode(enable: boolean): Promise<string>;
  disableDeviceOwner(): Promise<string>;
  installApk(filePath: string): Promise<string>;
}

export const KioskModule: KioskModuleInterface = NativeModules.KioskModule;