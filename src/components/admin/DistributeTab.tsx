import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { DeviceStorageService } from '../../api/storage';
import DeviceCurrentProducts from './DeviceCurrentProducts';
import DistributionForm from './DistributionForm';

const deviceStorage = new DeviceStorageService();

const DistributeTab: React.FC = () => {
  const [deviceId, setDeviceId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const loadDeviceId = async () => {
      try {
        const deviceInfo = await deviceStorage.getDeviceInfo();
        setDeviceId(deviceInfo?.device_id || null);
      } catch (error) {
        console.error('Error loading device ID:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDeviceId();
  }, []);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Загрузка...</Text>
      </View>
    );
  }

  if (!deviceId) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Устройство не найдено</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <DeviceCurrentProducts deviceId={deviceId} key={refreshKey} />

      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowForm(true)}
        >
          <Text style={styles.addButtonText}>Добавить товары для распределения</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowForm(false)}
      >
        <DistributionForm
          deviceId={deviceId}
          onClose={() => setShowForm(false)}
          onSuccess={() => setRefreshKey(prev => prev + 1)}
        />
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
  loadingText: {
    fontSize: 16,
    color: '#64748b',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
  },
  bottomSection: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  addButton: {
    backgroundColor: '#FF8A50',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#FF8A50',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DistributeTab;