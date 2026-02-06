import { NativeModules } from 'react-native';
import type { ImouModuleInterface } from './imou.types';

export const IMOU_CONFIG = {
  APP_ID: 'lce44d2053bfc5420d',
  APP_SECRET: '53ba141bde8640dfa0f12cff504e6b',
  API_BASE_URL: 'https://openapi-sg.easy4ip.com',
};

export const IMOU_LOG_LEVEL = {
  FATAL: 0,
  ERROR: 1,
  WARNING: 2,
  INFO: 3,
  DEBUG: 4,
} as const;

export const { ImouModule } = NativeModules as { ImouModule: ImouModuleInterface };
