import { generateUUID, generateSign, getApiBaseUrl, buildRequestBody } from './imou.api';
import type { CreateSubAccountResponse, GetOpenIdResponse, SubAccountTokenResponse } from './imou.types';

export interface SubAccountState {
  subAccessToken: string | null;
  subTokenExpireTime: number;
  openId: string | null;
  subAccountEmail: string | null;
}

export function createInitialSubAccountState(): SubAccountState {
  return {
    subAccessToken: null,
    subTokenExpireTime: 0,
    openId: null,
    subAccountEmail: null,
  };
}

export async function createSubAccount(
  account: string,
  adminToken: string,
  currentDomain: string | null
): Promise<{ openId: string; email: string }> {
  console.log('[IMOU-SDK] createSubAccount() called - account:', account);

  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = generateUUID();
  const sign = generateSign(timestamp, nonce);
  const baseUrl = getApiBaseUrl(currentDomain);

  const response = await fetch(`${baseUrl}/openapi/createSubAccount`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildRequestBody(timestamp, nonce, sign, {
      token: adminToken,
      account: account,
    })),
  });

  const data: CreateSubAccountResponse = await response.json();
  console.log('[IMOU-SDK] createSubAccount response:', JSON.stringify(data, null, 2));

  if (data.result.code === '0' && data.result.data) {
    console.log('[IMOU-SDK] SubAccount created, openId:', data.result.data.openid);
    return { openId: data.result.data.openid, email: account };
  }

  throw new Error(`Failed to create subaccount: ${data.result.msg} (code: ${data.result.code})`);
}

export async function getOpenIdByAccount(
  account: string,
  adminToken: string,
  currentDomain: string | null
): Promise<{ openId: string; email: string }> {
  console.log('[IMOU-SDK] getOpenIdByAccount() called - account:', account);

  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = generateUUID();
  const sign = generateSign(timestamp, nonce);
  const baseUrl = getApiBaseUrl(currentDomain);

  const response = await fetch(`${baseUrl}/openapi/getOpenIdByAccount`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildRequestBody(timestamp, nonce, sign, {
      token: adminToken,
      account: account,
    })),
  });

  const data: GetOpenIdResponse = await response.json();
  console.log('[IMOU-SDK] getOpenIdByAccount response:', JSON.stringify(data, null, 2));

  if (data.result.code === '0' && data.result.data) {
    console.log('[IMOU-SDK] OpenId found:', data.result.data.openid);
    return { openId: data.result.data.openid, email: account };
  }

  throw new Error(`Failed to get openId: ${data.result.msg} (code: ${data.result.code})`);
}

export async function fetchSubAccountToken(
  openId: string,
  adminToken: string,
  currentDomain: string | null
): Promise<{ accessToken: string; expireTime: number }> {
  console.log('[IMOU-SDK] getSubAccountToken() called - openId:', openId);

  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = generateUUID();
  const sign = generateSign(timestamp, nonce);
  const baseUrl = getApiBaseUrl(currentDomain);

  const response = await fetch(`${baseUrl}/openapi/subAccountToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildRequestBody(timestamp, nonce, sign, {
      token: adminToken,
      openid: openId,
    })),
  });

  const data: SubAccountTokenResponse = await response.json();
  console.log('[IMOU-SDK] getSubAccountToken response:', JSON.stringify(data, null, 2));

  if (data.result.code === '0' && data.result.data) {
    console.log('[IMOU-SDK] SubAccessToken obtained successfully');
    return {
      accessToken: data.result.data.accessToken,
      expireTime: timestamp + data.result.data.expireTime,
    };
  }

  throw new Error(`Failed to get subaccount token: ${data.result.msg} (code: ${data.result.code})`);
}

export async function addDevicePolicy(
  deviceId: string,
  openId: string,
  adminToken: string,
  currentDomain: string | null
): Promise<boolean> {
  console.log('[IMOU-SDK] addDevicePolicy() called - deviceId:', deviceId, 'openId:', openId);

  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = generateUUID();
  const sign = generateSign(timestamp, nonce);
  const baseUrl = getApiBaseUrl(currentDomain);

  const response = await fetch(`${baseUrl}/openapi/addPolicy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildRequestBody(timestamp, nonce, sign, {
      token: adminToken,
      openid: openId,
      policy: {
        statement: [
          {
            permission: 'DevControl',
            resource: [`dev:${deviceId}`],
          }
        ]
      }
    })),
  });

  const data = await response.json();
  console.log('[IMOU-SDK] addDevicePolicy response:', JSON.stringify(data, null, 2));

  if (data.result.code === '0') {
    console.log('[IMOU-SDK] Policy added successfully');
    return true;
  }

  console.warn('[IMOU-SDK] Failed to add policy:', data.result.msg);
  return false;
}
