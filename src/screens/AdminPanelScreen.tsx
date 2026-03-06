
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Sound from 'react-native-sound';
import DistributeTab from '../components/admin/DistributeTab';
import InvoicesTab from '../components/admin/InvoicesTab';
import { RootStackParamList } from '../utils/navigation.types';
import { deviceStorage } from '../api/storage';
import { CameraSettings } from '../api/types';
import { imouSDK } from '../../Imou/typescript/imou';
import { getLogStartTime, getLogCount } from '../services/diagnosticLogger';
import { uploadDiagnostics } from '../services/diagnosticUpload';

function formatLogStartTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const h = pad(date.getHours());
  const m = pad(date.getMinutes());
  const d = pad(date.getDate());
  const mo = pad(date.getMonth() + 1);
  const y = date.getFullYear();
  return `${h}:${m} ${d}.${mo}.${y}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  navHeader: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
    marginBottom: 8,
  },
  logoText: {
    color: '#22223b',
    fontSize: 28,
    fontWeight: '700',
    flex: 1,
    letterSpacing: 0.2,
    textAlign: 'left',
  },
  logoTextTablet: {
    fontSize: 24,
  },
  logoutButton: {
    backgroundColor: '#FF8A50',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#FF8A50',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  logoutButtonTablet: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
    letterSpacing: 0.2,
  },
  logoutButtonTextTablet: {
    fontSize: 16,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  unlockButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#10b981',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  unlockButtonTablet: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  unlockButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  unlockButtonTextTablet: {
    fontSize: 18,
  },
  contentContainer: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 8,
    paddingVertical: 0,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#FF8A50',
    backgroundColor: '#fff',
  },
  tabButtonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: '#FF8A50',
  },
  cameraButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#3b82f6',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  cameraButtonTablet: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  cameraButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cameraButtonTextTablet: {
    fontSize: 18,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  modalHint: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtonCancel: {
    flex: 1,
    backgroundColor: '#e5e7eb',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonSave: {
    flex: 1,
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonTextCancel: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextSave: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  diagButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#6366f1',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  diagButtonTablet: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  diagButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  diagModalInfo: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  diagModalInfoText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },
  diagModalInfoBold: {
    fontWeight: '700',
    color: '#1f2937',
  },
  diagModalButtonSend: {
    flex: 1,
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  diagModalButtonTextSend: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  flipButton: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  flipButtonDisabled: {
    opacity: 0.6,
  },
  flipButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  flipStatusText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 12,
  },
});

type AdminPanelScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AdminPanel'>;

interface AdminPanelScreenProps {
  navigation: AdminPanelScreenNavigationProp;
}

const { width } = Dimensions.get('window');
const isTablet = width > 600;

const AdminPanelScreen: React.FC<AdminPanelScreenProps> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<'invoices' | 'distribute'>('invoices');
  const [cameraModalVisible, setCameraModalVisible] = useState(false);
  const [cameraDeviceId, setCameraDeviceId] = useState('');
  const [cameraPassword, setCameraPassword] = useState('');
  const [savedCameraId, setSavedCameraId] = useState<string | null>(null);
  const [savedCameraPassword, setSavedCameraPassword] = useState<string | null>(null);
  const [flipLoading, setFlipLoading] = useState(false);
  const [flipStatus, setFlipStatus] = useState<string | null>(null);
  const [diagModalVisible, setDiagModalVisible] = useState(false);
  const [diagLogStart, setDiagLogStart] = useState<Date | null>(null);
  const [diagLogCount, setDiagLogCount] = useState(0);
  const [diagUploading, setDiagUploading] = useState(false);

  useEffect(() => {
    loadCameraSettings();
  }, []);

  const loadCameraSettings = async () => {
    const settings = await deviceStorage.getCameraSettings();
    if (settings) {
      setSavedCameraId(settings.deviceId);
      setCameraDeviceId(settings.deviceId);
      setSavedCameraPassword(settings.password || null);
      setCameraPassword(settings.password || '');
    }
  };

  const handleLogout = async () => {
    navigation.navigate('Home');
  };

  const playUnlockSignal = () => {
    const unlockSound = new Sound('unlock_signal.wav', Sound.MAIN_BUNDLE, (error) => {
      if (error) {
        console.log('Failed to load sound', error);
        return;
      }
      unlockSound.play((success) => {
        if (success) {
          console.log('Unlock signal played successfully');
        } else {
          console.log('Unlock signal playback failed');
        }
        unlockSound.release();
      });
    });
  };

  const loadFlipStatus = async (deviceId: string) => {
    try {
      setFlipLoading(true);
      const direction = await imouSDK.getFrameReverseStatus(deviceId);
      setFlipStatus(direction);
    } catch (e: any) {
      console.log('Failed to get flip status:', e?.message);
      setFlipStatus(null);
    } finally {
      setFlipLoading(false);
    }
  };

  const handleToggleFlip = async () => {
    if (!savedCameraId) {
      Alert.alert('Ошибка', 'Сначала сохраните настройки камеры');
      return;
    }
    try {
      setFlipLoading(true);
      const newDirection = await imouSDK.toggleFrameReverse(savedCameraId);
      setFlipStatus(newDirection);
      Alert.alert('Успешно', `Камера ${newDirection === 'reverse' ? 'перевёрнута' : 'в нормальном положении'}`);
    } catch (e: any) {
      Alert.alert('Ошибка', `Не удалось изменить положение: ${e?.message}`);
    } finally {
      setFlipLoading(false);
    }
  };

  const handleOpenDiag = () => {
    try {
      const logStart = getLogStartTime();
      const logCount = getLogCount();
      console.log('[Diag] logStart:', logStart, typeof logStart);
      console.log('[Diag] logStart instanceof Date:', logStart instanceof Date);
      console.log('[Diag] logCount:', logCount);
      setDiagLogStart(logStart);
      setDiagLogCount(logCount);
      setDiagModalVisible(true);
    } catch (e: any) {
      console.error('[Diag] handleOpenDiag error:', e?.message, e?.stack);
    }
  };

  const handleSendDiag = async () => {
    try {
      console.log('[Diag] handleSendDiag start');
      const deviceInfo = await deviceStorage.getDeviceInfo();
      console.log('[Diag] deviceInfo:', JSON.stringify(deviceInfo));
      const machid = deviceInfo?.machid || 'unknown';
      console.log('[Diag] machid:', machid);
      setDiagUploading(true);
      try {
        console.log('[Diag] calling uploadDiagnostics...');
        const result = await uploadDiagnostics(machid);
        console.log('[Diag] uploadDiagnostics result:', JSON.stringify(result));
        setDiagModalVisible(false);
        if (result.success) {
          Alert.alert('Успешно', 'Диагностика отправлена в хранилище');
        } else {
          Alert.alert('Ошибка', `Не удалось отправить: ${result.error}`);
        }
      } catch (e: any) {
        console.error('[Diag] uploadDiagnostics exception:', e?.message, e?.stack);
        Alert.alert('Ошибка', e?.message || 'Неизвестная ошибка');
      } finally {
        setDiagUploading(false);
      }
    } catch (e: any) {
      console.error('[Diag] handleSendDiag outer exception:', e?.message, e?.stack);
    }
  };

  const handleSaveCameraSettings = async () => {
    const trimmedId = cameraDeviceId.trim();
    const trimmedPassword = cameraPassword.trim();
    if (!trimmedId) {
      Alert.alert('Ошибка', 'Введите серийный номер камеры');
      return;
    }
    if (trimmedId.length > 20) {
      Alert.alert('Ошибка', 'Серийный номер не должен превышать 20 символов');
      return;
    }
    if (!trimmedPassword) {
      Alert.alert('Ошибка', 'Введите код камеры');
      return;
    }

    try {
      const settings: CameraSettings = { 
        deviceId: trimmedId,
        password: trimmedPassword
      };
      await deviceStorage.saveCameraSettings(settings);
      setSavedCameraId(trimmedId);
      setSavedCameraPassword(cameraPassword.trim() || null);
      setCameraModalVisible(false);
      Alert.alert('Успешно', 'Настройки камеры сохранены');
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось сохранить настройки');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#fff' }] }>
      <View style={styles.navHeader}>
        <Text style={[styles.logoText, isTablet && styles.logoTextTablet]}>
          GoMarket Admin
        </Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            onPress={handleOpenDiag}
            style={[styles.diagButton, isTablet && styles.diagButtonTablet]}
          >
            <Text style={[styles.diagButtonText]}>Диагностика</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setCameraModalVisible(true);
              if (savedCameraId) {
                loadFlipStatus(savedCameraId);
              }
            }}
            style={[styles.cameraButton, isTablet && styles.cameraButtonTablet]}
          >
            <Text style={[styles.cameraButtonText, isTablet && styles.cameraButtonTextTablet]}>
              {savedCameraId ? 'Камера' : 'Камера'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={playUnlockSignal}
            style={[styles.unlockButton, isTablet && styles.unlockButtonTablet]}
          >
            <Text style={[styles.unlockButtonText, isTablet && styles.unlockButtonTextTablet]}>
              Открыть замок
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleLogout}
            style={[styles.logoutButton, isTablet && styles.logoutButtonTablet]}
          >
            <Text style={[styles.logoutButtonText, isTablet && styles.logoutButtonTextTablet]}>
              Выйти
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'invoices' && styles.tabButtonActive]}
          onPress={() => setActiveTab('invoices')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'invoices' && styles.tabButtonTextActive]}>Партии</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'distribute' && styles.tabButtonActive]}
          onPress={() => setActiveTab('distribute')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'distribute' && styles.tabButtonTextActive]}>Распределить</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.contentContainer}>
        {activeTab === 'invoices' ? <InvoicesTab /> : <DistributeTab />}
      </View>

      {/* Diagnostics Modal */}
      <Modal
        visible={diagModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDiagModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Диагностика</Text>
            <View style={styles.diagModalInfo}>
              <Text style={styles.diagModalInfoText}>
                <Text style={styles.diagModalInfoBold}>Логи с: </Text>
                {diagLogStart
                  ? (() => {
                      try {
                        return formatLogStartTime(diagLogStart);
                      } catch (e: any) {
                        console.error('[Diag] formatLogStartTime error:', e?.message, 'diagLogStart:', diagLogStart, typeof diagLogStart);
                        return String(diagLogStart);
                      }
                    })()
                  : '—'}
              </Text>
              <Text style={styles.diagModalInfoText}>
                <Text style={styles.diagModalInfoBold}>Записей: </Text>
                {diagLogCount}
              </Text>
            </View>
            <Text style={styles.modalHint}>
              Логи JS-процесса приложения за последний час. Отправить в хранилище?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => setDiagModalVisible(false)}
                disabled={diagUploading}
              >
                <Text style={styles.modalButtonTextCancel}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.diagModalButtonSend, diagUploading && { opacity: 0.6 }]}
                onPress={handleSendDiag}
                disabled={diagUploading}
              >
                {diagUploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.diagModalButtonTextSend}>Отправить</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Camera Settings Modal */}
      <Modal
        visible={cameraModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCameraModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Настройки камеры</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Серийный номер камеры"
              value={cameraDeviceId}
              onChangeText={setCameraDeviceId}
              maxLength={20}
              autoCapitalize="characters"
            />
            <Text style={styles.modalHint}>
              Макс. 20 символов. {savedCameraId ? `Текущий: ${savedCameraId}` : 'Камера не настроена'}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Код камеры"
              value={cameraPassword}
              onChangeText={setCameraPassword}
              maxLength={32}
              autoCapitalize="characters"
            />
            <Text style={styles.modalHint}>
              Макс. 32 символа. {savedCameraPassword ? `Текущий: ${savedCameraPassword}` : 'Код не настроен'}
            </Text>
            {savedCameraId && (
              <TouchableOpacity
                style={[styles.flipButton, flipLoading && styles.flipButtonDisabled]}
                onPress={handleToggleFlip}
                disabled={flipLoading}
              >
                {flipLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.flipButtonText}>
                    {flipStatus === 'reverse' ? 'Вернуть в норму' : 'Перевернуть камеру'}
                  </Text>
                )}
              </TouchableOpacity>
            )}
            {flipStatus && (
              <Text style={styles.flipStatusText}>
                Текущее положение: {flipStatus === 'normal' ? 'Нормальное' : 'Перевёрнутое'}
              </Text>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => setCameraModalVisible(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonSave}
                onPress={handleSaveCameraSettings}
              >
                <Text style={styles.modalButtonTextSave}>Сохранить</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};


export default AdminPanelScreen;