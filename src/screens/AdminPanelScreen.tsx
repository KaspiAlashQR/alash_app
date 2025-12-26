import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions, Alert, ActivityIndicator, Platform, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { KioskModule, KioskStatus } from '../utils/KioskModule';
import { alashCloudAPI } from '../api/client';
import { deviceStorage } from '../api/storage';
import { Product, isApiError, isProductsResponse, DeviceInfo } from '../api/types';
import { API_CONFIG } from '../api/config';
import ProductCard from '../components/ProductCard';
import CustomerProductCard from '../components/CustomerProductCard';
import { RootStackParamList } from '../utils/navigation.types';
import StatisticsTab from '../components/admin/StatisticsTab';

type AdminPanelScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AdminPanel'>;

interface AdminPanelScreenProps {
  navigation: AdminPanelScreenNavigationProp;
}

const { width } = Dimensions.get('window');
const isTablet = width > 600;

const AdminPanelScreen: React.FC<AdminPanelScreenProps> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<'products' | 'statistics'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deviceId, setDeviceId] = useState<number | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [kioskModalVisible, setKioskModalVisible] = useState(false);
  const [editQuantityModalVisible, setEditQuantityModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editQuantity, setEditQuantity] = useState('');
  const [availableQuantity, setAvailableQuantity] = useState<number | null>(null);
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
        await KioskModule.enableKioskMode();
      }
    } catch (error) {
      console.warn('Ошибка включения киоск режима:', error);
    }
    navigation.navigate('Home');
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!deviceId || !deviceInfo) return;

    Alert.alert(
      'Удалить товар',
      `Вы уверены, что хотите удалить товар "${product.name_ru || product.name || ''}"? Товар вернется на склад.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              // Проверяем наличие invoice_product_id
              if (!product.invoice_product_id) {
                Alert.alert('Ошибка', `Товар не содержит invoice_product_id. ID товара: ${product.id}`);
                return;
              }

              const requestData = [
                {
                  invoice_product_id: product.invoice_product_id,
                  quantity: 0
                }
              ];
              
              const response = await alashCloudAPI.assignProducts(deviceInfo.device_id, requestData);
              
              if (response && isApiError(response)) {
                Alert.alert('Ошибка', response.error || 'Не удалось удалить товар');
              } else if (response && 'OK' in response && !response.OK) {
                Alert.alert('Ошибка', response.error || 'Не удалось удалить товар');
              } else {
                Alert.alert('Успех', 'Товар успешно удален', [
                  {
                    text: 'OK',
                    onPress: async () => {
                      await loadProducts(deviceInfo.device_id);
                    }
                  }
                ]);
              }
            } catch (error) {
              console.error('Ошибка удаления товара:', error);
              Alert.alert('Ошибка', 'Не удалось удалить товар: ' + (error instanceof Error ? error.message : String(error)));
            }
          }
        }
      ]
    );
  };

  const handleEditProduct = async (product: Product) => {
    setEditingProduct(product);
    setEditQuantity(product.quantity.toString());
    setAvailableQuantity(null);
    setEditQuantityModalVisible(true);
    
    // Загружаем доступные товары, чтобы получить available_quantity
    if (deviceInfo) {
      try {
        const response = await alashCloudAPI.getAvailableProducts(deviceInfo.device_id);
        if (!isApiError(response) && response.rows) {
          const availableProduct = response.rows.find(
            (ap) => ap.id === product.invoice_product_id
          );
          if (availableProduct) {
            setAvailableQuantity(availableProduct.available_quantity);
          }
        }
      } catch (error) {
        console.error('Ошибка загрузки доступных товаров:', error);
      }
    }
  };

  const handleSaveQuantity = async () => {
    if (!editingProduct || !deviceInfo) return;
    
    const newQuantity = parseInt(editQuantity, 10);
    if (isNaN(newQuantity) || newQuantity < 0) {
      Alert.alert('Ошибка', 'Введите корректное количество');
      return;
    }

    // Проверяем доступное количество на складе (только если увеличиваем)
    if (newQuantity > editingProduct.quantity && availableQuantity !== null) {
      const additionalNeeded = newQuantity - editingProduct.quantity;
      if (additionalNeeded > availableQuantity) {
        Alert.alert(
          'Ошибка', 
          `Недостаточно товара на складе. Нужно дополнительно: ${additionalNeeded} шт, доступно на складе: ${availableQuantity} шт`
        );
        return;
      }
    }

    try {
      const response = await alashCloudAPI.assignProducts(deviceInfo.device_id, [
        {
          invoice_product_id: editingProduct.invoice_product_id,
          quantity: newQuantity
        }
      ]);
      
      if (response && isApiError(response)) {
        Alert.alert('Ошибка', response.error || 'Не удалось обновить товар');
      } else if (response && 'OK' in response && !response.OK) {
        Alert.alert('Ошибка', response.error || 'Не удалось обновить товар');
      } else {
        setEditQuantityModalVisible(false);
        setEditingProduct(null);
        Alert.alert('Успех', 'Количество товара обновлено', [
          {
            text: 'OK',
            onPress: async () => {
              await loadProducts(deviceInfo.device_id);
            }
          }
        ]);
      }
    } catch (error) {
      console.error('Ошибка обновления товара:', error);
      Alert.alert('Ошибка', 'Не удалось обновить товар');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.navHeader}>
          <Text style={[styles.logoText, isTablet && styles.logoTextTablet]}>
            GoMarket Admin
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
          GoMarket Admin
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

      {/* Табы */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'products' && styles.tabActive]}
          onPress={() => setActiveTab('products')}
        >
          <Text style={[styles.tabText, activeTab === 'products' && styles.tabTextActive]}>
            Товары
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'statistics' && styles.tabActive]}
          onPress={() => setActiveTab('statistics')}
        >
          <Text style={[styles.tabText, activeTab === 'statistics' && styles.tabTextActive]}>
            Статистика
          </Text>
        </TouchableOpacity>
      </View>

      {/* Контент табов */}
      {activeTab === 'products' && (
        <>
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.contentSection}>
          {products.length === 0 ? (
            <View style={styles.centerContainer}>
              <Text style={[styles.emptyText, isTablet && styles.emptyTextTablet]}>
                Нет товаров для отображения
              </Text>
            </View>
          ) : (
            <View style={styles.productsContainer}>
              {(() => {
                const rows = [];
                for (let i = 0; i < products.length; i += 3) {
                  rows.push(
                    <View key={i} style={styles.productsRow}>
                      {products[i] && (
                        <View style={styles.productWrapper}>
                          <CustomerProductCard product={products[i]} readOnly={true} />
                          <View style={styles.adminActions}>
                            <TouchableOpacity
                              style={styles.editButton}
                              onPress={() => handleEditProduct(products[i])}
                            >
                              <Text style={styles.editButtonText}>Изменить количество</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.deleteButton}
                              onPress={() => handleDeleteProduct(products[i])}
                            >
                              <Text style={styles.deleteButtonText}>Удалить</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                      {products[i + 1] && (
                        <View style={styles.productWrapper}>
                          <CustomerProductCard product={products[i + 1]} readOnly={true} />
                          <View style={styles.adminActions}>
                            <TouchableOpacity
                              style={styles.editButton}
                              onPress={() => handleEditProduct(products[i + 1])}
                            >
                              <Text style={styles.editButtonText}>Изменить количество</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.deleteButton}
                              onPress={() => handleDeleteProduct(products[i + 1])}
                            >
                              <Text style={styles.deleteButtonText}>Удалить</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                      {products[i + 2] && (
                        <View style={styles.productWrapper}>
                          <CustomerProductCard product={products[i + 2]} readOnly={true} />
                          <View style={styles.adminActions}>
                            <TouchableOpacity
                              style={styles.editButton}
                              onPress={() => handleEditProduct(products[i + 2])}
                            >
                              <Text style={styles.editButtonText}>Изменить количество</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.deleteButton}
                              onPress={() => handleDeleteProduct(products[i + 2])}
                            >
                              <Text style={styles.deleteButtonText}>Удалить</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                }
                return rows;
              })()}
            </View>
          )}
        </View>
      </ScrollView>
        </>
      )}

      {activeTab === 'statistics' && <StatisticsTab />}

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

      {/* Модал для редактирования количества */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editQuantityModalVisible}
        onRequestClose={() => setEditQuantityModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.editQuantityModalContent, isTablet && styles.editQuantityModalContentTablet]}>
            <Text style={[styles.editQuantityModalTitle, isTablet && styles.editQuantityModalTitleTablet]}>
              Изменить количество
            </Text>
            
            {editingProduct && (
              <>
                <Text style={[styles.editQuantityInfo, isTablet && styles.editQuantityInfoTablet]}>
                  Товар: {editingProduct.name_ru || editingProduct.name || ''}
                </Text>
                <Text style={[styles.editQuantityInfo, isTablet && styles.editQuantityInfoTablet]}>
                  Назначено на устройство: {editingProduct.quantity} шт
                </Text>
                <Text style={[styles.editQuantityInfo, isTablet && styles.editQuantityInfoTablet]}>
                  Остаток на устройстве: {editingProduct.remaining_quantity} шт
                </Text>
                <Text style={[styles.editQuantityInfo, isTablet && styles.editQuantityInfoTablet]}>
                  Остаток на складе: {availableQuantity !== null ? `${availableQuantity} шт` : 'Загрузка...'}
                </Text>
                
                <TextInput
                  style={[styles.editQuantityInput, isTablet && styles.editQuantityInputTablet]}
                  value={editQuantity}
                  onChangeText={setEditQuantity}
                  keyboardType="numeric"
                  placeholder="Введите количество"
                  placeholderTextColor="#9ca3af"
                />
                
                <View style={styles.editQuantityButtons}>
                  <TouchableOpacity
                    style={[styles.editQuantityCancelButton, isTablet && styles.editQuantityCancelButtonTablet]}
                    onPress={() => {
                      setEditQuantityModalVisible(false);
                      setEditingProduct(null);
                      setEditQuantity('');
                    }}
                  >
                    <Text style={styles.editQuantityCancelButtonText}>Отмена</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.editQuantitySaveButton, isTablet && styles.editQuantitySaveButtonTablet]}
                    onPress={handleSaveQuantity}
                  >
                    <Text style={styles.editQuantitySaveButtonText}>Сохранить</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
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
    paddingHorizontal: isTablet ? 20 : 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 4,
    marginHorizontal: isTablet ? 20 : 16,
    marginTop: 16,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#FF8A50',
  },
  tabText: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#fff',
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
    paddingHorizontal: isTablet ? 12 : 8,
    paddingVertical: isTablet ? 12 : 8,
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
  productsContainer: {
    width: 800,
    alignSelf: 'center',
  },
  productsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  productWrapper: {
    width: 240,
    marginRight: 40,
  },
  adminActions: {
    marginTop: 8,
    gap: 8,
  },
  editButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
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
  editQuantityModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 500,
    elevation: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  editQuantityModalContentTablet: {
    padding: 32,
    maxWidth: 600,
  },
  editQuantityModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  editQuantityModalTitleTablet: {
    fontSize: 24,
    marginBottom: 20,
  },
  editQuantityInfo: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  editQuantityInfoTablet: {
    fontSize: 16,
  },
  editQuantityInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#374151',
    marginTop: 16,
    marginBottom: 20,
  },
  editQuantityInputTablet: {
    paddingVertical: 14,
    fontSize: 18,
  },
  editQuantityButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  editQuantityCancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  editQuantityCancelButtonTablet: {
    paddingVertical: 14,
  },
  editQuantityCancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  editQuantitySaveButton: {
    flex: 1,
    backgroundColor: '#FF8A50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  editQuantitySaveButtonTablet: {
    paddingVertical: 14,
  },
  editQuantitySaveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AdminPanelScreen;