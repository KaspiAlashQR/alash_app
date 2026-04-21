
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Modal, TextInput, Alert, ActivityIndicator, ScrollView } from 'react-native';
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
import { checkForUpdate, downloadAndInstallApk } from '../services/updateService';
import type { UpdateInfo } from '../services/updateService';

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
  // Update styles
  updateButton: {
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#059669',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  updateButtonTablet: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  updateModalContent: {
    maxWidth: 480,
    width: '90%',
  },
  updateModalCenter: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  updateModalHint: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  updateModalError: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
  },
  updateModalGreen: {
    fontSize: 16,
    color: '#059669',
    fontWeight: '600',
    textAlign: 'center',
  },
  updateVersionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 12,
  },
  updateVersionBox: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    minWidth: 100,
  },
  updateVersionBoxNew: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#6ee7b7',
  },
  updateVersionLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: 2,
  },
  updateVersionValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  updateVersionValueNew: {
    color: '#059669',
  },
  updateVersionArrow: {
    fontSize: 20,
    color: '#9ca3af',
  },
  updateNotesScroll: {
    maxHeight: 120,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  updateNotesText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 20,
  },
  updateProgressContainer: {
    height: 24,
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  updateProgressBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#059669',
    borderRadius: 12,
  },
  updateProgressText: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
  },
  updateInstallButton: {
    flex: 1,
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  updateInstallButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  menuToggleButton: {
    backgroundColor: '#22223b',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#22223b',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  menuToggleText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  menuDropdown: {
    position: 'absolute',
    top: 70,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 8,
    minWidth: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 101,
  },
  menuItem: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 16,
    marginVertical: 4,
  },
  pinButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#f59e0b',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  pinButtonTablet: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  pinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [updateChecking, setUpdateChecking] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadInstalling, setDownloadInstalling] = useState(false);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);

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

  const handleOpenPinModal = async () => {
    const savedPin = await deviceStorage.getAdminPin();
    setCurrentPin(savedPin);
    setNewPin('');
    setConfirmPin('');
    setPinModalVisible(true);
  };

  const handleSavePin = async () => {
    if (newPin.length < 4) {
      Alert.alert('Ошибка', 'PIN должен содержать минимум 4 цифры');
      return;
    }
    if (newPin !== confirmPin) {
      Alert.alert('Ошибка', 'PIN-коды не совпадают');
      return;
    }
    try {
      await deviceStorage.saveAdminPin(newPin);
      setPinModalVisible(false);
      Alert.alert('Успешно', 'PIN-код изменён');
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message || 'Не удалось сохранить PIN');
    }
  };

  const handleOpenUpdateModal = async () => {
    setUpdateModalVisible(true);
    setUpdateInfo(null);
    setUpdateError(null);
    setDownloadProgress(0);
    setUpdateChecking(true);
    try {
      const info = await checkForUpdate();
      setUpdateInfo(info);
    } catch (e: any) {
      setUpdateError(e?.message || 'Ошибка проверки обновлений');
    } finally {
      setUpdateChecking(false);
    }
  };

  const handleInstallUpdate = async () => {
    if (!updateInfo) { return; }
    setDownloadInstalling(true);
    setDownloadProgress(0);
    try {
      await downloadAndInstallApk(updateInfo.downloadUrl, percent => {
        setDownloadProgress(percent);
      });
      setUpdateModalVisible(false);
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message || 'Не удалось скачать обновление');
    } finally {
      setDownloadInstalling(false);
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
            onPress={() => setMenuVisible(!menuVisible)}
            style={styles.menuToggleButton}
          >
            <Text style={styles.menuToggleText}>☰ Меню</Text>
          </TouchableOpacity>
        </View>
        {menuVisible && (
          <TouchableOpacity
            style={styles.menuOverlay}
            activeOpacity={1}
            onPress={() => setMenuVisible(false)}
          >
            <View style={styles.menuDropdown}>
              <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); handleOpenPinModal(); }}>
                <Text style={[styles.menuItemText, { color: '#f59e0b' }]}>🔑  Смена PIN</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); handleOpenDiag(); }}>
                <Text style={[styles.menuItemText, { color: '#6366f1' }]}>📊  Диагностика</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); handleOpenUpdateModal(); }}>
                <Text style={[styles.menuItemText, { color: '#059669' }]}>🔄  Обновление</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); setCameraModalVisible(true); if (savedCameraId) { loadFlipStatus(savedCameraId); } }}>
                <Text style={[styles.menuItemText, { color: '#3b82f6' }]}>📷  Камера</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); playUnlockSignal(); }}>
                <Text style={[styles.menuItemText, { color: '#10b981' }]}>🔓  Открыть замок</Text>
              </TouchableOpacity>
              <View style={styles.menuDivider} />
              <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); handleLogout(); }}>
                <Text style={[styles.menuItemText, { color: '#ef4444' }]}>🚪  Выйти</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
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

      {/* PIN Change Modal */}
      <Modal
        visible={pinModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPinModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Смена PIN-кода</Text>
            <Text style={styles.modalHint}>Текущий PIN: {currentPin}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Новый PIN-код"
              value={newPin}
              onChangeText={(v) => setNewPin(v.replace(/[^0-9]/g, ''))}
              keyboardType="numeric"
              secureTextEntry
              maxLength={6}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Повторите PIN-код"
              value={confirmPin}
              onChangeText={(v) => setConfirmPin(v.replace(/[^0-9]/g, ''))}
              keyboardType="numeric"
              secureTextEntry
              maxLength={6}
            />
            <Text style={styles.modalHint}>Минимум 4 цифры</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => setPinModalVisible(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonSave}
                onPress={handleSavePin}
              >
                <Text style={styles.modalButtonTextSave}>Сохранить</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Update Modal */}
      <Modal
        visible={updateModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => { if (!downloadInstalling) { setUpdateModalVisible(false); } }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.updateModalContent]}>
            <Text style={styles.modalTitle}>Обновление приложения</Text>
            {updateChecking && (
              <View style={styles.updateModalCenter}>
                <ActivityIndicator size="large" color="#059669" />
                <Text style={styles.updateModalHint}>Проверка обновлений...</Text>
              </View>
            )}
            {!updateChecking && !!updateError && (
              <View style={styles.updateModalCenter}>
                <Text style={styles.updateModalError}>{updateError}</Text>
              </View>
            )}
            {!updateChecking && updateInfo && !updateInfo.hasUpdate && (
              <View style={styles.updateModalCenter}>
                <Text style={styles.updateModalGreen}>✓ Установлена последняя версия</Text>
                <Text style={styles.updateModalHint}>Версия: {updateInfo.currentVersion}</Text>
              </View>
            )}
            {!updateChecking && updateInfo?.hasUpdate && (
              <>
                <View style={styles.updateVersionRow}>
                  <View style={styles.updateVersionBox}>
                    <Text style={styles.updateVersionLabel}>Текущая</Text>
                    <Text style={styles.updateVersionValue}>{updateInfo.currentVersion}</Text>
                  </View>
                  <Text style={styles.updateVersionArrow}>→</Text>
                  <View style={[styles.updateVersionBox, styles.updateVersionBoxNew]}>
                    <Text style={styles.updateVersionLabel}>Новая</Text>
                    <Text style={[styles.updateVersionValue, styles.updateVersionValueNew]}>{updateInfo.latestVersion}</Text>
                  </View>
                </View>
                {!!updateInfo.releaseNotes && (
                  <ScrollView style={styles.updateNotesScroll} nestedScrollEnabled>
                    <Text style={styles.updateNotesText}>{updateInfo.releaseNotes}</Text>
                  </ScrollView>
                )}
                {downloadInstalling && (
                  <View style={styles.updateProgressContainer}>
                    <View style={[styles.updateProgressBar, { width: `${downloadProgress}%` }]} />
                    <Text style={styles.updateProgressText}>{downloadProgress}%</Text>
                  </View>
                )}
              </>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => setUpdateModalVisible(false)}
                disabled={downloadInstalling}
              >
                <Text style={styles.modalButtonTextCancel}>Закрыть</Text>
              </TouchableOpacity>
              {!updateChecking && updateInfo?.hasUpdate && (
                <TouchableOpacity
                  style={[styles.updateInstallButton, downloadInstalling && { opacity: 0.6 }]}
                  onPress={handleInstallUpdate}
                  disabled={downloadInstalling}
                >
                  {downloadInstalling ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.updateInstallButtonText}>Установить</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};


export default AdminPanelScreen;