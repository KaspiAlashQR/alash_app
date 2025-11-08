import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { KioskModule } from '../utils/KioskModule';

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

// Фиктивные данные товаров
const mockProducts = [
  {
    id: 1,
    name: 'Товар 1',
    price: '1000.00',
    image: null,
  },
  {
    id: 2,
    name: 'Товар 2', 
    price: '2500.00',
    image: null,
  },
  {
    id: 3,
    name: 'Товар 3',
    price: '750.00', 
    image: null,
  },
];

const AdminPanelScreen: React.FC<AdminPanelScreenProps> = ({ navigation }) => {
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
          <View style={styles.productsGrid}>
            {mockProducts.map((product) => (
              <View key={product.id} style={[styles.productCard, isTablet && styles.productCardTablet]}>
                {/* Product Image Placeholder */}
                <View style={[styles.productImagePlaceholder, isTablet && styles.productImagePlaceholderTablet]}>
                  <Text style={[styles.imagePlaceholderText, isTablet && styles.imagePlaceholderTextTablet]}>
                    📷
                  </Text>
                </View>
                
                {/* Product Info */}
                <View style={styles.productInfo}>
                  <Text style={[styles.productName, isTablet && styles.productNameTablet]}>
                    {product.name}
                  </Text>
                  <Text style={[styles.productPrice, isTablet && styles.productPriceTablet]}>
                    {product.price} ₸
                  </Text>
                </View>
                
                {/* Delete Button */}
                <TouchableOpacity
                  onPress={() => handleDeleteProduct(product.id)}
                  style={[styles.deleteButton, isTablet && styles.deleteButtonTablet]}
                >
                  <Text style={[styles.deleteButtonText, isTablet && styles.deleteButtonTextTablet]}>
                    Удалить
                  </Text>
                </TouchableOpacity>
              </View>
            ))}

            {/* Add Product Card */}
            <TouchableOpacity
              onPress={handleAddProduct}
              style={[styles.addProductCard, isTablet && styles.addProductCardTablet]}
            >
              <Text style={[styles.addProductIcon, isTablet && styles.addProductIconTablet]}>
                ➕
              </Text>
              <Text style={[styles.addProductText, isTablet && styles.addProductTextTablet]}>
                Добавить товар
              </Text>
            </TouchableOpacity>
          </View>
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