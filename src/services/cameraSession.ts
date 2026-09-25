import { deviceStorage } from '../api/storage';
import { imouTokenService } from '../../Imou/typescript/imou.token-service';
import type { ImouCameraViewRef } from '../../Imou/typescript/ImouCameraView';
import { addPendingRecording, markRecordingReady, processUploadQueue } from './recordingQueue';

type Phase = 'idle' | 'preparing' | 'connecting' | 'ready' | 'recording' | 'stopping' | 'failed';
type PreviewRect = { x: number; y: number; width: number; height: number };
type Parameters = { deviceId: string; accessToken: string; playToken: string; productId?: string };
export type CameraSessionState = {
  id: number; orderId: number; phase: Phase; attempt: number;
  parameters?: Parameters; rect?: PreviewRect; error?: string;
};

export class CameraSession {
  private state: CameraSessionState = { id: 0, orderId: 0, phase: 'idle', attempt: 0 };
  private listeners = new Set<() => void>();
  private player: ImouCameraViewRef | null = null;
  private paidAt = 0;
  private recordRequested = false;
  private recordStartedAt = 0;
  private filePath = '';
  private attemptTimer?: ReturnType<typeof setTimeout>;
  private lifetimeTimer?: ReturnType<typeof setTimeout>;
  private recordTimer?: ReturnType<typeof setTimeout>;
  private pendingSave: Promise<void> = Promise.resolve();
  private nextOrder?: { orderId: number; paidAt: number };

  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  private update(change: Partial<CameraSessionState>) {
    this.state = { ...this.state, ...change };
    this.listeners.forEach(listener => listener());
  }

  private log(event: string, detail: object = {}) {
    console.log('[CameraSession]', { event, sessionId: this.state.id, orderId: this.state.orderId,
      attempt: this.state.attempt, phase: this.state.phase, ...detail });
  }

  begin(orderId: number) {
    if (this.state.orderId === orderId && this.state.phase !== 'idle') return;
    if (this.state.phase === 'recording' || this.state.phase === 'stopping') {
      this.nextOrder = { orderId, paidAt: 0 };
      this.log('busy_previous_recording', { nextOrderId: orderId });
      return;
    }
    this.close('new_checkout');
    this.paidAt = 0;
    this.recordRequested = false;
    this.recordStartedAt = 0;
    this.filePath = '';
    this.pendingSave = Promise.resolve();
    this.update({ id: this.state.id + 1, orderId, phase: 'preparing', attempt: 0, error: undefined, rect: undefined });
    this.log('checkout_prepare');
    this.lifetimeTimer = setTimeout(() => this.close('qr_expired'), 120_000);
    void this.prepare(this.state.id);
  }

  private async prepare(id: number) {
    const attempt = this.state.attempt + 1;
    this.update({ phase: 'preparing', attempt, parameters: undefined });
    this.log('prepare_start');
    if (this.attemptTimer) clearTimeout(this.attemptTimer);
    this.attemptTimer = setTimeout(() => this.fail(id, attempt, 'connection_timeout'), 18_000);
    const current = () => this.state.id === id && this.state.attempt === attempt && this.state.phase === 'preparing';
    try {
      const settings = await deviceStorage.getCameraSettings();
      if (!current()) return;
      if (!settings?.deviceId) throw new Error('Camera not configured');
      const tokens = await imouTokenService.getCameraTokens(settings.deviceId);
      if (!current()) return;
      this.log('credentials_ready', { deviceId: settings.deviceId });
      const parameters = {
        deviceId: settings.deviceId,
        accessToken: tokens.accessToken,
        playToken: tokens.playToken,
        productId: tokens.productId,
      };
      this.log('playback_parameters', { streamType: 0, channelId: 0, keySource: 'legacy_device_id',
        hasAccessToken: !!parameters.accessToken, hasPlayToken: !!parameters.playToken });
      this.update({ phase: 'connecting', parameters });
      this.log('connecting');
    } catch (error) {
      if (current()) this.fail(id, attempt, String(error));
    }
  }

  attach(player: ImouCameraViewRef | null) { this.player = player; }

  setRect(orderId: number, rect?: PreviewRect) {
    if (this.state.orderId === orderId) this.update({ rect });
  }

  paid(orderId: number) {
    if (this.nextOrder?.orderId === orderId) {
      this.nextOrder.paidAt = Date.now();
      return;
    }
    if (this.state.orderId !== orderId || this.paidAt) return;
    this.paidAt = Date.now();
    if (this.lifetimeTimer) clearTimeout(this.lifetimeTimer);
    this.log('payment_confirmed');
    this.lifetimeTimer = setTimeout(() => {
      if (!this.recordRequested) this.close('no_video_within_paid_window');
    }, 15_000);
    if (this.state.phase === 'ready') this.startRecord();
  }

