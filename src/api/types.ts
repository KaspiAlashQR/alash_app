export interface DeviceInfo {
  device_id: number;
  device_name: string;
  machid: string;
  bin: string;
}

export interface Product {
  id: number;
  device_id: number;
  invoice_product_id: number;
  quantity: number;
  remaining_quantity: number;
  name_ru: string;
  name_kz: string;
  category: string;
  selling_price: number;
  purchase_price: number;
  image_url: string;
  created_at: string;
  updated_at: string;
  // Обратная совместимость (геттеры для старого кода)
  name?: string;
  amount?: number;
  name2?: string;
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
  device_id: number;
  name: string;
  amount: number;
  name2: string;
  url: string | null;
  category: string;
}

export interface EditProductRequest {
  device_id: number;
  price_id: number;
  name: string;
  amount: number;
  name2: string;
  url: string | null;
  category: string;
}

export interface AddProductResponse {
  OK: boolean;
  id: number;
}

export interface Category {
  id: number;
  name: string;
  name_kz: string;
}

export interface CategoriesResponse {
  categories: Category[];
}

export interface UploadImageResponse {
  success: boolean;
  url: string;
  public_id: string;
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

export interface GoOrderCreate {
  amount: number;
  device_id: number;
  product_name: any; // JSON-объект: массив или объект с товарами
  url?: string; // всегда ''
}

export interface GoOrderResponse {
  OK: boolean;
  id?: number;
  error?: string;
}

export interface GoOrderUpdateFields {
  status?: 'pending' | 'paid' | 'cancelled';
  product_name?: any; // если потребуется обновлять
}