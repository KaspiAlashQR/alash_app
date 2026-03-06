import { ImouModule, IMOU_LOG_LEVEL } from './imou.config';
import { addDevicePolicy } from './imou.subaccount';
import {
  fetchDeviceList,
  bindDeviceToAccount,
  unbindDeviceFromAccount,
  fetchDeviceInfoBeforeBind,
  fetchFrameReverseStatus,
  modifyFrameReverseStatus,
} from './imou.devices';
import {
  fetchCurrentDeviceWifi,
  fetchWifiAround,
  controlDeviceWifiConnection,
  getCurrentWifiSsid,
  connectToDeviceAp,
  disconnectFromDeviceAp,
  getPreviousWifiSsid,
  isConnectedToSsid,
  generateDeviceApSsid,
  getGatewayIp,
  getSoftApWifiList,
  startSoftApConfig,
} from './imou.wifi';
import { imouTokenService } from './imou.token-service';
import type { ImouCredentials, ImouDevice, CurWifiInfo, WifiConfig, SoftApWifiItem, FrameDirection } from './imou.types';

export { IMOU_LOG_LEVEL } from './imou.config';
export type { SoftApWifiItem, ImouDevice, CurWifiInfo, WifiConfig, WifiInfo, FrameDirection } from './imou.types';

export class ImouSDK {
  private static instance: ImouSDK;

  private constructor() {}

  static getInstance(): ImouSDK {
    if (!ImouSDK.instance) {
      ImouSDK.instance = new ImouSDK();
    }
    return ImouSDK.instance;
  }

  getCurrentDomain(): string | null {
    return imouTokenService.getCurrentDomain();
  }

  async getAccessToken(): Promise<string> {
    return imouTokenService.getAdminToken();
  }

  async createSubAccount(account: string): Promise<string> {
    await imouTokenService.getSubToken(account);
    return imouTokenService.getStoredOpenId() ?? '';
  }

  async getOpenIdByAccount(account: string): Promise<string> {
    await imouTokenService.getSubToken(account);
    return imouTokenService.getStoredOpenId() ?? '';
  }

  async getSubAccountToken(openId?: string): Promise<string> {
    return imouTokenService.getSubToken();
  }

  async loginSubAccount(account: string): Promise<string> {
    return imouTokenService.getSubToken(account);
  }

  isSubAccountLoggedIn(): boolean {
    return imouTokenService.isSubAccountReady();
  }

  getSubAccountEmail(): string | null {
    return imouTokenService.getSubAccountEmail();
  }

  getStoredOpenId(): string | null {
    return imouTokenService.getStoredOpenId();
  }

  getStoredSubAccessToken(): string | null {
    return imouTokenService.getStoredSubAccessToken();
  }

  logoutSubAccount(): void {
    imouTokenService.invalidateSubToken();
  }

  async initSDK(token?: string): Promise<boolean> {
    await imouTokenService.ensureSDKInitialized();
    return true;
  }

  async initialize(): Promise<boolean> {
    await imouTokenService.ensureSDKInitialized();
    return true;
  }

  setLogLevel(level: number): void {
    ImouModule.setLogLevel(level);
  }

  async isInitialized(): Promise<boolean> {
    return ImouModule.isSDKInitialized();
  }

  async getCredentials(): Promise<ImouCredentials> {
    return ImouModule.getAppCredentials();
  }

  getStoredAccessToken(): string | null {
    return imouTokenService.getStoredAdminToken();
  }

  async getKitToken(
    deviceId: string,
    channelId = '0',
    type = '0',
  ): Promise<{ kitToken: string; expireTime: number }> {
    return imouTokenService.getKitToken(deviceId, channelId, type);
  }

  async getDeviceList(page = 1, pageSize = 10): Promise<{ devices: ImouDevice[]; total: number }> {
    const token = await imouTokenService.getSubToken().catch(() => imouTokenService.getAdminToken());
    return fetchDeviceList(page, pageSize, token, imouTokenService.getCurrentDomain());
  }

  async bindDevice(deviceSn: string, code: string): Promise<string> {
    const adminToken = await imouTokenService.getAdminToken();
    const deviceId = await bindDeviceToAccount(deviceSn, code, adminToken, imouTokenService.getCurrentDomain());
    const openId = imouTokenService.getStoredOpenId();
    if (openId) {
      await addDevicePolicy(deviceId, openId, adminToken, imouTokenService.getCurrentDomain());
    }
    return deviceId;
  }

