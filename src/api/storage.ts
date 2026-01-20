import { DeviceInfo, StoredDeviceData } from '../api/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  DEVICE_DATA: 'device_data',
  FIRST_LAUNCH: 'first_launch',
  SETUP_COMPLETE: 'setup_complete',
} as const;

export class DeviceStorageService {
  async isFirstLaunch(): Promise<boolean> {
    try {
      const firstLaunch = await AsyncStorage.getItem(STORAGE_KEYS.FIRST_LAUNCH);
      return firstLaunch !== 'false';
    } catch (error) {
      console.error('Error checking first launch:', error);
      return true;
    }
  }

  async markFirstLaunchComplete(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.FIRST_LAUNCH, 'false');
    } catch (error) {
      console.error('Error marking first launch complete:', error);
    }
  }

  async saveDeviceData(deviceInfo: DeviceInfo): Promise<void> {
    try {
      const deviceData: StoredDeviceData = {
        deviceInfo,
        isFirstLaunch: false,
        setupComplete: true,
        lastSync: new Date().toISOString(),
      };
      
      await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_DATA, JSON.stringify(deviceData));
      await AsyncStorage.setItem(STORAGE_KEYS.SETUP_COMPLETE, 'true');
    } catch (error) {
      console.error('Error saving device data:', error);
      throw new Error('Не удалось сохранить данные устройства');
    }
  }

  async loadDeviceData(): Promise<StoredDeviceData | null> {
    try {
      const dataStr = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_DATA);
      return dataStr ? JSON.parse(dataStr) as StoredDeviceData : null;
    } catch (error) {
      console.error('Error loading device data:', error);
      return null;
    }
  }

  async isSetupComplete(): Promise<boolean> {
    try {
      const setupComplete = await AsyncStorage.getItem(STORAGE_KEYS.SETUP_COMPLETE);
      return setupComplete === 'true';
    } catch (error) {
      console.error('Error checking setup status:', error);
      return false;
    }
  }

  async getDeviceInfo(): Promise<DeviceInfo | null> {
    try {
      const deviceData = await this.loadDeviceData();
      return deviceData?.deviceInfo || null;
    } catch (error) {
      console.error('Error getting device info:', error);
      return null;
    }
  }

  async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing device data:', error);
      throw new Error('Не удалось очистить данные');
    }
  }

  async updateLastSync(): Promise<void> {
    try {
      const deviceData = await this.loadDeviceData();
      if (deviceData) {
        deviceData.lastSync = new Date().toISOString();
        await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_DATA, JSON.stringify(deviceData));
      }
    } catch (error) {
      console.error('Error updating last sync:', error);
    }
  }

  async getDeviceToken(): Promise<string | null> {
    const deviceInfo = await this.getDeviceInfo();
    return deviceInfo?.pwd || null;
  }
}

export const deviceStorage = new DeviceStorageService();

export async function getDeviceToken(): Promise<string | null> {
  return deviceStorage.getDeviceToken();
}