import { ImouModule, IMOU_LOG_LEVEL } from './imou.config';
import { fetchAccessToken, TokenState } from './imou.api';
import {
  createSubAccount,
  getOpenIdByAccount,
  fetchSubAccountToken,
  addDevicePolicy,
  SubAccountState,
  createInitialSubAccountState,
} from './imou.subaccount';
import {
  fetchKitToken,
  fetchDeviceList,
  bindDeviceToAccount,
  unbindDeviceFromAccount,
  fetchDeviceInfoBeforeBind,
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
import type { ImouCredentials, ImouDevice, CurWifiInfo, WifiConfig, SoftApWifiItem } from './imou.types';

export { IMOU_LOG_LEVEL } from './imou.config';
export type { SoftApWifiItem, ImouDevice, CurWifiInfo, WifiConfig, WifiInfo } from './imou.types';

export class ImouSDK {
  private static instance: ImouSDK;
  private initialized = false;
  private tokenState: TokenState = {
    accessToken: null,
    tokenExpireTime: 0,
    currentDomain: null,
  };
  private subState: SubAccountState = createInitialSubAccountState();

  private constructor() {}

  getCurrentDomain(): string | null {
    return this.tokenState.currentDomain;
  }

  static getInstance(): ImouSDK {
    if (!ImouSDK.instance) {
      ImouSDK.instance = new ImouSDK();
    }
    return ImouSDK.instance;
  }

  async getAccessToken(): Promise<string> {
    const result = await fetchAccessToken(this.tokenState);
    this.tokenState = result.state;
    return result.token;
  }

  async createSubAccount(account: string): Promise<string> {
    const adminToken = await this.getAccessToken();
    const result = await createSubAccount(account, adminToken, this.tokenState.currentDomain);
    this.subState.openId = result.openId;
    this.subState.subAccountEmail = result.email;
    return result.openId;
  }

  async getOpenIdByAccount(account: string): Promise<string> {
    const adminToken = await this.getAccessToken();
    const result = await getOpenIdByAccount(account, adminToken, this.tokenState.currentDomain);
    this.subState.openId = result.openId;
    this.subState.subAccountEmail = result.email;
    return result.openId;
  }

  async getSubAccountToken(openId?: string): Promise<string> {
    const targetOpenId = openId || this.subState.openId;
    if (!targetOpenId) {
      throw new Error('OpenId is required. Call createSubAccount or getOpenIdByAccount first.');
    }

    if (this.subState.subAccessToken && this.subState.subAccessToken.length > 0) {
      console.log('[IMOU-SDK] Using cached subAccessToken');
      return this.subState.subAccessToken;
    }

    const adminToken = await this.getAccessToken();
    const result = await fetchSubAccountToken(targetOpenId, adminToken, this.tokenState.currentDomain);
    this.subState.subAccessToken = result.accessToken;
    this.subState.subTokenExpireTime = result.expireTime;
    return result.accessToken;
  }

  async loginSubAccount(account: string): Promise<string> {
    console.log('[IMOU-SDK] loginSubAccount() called - account:', account);
    let openIdObtained = false;

    try {
      await this.createSubAccount(account);
      openIdObtained = true;
    } catch (createError: any) {
      console.log('[IMOU-SDK] createSubAccount error:', createError?.message);
      if (createError?.message?.includes('OP1010') ||
          createError?.message?.includes('already exist') ||
          createError?.message?.includes('SUB1002')) {
        console.log('[IMOU-SDK] Account already exists, trying to get openId...');
      }
    }

    if (!openIdObtained) {
      try {
        await this.getOpenIdByAccount(account);
        openIdObtained = true;
      } catch (getError: any) {
        throw new Error(`Не удалось создать или найти аккаунт: ${getError?.message}`);
      }
    }

    if (!this.subState.openId) {
      throw new Error('OpenId не получен');
    }

    return await this.getSubAccountToken();
  }

  isSubAccountLoggedIn(): boolean {
    return !!(this.subState.subAccessToken && this.subState.subAccessToken.length > 0);
  }

  getSubAccountEmail(): string | null {
    return this.subState.subAccountEmail;
  }

  getStoredOpenId(): string | null {
    return this.subState.openId;
  }

  getStoredSubAccessToken(): string | null {
    return this.subState.subAccessToken;
  }

  logoutSubAccount(): void {
    console.log('[IMOU-SDK] logoutSubAccount() called');
    this.subState = createInitialSubAccountState();
  }

  async initSDK(token?: string): Promise<boolean> {
    console.log('[IMOU-SDK] initSDK() called, already initialized:', this.initialized);
    if (this.initialized) {
      return true;
    }

    const accessToken = token || await this.getAccessToken();
    let apiHost: string | null = null;

    if (this.tokenState.currentDomain) {
      const match = this.tokenState.currentDomain.match(/https?:\/\/([^:/]+)(?::(\d+))?/);
      if (match) {
        const hostname = match[1];
        const port = match[2] || '443';
        apiHost = `${hostname}:${port}`;
      }
    }

    const result = apiHost
      ? await ImouModule.initSDKWithHost(accessToken, apiHost)
      : await ImouModule.initSDK(accessToken);

    this.initialized = result;
    return result;
  }

  async initialize(): Promise<boolean> {
    console.log('[IMOU-SDK] initialize() started');
    await this.getAccessToken();
    return await this.initSDK();
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
    return this.tokenState.accessToken;
  }

  async getKitToken(deviceId: string, channelId: string = '0', type: string = '0'): Promise<{ kitToken: string; expireTime: number }> {
    const token = this.isSubAccountLoggedIn() ? this.subState.subAccessToken! : await this.getAccessToken();
    return fetchKitToken(deviceId, channelId, type, token, this.tokenState.currentDomain);
  }

  async getDeviceList(page: number = 1, pageSize: number = 10): Promise<{ devices: ImouDevice[]; total: number }> {
    const token = this.isSubAccountLoggedIn() ? this.subState.subAccessToken! : await this.getAccessToken();
    return fetchDeviceList(page, pageSize, token, this.tokenState.currentDomain);
  }

  async bindDevice(deviceSn: string, code: string): Promise<string> {
    const adminToken = await this.getAccessToken();
    const deviceId = await bindDeviceToAccount(deviceSn, code, adminToken, this.tokenState.currentDomain);

    if (this.subState.openId) {
      await this.addDevicePolicy(deviceId);
    }

    return deviceId;
  }

  async addDevicePolicy(deviceId: string): Promise<boolean> {
    if (!this.subState.openId) {
      return false;
    }
    const adminToken = await this.getAccessToken();
    return addDevicePolicy(deviceId, this.subState.openId, adminToken, this.tokenState.currentDomain);
  }

  async unbindDevice(deviceId: string): Promise<boolean> {
    const adminToken = await this.getAccessToken();
    return unbindDeviceFromAccount(deviceId, adminToken, this.tokenState.currentDomain);
  }

  async getDeviceInfoBeforeBind(deviceSn: string, deviceCode: string) {
    const accessToken = await this.getAccessToken();
    return fetchDeviceInfoBeforeBind(deviceSn, deviceCode, accessToken, this.tokenState.currentDomain);
  }

  async getCurrentDeviceWifi(deviceId: string): Promise<CurWifiInfo> {
    const accessToken = await this.getAccessToken();
    return fetchCurrentDeviceWifi(deviceId, accessToken, this.tokenState.currentDomain);
  }

  async getWifiAround(deviceId: string): Promise<WifiConfig> {
    const accessToken = await this.getAccessToken();
    return fetchWifiAround(deviceId, accessToken, this.tokenState.currentDomain);
  }

  async controlDeviceWifi(
    deviceId: string,
    ssid: string,
    bssid: string,
    password: string,
    linkEnable: boolean = true
  ): Promise<boolean> {
    const accessToken = await this.getAccessToken();
    return controlDeviceWifiConnection(deviceId, ssid, bssid, password, linkEnable, accessToken, this.tokenState.currentDomain);
  }

  getCurrentWifiSsid(): Promise<string> {
    return getCurrentWifiSsid();
  }

  connectToDeviceAp(ssid: string, password: string = ''): Promise<boolean> {
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

  getSoftApWifiList(devicePassword: string, isScDevice: boolean = true): Promise<SoftApWifiItem[]> {
    return getSoftApWifiList(devicePassword, isScDevice);
  }

  startSoftApConfig(
    ssid: string,
    password: string,
    encryptionType: number,
    devicePassword: string,
    deviceSn: string
  ): Promise<boolean> {
    return startSoftApConfig(ssid, password, encryptionType, devicePassword, deviceSn);
  }
}

export const imouSDK = ImouSDK.getInstance();

export { default as ImouCameraView, IMOU_STREAM_TYPE } from './ImouCameraView';
export type { ImouCameraViewRef } from './ImouCameraView';

export default imouSDK;
