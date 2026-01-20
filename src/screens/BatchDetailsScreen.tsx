
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../utils/navigation.types';
import { BatchProduct, BatchProductDetail } from '../api/types';
import { getBatchProducts, getProductsList, addProductToBatch } from '../api/batches';

const { width } = Dimensions.get('window');
const isTablet = width > 600;

type Props = NativeStackScreenProps<RootStackParamList, 'BatchDetails'>;

const BatchDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { batchId, batchNumber } = route.params;

  const [batchProducts, setBatchProducts] = useState<BatchProductDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add product modal
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [products, setProducts] = useState<BatchProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<BatchProduct | null>(null);
  const [quantity, setQuantity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [saving, setSaving] = useState(false);

  const loadBatchProducts = useCallback(async () => {
    try {
      const response = await getBatchProducts(batchId);

      if ('error' in response) {
        Alert.alert('Ошибка', response.error);
        return;
      }

      setBatchProducts(response.rows || []);
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось загрузить товары партии');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [batchId]);

  const loadProducts = useCallback(async (search: string = '') => {
    setLoadingProducts(true);
    try {
      const response = await getProductsList({
        search,
        offset: 0,
        limit: 100,
        order: null,
      });

      if ('error' in response) {
        Alert.alert('Ошибка', response.error);
        return;
      }

      setProducts(response.rows || []);
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось загрузить список товаров');
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    loadBatchProducts();
  }, [loadBatchProducts]);

  const onRefresh = () => {
    setRefreshing(true);
    loadBatchProducts();
  };

  const openAddModal = () => {
    setSelectedProduct(null);
    setQuantity('');
    setPurchasePrice('');
    setSellingPrice('');
    setProductSearch('');
    setAddModalVisible(true);
    loadProducts();
  };

  const isProductInBatch = (productId: number) => {
    return batchProducts.some((bp) => bp.product_id === productId);
  };

  const selectProduct = (product: BatchProduct) => {
    if (isProductInBatch(product.id)) {
      Alert.alert('Внимание', 'Этот товар уже добавлен в партию');
      return;
    }
    setSelectedProduct(product);
  };

  const handleAddProduct = async () => {
    if (!selectedProduct) {
      Alert.alert('Ошибка', 'Выберите товар');
      return;
    }

    const qty = parseInt(quantity, 10);
    const purchase = parseFloat(purchasePrice);
    const selling = parseFloat(sellingPrice);

    if (!qty || qty <= 0) {
      Alert.alert('Ошибка', 'Укажите количество');
      return;
    }

    if (!purchase || purchase <= 0) {
      Alert.alert('Ошибка', 'Укажите цену закупки');
      return;
    }

    if (!selling || selling <= 0) {
      Alert.alert('Ошибка', 'Укажите цену продажи');
      return;
    }

    setSaving(true);

    try {
      const response = await addProductToBatch(batchId, {
        batch_id: batchId,
        product_id: selectedProduct.id,
        quantity: qty,
        purchase_price: purchase,
        selling_price: selling,
      });

      if (!response.OK) {
        Alert.alert('Ошибка', response.error || 'Не удалось добавить товар');
        setSaving(false);
        return;
      }

      setAddModalVisible(false);
      loadBatchProducts();
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось добавить товар');
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      !isProductInBatch(p.id) &&
      (p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.category.toLowerCase().includes(productSearch.toLowerCase()))
  );

  const renderBatchProductItem = ({ item }: { item: BatchProductDetail }) => (
    <View style={styles.productCard}>
      <View style={styles.productHeader}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.productImage} />
        ) : (
          <View style={[styles.productImage, styles.productImagePlaceholder]}>
            <Text style={styles.productImagePlaceholderText}>?</Text>
          </View>
        )}
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.product_name}</Text>
          <Text style={styles.productCategory}>{item.category}</Text>
        </View>
      </View>
      <View style={styles.productStats}>
        <View style={styles.productStatItem}>
          <Text style={styles.productStatLabel}>Кол-во</Text>
          <Text style={styles.productStatValue}>{item.quantity}</Text>
        </View>
        <View style={styles.productStatItem}>
          <Text style={styles.productStatLabel}>Закупка</Text>
          <Text style={styles.productStatValue}>{item.purchase_price} ₸</Text>
        </View>
        <View style={styles.productStatItem}>
          <Text style={styles.productStatLabel}>Продажа</Text>
          <Text style={styles.productStatValue}>{item.selling_price} ₸</Text>
        </View>
        <View style={styles.productStatItem}>
          <Text style={styles.productStatLabel}>Распред.</Text>
          <Text style={styles.productStatValue}>{item.distributed_quantity}</Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Назад</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{batchNumber}</Text>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Text style={styles.addButtonText}>+ Товар</Text>
        </TouchableOpacity>
      </View>

      {batchProducts.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Нет товаров</Text>
          <Text style={styles.emptyStateSubtext}>
            Нажмите "+ Товар" для добавления товаров в партию
          </Text>
        </View>
      ) : (
        <FlatList
          data={batchProducts}
          renderItem={renderBatchProductItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      )}

      {/* Add Product Modal */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setAddModalVisible(false)}>
              <Text style={styles.modalCancelText}>Отмена</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Добавить товар</Text>
            <TouchableOpacity
              onPress={handleAddProduct}
              disabled={saving || !selectedProduct}
              style={[styles.modalSaveButton, (!selectedProduct || saving) && styles.disabledButton]}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.modalSaveText}>Добавить</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {!selectedProduct ? (
              <>
                <TextInput
                  style={styles.searchInput}
                  value={productSearch}
                  onChangeText={(text) => {
                    setProductSearch(text);
                    loadProducts(text);
                  }}
                  placeholder="Поиск товара..."
                  placeholderTextColor="#9ca3af"
                />

                {loadingProducts ? (
                  <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 20 }} />
                ) : (
                  <FlatList
                    data={filteredProducts}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.productListItem}
                        onPress={() => selectProduct(item)}
                      >
                        {item.image_url ? (
                          <Image source={{ uri: item.image_url }} style={styles.productListImage} />
                        ) : (
                          <View style={[styles.productListImage, styles.productImagePlaceholder]}>
                            <Text style={styles.productImagePlaceholderText}>?</Text>
                          </View>
                        )}
                        <View style={styles.productListInfo}>
                          <Text style={styles.productListName}>{item.name}</Text>
                          <Text style={styles.productListCategory}>{item.category}</Text>
                        </View>
                      </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                      <Text style={styles.noProductsText}>Товары не найдены</Text>
                    }
                  />
                )}
              </>
            ) : (
              <View style={styles.selectedProductForm}>
                <View style={styles.selectedProductInfo}>
                  {selectedProduct.image_url ? (
                    <Image source={{ uri: selectedProduct.image_url }} style={styles.selectedProductImage} />
                  ) : (
                    <View style={[styles.selectedProductImage, styles.productImagePlaceholder]}>
                      <Text style={styles.productImagePlaceholderText}>?</Text>
                    </View>
                  )}
                  <View style={styles.selectedProductDetails}>
                    <Text style={styles.selectedProductName}>{selectedProduct.name}</Text>
                    <Text style={styles.selectedProductCategory}>{selectedProduct.category}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedProduct(null)} style={styles.changeProductButton}>
                    <Text style={styles.changeProductButtonText}>Изменить</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Количество *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={quantity}
                    onChangeText={setQuantity}
                    placeholder="0"
                    placeholderTextColor="#9ca3af"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Цена закупки (₸) *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={purchasePrice}
                    onChangeText={setPurchasePrice}
                    placeholder="0"
                    placeholderTextColor="#9ca3af"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Цена продажи (₸) *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={sellingPrice}
                    onChangeText={setSellingPrice}
                    placeholder="0"
                    placeholderTextColor="#9ca3af"
                    keyboardType="numeric"
                  />
                </View>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    paddingVertical: 4,
  },
  backButtonText: {
    color: '#FF8A50',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: isTablet ? 20 : 16,
    fontWeight: '700',
    color: '#1f2937',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  addButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  listContent: {
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  productImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginRight: 12,
  },
  productImagePlaceholder: {
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productImagePlaceholderText: {
    fontSize: 20,
    color: '#9ca3af',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  productCategory: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  productStats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  productStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  productStatLabel: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 2,
  },
  productStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  modalCancelText: {
    color: '#6b7280',
    fontSize: 16,
  },
  modalSaveButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalSaveText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
    color: '#1f2937',
  },
  productListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  productListImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  productListInfo: {
    flex: 1,
  },
  productListName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  productListCategory: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  noProductsText: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 14,
    paddingVertical: 20,
  },
  selectedProductForm: {
    flex: 1,
  },
  selectedProductInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  selectedProductImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginRight: 12,
  },
  selectedProductDetails: {
    flex: 1,
  },
  selectedProductName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  selectedProductCategory: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  changeProductButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  changeProductButtonText: {
    color: '#FF8A50',
    fontSize: 14,
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
  },
});

export default BatchDetailsScreen;
