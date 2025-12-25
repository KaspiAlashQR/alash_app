import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions, Alert, ActivityIndicator, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { KioskModule, KioskStatus } from '../utils/KioskModule';
import { alashCloudAPI } from '../api/client';
import { deviceStorage } from '../api/storage';
import { Product, isApiError, isProductsResponse, DeviceInfo } from '../api/types';
import ProductCard from '../components/ProductCard';
import { RootStackParamList } from '../utils/navigation.types';

type AdminPanelScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AdminPanel'>;

interface AdminPanelScreenProps {
  navigation: AdminPanelScreenNavigationProp;
}

const { width } = Dimensions.get('window');
const isTablet = width > 600;

const AdminPanelScreen: React.FC<AdminPanelScreenProps> = ({ navigation }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deviceId, setDeviceId] = useState<number | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [kioskModalVisible, setKioskModalVisible] = useState(false);
  const [kioskStatus, setKioskStatus] = useState<KioskStatus>({
    lockTaskMode: false,
    fullscreenMode: false,
    homeButtonBlocked: false,
    backButtonBlocked: false,
    menuButtonBlocked: false,
    recentAppsBlocked: false,
    landscapeOrientation: true,
    keyguardDisabled: false,
    defaultLauncher: false,
    autoStart: false
  });

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadDeviceAndProducts();
      checkKioskStatus();
    });

    return unsubscribe;
  }, [navigation]);

  const loadDeviceAndProducts = async () => {
    setIsLoading(true);
    try {
      const storedDeviceInfo = await deviceStorage.getDeviceInfo();
      if (storedDeviceInfo) {
        setDeviceInfo(storedDeviceInfo);
        setDeviceId(storedDeviceInfo.device_id);
        await loadProducts(storedDeviceInfo.device_id);
      } else {
        Alert.alert('Ошибка', 'Информация об устройстве не найдена');
      }
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить данные');
    } finally {
      setIsLoading(false);
    }
  };

  const loadProducts = async (deviceId: number) => {
    try {
      const response = await alashCloudAPI.getDevicePrices(deviceId);
      
      if (isApiError(response)) {
        console.error('Ошибка API:', response.error);
        Alert.alert('Ошибка', response.error || 'Не удалось загрузить товары');
        return;
      }

      if (isProductsResponse(response)) {
        setProducts(response.rows || []);
      } else {
        console.error('Неожиданный формат ответа:', response);
        Alert.alert('Ошибка', 'Неожиданный формат данных от сервера');
      }
    } catch (error) {
      console.error('Ошибка загрузки товаров:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить товары');
    }
  };

  const handleRefresh = () => {
    if (deviceId) {
      loadProducts(deviceId);
    }
  };

  const checkKioskStatus = async () => {
    try {
      const status = await KioskModule.getKioskStatus();
      setKioskStatus(status);
    } catch (error) {
      console.error('Ошибка проверки статуса киоска:', error);
      // Fallback к простой проверке
      try {
        const isEnabled = await KioskModule.isKioskModeEnabled();
        setKioskStatus(prev => ({
          ...prev,
          lockTaskMode: isEnabled,
          fullscreenMode: isEnabled,
          homeButtonBlocked: isEnabled,
          backButtonBlocked: isEnabled,
          menuButtonBlocked: isEnabled,
          recentAppsBlocked: isEnabled
        }));
      } catch (fallbackError) {
        console.error('Ошибка fallback проверки:', fallbackError);
      }
    }
  };

  const handleToggleKioskMode = async () => {
    try {
      if (kioskStatus.lockTaskMode) {
        await KioskModule.disableKioskMode();
        Alert.alert('Успех', 'Киоск-режим отключен');
      } else {
        await KioskModule.enableKioskMode();
        Alert.alert('Успех', 'Киоск-режим включен');
      }
      await checkKioskStatus();
    } catch (error) {
      console.error('Ошибка переключения киоск-режима:', error);
      Alert.alert('Ошибка', 'Не удалось переключить киоск-режим');
    }
  };

  const handleShowKioskModal = async () => {
    await checkKioskStatus();
    setKioskModalVisible(true);
  };

  const handleLogout = async () => {
    try {
      if (Platform.OS === 'android') {
        console.log('Включаем киоск режим при выходе из админки');
        await KioskModule.enableKioskMode();
        console.log('Киоск режим включен');
      }
    } catch (error) {
      console.warn('Ошибка включения киоск режима:', error);
    }
    navigation.navigate('Home');
  };

  const handleDeleteProduct = async (productId: number) => {
    if (!deviceId) return;

    Alert.alert(
      'Удалить товар',
      'Вы уверены, что хотите удалить этот товар?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Удаление товара ID:', productId);
              const response = await alashCloudAPI.deleteProduct(productId);
              console.log('Ответ API:', response);
              
              if (response && isApiError(response)) {
                console.error('API Error:', response.error);
                Alert.alert('Ошибка', response.error || 'Не удалось удалить товар');
              } else {
                Alert.alert('Успех', 'Товар успешно удален', [
                  {
                    text: 'OK',
                    onPress: async () => {
                      await loadProducts(deviceId);
                    }
                  }
                ]);
              }
            } catch (error) {
              console.error('Ошибка удаления товара:', error);
              Alert.alert('Ошибка', 'Не удалось удалить товар');
            }
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.navHeader}>
          <Text style={[styles.logoText, isTablet && styles.logoTextTablet]}>
            AlashCloud Admin
          </Text>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FF8A50" />
          <Text style={[styles.loadingText, isTablet && styles.loadingTextTablet]}>
            Загрузка...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#fff' }] }>
      <View style={styles.navHeader}>
        <Text style={[styles.logoText, isTablet && styles.logoTextTablet]}>
          AlashCloud Admin
        </Text>
        
        <TouchableOpacity
          onPress={handleLogout}
          style={[styles.logoutButton, isTablet && styles.logoutButtonTablet]}
        >
          <Text style={[styles.logoutButtonText, isTablet && styles.logoutButtonTextTablet]}>
            Выйти
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.contentSection}>
          {products.length === 0 ? (
            <View style={styles.centerContainer}>
              <Text style={[styles.emptyText, isTablet && styles.emptyTextTablet]}>
                Нет товаров для отображения
              </Text>
            </View>
          ) : (
            <View style={styles.productsGrid}>
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onEdit={(product) => navigation.navigate('AddProduct', { mode: 'edit', product })}
                  onDelete={(product) => handleDeleteProduct(product.id)}
                  showActions={true}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Кнопка скрыта по требованию, оставить для будущего */}
      <TouchableOpacity
        style={[styles.floatingAddButton, { display: 'none' }, isTablet && styles.floatingAddButtonTablet]}
        disabled
      >
        <Text style={[styles.floatingAddButtonText, isTablet && styles.floatingAddButtonTextTablet]}>
          + Добавить товар
        </Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={kioskModalVisible}
        onRequestClose={() => setKioskModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isTablet && styles.modalContentTablet]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isTablet && styles.modalTitleTablet]}>
                🛡️ Статус Киоск-режима
              </Text>
              <TouchableOpacity
                onPress={() => setKioskModalVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScrollView}>
              <View style={styles.statusItem}>
                <Text style={[styles.statusLabel, isTablet && styles.statusLabelTablet]}>
                  🔒 Lock Task Mode (Привязка к приложению)
                </Text>
                <View style={[styles.statusIndicator, kioskStatus.lockTaskMode && styles.statusActive]}>
                  <Text style={[styles.statusText, kioskStatus.lockTaskMode && styles.statusTextActive]}>
                    {kioskStatus.lockTaskMode ? 'АКТИВНО' : 'ОТКЛЮЧЕНО'}
                  </Text>
                </View>
              </View>

              <View style={styles.statusItem}>
                <Text style={[styles.statusLabel, isTablet && styles.statusLabelTablet]}>
                  🖼️ Полноэкранный режим
                </Text>
                <View style={[styles.statusIndicator, kioskStatus.fullscreenMode && styles.statusActive]}>
                  <Text style={[styles.statusText, kioskStatus.fullscreenMode && styles.statusTextActive]}>
                    {kioskStatus.fullscreenMode ? 'АКТИВНО' : 'ОТКЛЮЧЕНО'}
                  </Text>
                </View>
              </View>

              <View style={styles.statusItem}>
                <Text style={[styles.statusLabel, isTablet && styles.statusLabelTablet]}>
                  ⛔ Блокировка кнопки Home
                </Text>
                <View style={[styles.statusIndicator, kioskStatus.homeButtonBlocked && styles.statusActive]}>
                  <Text style={[styles.statusText, kioskStatus.homeButtonBlocked && styles.statusTextActive]}>
                    {kioskStatus.homeButtonBlocked ? 'ЗАБЛОКИРОВАНО' : 'РАЗРЕШЕНО'}
                  </Text>
                </View>
              </View>

              <View style={styles.statusItem}>
                <Text style={[styles.statusLabel, isTablet && styles.statusLabelTablet]}>
                  ⛔ Блокировка кнопки Back
                </Text>
                <View style={[styles.statusIndicator, kioskStatus.backButtonBlocked && styles.statusActive]}>
                  <Text style={[styles.statusText, kioskStatus.backButtonBlocked && styles.statusTextActive]}>
                    {kioskStatus.backButtonBlocked ? 'ЗАБЛОКИРОВАНО' : 'РАЗРЕШЕНО'}
                  </Text>
                </View>
              </View>

              <View style={styles.statusItem}>
                <Text style={[styles.statusLabel, isTablet && styles.statusLabelTablet]}>
                  ⛔ Блокировка кнопки Menu
                </Text>
                <View style={[styles.statusIndicator, kioskStatus.menuButtonBlocked && styles.statusActive]}>
                  <Text style={[styles.statusText, kioskStatus.menuButtonBlocked && styles.statusTextActive]}>
                    {kioskStatus.menuButtonBlocked ? 'ЗАБЛОКИРОВАНО' : 'РАЗРЕШЕНО'}
                  </Text>
                </View>
              </View>

              <View style={styles.statusItem}>
                <Text style={[styles.statusLabel, isTablet && styles.statusLabelTablet]}>
                  ⛔ Блокировка Recent Apps
                </Text>
                <View style={[styles.statusIndicator, kioskStatus.recentAppsBlocked && styles.statusActive]}>
                  <Text style={[styles.statusText, kioskStatus.recentAppsBlocked && styles.statusTextActive]}>
                    {kioskStatus.recentAppsBlocked ? 'ЗАБЛОКИРОВАНО' : 'РАЗРЕШЕНО'}
                  </Text>
                </View>
              </View>

              <View style={styles.statusItem}>
                <Text style={[styles.statusLabel, isTablet && styles.statusLabelTablet]}>
                  🔄 Горизонтальная ориентация
                </Text>
                <View style={[styles.statusIndicator, kioskStatus.landscapeOrientation && styles.statusActive]}>
                  <Text style={[styles.statusText, kioskStatus.landscapeOrientation && styles.statusTextActive]}>
                    {kioskStatus.landscapeOrientation ? 'ЗАФИКСИРОВАНО' : 'СВОБОДНО'}
                  </Text>
                </View>
              </View>

              <View style={styles.statusItem}>
                <Text style={[styles.statusLabel, isTablet && styles.statusLabelTablet]}>
                  🚪 Отключение экрана блокировки
                </Text>
                <View style={[styles.statusIndicator, kioskStatus.keyguardDisabled && styles.statusActive]}>
                  <Text style={[styles.statusText, kioskStatus.keyguardDisabled && styles.statusTextActive]}>
                    {kioskStatus.keyguardDisabled ? 'ОТКЛЮЧЕН' : 'АКТИВНЫЙ'}
                  </Text>
                </View>
              </View>

              <View style={styles.statusItem}>
                <Text style={[styles.statusLabel, isTablet && styles.statusLabelTablet]}>
                  🏠 Установка как дефолтный launcher
                </Text>
                <View style={[styles.statusIndicator, kioskStatus.defaultLauncher && styles.statusActive]}>
                  <Text style={[styles.statusText, kioskStatus.defaultLauncher && styles.statusTextActive]}>
                    {kioskStatus.defaultLauncher ? 'УСТАНОВЛЕНО' : 'НЕ УСТАНОВЛЕНО'}
                  </Text>
                </View>
              </View>

              <View style={styles.statusItem}>
                <Text style={[styles.statusLabel, isTablet && styles.statusLabelTablet]}>
                  🚀 Автозапуск после перезагрузки
                </Text>
                <View style={[styles.statusIndicator, kioskStatus.autoStart && styles.statusActive]}>
                  <Text style={[styles.statusText, kioskStatus.autoStart && styles.statusTextActive]}>
                    {kioskStatus.autoStart ? 'АКТИВНО' : 'ОТКЛЮЧЕНО'}
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                onPress={handleToggleKioskMode}
                style={[styles.modalToggleButton, kioskStatus.lockTaskMode && styles.modalToggleButtonActive]}
              >
                <Text style={[styles.modalToggleButtonText, kioskStatus.lockTaskMode && styles.modalToggleButtonTextActive]}>
                  {kioskStatus.lockTaskMode ? '🔓 Отключить Киоск-режим' : '🔒 Включить Киоск-режим'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 80, // Space for floating button
  },
  navHeader: {
    backgroundColor: '#fff',
    paddingHorizontal: 0,
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
    backgroundColor: '#3b82f6',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#3b82f6',
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
  contentSection: {
    flex: 1,
    paddingHorizontal: 0,
    paddingVertical: 0,
    backgroundColor: 'transparent',
    borderRadius: 0,
    margin: 0,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  loadingTextTablet: {
    fontSize: 18,
  },
  emptyText: {
    fontSize: 18,
    color: '#6b7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  emptyTextTablet: {
    fontSize: 20,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  floatingAddButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#FF6B35',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#FF6B35',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingAddButtonTablet: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    bottom: 32,
    right: 32,
  },
  floatingAddButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  floatingAddButtonTextTablet: {
    fontSize: 18,
  },
  kioskControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  kioskButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  kioskButtonTablet: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
  },
  kioskButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  kioskButtonTextTablet: {
    fontSize: 18,
  },
  kioskToggleButton: {
    backgroundColor: '#FF8A50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  kioskToggleButtonActive: {
    backgroundColor: '#dc2626',
  },
  kioskToggleButtonTablet: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
  },
  kioskToggleButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  kioskToggleButtonTextActive: {
    color: '#ffffff',
  },
  kioskToggleButtonTextTablet: {
    fontSize: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    maxHeight: '90%',
    width: '100%',
    maxWidth: 600,
    elevation: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalContentTablet: {
    maxWidth: 800,
    borderRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalTitleTablet: {
    fontSize: 22,
  },
  closeButton: {
    padding: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: 'bold',
  },
  modalScrollView: {
    maxHeight: 400,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  statusLabel: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
    paddingRight: 12,
  },
  statusLabelTablet: {
    fontSize: 16,
  },
  statusIndicator: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  statusActive: {
    backgroundColor: '#dcfce7',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  statusTextActive: {
    color: '#FF8A50',
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  modalToggleButton: {
    backgroundColor: '#FF8A50',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalToggleButtonActive: {
    backgroundColor: '#dc2626',
  },
  modalToggleButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalToggleButtonTextActive: {
    color: '#ffffff',
  },
});

export default AdminPanelScreen;