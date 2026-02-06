import { generateUUID, generateSign, getApiBaseUrl, buildRequestBody } from './imou.api';
import { ImouModule } from './imou.config';
import type {
  CurWifiInfo,
  WifiConfig,
  CurrentDeviceWifiResponse,
  WifiAroundResponse,
  ControlDeviceWifiResponse,
  SoftApWifiItem,
} from './imou.types';

export async function fetchCurrentDeviceWifi(
  deviceId: string,
  accessToken: string,
  currentDomain: string | null
): Promise<CurWifiInfo> {
  console.log('[IMOU-SDK] getCurrentDeviceWifi() - deviceId:', deviceId);

  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = generateUUID();
  const sign = generateSign(timestamp, nonce);
  const baseUrl = getApiBaseUrl(currentDomain);

  const response = await fetch(`${baseUrl}/openapi/currentDeviceWifi`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildRequestBody(timestamp, nonce, sign, {
      token: accessToken,
      deviceId,
    })),
  });

  const data: CurrentDeviceWifiResponse = await response.json();
  console.log('[IMOU-SDK] currentDeviceWifi response:', JSON.stringify(data, null, 2));

  if (data.result.code === '0' && data.result.data) {
    return data.result.data;
  }

  throw new Error(`Failed to get device WiFi: ${data.result.msg} (code: ${data.result.code})`);
}

export async function fetchWifiAround(
  deviceId: string,
  accessToken: string,
  currentDomain: string | null
): Promise<WifiConfig> {
  console.log('[IMOU-SDK] getWifiAround() - deviceId:', deviceId);

  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = generateUUID();
  const sign = generateSign(timestamp, nonce);
  const baseUrl = getApiBaseUrl(currentDomain);

  const response = await fetch(`${baseUrl}/openapi/wifiAround`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildRequestBody(timestamp, nonce, sign, {
      token: accessToken,
      deviceId,
    })),
  });

  const data: WifiAroundResponse = await response.json();
  console.log('[IMOU-SDK] wifiAround response:', JSON.stringify(data, null, 2));

  if (data.result.code === '0' && data.result.data) {
    return data.result.data;
  }

  throw new Error(`Failed to get WiFi around: ${data.result.msg} (code: ${data.result.code})`);
}

export async function controlDeviceWifiConnection(
  deviceId: string,
  ssid: string,
  bssid: string,
  password: string,
  linkEnable: boolean,
  accessToken: string,
  currentDomain: string | null
): Promise<boolean> {
  console.log('[IMOU-SDK] controlDeviceWifi() - deviceId:', deviceId, 'ssid:', ssid);

  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = generateUUID();
  const sign = generateSign(timestamp, nonce);
  const baseUrl = getApiBaseUrl(currentDomain);

  const response = await fetch(`${baseUrl}/openapi/controlDeviceWifi`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildRequestBody(timestamp, nonce, sign, {
      token: accessToken,
      deviceId,
      ssid,
      bssid,
      linkEnable,
      password,
    })),
  });

  const data: ControlDeviceWifiResponse = await response.json();
  console.log('[IMOU-SDK] controlDeviceWifi response:', JSON.stringify(data, null, 2));

  if (data.result.code === '0') {
    return true;
  }

  throw new Error(`Failed to control device WiFi: ${data.result.msg} (code: ${data.result.code})`);
}

export function getCurrentWifiSsid(): Promise<string> {
  console.log('[IMOU-SDK] getCurrentWifiSsid()');
  return ImouModule.getCurrentWifiSsid();
}

export function connectToDeviceAp(ssid: string, password: string = ''): Promise<boolean> {
  console.log('[IMOU-SDK] connectToDeviceAp() - ssid:', ssid);
  return ImouModule.connectToDeviceAp(ssid, password);
}

export function disconnectFromDeviceAp(): Promise<boolean> {
  console.log('[IMOU-SDK] disconnectFromDeviceAp()');
  return ImouModule.disconnectFromDeviceAp();
}

export function getPreviousWifiSsid(): Promise<string> {
  return ImouModule.getPreviousWifiSsid();
}

export function isConnectedToSsid(targetSsid: string): Promise<boolean> {
  return ImouModule.isConnectedToSsid(targetSsid);
}

export function generateDeviceApSsid(deviceSn: string): string {
  return `DAP-${deviceSn}`;
}

export function getGatewayIp(): Promise<string> {
  console.log('[IMOU-SDK] getGatewayIp()');
  return ImouModule.getGatewayIp();
}

export async function getSoftApWifiList(
  devicePassword: string,
  isScDevice: boolean = true
): Promise<SoftApWifiItem[]> {
  console.log('[IMOU-SDK] getSoftApWifiList()');
  const gatewayIp = await getGatewayIp();
  console.log('[IMOU-SDK] Gateway IP:', gatewayIp);
  return ImouModule.getSoftApWifiList(gatewayIp, devicePassword, isScDevice);
}

export async function startSoftApConfig(
  ssid: string,
  password: string,
  encryptionType: number,
  devicePassword: string,
  deviceSn: string
): Promise<boolean> {
  console.log('[IMOU-SDK] startSoftApConfig() - ssid:', ssid);
  const gatewayIp = await getGatewayIp();
  console.log('[IMOU-SDK] Gateway IP:', gatewayIp);
  return ImouModule.startSoftApConfig(ssid, password, encryptionType, gatewayIp, devicePassword, deviceSn);
}
