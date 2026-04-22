
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Batch } from '../../api/types';
import { getBatchesList, createBatch } from '../../api/batches';
import { RootStackParamList } from '../../utils/navigation.types';

const { width } = Dimensions.get('window');
const isTablet = width > 600;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const InvoicesTab: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Create batch modal
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [batchNumber, setBatchNumber] = useState('');
  const [batchDescription, setBatchDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const loadBatches = useCallback(async () => {
    try {
      const response = await getBatchesList({
        search: '',
        offset: 0,
        limit: 100,
        order: null,
      });

      if ('error' in response) {
        Alert.alert('Ошибка', response.error);
        return;
      }

      setBatches(response.rows || []);
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось загрузить список партий');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadBatches();
    });
    return unsubscribe;
  }, [navigation, loadBatches]);

  const onRefresh = () => {
    setRefreshing(true);
    loadBatches();
  };

  const openCreateModal = () => {
    setBatchNumber('');
    setBatchDescription('');
    setCreateModalVisible(true);
  };

  const handleCreateBatch = async () => {
    if (!batchNumber.trim()) {
      Alert.alert('Ошибка', 'Введите номер партии');
      return;
    }

    setSaving(true);

    try {
      const response = await createBatch({
        batch_number: batchNumber.trim(),
        description: batchDescription.trim(),
      });

      if (!response.OK || !response.id) {
        Alert.alert('Ошибка', response.error || 'Не удалось создать партию');
        setSaving(false);
        return;
      }

      setCreateModalVisible(false);
      loadBatches();

      // Переходим на страницу деталей созданной партии
      navigation.navigate('BatchDetails', { batchId: response.id, batchNumber: batchNumber.trim() });
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось создать партию');
    } finally {
      setSaving(false);
    }
  };

  const openBatchDetails = (batch: Batch) => {
    navigation.navigate('BatchDetails', { batchId: batch.id, batchNumber: batch.batch_number });
  };

  const renderBatchItem = ({ item }: { item: Batch }) => (
    <TouchableOpacity style={styles.batchCard} onPress={() => openBatchDetails(item)}>
      <View style={styles.batchHeader}>
        <Text style={styles.batchNumber}>{item.batch_number || `Партия #${item.id}`}</Text>
        <Text style={styles.batchDate}>
          {item.created_at ? item.created_at.split(' ')[0] : ''}
        </Text>
      </View>
      {item.description ? (
        <Text style={styles.batchDescription} numberOfLines={2}>{item.description}</Text>
      ) : null}
      <View style={styles.batchStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{item.products_count}</Text>
          <Text style={styles.statLabel}>товаров</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{item.total_quantity}</Text>
          <Text style={styles.statLabel}>единиц</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, styles.profitValue]}>
            {item.profit?.toLocaleString() || 0} ₸
          </Text>
          <Text style={styles.statLabel}>прибыль</Text>
        </View>
      </View>
      <View style={styles.cardArrow}>
        <Text style={styles.cardArrowText}>→</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Партии</Text>
        <TouchableOpacity style={styles.createButton} onPress={openCreateModal}>
          <Text style={styles.createButtonText}>Создать</Text>
        </TouchableOpacity>
      </View>

      {batches.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Нет партий</Text>
          <Text style={styles.emptyStateSubtext}>
            Нажмите "Создать" для добавления новой партии
          </Text>
        </View>
      ) : (
        <FlatList
          data={batches}
          renderItem={renderBatchItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      )}

      {/* Create Batch Modal */}
      <Modal
        visible={createModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Новая партия</Text>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Номер партии *</Text>
              <TextInput
                style={styles.formInput}
                value={batchNumber}
                onChangeText={setBatchNumber}
                placeholder="Например: 2026-001"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Описание</Text>
              <TextInput
                style={[styles.formInput, styles.formTextarea]}
                value={batchDescription}
                onChangeText={setBatchDescription}
                placeholder="Описание партии (необязательно)"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setCreateModalVisible(false)}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.disabledButton]}
                onPress={handleCreateBatch}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Создать</Text>
                )}
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
  title: {
    fontSize: isTablet ? 22 : 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  createButton: {
    backgroundColor: '#FF8A50',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: isTablet ? 16 : 14,
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
  batchCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    position: 'relative',
  },
  batchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingRight: 24,
  },
  batchNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  batchDate: {
    fontSize: 13,
    color: '#6b7280',
  },
  batchDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  batchStats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  profitValue: {
    color: '#10b981',
  },
  cardArrow: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  cardArrowText: {
    fontSize: 20,
    color: '#d1d5db',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 20,
    textAlign: 'center',
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
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  formTextarea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontWeight: '600',
    fontSize: 16,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#FF8A50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
});

export default InvoicesTab;
