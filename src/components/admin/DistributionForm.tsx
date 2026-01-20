import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TextInput, TouchableOpacity, Alert, Dimensions, ActivityIndicator } from 'react-native';
import { alashCloudAPI } from '../../api/client';
import { AvailableProduct, isApiError } from '../../api/types';

interface DistributionFormProps {
  deviceId: number;
  onClose: () => void;
  onSuccess: () => void;
}

interface SelectedProduct {
  batch_product_id: number;
  product_name: string;
  batch_number: string;
  quantity: number;
  available_quantity: number;
  selling_price: number;
}

const { width } = Dimensions.get('window');
const isTablet = width > 600;

const DistributionForm: React.FC<DistributionFormProps> = ({ deviceId, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(true);
  const [availableProducts, setAvailableProducts] = useState<AvailableProduct[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [filterBatch, setFilterBatch] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const [distributing, setDistributing] = useState(false);

  useEffect(() => {
    const loadAvailableProducts = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await alashCloudAPI.getAvailableProducts(deviceId);
        if (isApiError(response)) {
          setError(response.error);
        } else {
          setAvailableProducts(response.rows);
        }
      } catch (err) {
        setError('Ошибка загрузки доступных товаров');
        console.error('Error loading available products:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAvailableProducts();
  }, [deviceId]);

  const getUniqueBatches = () => {
    const batches = availableProducts.map(p => ({ id: p.batch_id, number: p.batch_number }));
    const unique = batches.filter((batch, index, self) =>
      index === self.findIndex(b => b.id === batch.id)
    );
    return unique.sort((a, b) => a.number.localeCompare(b.number));
  };

  const filteredProducts = filterBatch
    ? availableProducts.filter(p => p.batch_number === filterBatch)
    : availableProducts;

  const addToDistribution = (product: AvailableProduct, quantity: number) => {
    if (quantity <= 0) {
      Alert.alert('Ошибка', 'Введите количество больше 0');
      return;
    }

    if (quantity > product.available_quantity) {
      Alert.alert('Ошибка', `Доступно только ${product.available_quantity} шт.`);
      return;
    }

    const existingIndex = selectedProducts.findIndex(p => p.batch_product_id === product.batch_product_id);
    if (existingIndex >= 0) {
      const updated = [...selectedProducts];
      updated[existingIndex].quantity = quantity;
      setSelectedProducts(updated);
    } else {
      setSelectedProducts([...selectedProducts, {
        batch_product_id: product.batch_product_id,
        product_name: product.product_name,
        batch_number: product.batch_number,
        quantity,
        available_quantity: product.available_quantity,
        selling_price: product.selling_price,
      }]);
    }
  };

  const removeFromDistribution = (batch_product_id: number) => {
    setSelectedProducts(selectedProducts.filter(p => p.batch_product_id !== batch_product_id));
  };

  const handleDistribute = async () => {
    if (selectedProducts.length === 0) {
      Alert.alert('Ошибка', 'Выберите товары для распределения');
      return;
    }

    setDistributing(true);
    try {
      const productsToAssign = selectedProducts.map(p => ({
        batch_product_id: p.batch_product_id,
        quantity: p.quantity,
      }));

      const response = await alashCloudAPI.assignProducts(deviceId, productsToAssign);
      if (isApiError(response)) {
        Alert.alert('Ошибка', response.error);
      } else {
        Alert.alert('Успех', 'Товары успешно распределены', [
          { text: 'OK', onPress: () => {
            onSuccess();
            onClose();
          }}
        ]);
      }
    } catch (err) {
      Alert.alert('Ошибка', 'Не удалось распределить товары');
      console.error('Error distributing products:', err);
    } finally {
      setDistributing(false);
    }
  };

  const renderAvailableProduct = ({ item }: { item: AvailableProduct }) => {
    const quantity = quantities[item.batch_product_id] || '';
    const setQuantity = (value: string) => setQuantities(prev => ({ ...prev, [item.batch_product_id]: value }));

    return (
      <View style={styles.productCard}>
        <Image
          source={{ uri: item.image_url || 'https://via.placeholder.com/60' }}
          style={styles.productImage}
          resizeMode="cover"
        />
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.product_name}</Text>
          <Text style={styles.productCategory}>{item.category}</Text>
          <Text style={styles.batchNumber}>Партия: {item.batch_number}</Text>
          <Text style={styles.availableText}>Доступно: {item.available_quantity}</Text>
          <Text style={styles.priceText}>Цена: {item.selling_price}₸</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.quantityInput}
              placeholder="Кол-во"
              keyboardType="numeric"
              value={quantity}
              onChangeText={setQuantity}
            />
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                const qty = parseInt(quantity);
                if (!isNaN(qty)) {
                  addToDistribution(item, qty);
                  setQuantity(''); // Очищаем поле после добавления
                }
              }}
            >
              <Text style={styles.addButtonText}>Добавить</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderSelectedProduct = ({ item }: { item: SelectedProduct }) => (
    <View style={styles.selectedCard}>
      <View style={styles.selectedInfo}>
        <Text style={styles.selectedName}>{item.product_name}</Text>
        <Text style={styles.selectedBatch}>Партия: {item.batch_number}</Text>
        <Text style={styles.selectedQuantity}>Количество: {item.quantity}</Text>
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => removeFromDistribution(item.batch_product_id)}
      >
        <Text style={styles.removeButtonText}>Удалить</Text>
      </TouchableOpacity>
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
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Закрыть</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const uniqueBatches = getUniqueBatches();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Распределение товаров</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Фильтр по партии:</Text>
        <View style={styles.filterButtons}>
          <TouchableOpacity
            style={[styles.filterButton, filterBatch === null && styles.filterButtonActive]}
            onPress={() => setFilterBatch(null)}
          >
            <Text style={[styles.filterButtonText, filterBatch === null && styles.filterButtonTextActive]}>
              Все
            </Text>
          </TouchableOpacity>
          {uniqueBatches.map(batch => (
            <TouchableOpacity
              key={batch.id}
              style={[styles.filterButton, filterBatch === batch.number && styles.filterButtonActive]}
              onPress={() => setFilterBatch(batch.number)}
            >
              <Text style={[styles.filterButtonText, filterBatch === batch.number && styles.filterButtonTextActive]}>
                {batch.number}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Text style={styles.sectionTitle}>Доступные товары ({filteredProducts.length})</Text>
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.batch_product_id.toString()}
        renderItem={renderAvailableProduct}
        showsVerticalScrollIndicator={false}
        style={styles.productsList}
      />

      {selectedProducts.length > 0 && (
        <View style={styles.selectedSection}>
          <Text style={styles.sectionTitle}>Выбранные для распределения ({selectedProducts.length})</Text>
          <FlatList
            data={selectedProducts}
            keyExtractor={(item) => item.batch_product_id.toString()}
            renderItem={renderSelectedProduct}
            showsVerticalScrollIndicator={false}
            style={styles.selectedList}
          />
          <TouchableOpacity
            style={[styles.distributeButton, distributing && styles.distributeButtonDisabled]}
            onPress={handleDistribute}
            disabled={distributing}
          >
            <Text style={styles.distributeButtonText}>
              {distributing ? 'Распределение...' : 'Распределить'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#22223b',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#64748b',
  },
  filterContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginRight: 8,
    marginBottom: 4,
  },
  filterButtonActive: {
    backgroundColor: '#FF8A50',
    borderColor: '#FF8A50',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#6b7280',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22223b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  productsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22223b',
    marginBottom: 2,
  },
  productCategory: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  batchNumber: {
    fontSize: 12,
    color: '#FF8A50',
    fontWeight: '500',
    marginBottom: 2,
  },
  availableText: {
    fontSize: 12,
    color: '#059669',
    marginBottom: 2,
  },
  priceText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '500',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginRight: 8,
    fontSize: 14,
  },
  addButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  selectedSection: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  selectedList: {
    maxHeight: 200,
    paddingHorizontal: 16,
  },
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  selectedInfo: {
    flex: 1,
  },
  selectedName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#22223b',
  },
  selectedBatch: {
    fontSize: 12,
    color: '#64748b',
  },
  selectedQuantity: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
  },
  removeButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 12,
  },
  distributeButton: {
    backgroundColor: '#FF8A50',
    margin: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  distributeButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  distributeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
  },
});

export default DistributionForm;