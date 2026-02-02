import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, Dimensions, ActivityIndicator, TouchableOpacity, Alert, Modal } from 'react-native';
import { alashCloudAPI } from '../../api/client';
import { Product, isApiError } from '../../api/types';

const REMOVAL_REASONS = [
  { id: 'expired', label: 'Срок годности истёк' },
  { id: 'no_sell', label: 'Не хочу больше продавать' },
  { id: 'damaged', label: 'Товар испорчен' },
  { id: 'other', label: 'Другая причина' },
];

interface DeviceCurrentProductsProps {
  deviceId: number;
  onProductRemoved?: () => void;
}

const { width } = Dimensions.get('window');
const isTablet = width > 600;

const DeviceCurrentProducts: React.FC<DeviceCurrentProductsProps> = ({ deviceId, onProductRemoved }) => {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [removingProductId, setRemovingProductId] = useState<number | null>(null);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);

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

  useEffect(() => {
    loadProducts();
  }, [deviceId]);

  const handleRemoveProduct = (product: Product) => {
    setSelectedProduct(product);
    setSelectedReason(null);
    setShowRemoveModal(true);
  };

  const handleConfirmRemove = async () => {
    if (!selectedProduct || !selectedReason) return;

    setShowRemoveModal(false);
    setRemovingProductId(selectedProduct.batch_product_id);

    try {
      const response = await alashCloudAPI.assignProducts(deviceId, [{
        batch_product_id: selectedProduct.batch_product_id,
        quantity: 0
      }]);
      if (isApiError(response)) {
        Alert.alert('Ошибка', response.error);
      } else {
        await loadProducts();
        onProductRemoved?.();
      }
    } catch (err) {
      Alert.alert('Ошибка', 'Не удалось удалить товар');
    } finally {
      setRemovingProductId(null);
      setSelectedProduct(null);
      setSelectedReason(null);
    }
  };

  const handleCancelRemove = () => {
    setShowRemoveModal(false);
    setSelectedProduct(null);
    setSelectedReason(null);
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const isRemoving = removingProductId === item.batch_product_id;

    return (
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
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveProduct(item)}
          disabled={isRemoving}
        >
          {isRemoving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.removeButtonText}>✕</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

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

      <Modal
        visible={showRemoveModal}
        transparent
        animationType="fade"
        onRequestClose={handleCancelRemove}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Удаление товара</Text>
            {selectedProduct && (
              <Text style={styles.modalProductName}>
                {selectedProduct.product_name}
              </Text>
            )}
            <Text style={styles.modalSubtitle}>
              Остаток ({selectedProduct?.remaining_quantity || 0} шт) будет возвращён на склад
            </Text>

            <Text style={styles.reasonLabel}>Выберите причину удаления:</Text>
            {REMOVAL_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason.id}
                style={[
                  styles.reasonOption,
                  selectedReason === reason.id && styles.reasonOptionSelected
                ]}
                onPress={() => setSelectedReason(reason.id)}
              >
                <View style={[
                  styles.radioOuter,
                  selectedReason === reason.id && styles.radioOuterSelected
                ]}>
                  {selectedReason === reason.id && <View style={styles.radioInner} />}
                </View>
                <Text style={[
                  styles.reasonText,
                  selectedReason === reason.id && styles.reasonTextSelected
                ]}>
                  {reason.label}
                </Text>
              </TouchableOpacity>
            ))}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancelRemove}
              >
                <Text style={styles.cancelButtonText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  !selectedReason && styles.confirmButtonDisabled
                ]}
                onPress={handleConfirmRemove}
                disabled={!selectedReason}
              >
                <Text style={styles.confirmButtonText}>Удалить</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
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
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#22223b',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalProductName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF8A50',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  reasonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  reasonOptionSelected: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: '#ef4444',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
  },
  reasonText: {
    fontSize: 14,
    color: '#374151',
  },
  reasonTextSelected: {
    color: '#ef4444',
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#fca5a5',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default DeviceCurrentProducts;