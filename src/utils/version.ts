import { Platform } from 'react-native';
import packageJson from '../../package.json';

export function getAppVersion(): string {
  // Для Android/iOS можно расширить, если потребуется
  return packageJson.version;
}
