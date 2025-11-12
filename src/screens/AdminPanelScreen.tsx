import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions, Alert, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { KioskModule } from '../utils/KioskModule';
import { alashCloudAPI } from '../api/client';
import { deviceStorage } from '../api/storage';
import { Product, isApiError, isProductsResponse } from '../api/types';
import ProductCard from '../components/ProductCard';

type RootStackParamList = {
  Home: undefined;
  Auth: undefined;
  AdminPanel: undefined;
  AddProduct: undefined;
};

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

  useEffect(() => {
    loadDeviceAndProducts();
  }, []);

  const loadDeviceAndProducts = async () => {
    try {
      const deviceInfo = await deviceStorage.getDeviceInfo();
      if (deviceInfo) {
        setDeviceId(deviceInfo.device_id);
        await loadProducts(deviceInfo.device_id);
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
        Alert.alert('Ошибка загрузки товаров', response.error);
        return;
      }
      
      if (isProductsResponse(response)) {
        setProducts(response.rows);
      } else {
        Alert.alert('Ошибка', 'Неожиданный формат ответа сервера');
      }
    } catch (error) {
      console.error('Ошибка загрузки товаров:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить товары');
    }
  };

  const handleRefresh = () => {
    if (deviceId) {
      setIsLoading(true);
      loadProducts(deviceId).finally(() => setIsLoading(false));
    }
  };

  const handleProductPress = (product: Product) => {
    Alert.alert(
      product.name,
      `${product.name2}\n\nЦена: ${product.amount} ₸`,
      [
        { text: 'Редактировать', onPress: () => {} },
        { text: 'Удалить', onPress: () => {}, style: 'destructive' },
        { text: 'Отмена', style: 'cancel' }
      ]
    );
  };
  const handleLogout = async () => {
    try {
      // Включаем киоск режим обратно при выходе из админки
      if (Platform.OS === 'android') {
        await KioskModule.enableKioskMode();
        console.log('Киоск режим включен при выходе из админки');
      }
      navigation.navigate('Home');
    } catch (error) {
      console.warn('Ошибка включения киоск режима:', error);
      navigation.navigate('Home');
    }
  };

  const handleAddProduct = () => {
    navigation.navigate('AddProduct');
  };

  const handleDeleteProduct = (productId: number) => {
    // Пока просто заглушка
    console.log('Удаление товара:', productId);
  };

  const getCurrentDateTime = () => {
    return new Date().toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Navigation Header */}
        <View style={styles.navHeader}>
          <Text style={[styles.logoText, isTablet && styles.logoTextTablet]}>
            AlashCloud
          </Text>
          
          <Text style={[styles.lastLoginText, isTablet && styles.lastLoginTextTablet]}>
            Последний вход: {getCurrentDateTime()}
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

        {/* Content Section */}
        <View style={styles.contentSection}>
          <Text style={[styles.sectionTitle, isTablet && styles.sectionTitleTablet]}>
            Текущие товары
          </Text>

          {/* Products Grid */}
          {isLoading && products.length === 0 ? (
            <View style={[styles.productCard, isTablet && styles.productCardTablet, { justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={[styles.productName, isTablet && styles.productNameTablet]}>Загрузка товаров...</Text>
            </View>
          ) : products.length === 0 ? (
            <View style={[styles.productCard, isTablet && styles.productCardTablet, { justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={[styles.productName, isTablet && styles.productNameTablet]}>Товары не найдены</Text>
              <TouchableOpacity 
                style={[styles.logoutButton, isTablet && styles.logoutButtonTablet, { marginTop: 10 }]} 
                onPress={handleRefresh}
              >
                <Text style={[styles.logoutButtonText, isTablet && styles.logoutButtonTextTablet]}>Обновить</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.productsGrid}>
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onPress={() => handleProductPress(product)}
                />
              ))}

              {/* Add Product Card */}
              <TouchableOpacity
                onPress={handleAddProduct}
                style={[styles.addProductCard, isTablet && styles.addProductCardTablet]}
              >
                <Text style={[styles.addProductText, isTablet && styles.addProductTextTablet]}>
                  + Добавить товар
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
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
  lastLoginText: {
    color: '#bbf7d0',
    fontSize: 14,
    flex: 2,
    textAlign: 'center',
  },
  lastLoginTextTablet: {
    fontSize: 16,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
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
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 24,
  },
  sectionTitleTablet: {
    fontSize: 32,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  productCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    width: '31%', // 3 карточки в ряд
    marginBottom: 16,
  },
  productCardTablet: {
    padding: 16,
    width: '31%', // На планшете тоже 3 в ряд
  },
  productImagePlaceholder: {
    backgroundColor: '#f3f4f6',
    height: 80,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  productImagePlaceholderTablet: {
    height: 100,
  },
  imagePlaceholderText: {
    fontSize: 24,
  },
  imagePlaceholderTextTablet: {
    fontSize: 32,
  },
  productInfo: {
    marginBottom: 8,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  productNameTablet: {
    fontSize: 16,
  },
  productPrice: {
    fontSize: 12,
    fontWeight: '500',
    color: '#16a34a',
  },
  productPriceTablet: {
    fontSize: 14,
  },
  deleteButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  deleteButtonTablet: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButtonTextTablet: {
    fontSize: 14,
  },
  addProductCard: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#bfdbfe',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    width: '31%', // Тоже 3 в ряд
    marginBottom: 16,
    minHeight: 120,
  },
  addProductCardTablet: {
    padding: 20,
    minHeight: 140,
    width: '31%',
  },
  addProductIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  addProductIconTablet: {
    fontSize: 40,
  },
  addProductText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
    textAlign: 'center',
  },
  addProductTextTablet: {
    fontSize: 14,
  },
});

export default AdminPanelScreen;