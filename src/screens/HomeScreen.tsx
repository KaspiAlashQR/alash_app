import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator, ScrollView, Alert, NativeModules } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { deviceStorage } from '../api/storage';
import { DeviceInfo, Product, isApiError, isProductsResponse } from '../api/types';
import { alashCloudAPI } from '../api/client';
import { cartService } from '../services/cartService';
import { deviceCommandSocket, DeviceSocketStatus } from '../services/deviceCommandSocket';

import DeviceHeader from '../components/DeviceHeader';
import CustomerProductCard from '../components/CustomerProductCard';
import CategorySidebar from '../components/CategorySidebar';


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


type CategoryType = string;
function getCategoriesFromProducts(products: Product[]): CategoryType[] {
  const set = new Set<string>();
  products.forEach((p: Product) => {
    if (p.category && typeof p.category === 'string' && p.category.trim() !== '' && (p.totalRemaining || p.remaining_quantity || 0) > 0) {
      set.add(p.category.trim());
    }
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'ru'));
}

function groupProductsByPriority(products: Product[]): Product[] {
  const productMap = new Map<number, Product[]>();

  products.forEach(product => {
    if (!productMap.has(product.product_id)) {
      productMap.set(product.product_id, []);
    }
    productMap.get(product.product_id)!.push(product);
  });

  const groupedProducts: Product[] = [];
  productMap.forEach(productVariants => {
    productVariants.sort((a, b) => a.priority - b.priority);

    const bestVariant = productVariants[0];
    const totalRemaining = productVariants.reduce((sum, p) => sum + (p.remaining_quantity || 0), 0);

    const displayProduct: Product = {
      ...bestVariant,
      name: bestVariant.product_name,
      name_ru: bestVariant.product_name,
      name_kz: '',
      amount: bestVariant.selling_price,
      url: bestVariant.image_url,
      invoice_product_id: bestVariant.batch_product_id,
      allBatches: productVariants,
      totalRemaining: totalRemaining,
    };

    groupedProducts.push(displayProduct);
  });

  return groupedProducts;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [socketStatus, setSocketStatus] = useState<DeviceSocketStatus>(deviceCommandSocket.getStatus());
  const unlockAlertVisibleRef = useRef(false);

  useEffect(() => {
    checkDeviceSetup();

    const unsubscribe = cartService.subscribe((cart) => {
      setCartItemCount(cartService.getTotalItems());
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!isSetupComplete || !deviceInfo) return;

    const refreshInterval = setInterval(() => {
      loadProducts(deviceInfo.device_id);
    }, 30000);

    return () => clearInterval(refreshInterval);
  }, [isSetupComplete, deviceInfo]);

  useEffect(() => {
    const unsubscribeStatus = deviceCommandSocket.subscribeStatus(setSocketStatus);
    const unsubscribeCommand = deviceCommandSocket.subscribeCommand((message) => {
      if (message.type === 'unlock_request') {
        handleRemoteUnlockRequest();
      }
    });

    return () => {
      unsubscribeStatus();
      unsubscribeCommand();
    };
  }, []);

  useEffect(() => {
    if (!isSetupComplete || !deviceInfo) return;
    deviceCommandSocket.connect(deviceInfo);
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
        console.error('HomeScreen: API error:', response.error);
        // Alert.alert('Ошибка', 'Не удалось загрузить товары');
        return;
      }

      if (isProductsResponse(response)) {
        setProducts(response.rows || []);
      } else {
        console.error('HomeScreen: Unexpected response format:', response);
      }
    } catch (error) {
      console.error('HomeScreen: Error loading products:', error);
      // Alert.alert('Ошибка', 'Не удалось загрузить товары');
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

  const playRemoteUnlockSignal = async () => {
    if (!NativeModules.AuxModule?.playUnlockSignal) {
      Alert.alert('Ошибка', 'Модуль открытия замка недоступен');
      return;
    }

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await NativeModules.AuxModule.playUnlockSignal();
        return;
      } catch (error) {
        console.log(`[HomeScreen] Remote unlock attempt ${attempt} failed:`, error);
        if (attempt < 3) {
          await new Promise<void>(resolve => setTimeout(resolve, 1500));
        }
      }
    }

    Alert.alert('Ошибка', 'Не удалось открыть замок');
  };

  const handleRemoteUnlockRequest = () => {
    if (unlockAlertVisibleRef.current) return;

    unlockAlertVisibleRef.current = true;
    Alert.alert(
      'Открытие замка',
      'Пришла команда открытия замка. Открыть?',
      [
        {
          text: 'Отмена',
          style: 'cancel',
          onPress: () => {
            unlockAlertVisibleRef.current = false;
          },
        },
        {
          text: 'Открыть',
          onPress: async () => {
            try {
              await playRemoteUnlockSignal();
            } finally {
              unlockAlertVisibleRef.current = false;
            }
          },
        },
      ],
      {
        cancelable: true,
        onDismiss: () => {
          unlockAlertVisibleRef.current = false;
        },
      }
    );
  };

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

  if (!isSetupComplete) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.setupContainer}>
          
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


  const groupedProducts = groupProductsByPriority(products);

  const categories = getCategoriesFromProducts(groupedProducts);

  const filteredProducts = (selectedCategoryId
    ? groupedProducts.filter((p) => p.category === selectedCategoryId)
    : groupedProducts).filter((p) => (p.totalRemaining || p.remaining_quantity || 0) > 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#f8fafc', flexDirection: 'row' }] }>
      <CategorySidebar
        categories={['Все', ...categories]}
        selectedCategory={selectedCategoryId}
        onSelect={cat => setSelectedCategoryId(cat === 'Все' ? null : cat)}
        isTablet={isTablet}
        style={{ alignSelf: 'flex-start' }}
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        {deviceInfo && (
          <DeviceHeader 
            deviceInfo={deviceInfo} 
            onAdminAccess={handleAdminAccess}
            socketStatus={socketStatus}
            onSocketReconnect={() => deviceCommandSocket.reconnect()}
          />
        )}

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.contentSection}>
            {filteredProducts.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, isTablet && styles.emptyTextTablet]}>
                  Нет товаров для отображения
                </Text>
              </View>
            ) : (
              <View style={{ width: 800, alignSelf: 'center' }}>
                {(() => {
                  const rows = [];
                  for (let i = 0; i < filteredProducts.length; i += 4) {
                    rows.push(
                      <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 }}>
                        {filteredProducts[i] && (
                          <View style={{ width: 170, marginRight: 40 }}>
                            <CustomerProductCard product={filteredProducts[i]} />
                          </View>
                        )}
                        {filteredProducts[i + 1] && (
                          <View style={{ width: 170, marginRight: 40 }}>
                            <CustomerProductCard product={filteredProducts[i + 1]} />
                          </View>
                        )}
                        {filteredProducts[i + 2] && (
                          <View style={{ width: 170, marginRight: 40 }}>
                            <CustomerProductCard product={filteredProducts[i + 2]} />
                          </View>
                        )}
                        {filteredProducts[i + 3] && (
                          <View style={{ width: 170 }}>
                            <CustomerProductCard product={filteredProducts[i + 3]} />
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
        {cartItemCount > 0 && (
          <TouchableOpacity
            style={[styles.cartButton, isTablet && styles.cartButtonTablet]}
            onPress={handleGoToCart}
          >
            <Text style={[styles.cartButtonText, isTablet && styles.cartButtonTextTablet]}>
              Перейти к оплате 
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  loadingTextTablet: {
    fontSize: 20,
  },
  setupContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#fff',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3b82f6',
    textAlign: 'center',
    marginBottom: 16,
  },
  welcomeTitleTablet: {
    fontSize: 32,
  },
  setupMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  setupMessageTablet: {
    fontSize: 20,
    lineHeight: 30,
  },
  setupButton: {
    backgroundColor: '#FF8A50',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: '#FF8A50',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  setupButtonTablet: {
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderRadius: 16,
  },
  setupButtonText: {
    color: '#fff',
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
    backgroundColor: '#f9fafb',
    borderRadius: 20,
    margin: 12,
    shadowColor: '#e5e7eb',
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#6b7280',
    textAlign: 'center',
  },
  emptyTextTablet: {
    fontSize: 20,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    paddingHorizontal: 8,
  },
  productGridItem: {
    width: '48%',
    marginBottom: 16,
  },
  cartButton: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FF6B35',
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#FF6B35',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  cartButtonTablet: {
    paddingVertical: 24,
  },
  cartButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  cartButtonTextTablet: {
    fontSize: 24,
  },
});

export default HomeScreen;
