import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions, Alert, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { KioskModule } from '../utils/KioskModule';
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

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadDeviceAndProducts();
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
          <ActivityIndicator size="large" color="#16a34a" />
          <Text style={[styles.loadingText, isTablet && styles.loadingTextTablet]}>
            Загрузка...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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

      <TouchableOpacity
        onPress={() => navigation.navigate('AddProduct', { mode: 'add' })}
        style={[styles.floatingAddButton, isTablet && styles.floatingAddButtonTablet]}
      >
        <Text style={[styles.floatingAddButtonText, isTablet && styles.floatingAddButtonTextTablet]}>
          + Добавить товар
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e293b',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 80, // Space for floating button
  },
  navHeader: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  logoTextTablet: {
    fontSize: 24,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutButtonTablet: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  logoutButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  logoutButtonTextTablet: {
    fontSize: 16,
  },
  contentSection: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 24,
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
  floatingAddButton: {
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
  floatingAddButtonTablet: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    bottom: 32,
    right: 32,
  },
  floatingAddButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  floatingAddButtonTextTablet: {
    fontSize: 18,
  },
});

export default AdminPanelScreen;