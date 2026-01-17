import { Platform } from 'react-native';
import packageJson from '../../package.json';

export function getAppVersion(): string {
  return packageJson.version;
}
