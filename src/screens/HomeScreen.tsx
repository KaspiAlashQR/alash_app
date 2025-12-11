import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { deviceStorage } from '../api/storage';
import { DeviceInfo, Product, isApiError, isProductsResponse } from '../api/types';
import { alashCloudAPI } from '../api/client';
import { cartService } from '../services/cartService';
import DeviceHeader from '../components/DeviceHeader';
import CustomerProductCard from '../components/CustomerProductCard';

type RootStackParamList = {
  Home: undefined;
  Auth: undefined;
  AdminPanel: undefined;
  InitialSetup: undefined;
  Cart: undefined;
};

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

const { width } = Dimensions.get('window');
const isTablet = width > 600;

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [cartItemCount, setCartItemCount] = useState(0);

  useEffect(() => {
    checkDeviceSetup();
    
    // Подписываемся на изменения корзины
    const unsubscribe = cartService.subscribe((cart) => {
      setCartItemCount(cartService.getTotalItems());
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!isSetupComplete || !deviceInfo) return;

    // Автообновление товаров каждые 30 секунд
    const refreshInterval = setInterval(() => {
      loadProducts(deviceInfo.device_id);
    }, 30000);

    return () => clearInterval(refreshInterval);
  }, [isSetupComplete, deviceInfo]);

  const checkDeviceSetup = async () => {
    try {
      setIsLoading(true);

      const setupComplete = await deviceStorage.isSetupComplete();
      
      if (setupComplete) {
        const storedDeviceInfo = await deviceStorage.getDeviceInfo();
        
        if (storedDeviceInfo) {
          setDeviceInfo(storedDeviceInfo);
          setIsSetupComplete(true);
          await loadProducts(storedDeviceInfo.device_id);
        } else {
          await deviceStorage.clearAllData();
          setIsSetupComplete(false);
        }
      } else {
        setIsSetupComplete(false);
      }
    } catch (error) {
      console.error('Ошибка при проверке настройки устройства:', error);
      setIsSetupComplete(false);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProducts = async (deviceId: number) => {
    try {
      const response = await alashCloudAPI.getDevicePrices(deviceId);
      
      if (isApiError(response)) {
        console.error('Ошибка API:', response.error);
        Alert.alert('Ошибка', 'Не удалось загрузить товары');
        return;
      }

      if (isProductsResponse(response)) {
        setProducts(response.rows || []);
      } else {
        console.error('Неожиданный формат ответа:', response);
      }
    } catch (error) {
      console.error('Ошибка загрузки товаров:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить товары');
    }
  };

  const handleAdminAccess = () => {
    navigation.navigate('Auth');
  };

  const handleGoToSetup = () => {
    navigation.navigate('InitialSetup');
  };

  const handleGoToCart = () => {
    navigation.navigate('Cart');
  };

  // Показываем загрузку
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3182CE" />
          <Text style={[styles.loadingText, isTablet && styles.loadingTextTablet]}>
            Проверка настроек...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Если настройка не завершена - показываем экран для перехода к настройке
  if (!isSetupComplete) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.setupContainer}>
          <Text style={[styles.welcomeTitle, isTablet && styles.welcomeTitleTablet]}>
            Добро пожаловать в AlashCloud
          </Text>
          
          <Text style={[styles.setupMessage, isTablet && styles.setupMessageTablet]}>
            Для начала работы необходимо подключить ваше устройство к системе
          </Text>
          
          <TouchableOpacity
            style={[styles.setupButton, isTablet && styles.setupButtonTablet]}
            onPress={handleGoToSetup}
          >
            <Text style={[styles.setupButtonText, isTablet && styles.setupButtonTextTablet]}>
              Настроить устройство
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }


  return (
    <SafeAreaView style={styles.container}>
      {deviceInfo && (
        <DeviceHeader 
          deviceInfo={deviceInfo} 
          onAdminAccess={handleAdminAccess}
        />
      )}

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.contentSection}>
          {products.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, isTablet && styles.emptyTextTablet]}>
                Нет товаров для отображения
              </Text>
            </View>
          ) : (
            <View style={styles.productsGrid}>
              {(() => {
                const rows = [];
                const perRow = 3;
                for (let i = 0; i < products.length; i += perRow) {
                  const rowItems = products.slice(i, i + perRow);
                  rows.push(
                    <View key={i} style={{ flexDirection: 'row', width: '100%', marginBottom: 16 }}>
                      {rowItems.map((product) => (
                        <View key={product.id} style={{ flex: 1, marginHorizontal: 4 }}>
                          <CustomerProductCard product={product} />
                        </View>
                      ))}
                      {/* Добавляем пустые View для выравнивания */}
                      {Array.from({ length: perRow - rowItems.length }).map((_, idx) => (
                        <View key={`empty-${i}-${idx}`} style={{ flex: 1, marginHorizontal: 4 }} />
                      ))}
                    </View>
                  );
                }
                return rows;
              })()}
            </View>
          )}
        </View>
      </ScrollView>

      {cartItemCount > 0 && (
        <TouchableOpacity
          style={[styles.cartButton, isTablet && styles.cartButtonTablet]}
          onPress={handleGoToCart}
        >
          <Text style={[styles.cartButtonText, isTablet && styles.cartButtonTextTablet]}>
            🛒 Корзина ({cartItemCount})
          </Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#4A5568',
  },
  loadingTextTablet: {
    fontSize: 20,
  },
  setupContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A202C',
    textAlign: 'center',
    marginBottom: 16,
  },
  welcomeTitleTablet: {
    fontSize: 32,
  },
  setupMessage: {
    fontSize: 16,
    color: '#4A5568',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  setupMessageTablet: {
    fontSize: 20,
    lineHeight: 30,
  },
  setupButton: {
    backgroundColor: '#3182CE',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  setupButtonTablet: {
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderRadius: 16,
  },
  setupButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  setupButtonTextTablet: {
    fontSize: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 80,
  },
  contentSection: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#64748b',
    textAlign: 'center',
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
  cartButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#16a34a',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cartButtonTablet: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    bottom: 32,
    right: 32,
  },
  cartButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cartButtonTextTablet: {
    fontSize: 18,
  },
});

export default HomeScreen;