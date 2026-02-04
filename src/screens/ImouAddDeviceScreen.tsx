import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  FlatList,
  Dimensions,
  Platform,
  Linking,
  PermissionsAndroid,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import imouSDK, { SoftApWifiItem } from '../../Imou/typescript/imou';
import { RootStackParamList } from '../utils/navigation.types';

type ImouAddDeviceScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ImouAddDevice'>;

interface Props {
  navigation: ImouAddDeviceScreenNavigationProp;
}

const { width } = Dimensions.get('window');
const isTablet = width > 600;

type WizardStep =
  | 'enter_sn'           // Step 1: Enter device SN and code
  | 'reset_device'       // Step 2: Instructions to reset device
  | 'connect_ap'         // Step 3: Connect phone to device's Soft AP
  | 'select_wifi'        // Step 4: Select target WiFi network
  | 'enter_password'     // Step 5: Enter WiFi password
  | 'configuring'        // Step 6: Configuring device
  | 'binding'            // Step 7: Binding device to account
  | 'success'            // Step 8: Success
  | 'error';             // Error state

interface DeviceInfo {
  deviceSn: string;
  deviceCode: string;
  deviceModel?: string;
  brand?: string;
}

const ImouAddDeviceScreen: React.FC<Props> = ({ navigation }) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>('enter_sn');
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({ deviceSn: '', deviceCode: '' });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // WiFi state
  const [wifiList, setWifiList] = useState<SoftApWifiItem[]>([]);
  const [selectedWifi, setSelectedWifi] = useState<SoftApWifiItem | null>(null);
  const [wifiPassword, setWifiPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [deviceApSsid, setDeviceApSsid] = useState('');
  const [isConnectedToAp, setIsConnectedToAp] = useState(false);

  // Step progress
  const steps = [
    { key: 'enter_sn', label: '1' },
    { key: 'reset_device', label: '2' },
    { key: 'connect_ap', label: '3' },
    { key: 'select_wifi', label: '4' },
    { key: 'configuring', label: '5' },
    { key: 'success', label: '6' },
  ];

  const getCurrentStepIndex = () => {
    const stepKeys = ['enter_sn', 'reset_device', 'connect_ap', 'select_wifi', 'configuring', 'success'];
    const index = stepKeys.indexOf(currentStep === 'enter_password' ? 'select_wifi' :
                                   currentStep === 'binding' ? 'configuring' :
                                   currentStep === 'error' ? 'enter_sn' : currentStep);
    return index >= 0 ? index : 0;
  };

  // Request location permission (required for WiFi SSID on Android 10+)
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
    } catch (err) {
      console.warn('[ImouAddDevice] Permission error:', err);
      return false;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isConnectedToAp) {
        imouSDK.disconnectFromDeviceAp().catch(() => {});
      }
    };
  }, [isConnectedToAp]);

  const handleBack = () => {
    switch (currentStep) {
      case 'reset_device':
        setCurrentStep('enter_sn');
        break;
      case 'connect_ap':
        setCurrentStep('reset_device');
        break;
      case 'select_wifi':
        // Disconnect from AP when going back
        imouSDK.disconnectFromDeviceAp().catch(() => {});
        setIsConnectedToAp(false);
        setCurrentStep('connect_ap');
        break;
      case 'enter_password':
        setSelectedWifi(null);
        setWifiPassword('');
        setCurrentStep('select_wifi');
        break;
      case 'error':
        setCurrentStep('enter_sn');
        setErrorMessage('');
        break;
      default:
        navigation.goBack();
    }
  };

  const handleClose = () => {
    if (isConnectedToAp) {
      imouSDK.disconnectFromDeviceAp().catch(() => {});
    }
    navigation.goBack();
  };

  // Step 1: Validate and proceed with SN
  const handleValidateSn = async () => {
    if (!deviceInfo.deviceSn.trim()) {
      Alert.alert('Ошибка', 'Введите серийный номер устройства');
      return;
    }
    if (!deviceInfo.deviceCode.trim()) {
      Alert.alert('Ошибка', 'Введите код безопасности устройства');
      return;
    }

    setLoading(true);
    try {
      // Initialize SDK first
      await imouSDK.initialize();

      // Try to get device info before bind
      const info = await imouSDK.getDeviceInfoBeforeBind(
        deviceInfo.deviceSn.trim(),
        deviceInfo.deviceCode.trim()
      );

      setDeviceInfo(prev => ({
        ...prev,
        deviceModel: info.deviceModel,
        brand: info.brand,
      }));

      // Generate Soft AP SSID
      const apSsid = imouSDK.generateDeviceApSsid(deviceInfo.deviceSn.trim());
      setDeviceApSsid(apSsid);

      setCurrentStep('reset_device');
    } catch (error: any) {
      // Device might not be online yet, still allow to proceed
      const apSsid = imouSDK.generateDeviceApSsid(deviceInfo.deviceSn.trim());
      setDeviceApSsid(apSsid);
      setCurrentStep('reset_device');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Connect to device's Soft AP
  const handleConnectToAp = async () => {
    setLoading(true);
    try {
      // Request location permission first (required for WiFi SSID on Android 10+)
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        Alert.alert(
          'Разрешение не получено',
          'Для настройки WiFi камеры необходимо разрешение на геолокацию. Пожалуйста, предоставьте разрешение в настройках.',
          [
            { text: 'Открыть настройки', onPress: () => Linking.openSettings() },
            { text: 'Продолжить без разрешения', onPress: () => showManualConnectionInstructions() },
          ]
        );
        setLoading(false);
        return;
      }

      // Try common SSID patterns
      const ssidPatterns = [
        `DAP-${deviceInfo.deviceSn}`,
        `K5-${deviceInfo.deviceSn}`,
        `IPC-${deviceInfo.deviceSn}`,
        deviceInfo.deviceSn,
      ];

      let connected = false;
      for (const ssid of ssidPatterns) {
        try {
          // Soft AP usually has no password
          await imouSDK.connectToDeviceAp(ssid, '');
          setDeviceApSsid(ssid);
          connected = true;
          break;
        } catch (e) {
          continue;
        }
      }

      if (!connected) {
        showManualConnectionInstructions();
        return;
      }

      setIsConnectedToAp(true);
      setCurrentStep('select_wifi');
      loadWifiList();
    } catch (error: any) {
      Alert.alert('Ошибка', 'Не удалось подключиться к устройству. Убедитесь, что устройство в режиме настройки.');
    } finally {
      setLoading(false);
    }
  };

  const showManualConnectionInstructions = () => {
    Alert.alert(
      'Подключение вручную',
      `Подключитесь к WiFi сети камеры вручную:\n\n1. Откройте настройки WiFi\n2. Найдите сеть "${deviceApSsid}"\n3. Подключитесь (пароль обычно не нужен)\n4. Игнорируйте предупреждение "Нет интернета"\n5. Вернитесь в приложение\n\nВАЖНО: Не забудьте отключить мобильные данные!`,
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

  // Proceed without checking SSID (for cases when permission not granted)
  const proceedWithManualConnection = async () => {
    setLoading(true);
    try {
      // Try to get WiFi list from device directly via local SDK
      // If this works, we're connected to the device's AP
      const wifiItems = await imouSDK.getSoftApWifiList(deviceInfo.deviceCode, true);
      console.log('[ImouAddDevice] WiFi list received:', wifiItems?.length);

      if (wifiItems && wifiItems.length > 0) {
        setIsConnectedToAp(true);
        setWifiList(wifiItems.sort((a, b) => b.signal - a.signal));
        setCurrentStep('select_wifi');
      } else {
        // Empty list but no error - still connected
        setIsConnectedToAp(true);
        setWifiList([]);
        setCurrentStep('select_wifi');
      }
    } catch (error: any) {
      console.log('[ImouAddDevice] SDK error:', error?.message);
      // If SDK fails, device is not connected or not in AP mode
      Alert.alert(
        'Не удалось связаться с камерой',
        'Убедитесь что:\n\n1. Планшет подключен к WiFi сети камеры (DAP-...)\n2. Мобильные данные отключены\n3. Камера в режиме настройки (индикатор мигает)\n\nПопробуйте еще раз.',
        [
          { text: 'Открыть настройки WiFi', onPress: () => {
            if (Platform.OS === 'android') {
              Linking.sendIntent('android.settings.WIFI_SETTINGS');
            }
          }},
          { text: 'Повторить', onPress: () => proceedWithManualConnection() },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const checkApConnection = async () => {
    setLoading(true);
    try {
      // First try to check SSID
      const currentSsid = await imouSDK.getCurrentWifiSsid();
      console.log('[ImouAddDevice] Current SSID:', currentSsid);

      // If SSID is known and matches device pattern
      if (currentSsid && !currentSsid.includes('unknown') &&
          (currentSsid.includes(deviceInfo.deviceSn) ||
           currentSsid.startsWith('DAP-') ||
           currentSsid.startsWith('K5-') ||
           currentSsid.startsWith('IPC-'))) {
        setDeviceApSsid(currentSsid);
        setIsConnectedToAp(true);
        setCurrentStep('select_wifi');
        loadWifiList();
        return;
      }

      // If SSID is unknown, try to connect to device API directly
      // This is a better check than SSID because it verifies actual connectivity
      await proceedWithManualConnection();
    } catch (error) {
      setLoading(false);
      Alert.alert(
        'Ошибка проверки',
        'Не удалось проверить подключение. Попробуйте подключиться вручную.',
        [
          { text: 'OK', onPress: () => showManualConnectionInstructions() },
        ]
      );
    }
  };

  // Step 4: Load WiFi list from device via local SDK
  const loadWifiList = async () => {
    setLoading(true);
    try {
      const wifiItems = await imouSDK.getSoftApWifiList(deviceInfo.deviceCode, true);
      if (wifiItems && wifiItems.length > 0) {
        // Sort by signal strength
        const sorted = wifiItems.sort((a, b) => b.signal - a.signal);
        setWifiList(sorted);
      } else {
        setWifiList([]);
      }
    } catch (error: any) {
      console.log('[ImouAddDevice] Failed to load WiFi list:', error?.message);
      // Allow manual retry
      setWifiList([]);
    } finally {
      setLoading(false);
    }
  };

  // Step 5: Select WiFi and enter password
  const handleSelectWifi = (wifi: SoftApWifiItem) => {
    setSelectedWifi(wifi);
    // Check if open network (no encryption)
    if (wifi.isOpen) {
      // No password needed
      setWifiPassword('');
      handleConfigureWifi(wifi, '');
    } else {
      setCurrentStep('enter_password');
    }
  };

  // Step 6: Configure device WiFi via local SDK
  const handleConfigureWifi = async (wifi?: SoftApWifiItem, password?: string) => {
    const targetWifi = wifi || selectedWifi;
    const targetPassword = password !== undefined ? password : wifiPassword;

    if (!targetWifi) {
      Alert.alert('Ошибка', 'Выберите WiFi сеть');
      return;
    }

    setCurrentStep('configuring');
    setLoading(true);

    try {
      // Send WiFi config to device via local SDK
      // encryptionType: 12 = WPA2 (default if not specified)
      await imouSDK.startSoftApConfig(
        targetWifi.ssid,
        targetPassword,
        targetWifi.encryptionType || 12,
        deviceInfo.deviceCode,
        deviceInfo.deviceSn
      );

      // Wait for device to apply config and reconnect
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Disconnect from Soft AP
      try {
        await imouSDK.disconnectFromDeviceAp();
      } catch (e) {
        console.log('[ImouAddDevice] Disconnect error (may be already disconnected):', e);
      }
      setIsConnectedToAp(false);

      // Wait for phone to reconnect to home WiFi
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Proceed to binding
      setCurrentStep('binding');
      handleBindDevice();
    } catch (error: any) {
      setErrorMessage(`Не удалось настроить WiFi: ${error?.message || 'Неизвестная ошибка'}`);
      setCurrentStep('error');
      setLoading(false);
    }
  };

  // Step 7: Bind device to account
  const handleBindDevice = async () => {
    try {
      // Wait a bit more for device to come online
      await new Promise(resolve => setTimeout(resolve, 5000));

      await imouSDK.bindDevice(deviceInfo.deviceSn, deviceInfo.deviceCode);

      setLoading(false);
      setCurrentStep('success');
    } catch (error: any) {
      // Retry a few times
      for (let i = 0; i < 3; i++) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        try {
          await imouSDK.bindDevice(deviceInfo.deviceSn, deviceInfo.deviceCode);
          setLoading(false);
          setCurrentStep('success');
          return;
        } catch (e) {
          continue;
        }
      }

      setErrorMessage(`Не удалось привязать устройство: ${error?.message || 'Устройство не найдено в сети'}`);
      setCurrentStep('error');
      setLoading(false);
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'enter_sn':
        return (
          <View style={styles.stepContent}>
            <Icon name="barcode-scan" size={64} color="#2563eb" style={styles.stepIcon} />
            <Text style={styles.stepTitle}>Введите данные устройства</Text>
            <Text style={styles.stepDescription}>
              Серийный номер (SN) и код безопасности находятся на наклейке устройства
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Серийный номер (SN)"
              value={deviceInfo.deviceSn}
              onChangeText={(text) => setDeviceInfo(prev => ({ ...prev, deviceSn: text.toUpperCase() }))}
              autoCapitalize="characters"
              editable={!loading}
            />

            <TextInput
              style={styles.input}
              placeholder="Код безопасности (SC)"
              value={deviceInfo.deviceCode}
              onChangeText={(text) => setDeviceInfo(prev => ({ ...prev, deviceCode: text }))}
              autoCapitalize="characters"
              editable={!loading}
            />

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.disabledButton]}
              onPress={handleValidateSn}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Далее</Text>
              )}
            </TouchableOpacity>
          </View>
        );

      case 'reset_device':
        return (
          <View style={styles.stepContent}>
            <Icon name="restart" size={64} color="#f59e0b" style={styles.stepIcon} />
            <Text style={styles.stepTitle}>Сброс устройства</Text>
            <Text style={styles.stepDescription}>
              Для настройки WiFi устройство должно быть в режиме сопряжения
            </Text>

            <View style={styles.instructionsList}>
              <View style={styles.instructionItem}>
                <View style={styles.instructionNumber}><Text style={styles.instructionNumberText}>1</Text></View>
                <Text style={styles.instructionText}>Нажмите и удерживайте кнопку Reset на устройстве 5-10 секунд</Text>
              </View>
              <View style={styles.instructionItem}>
                <View style={styles.instructionNumber}><Text style={styles.instructionNumberText}>2</Text></View>
                <Text style={styles.instructionText}>Дождитесь голосового сообщения или мигания индикатора</Text>
              </View>
              <View style={styles.instructionItem}>
                <View style={styles.instructionNumber}><Text style={styles.instructionNumberText}>3</Text></View>
                <Text style={styles.instructionText}>Устройство создаст WiFi точку: {deviceApSsid}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setCurrentStep('connect_ap')}
            >
              <Text style={styles.primaryButtonText}>Устройство готово</Text>
            </TouchableOpacity>
          </View>
        );

      case 'connect_ap':
        return (
          <View style={styles.stepContent}>
            <Icon name="wifi" size={64} color="#2563eb" style={styles.stepIcon} />
            <Text style={styles.stepTitle}>Подключение к камере</Text>
            <Text style={styles.stepDescription}>
              Подключите планшет к WiFi точке камеры
            </Text>

            <View style={styles.apInfoBox}>
              <Text style={styles.apInfoLabel}>Имя сети (SSID):</Text>
              <Text style={styles.apInfoValue}>{deviceApSsid}</Text>
              <Text style={styles.apInfoHint}>Пароль обычно не требуется</Text>
            </View>

            <View style={styles.warningBox}>
              <Icon name="alert-circle-outline" size={20} color="#f59e0b" />
              <Text style={styles.warningText}>
                Android покажет "Нет интернета" - это нормально! Нажмите "Подключиться" или "Сохранить подключение".
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.disabledButton]}
              onPress={handleConnectToAp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Подключиться автоматически</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                if (Platform.OS === 'android') {
                  Linking.sendIntent('android.settings.WIFI_SETTINGS');
                }
              }}
              disabled={loading}
            >
              <Text style={styles.secondaryButtonText}>Открыть настройки WiFi</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, { marginTop: 8 }]}
              onPress={checkApConnection}
              disabled={loading}
            >
              <Text style={styles.secondaryButtonText}>Я подключился → Продолжить</Text>
            </TouchableOpacity>
          </View>
        );

      case 'select_wifi':
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Выберите WiFi сеть</Text>
            <Text style={styles.stepDescription}>
              Выберите сеть, к которой будет подключено устройство
            </Text>

            {loading ? (
              <ActivityIndicator size="large" color="#2563eb" style={{ marginVertical: 32 }} />
            ) : wifiList.length === 0 ? (
              <View style={styles.emptyWifiList}>
                <Icon name="wifi-off" size={48} color="#9ca3af" />
                <Text style={styles.emptyWifiText}>WiFi сети не найдены</Text>
                <TouchableOpacity style={styles.secondaryButton} onPress={loadWifiList}>
                  <Text style={styles.secondaryButtonText}>Обновить</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={wifiList}
                keyExtractor={(item, index) => `${item.ssid}-${index}`}
                style={styles.wifiList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.wifiItem}
                    onPress={() => handleSelectWifi(item)}
                  >
                    <Icon
                      name={item.signal >= 75 ? 'wifi-strength-4' :
                            item.signal >= 50 ? 'wifi-strength-3' :
                            item.signal >= 25 ? 'wifi-strength-2' : 'wifi-strength-1'}
                      size={24}
                      color={item.isOpen ? '#6b7280' : '#2563eb'}
                    />
                    <View style={styles.wifiItemInfo}>
                      <Text style={styles.wifiItemSsid}>{item.ssid}</Text>
                      <Text style={styles.wifiItemAuth}>
                        {item.isOpen ? 'Открытая сеть' : 'Защищённая'}
                      </Text>
                    </View>
                    {!item.isOpen && <Icon name="lock" size={16} color="#9ca3af" style={{ marginRight: 8 }} />}
                    <Icon name="chevron-right" size={24} color="#9ca3af" />
                  </TouchableOpacity>
                )}
                ListFooterComponent={
                  <TouchableOpacity style={styles.refreshButton} onPress={loadWifiList}>
                    <Icon name="refresh" size={20} color="#2563eb" />
                    <Text style={styles.refreshButtonText}>Обновить список</Text>
                  </TouchableOpacity>
                }
              />
            )}
          </View>
        );

      case 'enter_password':
        return (
          <View style={styles.stepContent}>
            <Icon name="lock" size={64} color="#2563eb" style={styles.stepIcon} />
            <Text style={styles.stepTitle}>Введите пароль WiFi</Text>
            <Text style={styles.stepDescription}>
              Сеть: {selectedWifi?.ssid}
            </Text>

            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Пароль WiFi"
                value={wifiPassword}
                onChangeText={setWifiPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.showPasswordButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Icon name={showPassword ? 'eye-off' : 'eye'} size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.disabledButton]}
              onPress={() => handleConfigureWifi()}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Подключить</Text>
              )}
            </TouchableOpacity>
          </View>
        );

      case 'configuring':
      case 'binding':
        return (
          <View style={styles.stepContent}>
            <ActivityIndicator size="large" color="#2563eb" style={styles.stepIcon} />
            <Text style={styles.stepTitle}>
              {currentStep === 'configuring' ? 'Настройка устройства' : 'Привязка устройства'}
            </Text>
            <Text style={styles.stepDescription}>
              {currentStep === 'configuring'
                ? 'Передача настроек WiFi на устройство...'
                : 'Ожидание подключения устройства к сети...'}
            </Text>
            <Text style={styles.waitText}>Пожалуйста, подождите</Text>
          </View>
        );

      case 'success':
        return (
          <View style={styles.stepContent}>
            <Icon name="check-circle" size={80} color="#22c55e" style={styles.stepIcon} />
            <Text style={styles.stepTitle}>Камера настроена!</Text>
            <Text style={styles.stepDescription}>
              {deviceInfo.deviceModel || 'Камера'} успешно подключена к WiFi и добавлена в ваш аккаунт
            </Text>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.primaryButtonText}>Готово</Text>
            </TouchableOpacity>
          </View>
        );

      case 'error':
        return (
          <View style={styles.stepContent}>
            <Icon name="alert-circle" size={80} color="#ef4444" style={styles.stepIcon} />
            <Text style={styles.stepTitle}>Ошибка</Text>
            <Text style={styles.stepDescription}>{errorMessage}</Text>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => {
                setCurrentStep('enter_sn');
                setErrorMessage('');
              }}
            >
              <Text style={styles.primaryButtonText}>Попробовать снова</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.secondaryButtonText}>Отмена</Text>
            </TouchableOpacity>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={handleBack}>
          <Icon name="arrow-left" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Настройка камеры</Text>
        <TouchableOpacity style={styles.headerButton} onPress={handleClose}>
          <Icon name="close" size={24} color="#374151" />
        </TouchableOpacity>
      </View>

      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        {steps.map((step, index) => (
          <React.Fragment key={step.key}>
            <View style={[
              styles.progressStep,
              index <= getCurrentStepIndex() && styles.progressStepActive,
              index < getCurrentStepIndex() && styles.progressStepCompleted,
            ]}>
              {index < getCurrentStepIndex() ? (
                <Icon name="check" size={14} color="#fff" />
              ) : (
                <Text style={[
                  styles.progressStepText,
                  index <= getCurrentStepIndex() && styles.progressStepTextActive,
                ]}>{step.label}</Text>
              )}
            </View>
            {index < steps.length - 1 && (
              <View style={[
                styles.progressLine,
                index < getCurrentStepIndex() && styles.progressLineActive,
              ]} />
            )}
          </React.Fragment>
        ))}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {renderStepContent()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: '600',
    color: '#111827',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
    backgroundColor: '#fff',
  },
  progressStep: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressStepActive: {
    backgroundColor: '#2563eb',
  },
  progressStepCompleted: {
    backgroundColor: '#22c55e',
  },
  progressStepText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  progressStepTextActive: {
    color: '#fff',
  },
  progressLine: {
    width: 32,
    height: 2,
    backgroundColor: '#e5e7eb',
  },
  progressLineActive: {
    backgroundColor: '#22c55e',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  stepContent: {
    flex: 1,
    alignItems: 'center',
  },
  stepIcon: {
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: isTablet ? 24 : 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: isTablet ? 16 : 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
  linkButton: {
    marginTop: 16,
    padding: 8,
  },
  linkButtonText: {
    color: '#2563eb',
    fontSize: 14,
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  instructionsList: {
    width: '100%',
    marginBottom: 24,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  instructionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  instructionNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },
  apInfoBox: {
    width: '100%',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  apInfoLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  apInfoValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563eb',
    marginBottom: 4,
  },
  apInfoHint: {
    fontSize: 12,
    color: '#9ca3af',
  },
  warningBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
    lineHeight: 18,
  },
  wifiList: {
    width: '100%',
    maxHeight: 400,
  },
  wifiItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  wifiItemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  wifiItemSsid: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  wifiItemAuth: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  emptyWifiList: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyWifiText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
    marginBottom: 16,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  refreshButtonText: {
    color: '#2563eb',
    fontSize: 14,
    marginLeft: 8,
  },
  passwordInputContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  showPasswordButton: {
    padding: 12,
  },
  waitText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 16,
  },
});

export default ImouAddDeviceScreen;
