import { NativeModules } from 'react-native';

interface KioskModuleInterface {
  enableKioskMode(): Promise<string>;
  disableKioskMode(): Promise<string>;
  isKioskModeEnabled(): Promise<boolean>;
}

export const KioskModule: KioskModuleInterface = NativeModules.KioskModule;