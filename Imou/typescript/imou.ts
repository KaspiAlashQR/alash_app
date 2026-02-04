import { NativeModules } from 'react-native';
import { md5 } from 'js-md5';

const IMOU_CONFIG = {
  APP_ID: 'lce44d2053bfc5420d',
  APP_SECRET: '53ba141bde8640dfa0f12cff504e6b',
  API_BASE_URL: 'https://openapi-sg.easy4ip.com',
};

interface ImouCredentials {
  appId: string;
  appSecret: string;
  apiHost: string;
}

// Soft AP WiFi item from device
export interface SoftApWifiItem {
  ssid: string;
  encryptionType: number; // encryption type code
  signal: number; // 0-100 quality
  isOpen: boolean; // true if no password needed
  authMode: number; // 0 = open
}

interface ImouModuleInterface {
  initSDK(token: string): Promise<boolean>;
  initSDKWithHost(token: string, apiHost: string | null): Promise<boolean>;
  setLogLevel(level: number): void;
  isSDKInitialized(): Promise<boolean>;
  getAppCredentials(): Promise<ImouCredentials>;
  // WiFi management for Soft AP
  getCurrentWifiSsid(): Promise<string>;
  connectToDeviceAp(ssid: string, password: string): Promise<boolean>;
  disconnectFromDeviceAp(): Promise<boolean>;
  getPreviousWifiSsid(): Promise<string>;
  isConnectedToSsid(targetSsid: string): Promise<boolean>;
  // Soft AP SDK methods (local communication with device)
  getGatewayIp(): Promise<string>;
  getSoftApWifiList(gatewayIp: string, devicePassword: string, isScDevice: boolean): Promise<SoftApWifiItem[]>;
  startSoftApConfig(
    ssid: string,
    password: string,
    encryptionType: number,
    gatewayIp: string,
    devicePassword: string,
    deviceSn: string
  ): Promise<boolean>;
}

interface AccessTokenResponse {
  result: {
    code: string;
    msg: string;
    data?: {
      accessToken: string;
      expireTime: number;
      currentDomain?: string;
    };
  };
}

interface KitTokenResponse {
  result: {
    code: string;
    msg: string;
    data?: {
      kitToken: string;
      expireTime: number;
    };
  };
}

export interface ImouDevice {
  deviceId: string;
  name: string;
  channels: Array<{
    channelId: string;
    channelName: string;
  }>;
  status: string;
  brand: string;
  deviceModel: string;
}

interface DeviceListResponse {
  result: {
    code: string;
    msg: string;
    data?: {
      deviceList: ImouDevice[];
      count: number;
    };
  };
}

interface BindDeviceResponse {
  result: {
    code: string;
    msg: string;
    data?: {
      deviceId: string;
    };
  };
}

interface UnbindDeviceResponse {
  result: {
    code: string;
    msg: string;
  };
}

// WiFi Configuration interfaces
export interface CurWifiInfo {
  linkEnable: boolean;
  ssid: string;
  intensity: number; // 0-5
  sigStrength: string; // dBm
  auth: string;
}

interface CurrentDeviceWifiResponse {
  result: {
    code: string;
    msg: string;
    data?: CurWifiInfo;
  };
}

export interface WifiInfo {
  bssid: string;
  ssid: string;
  linkStatus: string; // 0=unconnected, 1=connecting, 2=connected
  intensity: number; // 0-5
  auth: string; // OPEN, WEP, WPA/WPA2 PSK, WPA/WPA2
}

export interface WifiConfig {
  enable: boolean;
  wLan: WifiInfo[];
}

interface WifiAroundResponse {
  result: {
    code: string;
    msg: string;
    data?: WifiConfig;
  };
}

interface ControlDeviceWifiResponse {
  result: {
    code: string;
    msg: string;
  };
}

interface DeviceInfoBeforeBindResponse {
  result: {
    code: string;
    msg: string;
    data?: {
      deviceId: string;
      brand: string;
      deviceModel: string;
      ability: string;
      status: string;
    };
  };
}

const { ImouModule } = NativeModules as { ImouModule: ImouModuleInterface };

