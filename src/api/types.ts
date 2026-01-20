export interface DeviceInfo {
  device_id: number;
  device_name: string;
  machid: string;
  bin: string;
  user_id: number;
  pwd: string;
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
  batch_product_id: number;
  batch_id: number;
  batch_number: string;
  product_id: number;
  product_name: string;
  category: string;
  image_url: string;
  available_quantity: number;
  selling_price: number;
  purchase_price: number;
  assigned_quantity: number;
  remaining_quantity: number;
  batch_created_at: string;
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

export interface AddProductToBatchResponse {
  OK: boolean;
  id?: number;
  error?: string;
}

export interface Batch {
  id: number;
  user_id: number;
  batch_number: string;
  description: string;
  created_at: string;
  updated_at: string;
  products_count: number;
  total_quantity: number;
  profit: number;
}

export interface GetBatchesListRequest {
  search: string;
  offset: number;
  limit: number;
  order: null;
}

export interface BatchesListResponse {
  total: number;
  rows: Batch[];
}

export interface BatchProduct {
  id: number;
  user_id: number;
  name: string;
  category: string;
  image_url: string;
  created_at: string;
  updated_at: string;
  used_in_batches: number;
}

export interface BatchProductsListResponse {
  total: number;
  rows: BatchProduct[];
}

export interface GetProductsListRequest {
  search: string;
  offset: number;
  limit: number;
  order: null;
}

export interface CreateBatchRequest {
  batch_number: string;
  description: string;
}

export interface CreateBatchResponse {
  OK: boolean;
  id?: number;
  error?: string;
}

export interface AddProductToBatchRequest {
  batch_id: number;
  product_id: number;
  quantity: number;
  purchase_price: number;
  selling_price: number;
}

export interface AddProductToBatchResponse {
  OK: boolean;
  id?: number;
  error?: string;
}

export interface BatchProductDetail {
  id: number;
  batch_id: number;
  product_id: number;
  quantity: number;
  purchase_price: number;
  selling_price: number;
  product_name: string;
  category: string;
  image_url: string;
  created_at: string;
  updated_at: string;
  distributed_quantity: number;
  remaining_quantity: number;
  profit: number;
}

export interface BatchProductsDetailResponse {
  rows: BatchProductDetail[];
}