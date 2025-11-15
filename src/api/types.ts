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

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Cart {
  items: CartItem[];
  total: number;
}

export interface ProductsResponse {
  rows: Product[];
}

export interface AddProductRequest {
  pid: number;
  name: string;
  amount: string;
  pin: string;
  data: string;
  name2: string;
  image_data: string | null;
}

export interface EditProductRequest {
  pid: number;
  name: string;
  amount: string;
  pin: string;
  data: string;
  name2: string;
  image_data: string | null;
}

export interface AddProductResponse {
  id: number;
}


export interface ApiError {
  error: string;
  OK?: boolean;
}


export type ApiResponse<T> = T | ApiError;


export interface StoredDeviceData {
  deviceInfo: DeviceInfo;
  isFirstLaunch: boolean;
  setupComplete: boolean;
  lastSync: string;
}


export function isApiError(response: any): response is ApiError {
  return response && typeof response === 'object' && ('error' in response || response.OK === false);
}


export function isDeviceInfo(response: any): response is DeviceInfo {
  return response && typeof response === 'object' && 
    'device_id' in response && 
    'device_name' in response && 
    'machid' in response && 
    'bin' in response;
}

export function isProductsResponse(response: any): response is ProductsResponse {
  return response && typeof response === 'object' && 'rows' in response && Array.isArray(response.rows);
}