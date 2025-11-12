import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { deviceStorage } from '../api/storage';
import { DeviceInfo } from '../api/types';
import DeviceHeader from '../components/DeviceHeader';

type RootStackParamList = {
  Home: undefined;
  Auth: undefined;
  AdminPanel: undefined;
  InitialSetup: undefined;
};

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

const { width } = Dimensions.get('window');
const isTablet = width > 600;

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [isSetupComplete, setIsSetupComplete] = useState(false);

  useEffect(() => {
    checkDeviceSetup();
  }, []);

  const checkDeviceSetup = async () => {
    try {
      setIsLoading(true);

      const setupComplete = await deviceStorage.isSetupComplete();
      
      if (setupComplete) {
        const storedDeviceInfo = await deviceStorage.getDeviceInfo();
        
        if (storedDeviceInfo) {
          setDeviceInfo(storedDeviceInfo);
          setIsSetupComplete(true);
        } else {
          await deviceStorage.clearAllData();
          setIsSetupComplete(false);
        }
      } else {
        setIsSetupComplete(false);
      }
    } catch (error) {
      console.error('Ошибка при проверке настройки устройства:', error);
      setIsSetupComplete(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminAccess = () => {
    navigation.navigate('Auth');
  };

  const handleGoToSetup = () => {
    navigation.navigate('InitialSetup');
  };

  // Показываем загрузку
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3182CE" />
          <Text style={[styles.loadingText, isTablet && styles.loadingTextTablet]}>
            Проверка настроек...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Если настройка не завершена - показываем экран для перехода к настройке
  if (!isSetupComplete) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.setupContainer}>
          <Text style={[styles.welcomeTitle, isTablet && styles.welcomeTitleTablet]}>
            Добро пожаловать в AlashCloud
          </Text>
          
          <Text style={[styles.setupMessage, isTablet && styles.setupMessageTablet]}>
            Для начала работы необходимо подключить ваше устройство к системе
          </Text>
          
          <TouchableOpacity
            style={[styles.setupButton, isTablet && styles.setupButtonTablet]}
            onPress={handleGoToSetup}
          >
            <Text style={[styles.setupButtonText, isTablet && styles.setupButtonTextTablet]}>
              Настроить устройство
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Основной экран с Header и кнопкой входа в админку
  return (
    <SafeAreaView style={styles.container}>
      {/* Header с информацией об устройстве */}
      {deviceInfo && (
        <DeviceHeader 
          deviceInfo={deviceInfo} 
          onAdminAccess={handleAdminAccess}
        />
      )}
      
      {/* Основной контент */}
      <View style={styles.mainContent}>
        <View style={styles.centerContainer}>
          <Text style={[styles.deviceTitle, isTablet && styles.deviceTitleTablet]}>
            {deviceInfo?.device_name}
          </Text>
          
          <Text style={[styles.statusText, isTablet && styles.statusTextTablet]}>
            Устройство готово к работе
          </Text>
          
          {/* Кнопка входа в админку */}
          <TouchableOpacity
            style={[styles.adminButton, isTablet && styles.adminButtonTablet]}
            onPress={handleAdminAccess}
          >
            <Text style={[styles.adminButtonText, isTablet && styles.adminButtonTextTablet]}>
              Войти в панель управления
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#4A5568',
  },
  loadingTextTablet: {
    fontSize: 20,
  },
  setupContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A202C',
    textAlign: 'center',
    marginBottom: 16,
  },
  welcomeTitleTablet: {
    fontSize: 32,
  },
  setupMessage: {
    fontSize: 16,
    color: '#4A5568',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  setupMessageTablet: {
    fontSize: 20,
    lineHeight: 30,
  },
  setupButton: {
    backgroundColor: '#3182CE',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  setupButtonTablet: {
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderRadius: 16,
  },
  setupButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  setupButtonTextTablet: {
    fontSize: 20,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  centerContainer: {
    alignItems: 'center',
  },
  deviceTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A202C',
    textAlign: 'center',
    marginBottom: 12,
  },
  deviceTitleTablet: {
    fontSize: 36,
  },
  statusText: {
    fontSize: 16,
    color: '#48BB78',
    textAlign: 'center',
    marginBottom: 48,
  },
  statusTextTablet: {
    fontSize: 20,
  },
  adminButton: {
    backgroundColor: '#3182CE',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  adminButtonTablet: {
    paddingHorizontal: 48,
    paddingVertical: 20,
    borderRadius: 16,
  },
  adminButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  adminButtonTextTablet: {
    fontSize: 20,
  },
});

export default HomeScreen;