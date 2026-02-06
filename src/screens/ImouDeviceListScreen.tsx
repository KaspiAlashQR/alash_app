import React, { useState, useCallback, useEffect } from 'react';
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
import { deviceStorage } from '../api/storage';

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

  // SubAccount state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [subAccountEmail, setSubAccountEmail] = useState<string | null>(null);
  const [noEmailConfigured, setNoEmailConfigured] = useState(false);

  // Auto-login with stored email
  const autoLogin = useCallback(async () => {
    try {
      // Check if already logged in
      if (imouSDK.isSubAccountLoggedIn()) {
        setIsLoggedIn(true);
        setSubAccountEmail(imouSDK.getSubAccountEmail());
        return true;
      }

      // Get email from device storage
      const deviceInfo = await deviceStorage.getDeviceInfo();
      const storedEmail = deviceInfo?.email;

      if (!storedEmail) {
        console.log('[ImouDeviceList] No email configured in device storage');
        setNoEmailConfigured(true);
        return false;
      }

      console.log('[ImouDeviceList] Auto-login with stored email:', storedEmail);
      await imouSDK.loginSubAccount(storedEmail);
      setIsLoggedIn(true);
      setSubAccountEmail(storedEmail);
      return true;
    } catch (error: any) {
      console.error('[ImouDeviceList] Auto-login failed:', error?.message);
      Alert.alert('Ошибка входа', error?.message || 'Не удалось войти в IMOU');
      return false;
    }
  }, []);

  const loadDevices = useCallback(async () => {
    try {
      setLoading(true);

      // Initialize SDK first
      await imouSDK.initialize();

      // Try auto-login
      const loggedIn = await autoLogin();
      if (!loggedIn) {
        setLoading(false);
        return;
      }

      const result = await imouSDK.getDeviceList();
      setDevices(result.devices);
    } catch (error: any) {
      Alert.alert('Ошибка', error?.message || 'Не удалось загрузить список устройств');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [autoLogin]);

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
    if (!isLoggedIn) {
      Alert.alert('Ошибка', 'Необходимо настроить email в настройках устройства');
      return;
    }
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
      playToken: device.playToken, // Pass playToken from device list API
      productId: device.productId, // Product ID из API (НЕ deviceId!)
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

      {/* SubAccount info bar */}
      {isLoggedIn && subAccountEmail && (
        <View style={styles.accountBar}>
          <View style={styles.accountInfo}>
            <Icon name="account-circle" size={20} color="#22c55e" />
            <Text style={styles.accountEmail} numberOfLines={1}>{subAccountEmail}</Text>
          </View>
          <Icon name="check-circle" size={20} color="#22c55e" />
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Подключение к IMOU...</Text>
        </View>
      ) : noEmailConfigured ? (
        <View style={styles.emptyContainer}>
          <Icon name="email-off" size={64} color="#d1d5db" />
          <Text style={styles.emptyText}>Email не настроен</Text>
          <Text style={styles.emptySubText}>
            Для работы с камерами IMOU необходимо настроить email в настройках устройства
          </Text>
        </View>
      ) : !isLoggedIn ? (
        <View style={styles.emptyContainer}>
          <Icon name="account-off" size={64} color="#d1d5db" />
          <Text style={styles.emptyText}>Не удалось войти</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={loadDevices}>
            <Text style={styles.emptyButtonText}>Повторить</Text>
          </TouchableOpacity>
        </View>
      ) : devices.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="camera-off" size={64} color="#d1d5db" />
          <Text style={styles.emptyText}>Устройства не найдены</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={handleAddDevice}>
            <Text style={styles.emptyButtonText}>Добавить камеру</Text>
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
  accountBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f0fdf4',
    borderBottomWidth: 1,
    borderBottomColor: '#dcfce7',
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  accountEmail: {
    marginLeft: 8,
    fontSize: 14,
    color: '#166534',
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
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
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
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
