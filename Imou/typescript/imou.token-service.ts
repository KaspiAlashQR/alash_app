import { fetchAccessToken } from './imou.api';
import type { TokenState } from './imou.api';
import { createSubAccount, getOpenIdByAccount, fetchSubAccountToken } from './imou.subaccount';
import { fetchKitToken, fetchDeviceList } from './imou.devices';
import { ImouModule } from './imou.config';
import { deviceStorage } from '../../src/api/storage';

const TOKEN_REFRESH_BUFFER = 300;
const AUTO_REFRESH_INTERVAL_MS = 60_000;

interface KitTokenEntry {
  kitToken: string;
  expireTime: number;
}

interface SubState {
  token: string | null;
  expireTime: number;
  openId: string | null;
  email: string | null;
}

export class ImouTokenService {
  private static instance: ImouTokenService;

  private adminState: TokenState = {
    accessToken: null,
    tokenExpireTime: 0,
    currentDomain: null,
  };

  private subState: SubState = {
    token: null,
    expireTime: 0,
    openId: null,
    email: null,
  };

  private kitCache = new Map<string, KitTokenEntry>();

  private adminInflight: Promise<string> | null = null;
  private subInflight: Promise<string> | null = null;
  private kitInflight = new Map<string, Promise<KitTokenEntry>>();

  private sdkInitDone = false;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  private constructor() {}

  static getInstance(): ImouTokenService {
    if (!ImouTokenService.instance) {
      ImouTokenService.instance = new ImouTokenService();
    }
    return ImouTokenService.instance;
  }

