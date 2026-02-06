import { md5 } from 'js-md5';
import { IMOU_CONFIG } from './imou.config';
import type { AccessTokenResponse } from './imou.types';

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function generateSign(timestamp: number, nonce: string): string {
  const signStr = `time:${timestamp},nonce:${nonce},appSecret:${IMOU_CONFIG.APP_SECRET}`;
  return md5(signStr);
}

export interface TokenState {
  accessToken: string | null;
  tokenExpireTime: number;
  currentDomain: string | null;
}

export async function fetchAccessToken(state: TokenState): Promise<{ token: string; state: TokenState }> {
  console.log('[IMOU-SDK] getAccessToken() called');

  const currentTime = Math.floor(Date.now() / 1000);
  if (state.accessToken && currentTime < state.tokenExpireTime - 300) {
    console.log('[IMOU-SDK] Using cached token, expires:', new Date(state.tokenExpireTime * 1000).toISOString());
    return { token: state.accessToken, state };
  }

  const timestamp = currentTime;
  const nonce = generateUUID();
  const sign = generateSign(timestamp, nonce);

  console.log('[IMOU-SDK] Requesting accessToken from:', `${IMOU_CONFIG.API_BASE_URL}/openapi/accessToken`);

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
    const newState: TokenState = {
      accessToken: data.result.data.accessToken,
      tokenExpireTime: data.result.data.expireTime,
      currentDomain: data.result.data.currentDomain || state.currentDomain,
    };
    console.log('[IMOU-SDK] accessToken obtained successfully');
    return { token: newState.accessToken!, state: newState };
  }

  throw new Error(`Failed to get accessToken: ${data.result.msg} (code: ${data.result.code})`);
}

export function getApiBaseUrl(currentDomain: string | null): string {
  if (currentDomain) {
    return currentDomain.replace(/:443$/, '');
  }
  return IMOU_CONFIG.API_BASE_URL;
}

export function buildRequestBody(
  timestamp: number,
  nonce: string,
  sign: string,
  params: Record<string, any>
): object {
  return {
    system: {
      ver: '1.0',
      appId: IMOU_CONFIG.APP_ID,
      sign,
      time: timestamp,
      nonce,
    },
    params,
  };
}
