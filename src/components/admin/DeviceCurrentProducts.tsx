import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, Dimensions, ActivityIndicator } from 'react-native';
import { alashCloudAPI } from '../../api/client';
import { Product, isApiError } from '../../api/types';

interface DeviceCurrentProductsProps {
  deviceId: number;
}

const { width } = Dimensions.get('window');
const isTablet = width > 600;

const DeviceCurrentProducts: React.FC<DeviceCurrentProductsProps> = ({ deviceId }) => {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProducts = async () => {
      if (!deviceId) return;

      setLoading(true);
      setError(null);

      try {
        const response = await alashCloudAPI.getDevicePrices(deviceId);
        if (isApiError(response)) {
          setError(response.error);
        } else {
          setProducts(response.rows);
        }
      } catch (err) {
        setError('Ошибка загрузки товаров');
        console.error('Error loading device products:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [deviceId]);

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.productCard}>
      <Image
        source={{ uri: item.image_url || 'https://via.placeholder.com/80' }}
        style={styles.productImage}
        resizeMode="cover"
      />
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.product_name}</Text>
        <Text style={styles.productCategory}>{item.category}</Text>
        <Text style={styles.batchNumber}>Партия: {item.batch_number}</Text>
        <View style={styles.quantityRow}>
          <Text style={styles.quantityText}>Количество: {item.quantity}</Text>
          <Text style={styles.remainingText}>Остаток: {item.remaining_quantity}</Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.purchasePrice}>Закупка: {item.purchase_price}₸</Text>
          <Text style={styles.sellingPrice}>Продажа: {item.selling_price}₸</Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Загрузка товаров...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (products.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>На устройстве нет товаров</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Текущие товары на устройстве</Text>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderProduct}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#22223b',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
  },
  listContainer: {
    padding: 16,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22223b',
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  batchNumber: {
    fontSize: 14,
    color: '#FF8A50',
    fontWeight: '500',
    marginBottom: 8,
  },
  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  quantityText: {
    fontSize: 14,
    color: '#374151',
  },
  remainingText: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '500',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  purchasePrice: {
    fontSize: 14,
    color: '#6b7280',
  },
  sellingPrice: {
    fontSize: 14,
    color: '#dc2626',
    fontWeight: '500',
  },
});

export default DeviceCurrentProducts;