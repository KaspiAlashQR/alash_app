import { Camera } from 'react-native-vision-camera';

// Состояние камеры
let cameraActive = false;

/**
 * Проверка и запрос разрешений на использование камеры
 */
export const requestCameraPermission = async (): Promise<boolean> => {
  try {
    const permission = await Camera.requestCameraPermission();
    
    if (permission === 'granted' || permission === 'authorized') {
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Ошибка при запросе разрешения камеры:', error);
    return false;
  }
};

/**
 * Проверка статуса разрешений камеры
 */
export const checkCameraPermission = async (): Promise<boolean> => {
  try {
    const permission = await Camera.getCameraPermissionStatus();
    return permission === 'granted' || permission === 'authorized';
  } catch (error) {
    console.error('Ошибка при проверке разрешения камеры:', error);
    return false;
  }
};

/**
 * Включить камеру (устанавливает флаг активности)
 */
export const startCamera = async (): Promise<{ success: boolean; message: string; active: boolean }> => {
  try {
    // Проверяем разрешения
    const hasPermission = await checkCameraPermission();
    
    if (!hasPermission) {
      const granted = await requestCameraPermission();
      
      if (!granted) {
        return {
          success: false,
          message: 'Нет разрешения на использование камеры',
          active: false
        };
      }
    }
    
    cameraActive = true;
    
    return {
      success: true,
      message: 'Камера включена',
      active: true
    };
  } catch (error: any) {
    console.error('Ошибка при включении камеры:', error);
    return {
      success: false,
      message: error?.message || 'Неизвестная ошибка',
      active: false
    };
  }
};

/**
 * Отключить камеру (сбрасывает флаг активности)
 */
export const stopCamera = (): { success: boolean; message: string; active: boolean } => {
  cameraActive = false;
  
  return {
    success: true,
    message: 'Камера отключена',
    active: false
  };
};

/**
 * Получить текущий статус камеры
 */
export const getCameraStatus = (): boolean => {
  return cameraActive;
};

/**
 * Получить доступные камеры (фронтальная, задняя)
 */
export const getAvailableCameras = async () => {
  try {
    const devices = await Camera.getAvailableCameraDevices();
    return devices;
  } catch (error) {
    console.error('Ошибка при получении списка камер:', error);
    return [];
  }
};
