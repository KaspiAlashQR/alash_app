/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAppVersion } from './utils/version';
import { StatusBar, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Screens
import HomeScreen from './screens/HomeScreen';
import AuthScreen from './screens/AuthScreen';
import AdminPanelScreen from './screens/AdminPanelScreen';
import AddProductScreen from './screens/AddProductScreen';
import InitialSetupScreen from './screens/InitialSetupScreen';
import CartScreen from './screens/CartScreen';
import PaymentScreen from './screens/PaymentScreen';
import BatchDetailsScreen from './screens/BatchDetailsScreen';
import ImouDeviceListScreen from './screens/ImouDeviceListScreen';
import ImouDeviceViewScreen from './screens/ImouDeviceViewScreen';
import ImouAddDeviceScreen from './screens/ImouAddDeviceScreen';

// Utils
import { KioskModule } from './utils/KioskModule';
import { imouTokenService } from '../Imou/typescript/imou.token-service';
import { deviceStorage } from './api/storage';
import { startDiagnosticLogger } from './services/diagnosticLogger';
import { CameraSessionHost } from './components/CameraSessionHost';
import { processUploadQueue, recoverRecordings } from './services/recordingQueue';

// Types
import { RootStackParamList } from './utils/navigation.types';

const Stack = createNativeStackNavigator<RootStackParamList>();

function App(): React.JSX.Element {

  // Ключ для хранения версии
  const VERSION_KEY = 'APP_VERSION';

  useEffect(() => {
    startDiagnosticLogger();
    void recoverRecordings();
    const uploadTimer = setInterval(() => { void processUploadQueue(); }, 60_000);

    // Проверка версии и очистка storage при обновлении
    const checkAndClearStorageOnUpdate = async () => {
      try {
        const currentVersion = getAppVersion();
        const storedVersion = await AsyncStorage.getItem(VERSION_KEY);
        if (storedVersion !== currentVersion) {
          // Очистить только нужные ключи, например корзину и авторизацию
          await AsyncStorage.removeItem('@AlashCloud_Cart');
          await AsyncStorage.setItem(VERSION_KEY, currentVersion);
        }
      } catch (e) {
        console.warn('Ошибка при проверке версии приложения:', e);
      }
    };
    checkAndClearStorageOnUpdate();
    
    const enableKioskOnStart = async () => {
      if (Platform.OS === 'android') {
        try {
          await KioskModule.enableKioskMode();
        } catch (error) {
          console.warn('Не удалось включить киоск режим:', error);
        }
      }
    };

    enableKioskOnStart();

    const initImou = async () => {
      const deviceInfo = await deviceStorage.getDeviceInfo();
      if (deviceInfo?.email) {
        await imouTokenService.ensureReady(deviceInfo.email).catch(() => {});
        imouTokenService.startAutoRefresh();
      }
    };

    initImou();

    return () => {
      clearInterval(uploadTimer);
      imouTokenService.stopAutoRefresh();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar
        backgroundColor="transparent"
        translucent
        hidden={true} // Скрываем статус бар в киоск режиме
      />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerShown: false, // Убираем стандартные заголовки для кастомного дизайна
            gestureEnabled: false, // Отключаем жесты в киоск режиме
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{
              title: 'Главная',
            }}
          />
          <Stack.Screen
            name="InitialSetup"
            component={InitialSetupScreen}
            options={{
              title: 'Первичная настройка',
            }}
          />
          <Stack.Screen
            name="Auth"
            component={AuthScreen}
            options={{
              title: 'Авторизация',
              gestureDirection: 'horizontal',
            }}
          />
          <Stack.Screen
            name="AdminPanel"
            component={AdminPanelScreen}
            options={{
              title: 'Панель администратора',
              gestureEnabled: false, // Запрещаем свайп назад с панели админа
            }}
          />
          <Stack.Screen
            name="AddProduct"
            component={AddProductScreen}
            options={{
              title: 'Добавление товара',
              gestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="Cart"
            component={CartScreen}
            options={{
              title: 'Корзина',
              gestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="Payment"
            component={PaymentScreen}
            options={{
              title: 'Оплата',
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="BatchDetails"
            component={BatchDetailsScreen}
            options={{
              title: 'Детали партии',
              gestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="ImouDeviceList"
            component={ImouDeviceListScreen}
            options={{
              title: 'Устройства IMOU',
              gestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="ImouDeviceView"
            component={ImouDeviceViewScreen}
            options={{
              title: 'Просмотр камеры',
              gestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="ImouAddDevice"
            component={ImouAddDeviceScreen}
            options={{
              title: 'Настройка камеры',
              gestureEnabled: true,
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
      <CameraSessionHost />
    </SafeAreaProvider>
  );
}

export default App;
