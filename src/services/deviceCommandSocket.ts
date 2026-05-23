import { AppState, AppStateStatus, NativeEventSubscription } from 'react-native';
import { API_CONFIG } from '../api/config';
import { DeviceInfo } from '../api/types';

export type DeviceSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface DeviceCommandMessage {
  type: string;
  device_id?: number;
  machid?: string | number;
  device_name?: string;
  requested_by?: number;
  requested_at?: string;
}

type StatusListener = (status: DeviceSocketStatus) => void;
type CommandListener = (message: DeviceCommandMessage) => void;

class DeviceCommandSocketService {
  private socket: WebSocket | null = null;
  private deviceInfo: DeviceInfo | null = null;
  private status: DeviceSocketStatus = 'disconnected';
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelayMs = 3000;
  private manualClose = false;
  private statusListeners = new Set<StatusListener>();
  private commandListeners = new Set<CommandListener>();
  private appStateSubscription: NativeEventSubscription;

  constructor() {
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
  }

  connect(deviceInfo: DeviceInfo) {
    const sameDevice = this.deviceInfo?.machid === deviceInfo.machid && this.deviceInfo?.pwd === deviceInfo.pwd;
    this.deviceInfo = deviceInfo;
    this.manualClose = false;

    if (sameDevice && this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.openSocket();
  }

  reconnect() {
    this.clearReconnectTimer();
    this.closeSocket();
    this.manualClose = false;
    this.openSocket();
  }

  disconnect() {
    this.manualClose = true;
    this.clearReconnectTimer();
    this.closeSocket();
    this.setStatus('disconnected');
  }

  getStatus() {
    return this.status;
  }

  subscribeStatus(listener: StatusListener) {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  subscribeCommand(listener: CommandListener) {
    this.commandListeners.add(listener);
    return () => {
      this.commandListeners.delete(listener);
    };
  }

  private openSocket() {
    if (!this.deviceInfo?.machid || !this.deviceInfo?.pwd) {
      this.setStatus('error');
      return;
    }

    this.closeSocket();
    this.setStatus('connecting');

    const machid = encodeURIComponent(String(this.deviceInfo.machid));
    const token = encodeURIComponent(this.deviceInfo.pwd);
    const url = `${API_CONFIG.WS_BASE_URL}/ws/devices/${machid}?token=${token}`;

    try {
      const socket = new WebSocket(url);
      this.socket = socket;

      socket.onopen = () => {
        this.setStatus('connected');
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message?.type === 'ping') {
            return;
          }
          this.commandListeners.forEach(listener => listener(message));
        } catch (error) {
          console.log('[DeviceCommandSocket] Invalid message:', error);
        }
      };

      socket.onerror = () => {
        this.setStatus('error');
        if (this.socket === socket && !this.manualClose) {
          this.closeSocket();
          this.scheduleReconnect();
        }
      };

      socket.onclose = () => {
        if (this.socket === socket) {
          this.socket = null;
        }
        if (!this.manualClose) {
          this.setStatus('disconnected');
          this.scheduleReconnect();
        }
      };
    } catch (error) {
      console.log('[DeviceCommandSocket] Open failed:', error);
      this.setStatus('error');
      this.scheduleReconnect();
    }
  }

  private closeSocket() {
    if (!this.socket) {
      return;
    }

    const socket = this.socket;
    this.socket = null;
    socket.onopen = null;
    socket.onmessage = null;
    socket.onerror = null;
    socket.onclose = null;

    try {
      socket.close();
    } catch (error) {
      console.log('[DeviceCommandSocket] Close failed:', error);
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || !this.deviceInfo) {
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.manualClose) {
        this.openSocket();
      }
    }, this.reconnectDelayMs);
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private setStatus(status: DeviceSocketStatus) {
    if (this.status === status) {
      return;
    }

    this.status = status;
    this.statusListeners.forEach(listener => listener(status));
  }

  private handleAppStateChange = (nextState: AppStateStatus) => {
    if (nextState === 'active' && this.deviceInfo && this.status !== 'connected') {
      this.reconnect();
    }
  };
}

export const deviceCommandSocket = new DeviceCommandSocketService();
