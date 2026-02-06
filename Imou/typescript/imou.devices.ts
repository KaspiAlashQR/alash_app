import { generateUUID, generateSign, getApiBaseUrl, buildRequestBody } from './imou.api';
import type {
  ImouDevice,
  KitTokenResponse,
  BindDeviceResponse,
  UnbindDeviceResponse,
  DeviceInfoBeforeBindResponse,
} from './imou.types';

export async function fetchKitToken(
  deviceId: string,
  channelId: string,
  type: string,
  token: string,
  currentDomain: string | null
): Promise<{ kitToken: string; expireTime: number }> {
  console.log('[IMOU-SDK] getKitToken() called - deviceId:', deviceId);

  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = generateUUID();
  const sign = generateSign(timestamp, nonce);
  const baseUrl = getApiBaseUrl(currentDomain);

  const response = await fetch(`${baseUrl}/openapi/getKitToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildRequestBody(timestamp, nonce, sign, {
      token,
      deviceId,
      channelId,
      type,
    })),
  });

  const data: KitTokenResponse = await response.json();
  console.log('[IMOU-SDK] getKitToken response:', JSON.stringify(data, null, 2));

  if (data.result.code === '0' && data.result.data) {
    return {
      kitToken: data.result.data.kitToken,
      expireTime: data.result.data.expireTime,
    };
  }

  throw new Error(`Failed to get kitToken: ${data.result.msg} (code: ${data.result.code})`);
}

export async function fetchDeviceList(
  page: number,
  pageSize: number,
  token: string,
  currentDomain: string | null
): Promise<{ devices: ImouDevice[]; total: number }> {
  console.log('[IMOU-SDK] getDeviceList() called');

  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = generateUUID();
  const sign = generateSign(timestamp, nonce);
  const baseUrl = getApiBaseUrl(currentDomain);

  const response = await fetch(`${baseUrl}/openapi/listDeviceDetailsByPage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildRequestBody(timestamp, nonce, sign, {
      token,
      page: String(page),
      pageSize: String(pageSize),
    })),
  });

  const data = await response.json();
  console.log('[IMOU-SDK] getDeviceList response code:', data.result.code);

  if (data.result.code === '0' && data.result.data) {
    const deviceList = data.result.data.deviceList || [];

    const devices: ImouDevice[] = deviceList.map((d: any) => ({
      deviceId: d.deviceId,
      name: d.deviceName || d.deviceId,
      playToken: d.playToken,
      productId: d.productId || '',
      channels: (d.channelList || []).map((ch: any) => ({
        channelId: ch.channelId,
        channelName: ch.channelName || `Channel ${ch.channelId}`,
      })),
      status: d.deviceStatus || 'unknown',
      brand: d.brand || '',
      deviceModel: d.deviceModel || '',
    }));

    return { devices, total: data.result.data.count || 0 };
  }

  throw new Error(`Failed to get device list: ${data.result.msg} (code: ${data.result.code})`);
}

export async function bindDeviceToAccount(
  deviceSn: string,
  code: string,
  adminToken: string,
  currentDomain: string | null
): Promise<string> {
  console.log('[IMOU-SDK] bindDevice() - deviceSn:', deviceSn);

  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = generateUUID();
  const sign = generateSign(timestamp, nonce);
  const baseUrl = getApiBaseUrl(currentDomain);

  const response = await fetch(`${baseUrl}/openapi/bindDevice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildRequestBody(timestamp, nonce, sign, {
      token: adminToken,
      deviceId: deviceSn,
      code,
    })),
  });

  const data: BindDeviceResponse = await response.json();
  console.log('[IMOU-SDK] bindDevice response:', JSON.stringify(data, null, 2));

  if (data.result.code === '0') {
    return data.result.data?.deviceId || deviceSn;
  }

  if (data.result.code === 'DV1003') {
    console.log('[IMOU-SDK] Device already bound');
    return deviceSn;
  }

  throw new Error(`Failed to bind device: ${data.result.msg} (code: ${data.result.code})`);
}

export async function unbindDeviceFromAccount(
  deviceId: string,
  adminToken: string,
  currentDomain: string | null
): Promise<boolean> {
  console.log('[IMOU-SDK] unbindDevice() - deviceId:', deviceId);

  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = generateUUID();
  const sign = generateSign(timestamp, nonce);
  const baseUrl = getApiBaseUrl(currentDomain);

  const response = await fetch(`${baseUrl}/openapi/unBindDevice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildRequestBody(timestamp, nonce, sign, {
      token: adminToken,
      deviceId,
    })),
  });

  const data: UnbindDeviceResponse = await response.json();

  if (data.result.code === '0') {
    return true;
  }

  throw new Error(`Failed to unbind device: ${data.result.msg} (code: ${data.result.code})`);
}

export async function fetchDeviceInfoBeforeBind(
  deviceSn: string,
  deviceCode: string,
  accessToken: string,
  currentDomain: string | null
): Promise<{
  deviceId: string;
  brand: string;
  deviceModel: string;
  ability: string;
  status: string;
}> {
  console.log('[IMOU-SDK] getDeviceInfoBeforeBind() - deviceSn:', deviceSn);

  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = generateUUID();
  const sign = generateSign(timestamp, nonce);
  const baseUrl = getApiBaseUrl(currentDomain);

  const response = await fetch(`${baseUrl}/openapi/unBindDeviceInfo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildRequestBody(timestamp, nonce, sign, {
      token: accessToken,
      deviceId: deviceSn,
      deviceCodeModel: deviceCode,
    })),
  });

  const data: DeviceInfoBeforeBindResponse = await response.json();
  console.log('[IMOU-SDK] unBindDeviceInfo response:', JSON.stringify(data, null, 2));

  if (data.result.code === '0' && data.result.data) {
    return data.result.data;
  }

  throw new Error(`Failed to get device info: ${data.result.msg} (code: ${data.result.code})`);
}
