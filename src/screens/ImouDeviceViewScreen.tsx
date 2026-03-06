import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ImouCameraView, ImouCameraViewRef, IMOU_STREAM_TYPE } from '../../Imou/typescript/imou';
import imouSDK from '../../Imou/typescript/imou';
import { imouTokenService } from '../../Imou/typescript/imou.token-service';
import type { CurWifiInfo, WifiInfo } from '../../Imou/typescript/imou';
import { deviceStorage } from '../api/storage';
import { RootStackParamList } from '../utils/navigation.types';

type ImouDeviceViewScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ImouDeviceView'>;
type ImouDeviceViewScreenRouteProp = RouteProp<RootStackParamList, 'ImouDeviceView'>;

interface Props {
  navigation: ImouDeviceViewScreenNavigationProp;
  route: ImouDeviceViewScreenRouteProp;
}

const { width } = Dimensions.get('window');
const isTablet = width > 600;

const ImouDeviceViewScreen: React.FC<Props> = ({ navigation, route }) => {
  const { deviceId, deviceName, channelId, playToken: routePlayToken, productId: routeProductId } = route.params;
  const cameraRef = useRef<ImouCameraViewRef>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string>('');
  const [playToken, setPlayToken] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [streamType, setStreamType] = useState<number>(IMOU_STREAM_TYPE.HD);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [wifiLoading, setWifiLoading] = useState(false);
  const [wifiError, setWifiError] = useState<string | null>(null);
  const [currentWifi, setCurrentWifi] = useState<CurWifiInfo | null>(null);
  const [wifiAround, setWifiAround] = useState<WifiInfo[]>([]);
  const [selectedWifi, setSelectedWifi] = useState<WifiInfo | null>(null);
  const [wifiPassword, setWifiPassword] = useState('');
  const [updatingWifi, setUpdatingWifi] = useState(false);
  const [showWifiPassword, setShowWifiPassword] = useState(false);
  const [wifiStatusNote, setWifiStatusNote] = useState<string | null>(null);

  useEffect(() => {
    initCamera();
  }, []);

  useEffect(() => {
    loadWifiInfo();
  }, []);

  useEffect(() => {
    if (!loading && !error && accessToken && playToken) {
      cameraRef.current?.startPreview();
      setIsPlaying(true);
    }
  }, [loading, error, accessToken, playToken]);

  const initCamera = async () => {
    try {
      setLoading(true);
      setError(null);

      const email =
        imouTokenService.getSubAccountEmail() ??
        (await deviceStorage.getDeviceInfo())?.email;

      if (!email) {
        setError('Необходимо войти в аккаунт IMOU');
        setLoading(false);
        return;
      }

      await imouTokenService.ensureSDKInitialized();

      const token = await imouTokenService.getSubToken(email);
      setAccessToken(token);

      if (routePlayToken) {
        setPlayToken(routePlayToken);
      } else {
        try {
          const kitToken = await imouTokenService.getKitToken(deviceId, channelId);
          setPlayToken(kitToken.kitToken);
        } catch {
          setError('Нет playToken. Обновите список устройств.');
          setLoading(false);
          return;
        }
      }
      setLoading(false);
    } catch (err: any) {
      setError(err?.message || 'Ошибка инициализации');
      setLoading(false);
    }
  };

  const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<T>((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error(`Таймаут: ${label}`)), timeoutMs);
    });
    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  };

  const loadWifiInfo = async () => {
    try {
      setWifiLoading(true);
      setWifiError(null);
      const [current, around] = await Promise.all([
        withTimeout(imouSDK.getCurrentDeviceWifi(deviceId), 15000, 'currentDeviceWifi'),
        withTimeout(imouSDK.getWifiAround(deviceId), 15000, 'wifiAround'),
      ]);
      setCurrentWifi(current);
      const sorted = [...(around?.wLan || [])].sort((a, b) => (b.intensity || 0) - (a.intensity || 0));
      setWifiAround(sorted);
    } catch (err: any) {
      console.error('[ImouDeviceView] loadWifiInfo error:', err);
      setWifiError(err?.message || 'Ошибка загрузки WiFi');
    } finally {
      setWifiLoading(false);
    }
  };

  const isOpenNetwork = (auth?: string) => {
    if (!auth) return false;
    const upper = auth.toUpperCase();
    return upper.includes('OPEN') || upper.includes('NONE');
  };

  const getSignalIcon = (intensity: number) => {
    if (intensity >= 80) return 'wifi-strength-4';
    if (intensity >= 60) return 'wifi-strength-3';
    if (intensity >= 40) return 'wifi-strength-2';
    return 'wifi-strength-1';
  };

  const handleSelectWifi = (wifi: WifiInfo) => {
    setSelectedWifi(wifi);
    if (isOpenNetwork(wifi.auth)) {
      setWifiPassword('');
    }
  };

  const handleApplyWifi = async () => {
    if (!selectedWifi) {
      setWifiError('Выберите WiFi сеть');
      return;
    }
    if (!isOpenNetwork(selectedWifi.auth) && !wifiPassword) {
      setWifiError('Введите пароль WiFi');
      return;
    }

    try {
      setUpdatingWifi(true);
      setWifiError(null);
      setWifiStatusNote('Переключение сети... Это может занять до 1 минуты.');
      await withTimeout(imouSDK.controlDeviceWifi(
        deviceId,
        selectedWifi.ssid,
        selectedWifi.bssid,
        wifiPassword,
        true
      ), 20000, 'controlDeviceWifi');
      setWifiPassword('');
      await new Promise<void>(resolve => setTimeout(() => resolve(), 2000));
      await loadWifiInfo();
      setWifiStatusNote('Сеть переключена. Если камера офлайн — подождите 30–60 секунд.');
    } catch (err: any) {
      console.error('[ImouDeviceView] controlDeviceWifi error:', err);
      setWifiError(err?.message || 'Не удалось изменить WiFi');
      setWifiStatusNote(null);
    } finally {
      setUpdatingWifi(false);
    }
  };

  const handlePlayStart = () => {
    setIsPlaying(true);
  };

  const handlePlayStop = () => {
    setIsPlaying(false);
  };

  const handleError = (err: { code?: number; error: string }) => {
    setError(err.error);
    setIsPlaying(false);
  };

  const togglePlay = () => {
    if (isPlaying) {
      cameraRef.current?.stopPreview();
      setIsPlaying(false);
    } else {
      cameraRef.current?.startPreview();
      setIsPlaying(true);
    }
  };

  const toggleStreamType = () => {
    const newType = streamType === IMOU_STREAM_TYPE.HD ? IMOU_STREAM_TYPE.SD : IMOU_STREAM_TYPE.HD;
    setStreamType(newType);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <SafeAreaView style={[styles.container, isFullscreen && styles.fullscreenContainer]}>
      {!isFullscreen && (
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {deviceName}
          </Text>
          <View style={styles.headerPlaceholder} />
        </View>
      )}

      {isFullscreen ? (
        <View style={[styles.videoContainer, styles.fullscreenVideo]}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={styles.loadingText}>Подключение...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Icon name="alert-circle" size={48} color="#ef4444" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={initCamera}>
                <Text style={styles.retryButtonText}>Повторить</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ImouCameraView
              ref={cameraRef}
              deviceId={deviceId}
              accessToken={accessToken}
              playToken={playToken}
              productId={routeProductId} // Product ID из API (НЕ deviceId!)
              channelId={parseInt(channelId, 10)}
              streamType={streamType}
            autoPlay={false}
              style={styles.cameraView}
              onPlayStart={handlePlayStart}
              onPlayStop={handlePlayStop}
              onError={handleError}
            />
          )}

          <TouchableOpacity style={styles.exitFullscreenButton} onPress={toggleFullscreen}>
            <Icon name="fullscreen-exit" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.videoContainer}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={styles.loadingText}>Подключение...</Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Icon name="alert-circle" size={48} color="#ef4444" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={initCamera}>
                  <Text style={styles.retryButtonText}>Повторить</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ImouCameraView
                ref={cameraRef}
                deviceId={deviceId}
                accessToken={accessToken}
                playToken={playToken}
                productId={routeProductId} // Product ID из API (НЕ deviceId!)
                channelId={parseInt(channelId, 10)}
                streamType={streamType}
                autoPlay={false}
                style={styles.cameraView}
                onPlayStart={handlePlayStart}
                onPlayStop={handlePlayStop}
                onError={handleError}
              />
            )}
          </View>

          {!loading && !error && (
            <View style={styles.controlsContainer}>
              <View style={styles.controlsRow}>
                <TouchableOpacity style={styles.controlButton} onPress={togglePlay}>
                  <Icon name={isPlaying ? 'pause' : 'play'} size={28} color="#374151" />
                  <Text style={styles.controlLabel}>{isPlaying ? 'Пауза' : 'Играть'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.controlButton} onPress={toggleStreamType}>
                  <Icon name="quality-high" size={28} color="#374151" />
                  <Text style={styles.controlLabel}>
                    {streamType === IMOU_STREAM_TYPE.HD ? 'HD' : 'SD'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.controlButton} onPress={toggleFullscreen}>
                  <Icon name="fullscreen" size={28} color="#374151" />
                  <Text style={styles.controlLabel}>Полный</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.wifiSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>WiFi устройства</Text>
              <TouchableOpacity style={styles.refreshButton} onPress={loadWifiInfo} disabled={wifiLoading}>
                <Icon name="refresh" size={18} color="#2563eb" />
                <Text style={styles.refreshButtonText}>Обновить</Text>
              </TouchableOpacity>
            </View>

            {wifiLoading && (
              <View style={styles.wifiLoadingRow}>
                <ActivityIndicator size="small" color="#2563eb" />
                <Text style={styles.wifiLoadingText}>Загрузка WiFi...</Text>
              </View>
            )}

            {wifiError && <Text style={styles.wifiErrorText}>{wifiError}</Text>}
            {wifiStatusNote && <Text style={styles.wifiNoteText}>{wifiStatusNote}</Text>}

            {currentWifi && (
              <View style={styles.currentWifiCard}>
                <View style={styles.currentWifiRow}>
                  <Icon name="wifi" size={20} color="#22c55e" />
                  <Text style={styles.currentWifiTitle} numberOfLines={1}>
                    {currentWifi.ssid || 'Без имени'}
                  </Text>
                </View>
                <Text style={styles.currentWifiMeta}>
                  {currentWifi.auth || 'Неизвестная защита'} • {currentWifi.sigStrength || 'Сигнал неизвестен'}
                </Text>
              </View>
            )}

            <Text style={styles.sectionSubtitle}>Сети вокруг устройства</Text>

            {wifiAround.length === 0 ? (
              <View style={styles.emptyWifiBox}>
                <Icon name="wifi-off" size={36} color="#9ca3af" />
                <Text style={styles.emptyWifiText}>Сети не найдены</Text>
              </View>
            ) : (
              wifiAround.map((item) => {
                const isSelected = selectedWifi?.bssid === item.bssid;
                return (
                  <TouchableOpacity
                    key={`${item.ssid}-${item.bssid}`}
                    style={[styles.wifiItem, isSelected && styles.wifiItemSelected]}
                    onPress={() => handleSelectWifi(item)}
                  >
                    <Icon name={getSignalIcon(item.intensity || 0)} size={22} color="#2563eb" />
                    <View style={styles.wifiItemInfo}>
                      <Text style={styles.wifiItemSsid} numberOfLines={1}>{item.ssid}</Text>
                      <Text style={styles.wifiItemAuth}>
                        {isOpenNetwork(item.auth) ? 'Открытая сеть' : (item.auth || 'Защищённая сеть')}
                      </Text>
                    </View>
                    {isSelected && <Icon name="check-circle" size={20} color="#22c55e" />}
                  </TouchableOpacity>
                );
              })
            )}

            {selectedWifi && (
              <View style={styles.wifiConfigBox}>
                <Text style={styles.wifiConfigTitle} numberOfLines={1}>
                  Подключить к: {selectedWifi.ssid}
                </Text>
                {!isOpenNetwork(selectedWifi.auth) && (
                  <View style={styles.passwordInputContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      value={wifiPassword}
                      onChangeText={setWifiPassword}
                      placeholder="Пароль WiFi"
                      secureTextEntry={!showWifiPassword}
                    />
                    <TouchableOpacity
                      style={styles.showPasswordButton}
                      onPress={() => setShowWifiPassword(!showWifiPassword)}
                    >
                      <Icon name={showWifiPassword ? 'eye-off' : 'eye'} size={20} color="#6b7280" />
                    </TouchableOpacity>
                  </View>
                )}
                <TouchableOpacity
                  style={[styles.applyWifiButton, updatingWifi && styles.applyWifiButtonDisabled]}
                  onPress={handleApplyWifi}
                  disabled={updatingWifi}
                >
                  <Text style={styles.applyWifiButtonText}>
                    {updatingWifi ? 'Подключение...' : 'Подключить'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  fullscreenContainer: {
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: isTablet ? 20 : 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerPlaceholder: {
    width: 40,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  videoContainer: {
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    borderRadius: 12,
    margin: 16,
    overflow: 'hidden',
  },
  fullscreenVideo: {
    flex: 1,
    margin: 0,
    borderRadius: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1f2937',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    padding: 24,
  },
  errorText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cameraView: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  exitFullscreenButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  controlsContainer: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  controlButton: {
    alignItems: 'center',
    padding: 12,
  },
  controlLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  wifiSection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
    marginBottom: 8,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 6,
  },
  refreshButtonText: {
    fontSize: 12,
    color: '#2563eb',
  },
  wifiLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  wifiLoadingText: {
    fontSize: 12,
    color: '#6b7280',
  },
  wifiErrorText: {
    fontSize: 12,
    color: '#ef4444',
    marginBottom: 8,
  },
  wifiNoteText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  currentWifiCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  currentWifiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currentWifiTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
  },
  currentWifiMeta: {
    marginTop: 4,
    fontSize: 12,
    color: '#166534',
  },
  emptyWifiBox: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  emptyWifiText: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 8,
  },
  wifiItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  wifiItemSelected: {
    borderColor: '#22c55e',
    backgroundColor: '#ecfdf3',
  },
  wifiItemInfo: {
    flex: 1,
    marginLeft: 10,
  },
  wifiItemSsid: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  wifiItemAuth: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  wifiConfigBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  wifiConfigTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  showPasswordButton: {
    padding: 10,
  },
  applyWifiButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  applyWifiButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  applyWifiButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ImouDeviceViewScreen;