  async addDevicePolicy(deviceId: string): Promise<boolean> {
    const openId = imouTokenService.getStoredOpenId();
    if (!openId) return false;
    const adminToken = await imouTokenService.getAdminToken();
    return addDevicePolicy(deviceId, openId, adminToken, imouTokenService.getCurrentDomain());
  }

  async unbindDevice(deviceId: string): Promise<boolean> {
    const adminToken = await imouTokenService.getAdminToken();
    return unbindDeviceFromAccount(deviceId, adminToken, imouTokenService.getCurrentDomain());
  }

  async getDeviceInfoBeforeBind(deviceSn: string, deviceCode: string) {
    const accessToken = await imouTokenService.getAdminToken();
    return fetchDeviceInfoBeforeBind(deviceSn, deviceCode, accessToken, imouTokenService.getCurrentDomain());
  }

  async getCurrentDeviceWifi(deviceId: string): Promise<CurWifiInfo> {
    const accessToken = await imouTokenService.getAdminToken();
    return fetchCurrentDeviceWifi(deviceId, accessToken, imouTokenService.getCurrentDomain());
  }

  async getWifiAround(deviceId: string): Promise<WifiConfig> {
    const accessToken = await imouTokenService.getAdminToken();
    return fetchWifiAround(deviceId, accessToken, imouTokenService.getCurrentDomain());
  }

  async controlDeviceWifi(
    deviceId: string,
    ssid: string,
    bssid: string,
    password: string,
    linkEnable = true,
  ): Promise<boolean> {
    const accessToken = await imouTokenService.getAdminToken();
    return controlDeviceWifiConnection(deviceId, ssid, bssid, password, linkEnable, accessToken, imouTokenService.getCurrentDomain());
  }

  getCurrentWifiSsid(): Promise<string> {
    return getCurrentWifiSsid();
  }

  connectToDeviceAp(ssid: string, password = ''): Promise<boolean> {
    return connectToDeviceAp(ssid, password);
  }

  disconnectFromDeviceAp(): Promise<boolean> {
    return disconnectFromDeviceAp();
  }

  getPreviousWifiSsid(): Promise<string> {
    return getPreviousWifiSsid();
  }

  isConnectedToSsid(targetSsid: string): Promise<boolean> {
    return isConnectedToSsid(targetSsid);
  }

  generateDeviceApSsid(deviceSn: string): string {
    return generateDeviceApSsid(deviceSn);
  }

  getGatewayIp(): Promise<string> {
    return getGatewayIp();
  }

  getSoftApWifiList(devicePassword: string, isScDevice = true): Promise<SoftApWifiItem[]> {
    return getSoftApWifiList(devicePassword, isScDevice);
  }

  startSoftApConfig(
    ssid: string,
    password: string,
    encryptionType: number,
    devicePassword: string,
    deviceSn: string,
  ): Promise<boolean> {
    return startSoftApConfig(ssid, password, encryptionType, devicePassword, deviceSn);
  }

  async getFrameReverseStatus(deviceId: string, channelId = '0'): Promise<FrameDirection> {
    const token = await imouTokenService.getAdminToken();
    return fetchFrameReverseStatus(deviceId, channelId, token, imouTokenService.getCurrentDomain());
  }

  async setFrameReverse(deviceId: string, direction: FrameDirection, channelId = '0'): Promise<void> {
    const token = await imouTokenService.getAdminToken();
    return modifyFrameReverseStatus(deviceId, channelId, direction, token, imouTokenService.getCurrentDomain());
  }

  async toggleFrameReverse(deviceId: string, channelId = '0'): Promise<FrameDirection> {
    const current = await this.getFrameReverseStatus(deviceId, channelId);
    const newDirection: FrameDirection = current === 'normal' ? 'reverse' : 'normal';
    await this.setFrameReverse(deviceId, newDirection, channelId);
    return newDirection;
  }
}

export const imouSDK = ImouSDK.getInstance();

export { default as ImouCameraView, IMOU_STREAM_TYPE } from './ImouCameraView';
export type { ImouCameraViewRef } from './ImouCameraView';

export default imouSDK;