  async getAdminToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    if (
      !this.adminInflight &&
      this.adminState.accessToken &&
      now < this.adminState.tokenExpireTime - TOKEN_REFRESH_BUFFER
    ) {
      return this.adminState.accessToken;
    }
    if (this.adminInflight) return this.adminInflight;
    this.adminInflight = this._fetchAdminToken().finally(() => {
      this.adminInflight = null;
    });
    return this.adminInflight;
  }

  private async _fetchAdminToken(): Promise<string> {
    const result = await fetchAccessToken(this.adminState);
    this.adminState = result.state;
    return result.token;
  }

  async getSubToken(email?: string): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    if (
      !this.subInflight &&
      this.subState.token &&
      now < this.subState.expireTime - TOKEN_REFRESH_BUFFER
    ) {
      return this.subState.token;
    }
    if (this.subInflight) return this.subInflight;
    this.subInflight = this._fetchSubToken(email).finally(() => {
      this.subInflight = null;
    });
    return this.subInflight;
  }

  private async _fetchSubToken(email?: string): Promise<string> {
    const targetEmail = email || this.subState.email;
    if (!targetEmail) {
      throw new Error('Email required to obtain sub account token');
    }
    const adminToken = await this.getAdminToken();
    if (!this.subState.openId) {
      await this._resolveOpenId(targetEmail, adminToken);
    }
    const result = await fetchSubAccountToken(
      this.subState.openId!,
      adminToken,
      this.adminState.currentDomain,
    );
    this.subState.token = result.accessToken;
    this.subState.expireTime = result.expireTime;
    this.subState.email = targetEmail;
    return result.accessToken;
  }

  private async _resolveOpenId(email: string, adminToken: string): Promise<void> {
    try {
      const result = await createSubAccount(email, adminToken, this.adminState.currentDomain);
      this.subState.openId = result.openId;
      this.subState.email = email;
    } catch (err: any) {
      const msg: string = err?.message ?? '';
      if (
        msg.includes('OP1010') ||
        msg.includes('already exist') ||
        msg.includes('SUB1002')
      ) {
        const result = await getOpenIdByAccount(email, adminToken, this.adminState.currentDomain);
        this.subState.openId = result.openId;
        this.subState.email = email;
      } else {
        throw err;
      }
    }
  }

  async getKitToken(
    deviceId: string,
    channelId = '0',
    type = '0',
  ): Promise<KitTokenEntry> {
    const key = `${deviceId}:${channelId}`;
    const now = Math.floor(Date.now() / 1000);
    const cached = this.kitCache.get(key);
    if (cached && now < cached.expireTime - TOKEN_REFRESH_BUFFER) {
      return cached;
    }
    const inflight = this.kitInflight.get(key);
    if (inflight) return inflight;
    const promise = this._fetchKitToken(deviceId, channelId, type, key).finally(() => {
      this.kitInflight.delete(key);
    });
    this.kitInflight.set(key, promise);
    return promise;
  }

  private async _fetchKitToken(
    deviceId: string,
    channelId: string,
    type: string,
    key: string,
  ): Promise<KitTokenEntry> {
    const token = await this.getSubToken();
    const result = await fetchKitToken(deviceId, channelId, type, token, this.adminState.currentDomain);
    this.kitCache.set(key, result);
    return result;
  }

  async getPlayToken(deviceId: string): Promise<{ playToken: string; productId: string | undefined }> {
    const settings = await deviceStorage.getCameraSettings();
    if (settings?.deviceId === deviceId && settings?.playToken) {
      return { playToken: settings.playToken, productId: settings.productId };
    }
    const token = await this.getSubToken();
    const { devices } = await fetchDeviceList(1, 50, token, this.adminState.currentDomain);
    const device = devices.find(d => d.deviceId === deviceId);
    if (!device?.playToken) {
      throw new Error('PlayToken not found. Refresh device list.');
    }
    if (settings) {
      await deviceStorage.saveCameraSettings({
        ...settings,
        playToken: device.playToken,
        productId: device.productId,
      });
    }
    return { playToken: device.playToken, productId: device.productId };
  }

  async ensureSDKInitialized(): Promise<void> {
    if (this.sdkInitDone) {
      const isInit = await ImouModule.isSDKInitialized();
      if (isInit) return;
      this.sdkInitDone = false;
    }
    const accessToken = await this.getAdminToken();
    let apiHost: string | null = null;
    if (this.adminState.currentDomain) {
      const match = this.adminState.currentDomain.match(/https?:\/\/([^:/]+)(?::(\d+))?/);
      if (match) {
        apiHost = `${match[1]}:${match[2] ?? '443'}`;
      }
    }
    const result = apiHost
      ? await ImouModule.initSDKWithHost(accessToken, apiHost)
      : await ImouModule.initSDK(accessToken);
    this.sdkInitDone = result;
  }

  async ensureReady(email: string): Promise<void> {
    await this.getAdminToken();
    await this.ensureSDKInitialized();
    await this.getSubToken(email);
  }

  async getCameraTokens(deviceId: string): Promise<{
    accessToken: string;
    playToken: string;
    productId: string | undefined;
  }> {
    const [accessToken, { playToken, productId }] = await Promise.all([
      this.getSubToken(),
      this.getPlayToken(deviceId),
    ]);
    return { accessToken, playToken, productId };
  }

  isSubAccountReady(): boolean {
    return !!(this.subState.token && this.subState.openId);
  }

  getSubAccountEmail(): string | null {
    return this.subState.email;
  }

  getStoredSubAccessToken(): string | null {
    return this.subState.token;
  }

  getStoredOpenId(): string | null {
    return this.subState.openId;
  }

  getCurrentDomain(): string | null {
    return this.adminState.currentDomain;
  }

  getStoredAdminToken(): string | null {
    return this.adminState.accessToken;
  }

  invalidateSubToken(): void {
    this.subState.token = null;
    this.subState.expireTime = 0;
    this.subState.openId = null;
  }

  startAutoRefresh(): void {
    if (this.refreshTimer) return;
    this.refreshTimer = setInterval(() => {
      this._autoRefresh().catch(() => {});
    }, AUTO_REFRESH_INTERVAL_MS);
  }

  stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private async _autoRefresh(): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    if (
      this.adminState.accessToken &&
      now >= this.adminState.tokenExpireTime - TOKEN_REFRESH_BUFFER * 6
    ) {
      await this.getAdminToken().catch(() => {});
    }
    if (
      this.subState.token &&
      this.subState.email &&
      now >= this.subState.expireTime - TOKEN_REFRESH_BUFFER * 6
    ) {
      await this.getSubToken().catch(() => {});
    }
    for (const [key, entry] of this.kitCache.entries()) {
      if (now >= entry.expireTime - TOKEN_REFRESH_BUFFER * 6) {
        const [deviceId, channelId] = key.split(':');
        await this.getKitToken(deviceId, channelId).catch(() => {});
      }
    }
  }
}

export const imouTokenService = ImouTokenService.getInstance();
