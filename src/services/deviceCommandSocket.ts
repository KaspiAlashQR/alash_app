import {
  AppState,
  AppStateStatus,
  NativeEventSubscription,
} from 'react-native';

import { API_CONFIG } from '../api/config';
import { DeviceInfo } from '../api/types';

export type DeviceSocketStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

export interface DeviceCommandMessage {
  type: string;
  device_id?: number;
  machid?: string | number;
  device_name?: string;
  requested_by?: number;
  requested_at?: string;
}

type StatusListener = (
  status: DeviceSocketStatus,
) => void;

type CommandListener = (
  message: DeviceCommandMessage,
) => void;

const INITIAL_RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_DELAY_MS = 60000;
const CONNECTION_TIMEOUT_MS = 15000;
const HEARTBEAT_TIMEOUT_MS = 15000;
const WATCHDOG_INTERVAL_MS = 3000;

class DeviceCommandSocketService {
  private socket: WebSocket | null = null;
  private deviceInfo: DeviceInfo | null = null;
  private status: DeviceSocketStatus = 'disconnected';

  private reconnectTimer:
    | ReturnType<typeof setTimeout>
    | null = null;

  private connectionTimer:
    | ReturnType<typeof setTimeout>
    | null = null;

  private watchdogTimer:
    | ReturnType<typeof setInterval>
    | null = null;

  private reconnectDelayMs = INITIAL_RECONNECT_DELAY_MS;
  private lastServerActivityAt = 0;
  private manualClose = false;

  private statusListeners = new Set<StatusListener>();
  private commandListeners = new Set<CommandListener>();

  private appStateSubscription: NativeEventSubscription;

  constructor() {
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange,
    );
  }

  connect(deviceInfo: DeviceInfo) {
    const sameDevice =
      String(this.deviceInfo?.machid) ===
        String(deviceInfo.machid) &&
      this.deviceInfo?.pwd === deviceInfo.pwd;

    this.deviceInfo = deviceInfo;
    this.manualClose = false;

    if (
      sameDevice &&
      this.socket &&
      (
        this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING
      )
    ) {
      return;
    }

    this.openSocket();
  }

  reconnect() {
    this.clearReconnectTimer();
    this.manualClose = false;
    this.closeSocket();
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

    const machid = encodeURIComponent(
      String(this.deviceInfo.machid),
    );

    const token = encodeURIComponent(
      this.deviceInfo.pwd,
    );

    const url =
      `${API_CONFIG.WS_BASE_URL}` +
      `/ws/devices/${machid}?token=${token}`;

    try {
      const socket = new WebSocket(url);
      this.socket = socket;
      this.lastServerActivityAt = Date.now();

      this.connectionTimer = setTimeout(() => {
        this.failConnection(socket, 'error');
      }, CONNECTION_TIMEOUT_MS);

      socket.onopen = () => {
        if (this.socket !== socket) {
          return;
        }

        this.lastServerActivityAt = Date.now();
        this.setStatus('connecting');
      };

      socket.onmessage = event => {
        if (this.socket !== socket) {
          return;
        }

        this.lastServerActivityAt = Date.now();

        try {
          const message = JSON.parse(event.data);

          if (message?.type === 'connection_ack') {
            if (
              String(message.machid) !==
              String(this.deviceInfo?.machid)
            ) {
              this.failConnection(socket, 'error');
              return;
            }

            socket.send(JSON.stringify({
              type: 'client_ready',
              machid: this.deviceInfo?.machid,
            }));

            return;
          }

          if (message?.type === 'ready_ack') {
            this.clearConnectionTimer();
            this.reconnectDelayMs =
              INITIAL_RECONNECT_DELAY_MS;

            this.setStatus('connected');
            this.startWatchdog(socket);
            return;
          }

          if (message?.type === 'ping') {
            socket.send(JSON.stringify({
              type: 'pong',
              timestamp: message.timestamp,
            }));

            return;
          }

          this.commandListeners.forEach(listener => {
            listener(message);
          });

        } catch (error) {
          console.log(
            '[DeviceCommandSocket] Invalid message:',
            error,
          );
        }
      };

      socket.onerror = () => {
        this.failConnection(socket, 'error');
      };

      socket.onclose = () => {
        if (this.socket !== socket) {
          return;
        }

        this.socket = null;
        this.clearConnectionTimer();
        this.stopWatchdog();

        if (!this.manualClose) {
          this.setStatus('disconnected');
          this.scheduleReconnect();
        }
      };

    } catch (error) {
      console.log(
        '[DeviceCommandSocket] Open failed:',
        error,
      );

      this.setStatus('error');
      this.scheduleReconnect();
    }
  }

  private failConnection(
    socket: WebSocket,
    status: DeviceSocketStatus,
  ) {
    if (this.socket !== socket) {
      return;
    }

    this.setStatus(status);
    this.closeSocket();

    if (!this.manualClose) {
      this.scheduleReconnect();
    }
  }

  private startWatchdog(socket: WebSocket) {
    this.stopWatchdog();

    this.watchdogTimer = setInterval(() => {
      if (
        this.socket !== socket ||
        socket.readyState !== WebSocket.OPEN
      ) {
        this.failConnection(socket, 'disconnected');
        return;
      }

      const inactiveFor =
        Date.now() - this.lastServerActivityAt;

      if (inactiveFor > HEARTBEAT_TIMEOUT_MS) {
        console.log(
          '[DeviceCommandSocket] Heartbeat timeout',
        );

        this.failConnection(socket, 'disconnected');
      }
    }, WATCHDOG_INTERVAL_MS);
  }

  private stopWatchdog() {
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  private clearConnectionTimer() {
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }
  }

  private closeSocket() {
    this.clearConnectionTimer();
    this.stopWatchdog();

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
      console.log(
        '[DeviceCommandSocket] Close failed:',
        error,
      );
    }
  }

  private scheduleReconnect() {
    if (
      this.reconnectTimer ||
      !this.deviceInfo ||
      this.manualClose
    ) {
      return;
    }

    const delay = this.reconnectDelayMs;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;

      if (!this.manualClose) {
        this.openSocket();
      }
    }, delay);

    this.reconnectDelayMs = Math.min(
      this.reconnectDelayMs * 2,
      MAX_RECONNECT_DELAY_MS,
    );
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

    this.statusListeners.forEach(listener => {
      listener(status);
    });
  }

  private handleAppStateChange = (
    nextState: AppStateStatus,
  ) => {
    if (
      nextState !== 'active' ||
      !this.deviceInfo
    ) {
      return;
    }

    const socketIsOpen =
      this.socket?.readyState === WebSocket.OPEN;

    if (
      this.status !== 'connected' ||
      !socketIsOpen
    ) {
      this.reconnect();
    }
  };
}

export const deviceCommandSocket =
  new DeviceCommandSocketService();