// Log levels
export const IMOU_LOG_LEVEL = {
  FATAL: 0,
  ERROR: 1,
  WARNING: 2,
  INFO: 3,
  DEBUG: 4,
} as const;

export class ImouSDK {
  private static instance: ImouSDK;
  private initialized = false;
  private accessToken: string | null = null;
  private tokenExpireTime: number = 0;
  private currentDomain: string | null = null;

  private constructor() {}

  getCurrentDomain(): string | null {
    return this.currentDomain;
  }

  static getInstance(): ImouSDK {
    if (!ImouSDK.instance) {
      ImouSDK.instance = new ImouSDK();
    }
    return ImouSDK.instance;
  }

  /**
   * Step 1: Get accessToken from Imou Open Platform
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private generateSign(timestamp: number, nonce: string): string {
    const signStr = `time:${timestamp},nonce:${nonce},appSecret:${IMOU_CONFIG.APP_SECRET}`;
    return md5(signStr);
  }

  async getAccessToken(): Promise<string> {
    console.log('[IMOU-SDK] getAccessToken() called');
    try {
      const currentTime = Math.floor(Date.now() / 1000);
      if (this.accessToken && currentTime < this.tokenExpireTime - 300) {
        console.log('[IMOU-SDK] Using cached token, expires:', new Date(this.tokenExpireTime * 1000).toISOString());
        return this.accessToken;
      }

      const timestamp = currentTime;
      const nonce = this.generateUUID();
      const sign = this.generateSign(timestamp, nonce);

      console.log('[IMOU-SDK] Requesting accessToken from:', `${IMOU_CONFIG.API_BASE_URL}/openapi/accessToken`);
      console.log('[IMOU-SDK] Request params - appId:', IMOU_CONFIG.APP_ID, 'timestamp:', timestamp);

      const response = await fetch(`${IMOU_CONFIG.API_BASE_URL}/openapi/accessToken`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          system: {
            ver: '1.0',
            appId: IMOU_CONFIG.APP_ID,
            sign: sign,
            time: timestamp,
            nonce: nonce,
          },
          params: {},
        }),
      });

      console.log('[IMOU-SDK] Response status:', response.status, response.statusText);
      const data: AccessTokenResponse = await response.json();
      console.log('[IMOU-SDK] Response data:', JSON.stringify(data, null, 2));

      if (data.result.code === '0' && data.result.data) {
        this.accessToken = data.result.data.accessToken;
        this.tokenExpireTime = data.result.data.expireTime;
        if (data.result.data.currentDomain) {
          this.currentDomain = data.result.data.currentDomain;
          console.log('[IMOU-SDK] currentDomain from API:', this.currentDomain);
        }
        console.log('[IMOU-SDK] accessToken obtained successfully, expires:', new Date(this.tokenExpireTime * 1000).toISOString());
        return this.accessToken;
      } else {
        console.error('[IMOU-SDK] accessToken request failed - code:', data.result.code, 'msg:', data.result.msg);
        throw new Error(`Failed to get accessToken: ${data.result.msg} (code: ${data.result.code})`);
      }
    } catch (error: any) {
      console.error('[IMOU-SDK] getAccessToken ERROR:', error?.message || error);
      throw error;
    }
  }

  /**
   * Step 2: Initialize SDK with accessToken
   */
  async initSDK(token?: string): Promise<boolean> {
    console.log('[IMOU-SDK] initSDK() called, already initialized:', this.initialized);
    try {
      if (this.initialized) {
        console.log('[IMOU-SDK] SDK already initialized, skipping');
        return true;
      }

      const accessToken = token || await this.getAccessToken();
      console.log('[IMOU-SDK] Calling native ImouModule.initSDK with token:', accessToken?.substring(0, 20) + '...');

      let apiHost: string | null = null;
      if (this.currentDomain) {
        const match = this.currentDomain.match(/https?:\/\/([^:/]+)(?::(\d+))?/);
        if (match) {
          const hostname = match[1];
          const port = match[2] || '443';
          apiHost = `${hostname}:${port}`;
          console.log('[IMOU-SDK] Using currentDomain as apiHost:', apiHost);
        }
      }

      const result = apiHost
        ? await ImouModule.initSDKWithHost(accessToken, apiHost)
        : await ImouModule.initSDK(accessToken);
      console.log('[IMOU-SDK] ImouModule.initSDK result:', result);
      this.initialized = result;

      if (result) {
        console.log('[IMOU-SDK] Native SDK initialized successfully');
      } else {
        console.error('[IMOU-SDK] Native SDK returned false');
      }

      return result;
    } catch (error: any) {
      console.error('[IMOU-SDK] initSDK ERROR:', error?.message || error);
      console.error('[IMOU-SDK] initSDK full error:', JSON.stringify(error, Object.getOwnPropertyNames(error || {}), 2));
      throw error;
    }
  }

