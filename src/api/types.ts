export interface DeviceInfo {
  device_id: number;
  device_name: string;
  machid: string;
  bin: string;
  user_id: number;
}

export interface Product {
  id: number;
  device_id: number;
  batch_product_id: number;
  quantity: number;
  remaining_quantity: number;
  product_id: number;
  product_name: string;
  category: string;
  image_url: string;
  selling_price: number;
  purchase_price: number;
  batch_id: number;
  batch_number: string;
  created_at: string;
  updated_at: string;
  priority: number;
  name?: string;
  amount?: number;
  name2?: string;
  url?: string;
  name_ru?: string;
  name_kz?: string;
  invoice_product_id?: number;
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
  product_name: any;
  url?: string;
}

export interface GoOrderResponse {
  OK: boolean;
  id?: number;
  error?: string;
}

export interface GoOrderUpdateFields {
  status?: 'pending' | 'paid' | 'cancelled';
  product_name?: any;
}

export interface AssignProductItem {
  batch_product_id: number;
  quantity: number;
}

export interface AssignProductsRequest {
  products: AssignProductItem[];
}

export interface AssignProductsResponse {
  OK: boolean;
  error?: string;
}

export interface AvailableProduct {
  id: number;
  invoice_id: number;
  invoice_name: string;
  name_ru: string;
  name_kz: string;
  category: string;
  available_quantity: number;
  selling_price: number;
  purchase_price: number;
  image_url: string;
  assigned_quantity: number;
  remaining_quantity: number;
}

export interface AvailableProductsResponse {
  rows: AvailableProduct[];
}

export interface OrderProduct {
  name: string;
  quantity: number;
}

export interface Order {
  id: number;
  amount: number;
  device_id: number;
  product_name: OrderProduct[];
  url: string;
  status: 'pending' | 'paid' | 'completed' | 'cancelled' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface OrdersResponse {
  orders: Order[];
  error?: string;
}