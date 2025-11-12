// Типы для API ответов
export interface DeviceInfo {
  device_id: number;
  device_name: string;
  machid: string;
  bin: string;
}

export interface Product {
  id: number;
  name: string;
  amount: number;
  pid: number;
  name2: string;
  url?: string;
}

export interface ProductsResponse {
  rows: Product[];
}

// Типы для ошибок API
export interface ApiError {
  error: string;
  OK?: boolean;
}

// Общий тип для ответов API
export type ApiResponse<T> = T | ApiError;

// Типы для локального хранения
export interface StoredDeviceData {
  deviceInfo: DeviceInfo;
  isFirstLaunch: boolean;
  setupComplete: boolean;
  lastSync: string;
}

// Тип для проверки успешности ответа
export function isApiError(response: any): response is ApiError {
  return response && ('error' in response || response.OK === false);
}

// Тип для проверки успешности ответа устройства
export function isDeviceInfo(response: any): response is DeviceInfo {
  return response && 
    'device_id' in response && 
    'device_name' in response && 
    'machid' in response && 
    'bin' in response;
}

export function isProductsResponse(response: any): response is ProductsResponse {
  return response && 'rows' in response && Array.isArray(response.rows);
}