  playStarted(id: number, attempt: number) {
    if (!this.matches(id, attempt) || this.state.phase !== 'connecting') return;
    if (this.attemptTimer) clearTimeout(this.attemptTimer);
    this.update({ phase: 'ready', error: undefined });
    this.log('stream_ready');
    if (this.paidAt) this.startRecord();
  }

  private startRecord() {
    if (this.recordRequested || !this.player || Date.now() - this.paidAt >= 15_000) return;
    this.recordRequested = true;
    this.log('record_requested', { afterPaymentMs: Date.now() - this.paidAt });
    this.player.startRecord(String(this.state.orderId));
    this.recordTimer = setTimeout(() => this.recordError(this.state.id, this.state.attempt, 'record_start_timeout'), 5000);
  }

  recordStarted(id: number, attempt: number, filePath: string) {
    if (!this.matches(id, attempt) || !this.recordRequested) return;
    if (this.recordTimer) clearTimeout(this.recordTimer);
    this.filePath = filePath;
    this.recordStartedAt = Date.now();
    this.update({ phase: 'recording' });
    this.log('record_started', { filePath });
    this.pendingSave = addPendingRecording({ orderId: this.state.orderId, filePath,
      createdAt: new Date().toISOString(), uploaded: false, ready: false });
    this.pendingSave.catch(error => this.log('queue_persist_failed', { error: String(error) }));
    this.recordTimer = setTimeout(() => this.finishRecording('15_seconds_elapsed'), 15_000);
  }

  private finishRecording(reason: string) {
    if (this.recordTimer) clearTimeout(this.recordTimer);
    this.update({ phase: 'stopping' });
    this.log('record_stop_requested', { reason, elapsedMs: Date.now() - this.recordStartedAt });
    this.player?.stopRecord();
    this.recordTimer = setTimeout(() => this.close('record_finalize_timeout'), 12_000);
  }

  async recordStopped(id: number, attempt: number, filePath: string) {
    if (!this.matches(id, attempt) || !this.recordRequested || filePath !== this.filePath) return;
    if (this.recordTimer) clearTimeout(this.recordTimer);
    this.log('record_finalized', { filePath, elapsedMs: Date.now() - this.recordStartedAt });
    try {
      await this.pendingSave.catch(() => {});
      await markRecordingReady(this.state.orderId, filePath);
    } catch (error) {
      this.log('queue_finalize_failed', { error: String(error) });
    } finally {
      if (this.matches(id, attempt)) this.close('record_complete');
      void processUploadQueue();
    }
  }

  recordError(id: number, attempt: number, error: string) {
    if (!this.matches(id, attempt)) return;
    this.log('record_error', { error });
    this.close('record_failed');
  }

  fail(id: number, attempt: number, error: string) {
    if (!this.matches(id, attempt) || this.state.phase === 'failed' || this.state.phase === 'idle' || this.state.phase === 'stopping') return;
    if (this.attemptTimer) clearTimeout(this.attemptTimer);
    this.log('stream_error', { error });
    if (this.recordRequested) {
      this.finishRecording('stream_lost');
      return;
    }
    this.player?.stopPreview();
    this.update({ phase: 'failed', parameters: undefined, error });
    if (attempt < 3 && (!this.paidAt || Date.now() - this.paidAt < 12_000)) {
      const delayMs = attempt * 2000;
      this.log('retry_scheduled', { delayMs });
      this.attemptTimer = setTimeout(() => { if (this.matches(id, attempt)) void this.prepare(id); }, delayMs);
    }
  }

  leave(orderId: number) {
    if (this.nextOrder?.orderId === orderId && !this.nextOrder.paidAt) this.nextOrder = undefined;
    if (this.state.orderId !== orderId) return;
    this.setRect(orderId);
    if (!this.paidAt) this.close('checkout_cancelled');
    else this.log('payment_screen_left');
  }

  background() {
    this.nextOrder = undefined;
    this.setRect(this.state.orderId);
    if (this.state.phase === 'recording') this.finishRecording('app_background');
    else if (this.state.phase !== 'stopping') this.close('app_background');
  }

  private matches(id: number, attempt: number) { return this.state.id === id && this.state.attempt === attempt; }

  private close(reason: string) {
    if (this.attemptTimer) clearTimeout(this.attemptTimer);
    if (this.lifetimeTimer) clearTimeout(this.lifetimeTimer);
    if (this.recordTimer) clearTimeout(this.recordTimer);
    this.log('session_closed', { reason });
    this.player?.stopPreview();
    this.player = null;
    this.update({ id: this.state.id + 1, phase: 'idle', parameters: undefined, rect: undefined });
    const next = this.nextOrder;
    this.nextOrder = undefined;
    if (next) {
      this.begin(next.orderId);
      if (next.paidAt) {
        this.paid(next.orderId);
        this.paidAt = next.paidAt;
      }
    }
  }
}

export const cameraSession = new CameraSession();
