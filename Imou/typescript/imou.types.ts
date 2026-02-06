export interface ImouCredentials {
  appId: string;
  appSecret: string;
  apiHost: string;
}

export interface SoftApWifiItem {
  ssid: string;
  encryptionType: number;
  signal: number;
  isOpen: boolean;
  authMode: number;
}

export interface ImouModuleInterface {
  initSDK(token: string): Promise<boolean>;
  initSDKWithHost(token: string, apiHost: string | null): Promise<boolean>;
  setLogLevel(level: number): void;
  isSDKInitialized(): Promise<boolean>;
  getAppCredentials(): Promise<ImouCredentials>;
  getCurrentWifiSsid(): Promise<string>;
  connectToDeviceAp(ssid: string, password: string): Promise<boolean>;
  disconnectFromDeviceAp(): Promise<boolean>;
  getPreviousWifiSsid(): Promise<string>;
  isConnectedToSsid(targetSsid: string): Promise<boolean>;
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

export interface AccessTokenResponse {
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

export interface CreateSubAccountResponse {
  result: {
    code: string;
    msg: string;
    data?: {
      openid: string;
    };
  };
}

export interface GetOpenIdResponse {
  result: {
    code: string;
    msg: string;
    data?: {
      openid: string;
    };
  };
}

export interface SubAccountTokenResponse {
  result: {
    code: string;
    msg: string;
    data?: {
      accessToken: string;
      expireTime: number;
    };
  };
}

export interface KitTokenResponse {
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
  playToken?: string;
  productId?: string;
  channels: Array<{
    channelId: string;
    channelName: string;
  }>;
  status: string;
  brand: string;
  deviceModel: string;
}

export interface DeviceListResponse {
  result: {
    code: string;
    msg: string;
    data?: {
      deviceList: ImouDevice[];
      count: number;
    };
  };
}

export interface BindDeviceResponse {
  result: {
    code: string;
    msg: string;
    data?: {
      deviceId: string;
    };
  };
}

export interface UnbindDeviceResponse {
  result: {
    code: string;
    msg: string;
  };
}

export interface CurWifiInfo {
  linkEnable: boolean;
  ssid: string;
  intensity: number;
  sigStrength: string;
  auth: string;
}

export interface CurrentDeviceWifiResponse {
  result: {
    code: string;
    msg: string;
    data?: CurWifiInfo;
  };
}

export interface WifiInfo {
  bssid: string;
  ssid: string;
  linkStatus: string;
  intensity: number;
  auth: string;
}

export interface WifiConfig {
  enable: boolean;
  wLan: WifiInfo[];
}

export interface WifiAroundResponse {
  result: {
    code: string;
    msg: string;
    data?: WifiConfig;
  };
}

export interface ControlDeviceWifiResponse {
  result: {
    code: string;
    msg: string;
  };
}

export interface DeviceInfoBeforeBindResponse {
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
