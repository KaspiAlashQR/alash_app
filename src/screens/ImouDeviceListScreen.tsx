import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import imouSDK, { ImouDevice } from '../../Imou/typescript/imou';
import { RootStackParamList } from '../utils/navigation.types';

type ImouDeviceListScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ImouDeviceList'>;

interface Props {
  navigation: ImouDeviceListScreenNavigationProp;
}

const { width } = Dimensions.get('window');
const isTablet = width > 600;

const ImouDeviceListScreen: React.FC<Props> = ({ navigation }) => {
  const [devices, setDevices] = useState<ImouDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDevices = useCallback(async () => {
    try {
      await imouSDK.initialize();
      const result = await imouSDK.getDeviceList();
      setDevices(result.devices);
    } catch (error: any) {
      Alert.alert('Ошибка', error?.message || 'Не удалось загрузить список устройств');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Reload devices when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadDevices();
    }, [loadDevices])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadDevices();
  };

  const handleAddDevice = () => {
    navigation.navigate('ImouAddDevice');
  };

  const handleDeleteDevice = (device: ImouDevice) => {
    Alert.alert(
      'Удаление устройства',
      `Удалить устройство "${device.name}"?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await imouSDK.unbindDevice(device.deviceId);
              Alert.alert('Успешно', 'Устройство удалено');
              loadDevices();
            } catch (error: any) {
              Alert.alert('Ошибка', error?.message || 'Не удалось удалить устройство');
            }
          },
        },
      ]
    );
  };

  const handleOpenDevice = (device: ImouDevice) => {
    navigation.navigate('ImouDeviceView', {
      deviceId: device.deviceId,
      deviceName: device.name,
      channelId: device.channels?.[0]?.channelId || '0',
    });
  };

  const renderDevice = ({ item }: { item: ImouDevice }) => {
    const isOnline = item.status === 'online';
    return (
      <TouchableOpacity
        style={styles.deviceCard}
        onPress={() => handleOpenDevice(item)}
        onLongPress={() => handleDeleteDevice(item)}
      >
        <View style={styles.deviceIconContainer}>
          <Icon
            name="camera"
            size={isTablet ? 40 : 32}
            color={isOnline ? '#22c55e' : '#9ca3af'}
          />
        </View>
        <View style={styles.deviceInfo}>
          <Text style={styles.deviceName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.deviceModel} numberOfLines={1}>
            {item.deviceModel || item.brand || 'IMOU Camera'}
          </Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, isOnline ? styles.statusOnline : styles.statusOffline]} />
            <Text style={[styles.statusText, isOnline ? styles.statusTextOnline : styles.statusTextOffline]}>
              {isOnline ? 'Онлайн' : 'Офлайн'}
            </Text>
          </View>
        </View>
        <Icon name="chevron-right" size={24} color="#9ca3af" />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Устройства IMOU</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddDevice}>
          <Icon name="plus" size={24} color="#2563eb" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : devices.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="camera-off" size={64} color="#d1d5db" />
          <Text style={styles.emptyText}>Устройства не найдены</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={handleAddDevice}>
            <Text style={styles.emptyButtonText}>Настроить камеру</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={devices}
          renderItem={renderDevice}
          keyExtractor={(item) => item.deviceId}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#2563eb']} />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: isTablet ? 22 : 18,
    fontWeight: '600',
    color: '#111827',
  },
  addButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  deviceIconContainer: {
    width: isTablet ? 64 : 48,
    height: isTablet ? 64 : 48,
    borderRadius: isTablet ? 32 : 24,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: isTablet ? 18 : 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  deviceModel: {
    fontSize: isTablet ? 14 : 12,
    color: '#6b7280',
    marginBottom: 6,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusOnline: {
    backgroundColor: '#22c55e',
  },
  statusOffline: {
    backgroundColor: '#9ca3af',
  },
  statusText: {
    fontSize: 12,
  },
  statusTextOnline: {
    color: '#22c55e',
  },
  statusTextOffline: {
    color: '#9ca3af',
  },
});

export default ImouDeviceListScreen;