  /**
   * Full initialization: get token + init SDK
   */
  async initialize(): Promise<boolean> {
    console.log('[IMOU-SDK] ====== Full initialize() started ======');
    try {
      console.log('[IMOU-SDK] Step 1/2: Getting access token...');
      await this.getAccessToken();
      console.log('[IMOU-SDK] Step 2/2: Initializing native SDK...');
      const result = await this.initSDK();
      console.log('[IMOU-SDK] ====== Full initialize() completed, result:', result, '======');
      return result;
    } catch (error: any) {
      console.error('[IMOU-SDK] ====== Full initialize() FAILED ======');
      console.error('[IMOU-SDK] Error:', error?.message || error);
      throw error;
    }
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
    return this.accessToken;
  }

  private getApiBaseUrl(): string {
    if (this.currentDomain) {
      return this.currentDomain.replace(/:443$/, '');
    }
    return IMOU_CONFIG.API_BASE_URL;
  }

  async getKitToken(deviceId: string, channelId: string = '0', type: string = '0'): Promise<{ kitToken: string; expireTime: number }> {
    console.log('[IMOU-SDK] getKitToken() called - deviceId:', deviceId, 'channelId:', channelId);
    try {
      const accessToken = await this.getAccessToken();
      const timestamp = Math.floor(Date.now() / 1000);
      const nonce = this.generateUUID();
      const sign = this.generateSign(timestamp, nonce);
      const baseUrl = this.getApiBaseUrl();

      console.log('[IMOU-SDK] Requesting kitToken from:', `${baseUrl}/openapi/getKitToken`);

      const response = await fetch(`${baseUrl}/openapi/getKitToken`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          system: {
            ver: '1.0',
            appId: IMOU_CONFIG.APP_ID,
            sign: sign,
            time: timestamp,
            nonce: nonce,
          },
          params: {
            token: accessToken,
            deviceId: deviceId,
            channelId: channelId,
            type: type,
          },
        }),
      });

      console.log('[IMOU-SDK] getKitToken response status:', response.status);
      const data: KitTokenResponse = await response.json();
      console.log('[IMOU-SDK] getKitToken response:', JSON.stringify(data, null, 2));

      if (data.result.code === '0' && data.result.data) {
        console.log('[IMOU-SDK] kitToken obtained successfully');
        return {
          kitToken: data.result.data.kitToken,
          expireTime: data.result.data.expireTime,
        };
      } else {
        console.error('[IMOU-SDK] getKitToken failed - code:', data.result.code, 'msg:', data.result.msg);
        throw new Error(`Failed to get kitToken: ${data.result.msg} (code: ${data.result.code})`);
      }
    } catch (error: any) {
      console.error('[IMOU-SDK] getKitToken ERROR:', error?.message || error);
      throw error;
    }
  }

  async getDeviceList(page: number = 1, pageSize: number = 10): Promise<{ devices: ImouDevice[]; total: number }> {
    try {
      const accessToken = await this.getAccessToken();
      const timestamp = Math.floor(Date.now() / 1000);
      const nonce = this.generateUUID();
      const sign = this.generateSign(timestamp, nonce);
      const baseUrl = this.getApiBaseUrl();

      const response = await fetch(`${baseUrl}/openapi/listDeviceDetailsByPage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          system: {
            ver: '1.0',
            appId: IMOU_CONFIG.APP_ID,
            sign: sign,
            time: timestamp,
            nonce: nonce,
          },
          params: {
            token: accessToken,
            page: String(page),
            pageSize: String(pageSize),
          },
        }),
      });

      const data: DeviceListResponse = await response.json();

      if (data.result.code === '0' && data.result.data) {
        return {
          devices: data.result.data.deviceList || [],
          total: data.result.data.count || 0,
        };
      } else {
        throw new Error(`Failed to get device list: ${data.result.msg} (code: ${data.result.code})`);
      }
    } catch (error: any) {
      throw error;
    }
  }

  async bindDevice(deviceSn: string, code: string): Promise<string> {
    try {
      const accessToken = await this.getAccessToken();
      const timestamp = Math.floor(Date.now() / 1000);
      const nonce = this.generateUUID();
      const sign = this.generateSign(timestamp, nonce);
      const baseUrl = this.getApiBaseUrl();

      const response = await fetch(`${baseUrl}/openapi/bindDevice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          system: {
            ver: '1.0',
            appId: IMOU_CONFIG.APP_ID,
            sign: sign,
            time: timestamp,
            nonce: nonce,
          },
          params: {
            token: accessToken,
            deviceId: deviceSn,
            code: code,
          },
        }),
      });

      const data: BindDeviceResponse = await response.json();

      if (data.result.code === '0') {
        return data.result.data?.deviceId || deviceSn;
      } else {
        throw new Error(`Failed to bind device: ${data.result.msg} (code: ${data.result.code})`);
      }
    } catch (error: any) {
      throw error;
    }
  }

  async unbindDevice(deviceId: string): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken();
      const timestamp = Math.floor(Date.now() / 1000);
      const nonce = this.generateUUID();
      const sign = this.generateSign(timestamp, nonce);
      const baseUrl = this.getApiBaseUrl();

      const response = await fetch(`${baseUrl}/openapi/unBindDevice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          system: {
            ver: '1.0',
            appId: IMOU_CONFIG.APP_ID,
            sign: sign,
            time: timestamp,
            nonce: nonce,
          },
          params: {
            token: accessToken,
            deviceId: deviceId,
          },
        }),
      });

      const data: UnbindDeviceResponse = await response.json();

      if (data.result.code === '0') {
        return true;
      } else {
        throw new Error(`Failed to unbind device: ${data.result.msg} (code: ${data.result.code})`);
      }
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Get device info before binding (for new devices)
   */
  async getDeviceInfoBeforeBind(deviceSn: string, deviceCode: string): Promise<{
    deviceId: string;
    brand: string;
    deviceModel: string;
    ability: string;
    status: string;
  }> {
    console.log('[IMOU-SDK] getDeviceInfoBeforeBind() - SN:', deviceSn);
    try {
      const accessToken = await this.getAccessToken();
      const timestamp = Math.floor(Date.now() / 1000);
      const nonce = this.generateUUID();
      const sign = this.generateSign(timestamp, nonce);
      const baseUrl = this.getApiBaseUrl();

      const response = await fetch(`${baseUrl}/openapi/deviceInfoBeforeBind`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          system: {
            ver: '1.0',
            appId: IMOU_CONFIG.APP_ID,
            sign: sign,
            time: timestamp,
            nonce: nonce,
          },
          params: {
            token: accessToken,
            deviceId: deviceSn,
            code: deviceCode,
          },
        }),
      });

      const data: DeviceInfoBeforeBindResponse = await response.json();
      console.log('[IMOU-SDK] deviceInfoBeforeBind response:', JSON.stringify(data, null, 2));

      if (data.result.code === '0' && data.result.data) {
        return data.result.data;
      } else {
        throw new Error(`Failed to get device info: ${data.result.msg} (code: ${data.result.code})`);
      }
    } catch (error: any) {
      console.error('[IMOU-SDK] getDeviceInfoBeforeBind ERROR:', error?.message || error);
      throw error;
    }
  }

  /**
   * Get current WiFi info of device (when device is online)
   */
  async getCurrentDeviceWifi(deviceId: string): Promise<CurWifiInfo> {
    console.log('[IMOU-SDK] getCurrentDeviceWifi() - deviceId:', deviceId);
    try {
      const accessToken = await this.getAccessToken();
      const timestamp = Math.floor(Date.now() / 1000);
      const nonce = this.generateUUID();
      const sign = this.generateSign(timestamp, nonce);
      const baseUrl = this.getApiBaseUrl();

      const response = await fetch(`${baseUrl}/openapi/currentDeviceWifi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          system: {
            ver: '1.0',
            appId: IMOU_CONFIG.APP_ID,
            sign: sign,
            time: timestamp,
            nonce: nonce,
          },
          params: {
            token: accessToken,
            deviceId: deviceId,
          },
        }),
      });

      const data: CurrentDeviceWifiResponse = await response.json();
      console.log('[IMOU-SDK] currentDeviceWifi response:', JSON.stringify(data, null, 2));

      if (data.result.code === '0' && data.result.data) {
        return data.result.data;
      } else {
        throw new Error(`Failed to get device WiFi: ${data.result.msg} (code: ${data.result.code})`);
      }
    } catch (error: any) {
      console.error('[IMOU-SDK] getCurrentDeviceWifi ERROR:', error?.message || error);
      throw error;
    }
  }

  /**
   * Get list of WiFi networks around the device
   */
  async getWifiAround(deviceId: string): Promise<WifiConfig> {
    console.log('[IMOU-SDK] getWifiAround() - deviceId:', deviceId);
    try {
      const accessToken = await this.getAccessToken();
      const timestamp = Math.floor(Date.now() / 1000);
      const nonce = this.generateUUID();
      const sign = this.generateSign(timestamp, nonce);
      const baseUrl = this.getApiBaseUrl();

      const response = await fetch(`${baseUrl}/openapi/wifiAround`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          system: {
            ver: '1.0',
            appId: IMOU_CONFIG.APP_ID,
            sign: sign,
            time: timestamp,
            nonce: nonce,
          },
          params: {
            token: accessToken,
            deviceId: deviceId,
          },
        }),
      });

      const data: WifiAroundResponse = await response.json();
      console.log('[IMOU-SDK] wifiAround response:', JSON.stringify(data, null, 2));

      if (data.result.code === '0' && data.result.data) {
        return data.result.data;
      } else {
        throw new Error(`Failed to get WiFi around: ${data.result.msg} (code: ${data.result.code})`);
      }
    } catch (error: any) {
      console.error('[IMOU-SDK] getWifiAround ERROR:', error?.message || error);
      throw error;
    }
  }

  /**
   * Control device WiFi - switch device to a different WiFi network
   */
  async controlDeviceWifi(
    deviceId: string,
    ssid: string,
    bssid: string,
    password: string,
    linkEnable: boolean = true
  ): Promise<boolean> {
    console.log('[IMOU-SDK] controlDeviceWifi() - deviceId:', deviceId, 'ssid:', ssid);
    try {
      const accessToken = await this.getAccessToken();
      const timestamp = Math.floor(Date.now() / 1000);
      const nonce = this.generateUUID();
      const sign = this.generateSign(timestamp, nonce);
      const baseUrl = this.getApiBaseUrl();

      const response = await fetch(`${baseUrl}/openapi/controlDeviceWifi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          system: {
            ver: '1.0',
            appId: IMOU_CONFIG.APP_ID,
            sign: sign,
            time: timestamp,
            nonce: nonce,
          },
          params: {
            token: accessToken,
            deviceId: deviceId,
            ssid: ssid,
            bssid: bssid,
            linkEnable: linkEnable,
            password: password,
          },
        }),
      });

      const data: ControlDeviceWifiResponse = await response.json();
      console.log('[IMOU-SDK] controlDeviceWifi response:', JSON.stringify(data, null, 2));

      if (data.result.code === '0') {
        return true;
      } else {
        throw new Error(`Failed to control device WiFi: ${data.result.msg} (code: ${data.result.code})`);
      }
    } catch (error: any) {
      console.error('[IMOU-SDK] controlDeviceWifi ERROR:', error?.message || error);
      throw error;
    }
  }

  // ============ Native WiFi Methods for Soft AP ============

  /**
   * Get current WiFi SSID that phone is connected to
   */
  async getCurrentWifiSsid(): Promise<string> {
    console.log('[IMOU-SDK] getCurrentWifiSsid()');
    return ImouModule.getCurrentWifiSsid();
  }

  /**
   * Connect phone to device's Soft AP network
   * @param ssid - Device's Soft AP SSID (e.g., "DAP-XXXXX" or "K5-XXXXX")
   * @param password - Soft AP password (usually empty for Imou devices)
   */
  async connectToDeviceAp(ssid: string, password: string = ''): Promise<boolean> {
    console.log('[IMOU-SDK] connectToDeviceAp() - ssid:', ssid);
    return ImouModule.connectToDeviceAp(ssid, password);
  }

  /**
   * Disconnect from device's Soft AP and return to previous WiFi
   */
  async disconnectFromDeviceAp(): Promise<boolean> {
    console.log('[IMOU-SDK] disconnectFromDeviceAp()');
    return ImouModule.disconnectFromDeviceAp();
  }

  /**
   * Get previously connected WiFi SSID (before connecting to Soft AP)
   */
  async getPreviousWifiSsid(): Promise<string> {
    return ImouModule.getPreviousWifiSsid();
  }

  /**
   * Check if phone is connected to a specific WiFi SSID
   */
  async isConnectedToSsid(targetSsid: string): Promise<boolean> {
    return ImouModule.isConnectedToSsid(targetSsid);
  }

  /**
   * Generate device's Soft AP SSID from serial number
   * Pattern: "DAP-" + last 6 chars of SN (or full SN depending on device)
   */
  generateDeviceApSsid(deviceSn: string): string {
    // Common patterns: DAP-XXXXXX, K5-XXXXXX, IPC-XXXXXX
    // Default to DAP- prefix with full SN
    return `DAP-${deviceSn}`;
  }

  // ============ Soft AP SDK Methods (Local Device Communication) ============

  /**
   * Get gateway IP address (device IP when connected to Soft AP)
   * Usually returns 192.168.x.1
   */
  async getGatewayIp(): Promise<string> {
    console.log('[IMOU-SDK] getGatewayIp()');
    return ImouModule.getGatewayIp();
  }

  /**
   * Get WiFi list from device via Soft AP (local SDK call)
   * This communicates directly with the device, not through cloud API
   * @param devicePassword - Device password (SC code)
   * @param isScDevice - true if device uses SC code
   */
  async getSoftApWifiList(devicePassword: string, isScDevice: boolean = true): Promise<SoftApWifiItem[]> {
    console.log('[IMOU-SDK] getSoftApWifiList()');
    try {
      const gatewayIp = await this.getGatewayIp();
      console.log('[IMOU-SDK] Gateway IP:', gatewayIp);
      return ImouModule.getSoftApWifiList(gatewayIp, devicePassword, isScDevice);
    } catch (error: any) {
      console.error('[IMOU-SDK] getSoftApWifiList ERROR:', error?.message || error);
      throw error;
    }
  }

  /**
   * Send WiFi credentials to device via Soft AP (local SDK call)
   * This configures the device to connect to the specified WiFi network
   * @param ssid - Target WiFi SSID
   * @param password - Target WiFi password
   * @param encryptionType - Encryption type code (from SoftApWifiItem)
   * @param devicePassword - Device password (SC code)
   * @param deviceSn - Device serial number
   */
  async startSoftApConfig(
    ssid: string,
    password: string,
    encryptionType: number,
    devicePassword: string,
    deviceSn: string
  ): Promise<boolean> {
    console.log('[IMOU-SDK] startSoftApConfig() - ssid:', ssid);
    try {
      const gatewayIp = await this.getGatewayIp();
      console.log('[IMOU-SDK] Gateway IP:', gatewayIp);
      return ImouModule.startSoftApConfig(
        ssid,
        password,
        encryptionType,
        gatewayIp,
        devicePassword,
        deviceSn
      );
    } catch (error: any) {
      console.error('[IMOU-SDK] startSoftApConfig ERROR:', error?.message || error);
      throw error;
    }
  }
}

export const imouSDK = ImouSDK.getInstance();

// Re-export camera view component
export { default as ImouCameraView, IMOU_STREAM_TYPE } from './ImouCameraView';
export type { ImouCameraViewRef } from './ImouCameraView';

export default imouSDK;
