import { useState, useEffect, useCallback } from 'react';
import { Alert, Platform, Linking, PermissionsAndroid } from 'react-native';
import imouSDK, { SoftApWifiItem } from '../../../Imou/typescript/imou';
import { WizardStep, WizardState, DeviceInfo } from './types';

const initialState: WizardState = {
  currentStep: 'enter_sn',
  deviceInfo: { deviceSn: '', deviceCode: '' },
  loading: false,
  errorMessage: '',
  wifiList: [],
  selectedWifi: null,
  wifiPassword: '',
  showPassword: false,
  deviceApSsid: '',
  isConnectedToAp: false,
  bindingProgress: 0,
  bindingStatus: '',
};

export function useDeviceSetup(onComplete: () => void) {
  const [state, setState] = useState<WizardState>(initialState);

  const updateState = useCallback((updates: Partial<WizardState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const setStep = useCallback((step: WizardStep) => {
    updateState({ currentStep: step });
  }, [updateState]);

  const setLoading = useCallback((loading: boolean) => {
    updateState({ loading });
  }, [updateState]);

  const setError = useCallback((errorMessage: string) => {
    updateState({ errorMessage, currentStep: 'error', loading: false });
  }, [updateState]);

  useEffect(() => {
    return () => {
      if (state.isConnectedToAp) {
        imouSDK.disconnectFromDeviceAp().catch(() => {});
      }
    };
  }, [state.isConnectedToAp]);

  const requestLocationPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Доступ к геолокации',
          message: 'Для настройки WiFi камеры необходим доступ к геолокации',
          buttonNeutral: 'Позже',
          buttonNegative: 'Отмена',
          buttonPositive: 'Разрешить',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  };

  const handleBack = useCallback(() => {
    switch (state.currentStep) {
      case 'reset_device':
        setStep('enter_sn');
        break;
      case 'connect_ap':
        setStep('reset_device');
        break;
      case 'select_wifi':
        imouSDK.disconnectFromDeviceAp().catch(() => {});
        updateState({ isConnectedToAp: false, currentStep: 'connect_ap' });
        break;
      case 'enter_password':
        updateState({ selectedWifi: null, wifiPassword: '', currentStep: 'select_wifi' });
        break;
      case 'error':
        updateState({ errorMessage: '', currentStep: 'enter_sn' });
        break;
      default:
        onComplete();
    }
  }, [state.currentStep, setStep, updateState, onComplete]);

  const handleClose = useCallback(() => {
    if (state.isConnectedToAp) {
      imouSDK.disconnectFromDeviceAp().catch(() => {});
    }
    onComplete();
  }, [state.isConnectedToAp, onComplete]);

  const validateSn = async () => {
    if (!state.deviceInfo.deviceSn.trim()) {
      Alert.alert('Ошибка', 'Введите серийный номер устройства');
      return;
    }
    if (!state.deviceInfo.deviceCode.trim()) {
      Alert.alert('Ошибка', 'Введите код безопасности устройства');
      return;
    }

    setLoading(true);
    try {
      await imouSDK.initialize();
      const info = await imouSDK.getDeviceInfoBeforeBind(
        state.deviceInfo.deviceSn.trim(),
        state.deviceInfo.deviceCode.trim()
      );
      const apSsid = imouSDK.generateDeviceApSsid(state.deviceInfo.deviceSn.trim());
      updateState({
        deviceInfo: { ...state.deviceInfo, deviceModel: info.deviceModel, brand: info.brand },
        deviceApSsid: apSsid,
        currentStep: 'reset_device',
        loading: false,
      });
    } catch {
      const apSsid = imouSDK.generateDeviceApSsid(state.deviceInfo.deviceSn.trim());
      updateState({ deviceApSsid: apSsid, currentStep: 'reset_device', loading: false });
    }
  };

  const loadWifiList = async () => {
    setLoading(true);
    try {
      const wifiItems = await imouSDK.getSoftApWifiList(state.deviceInfo.deviceCode, true);
      if (wifiItems && wifiItems.length > 0) {
        const sorted = wifiItems.sort((a, b) => b.signal - a.signal);
        updateState({ wifiList: sorted, loading: false });
      } else {
        updateState({ wifiList: [], loading: false });
      }
    } catch {
      updateState({ wifiList: [], loading: false });
    }
  };

  const showManualConnectionInstructions = () => {
    Alert.alert(
      'Подключение вручную',
      `Подключитесь к WiFi сети камеры вручную:\n\n1. Откройте настройки WiFi\n2. Найдите сеть "${state.deviceApSsid}"\n3. Подключитесь (пароль обычно не нужен)\n4. Игнорируйте предупреждение "Нет интернета"\n5. Вернитесь в приложение\n\nВАЖНО: Не забудьте отключить мобильные данные!`,
      [
        {
          text: 'Открыть настройки WiFi',
          onPress: () => {
            if (Platform.OS === 'android') {
              Linking.sendIntent('android.settings.WIFI_SETTINGS');
            }
          },
        },
        { text: 'Я подключился', onPress: () => proceedWithManualConnection() },
      ]
    );
  };

  const proceedWithManualConnection = async () => {
    setLoading(true);
    try {
      const wifiItems = await imouSDK.getSoftApWifiList(state.deviceInfo.deviceCode, true);
      if (wifiItems && wifiItems.length > 0) {
        updateState({
          isConnectedToAp: true,
          wifiList: wifiItems.sort((a, b) => b.signal - a.signal),
          currentStep: 'select_wifi',
          loading: false,
        });
      } else {
        updateState({
          isConnectedToAp: true,
          wifiList: [],
          currentStep: 'select_wifi',
          loading: false,
        });
      }
    } catch {
      Alert.alert(
        'Не удалось связаться с камерой',
        'Убедитесь что:\n\n1. Планшет подключен к WiFi сети камеры (DAP-...)\n2. Мобильные данные отключены\n3. Камера в режиме настройки (индикатор мигает)\n\nПопробуйте еще раз.',
        [
          {
            text: 'Открыть настройки WiFi',
            onPress: () => {
              if (Platform.OS === 'android') {
                Linking.sendIntent('android.settings.WIFI_SETTINGS');
              }
            },
          },
          { text: 'Повторить', onPress: () => proceedWithManualConnection() },
        ]
      );
      setLoading(false);
    }
  };

  const connectToAp = async () => {
    setLoading(true);
    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        Alert.alert(
          'Разрешение не получено',
          'Для настройки WiFi камеры необходимо разрешение на геолокацию.',
          [
            { text: 'Открыть настройки', onPress: () => Linking.openSettings() },
            { text: 'Продолжить без разрешения', onPress: () => showManualConnectionInstructions() },
          ]
        );
        setLoading(false);
        return;
      }

      const ssidPatterns = [
        `DAP-${state.deviceInfo.deviceSn}`,
        `K5-${state.deviceInfo.deviceSn}`,
        `IPC-${state.deviceInfo.deviceSn}`,
        state.deviceInfo.deviceSn,
      ];

      let connected = false;
      for (const ssid of ssidPatterns) {
        try {
          await imouSDK.connectToDeviceAp(ssid, '');
          updateState({ deviceApSsid: ssid });
          connected = true;
          break;
        } catch {
          continue;
        }
      }

      if (!connected) {
        showManualConnectionInstructions();
        setLoading(false);
        return;
      }

      updateState({ isConnectedToAp: true, currentStep: 'select_wifi', loading: false });
      loadWifiList();
    } catch {
      Alert.alert('Ошибка', 'Не удалось подключиться к устройству.');
      setLoading(false);
    }
  };

  const checkApConnection = async () => {
    setLoading(true);
    try {
      const currentSsid = await imouSDK.getCurrentWifiSsid();
      if (
        currentSsid &&
        !currentSsid.includes('unknown') &&
        (currentSsid.includes(state.deviceInfo.deviceSn) ||
          currentSsid.startsWith('DAP-') ||
          currentSsid.startsWith('K5-') ||
          currentSsid.startsWith('IPC-'))
      ) {
        updateState({ deviceApSsid: currentSsid, isConnectedToAp: true, currentStep: 'select_wifi' });
        loadWifiList();
        return;
      }
      await proceedWithManualConnection();
    } catch {
      setLoading(false);
      Alert.alert('Ошибка проверки', 'Не удалось проверить подключение.', [
        { text: 'OK', onPress: () => showManualConnectionInstructions() },
      ]);
    }
  };

  const selectWifi = (wifi: SoftApWifiItem) => {
    updateState({ selectedWifi: wifi });
    if (wifi.isOpen) {
      updateState({ wifiPassword: '' });
      configureWifi(wifi, '');
    } else {
      setStep('enter_password');
    }
  };

  const configureWifi = async (wifi?: SoftApWifiItem, password?: string) => {
    const targetWifi = wifi || state.selectedWifi;
    const targetPassword = password !== undefined ? password : state.wifiPassword;

    if (!targetWifi) {
      Alert.alert('Ошибка', 'Выберите WiFi сеть');
      return;
    }

    updateState({
      currentStep: 'configuring',
      loading: true,
      bindingProgress: 0,
      bindingStatus: 'Отправка настроек WiFi на устройство...',
    });

    try {
      await imouSDK.startSoftApConfig(
        targetWifi.ssid,
        targetPassword,
        targetWifi.encryptionType || 12,
        state.deviceInfo.deviceCode,
        state.deviceInfo.deviceSn
      );

      updateState({ bindingStatus: 'Устройство применяет настройки...', bindingProgress: 10 });
      await new Promise<void>(resolve => setTimeout(resolve, 3000));

      updateState({ bindingStatus: 'Отключение от точки доступа устройства...' });
      try {
        await imouSDK.disconnectFromDeviceAp();
      } catch {}
      updateState({ isConnectedToAp: false, bindingProgress: 15 });

      updateState({ bindingStatus: 'Переподключение к домашней сети...' });
      await new Promise<void>(resolve => setTimeout(resolve, 5000));
      updateState({ bindingProgress: 20, currentStep: 'binding' });

      await bindDevice();
    } catch (error: any) {
      setError(`Не удалось настроить WiFi: ${error?.message || 'Неизвестная ошибка'}`);
    }
  };

  const bindDevice = async () => {
    const POLL_INTERVAL = 3000;
    const MAX_TIMEOUT = 120000;
    const startTime = Date.now();

    updateState({ bindingStatus: 'Ожидание подключения устройства к WiFi...' });

    try {
      let deviceOnline = false;
      let lastError: any = null;

      while (Date.now() - startTime < MAX_TIMEOUT) {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(20 + Math.floor((elapsed / MAX_TIMEOUT) * 70), 90);
        const secondsElapsed = Math.floor(elapsed / 1000);
        const secondsRemaining = Math.floor((MAX_TIMEOUT - elapsed) / 1000);

        updateState({
          bindingProgress: progress,
          bindingStatus: `Ожидание устройства... ${secondsElapsed}сек (осталось ${secondsRemaining}сек)`,
        });

        try {
          const info = await imouSDK.getDeviceInfoBeforeBind(
            state.deviceInfo.deviceSn.trim(),
            state.deviceInfo.deviceCode.trim()
          );

          if (info && info.status === 'online') {
            deviceOnline = true;
            break;
          }
        } catch (error: any) {
          lastError = error;
        }

        await new Promise<void>(resolve => setTimeout(resolve, POLL_INTERVAL));
      }

      updateState({ bindingProgress: 95, bindingStatus: 'Привязка устройства к аккаунту...' });

      if (deviceOnline) {
        await imouSDK.bindDevice(state.deviceInfo.deviceSn, state.deviceInfo.deviceCode);
        updateState({ bindingProgress: 100, loading: false, currentStep: 'success' });
        return;
      }

      updateState({ bindingStatus: 'Попытка привязки...' });

      try {
        await imouSDK.bindDevice(state.deviceInfo.deviceSn, state.deviceInfo.deviceCode);
        updateState({ bindingProgress: 100, loading: false, currentStep: 'success' });
        return;
      } catch (bindError: any) {
        for (let i = 0; i < 3; i++) {
          updateState({ bindingStatus: `Повторная попытка привязки (${i + 1}/3)...` });
          await new Promise<void>(resolve => setTimeout(resolve, 5000));

          try {
            await imouSDK.bindDevice(state.deviceInfo.deviceSn, state.deviceInfo.deviceCode);
            updateState({ bindingProgress: 100, loading: false, currentStep: 'success' });
            return;
          } catch (retryError: any) {
            lastError = retryError;
          }
        }

        throw lastError || new Error('Устройство не подключилось к сети');
      }
    } catch (error: any) {
      setError(
        `Не удалось привязать устройство: ${error?.message || 'Устройство не подключилось к WiFi сети'}\n\n` +
          'Возможные причины:\n• Неверный пароль WiFi\n• Устройство слишком далеко от роутера\n• Роутер не поддерживает 2.4GHz'
      );
    }
  };

  const getCurrentStepIndex = () => {
    const stepKeys = ['enter_sn', 'reset_device', 'connect_ap', 'select_wifi', 'configuring', 'success'];
    const index = stepKeys.indexOf(
      state.currentStep === 'enter_password'
        ? 'select_wifi'
        : state.currentStep === 'binding'
          ? 'configuring'
          : state.currentStep === 'error'
            ? 'enter_sn'
            : state.currentStep
    );
    return index >= 0 ? index : 0;
  };

  return {
    state,
    updateState,
    handleBack,
    handleClose,
    validateSn,
    connectToAp,
    checkApConnection,
    loadWifiList,
    selectWifi,
    configureWifi,
    getCurrentStepIndex,
  };
}
