import { API_CONFIG } from './config';
import { DeviceInfo, ApiResponse, isApiError, isDeviceInfo, Product, ProductsResponse, isProductsResponse, AddProductRequest, AddProductResponse, EditProductRequest, UploadImageResponse, CategoriesResponse, AssignProductItem, AssignProductsResponse, AvailableProductsResponse, OrdersResponse } from './types';

class AlashCloudAPI {
  private baseURL = API_CONFIG.BASE_URL;
  private token = API_CONFIG.TOKEN;

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const startTime = Date.now();
    const url = `${this.baseURL}${endpoint}`;
    const method = options.method || 'GET';
    const headers = {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };
    try {
      const response = await fetch(url, { ...options, headers });
      const duration = Date.now() - startTime;
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('Ошибка парсинга JSON из API:', text);
        throw new Error('Ошибка парсинга JSON из API');
      }
      // Логируем все полученные данные
      console.log('API response:', {
        url,
        method,
        status: response.status,
        duration,
        data,
      });
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized - проверьте токен авторизации');
        } else if (response.status === 404) {
          throw new Error('Устройство не найдено в системе');
        } else if (response.status === 500) {
          throw new Error('Ошибка сервера - попробуйте позже');
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }
      return data as T;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('API error:', {
        url,
        method,
        duration,
        error: error instanceof Error ? error.message : error,
      });
      if (error instanceof Error) {
        return { error: error.message } as ApiResponse<T>;
      }
      return { error: 'Неизвестная ошибка сети' } as ApiResponse<T>;
    }
  }

  async getDeviceInfo(machid: string): Promise<ApiResponse<DeviceInfo>> {
    const endpoint = `${API_CONFIG.ENDPOINTS.DEVICE_INFO}/${machid}`;
    return this.makeRequest<DeviceInfo>(endpoint, { method: 'GET' });
  }

  async getDevicePrices(deviceId: number): Promise<ApiResponse<ProductsResponse>> {
    const endpoint = `${API_CONFIG.ENDPOINTS.GET_DEVICE_PRODUCTS}/${deviceId}/products/${API_CONFIG.SESSION_ID}`;
    const response = await this.makeRequest<any>(endpoint, { method: 'GET' });
    
    // Если rows — строка, парсим её как JSON
    if (response && typeof response.rows === 'string') {
      try {
        response.rows = JSON.parse(response.rows);
      } catch (e) {
        console.error('Ошибка парсинга rows:', response.rows);
        return { error: 'Ошибка парсинга списка товаров' };
      }
    }
    
    return response as ProductsResponse;
  }

  async validateDevice(machid: string): Promise<{ isValid: boolean; deviceInfo?: DeviceInfo; error?: string }> {
    const response = await this.getDeviceInfo(machid);
    
    if (isApiError(response)) {
      return { isValid: false, error: response.error };
    }
    
    if (isDeviceInfo(response)) {
      return { isValid: true, deviceInfo: response };
    }
    
    const error = 'Неожиданный формат ответа сервера';
    return { isValid: false, error };
  }

  async addProduct(productData: AddProductRequest): Promise<ApiResponse<AddProductResponse>> {
    const endpoint = `${API_CONFIG.ENDPOINTS.ADD_PRICE}/${API_CONFIG.SESSION_ID}`;
    const url = `${this.baseURL}${endpoint}`;
    const body = JSON.stringify(productData);
    
    console.log('=== ADD PRODUCT REQUEST ===');
    console.log('URL:', url);
    console.log('Headers:', {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    });
    console.log('Body:', body);
    console.log('Body (parsed):', productData);
    
    const response = await this.makeRequest<AddProductResponse>(endpoint, {
      method: 'POST',
      body: body,
    });
    
    console.log('=== ADD PRODUCT RESPONSE ===');
    console.log('Response:', response);
    console.log('===========================');
    
    return response;
  }

  async editProduct(productData: EditProductRequest): Promise<ApiResponse<AddProductResponse>> {
    const endpoint = `${API_CONFIG.ENDPOINTS.EDIT_PRICE}/${API_CONFIG.SESSION_ID}`;
    const url = `${this.baseURL}${endpoint}`;
    const body = JSON.stringify(productData);
    
    console.log('=== EDIT PRODUCT REQUEST ===');
    console.log('URL:', url);
    console.log('Headers:', {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    });
    console.log('Body:', body);
    console.log('Body (parsed):', productData);
    
    const response = await this.makeRequest<AddProductResponse>(endpoint, {
      method: 'POST',
      body: body,
    });
    
    console.log('=== EDIT PRODUCT RESPONSE ===');
    console.log('Response:', response);
    console.log('============================');
    
    return response;
  }

  async deleteProduct(deviceId: number, priceId: number): Promise<ApiResponse<{ OK: boolean }>> {
    const endpoint = `${API_CONFIG.ENDPOINTS.DELETE_PRICE}/${deviceId}/${priceId}/${API_CONFIG.SESSION_ID}`;
    const url = `${this.baseURL}${endpoint}`;
    
    console.log('=== DELETE PRODUCT REQUEST ===');
    console.log('URL:', url);
    console.log('Headers:', {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    });
    console.log('Params:', { device_id: deviceId, priceId, sessionId: API_CONFIG.SESSION_ID });
    
    const response = await this.makeRequest<{ OK: boolean }>(endpoint, { method: 'POST' });
    
    console.log('=== DELETE PRODUCT RESPONSE ===');
    console.log('Response:', response);
    console.log('===============================');
    
    return response;
  }

  async uploadImage(file: File | Blob): Promise<ApiResponse<UploadImageResponse>> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const endpoint = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.UPLOAD_IMAGE}/${API_CONFIG.SESSION_ID}`;
      
      console.log('=== UPLOAD IMAGE REQUEST ===');
      console.log('URL:', endpoint);
      console.log('Headers:', {
        'Authorization': `Bearer ${API_CONFIG.TOKEN}`,
      });
      console.log('File size:', file.size, 'bytes');
      console.log('File type:', file.type);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_CONFIG.TOKEN}`,
        },
        body: formData,
      });

      console.log('=== UPLOAD IMAGE RESPONSE ===');
      console.log('Status:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json();
        console.log('Error response:', errorData);
        console.log('============================');
        return { error: errorData.error || 'Не удалось загрузить изображение' };
      }

      const responseData = await response.json();
      console.log('Success response:', responseData);
      console.log('============================');
      
      return responseData;
    } catch (error) {
      console.log('=== UPLOAD IMAGE ERROR ===');
      console.log('Error:', error);
      console.log('==========================');
      return { error: 'Ошибка загрузки изображения' };
    }
  }

  async getCategories(): Promise<ApiResponse<CategoriesResponse>> {
    const endpoint = API_CONFIG.ENDPOINTS.GET_CATEGORIES;
    const url = `${this.baseURL}${endpoint}`;
    
    console.log('=== GET CATEGORIES REQUEST ===');
    console.log('URL:', url);
    console.log('Headers:', {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    });
    
    const response = await this.makeRequest<CategoriesResponse>(endpoint, {
      method: 'GET',
    });
    
    console.log('=== GET CATEGORIES RESPONSE ===');
    console.log('Response:', response);
    console.log('===============================');
    
    return response;
  }

  async createOrder(machid: string, sum: number): Promise<ApiResponse<{ id: number }>> {
    const endpoint = `${API_CONFIG.ENDPOINTS.NEW_ORDER}/${encodeURIComponent(machid)}/${sum}`;
    return this.makeRequest<{ id: number }>(endpoint, { method: 'GET' });
  }

  async checkOrder(orderId: number): Promise<ApiResponse<boolean>> {
    const endpoint = `${API_CONFIG.ENDPOINTS.CHECK_ORDER}/${orderId}`;
    return this.makeRequest<boolean>(endpoint, { method: 'GET' });
  }

  async getTemperature(machid: string): Promise<ApiResponse<{ status: string; machid: string; value: number }>> {
    const endpoint = `/update_temp/${machid}`;
    return this.makeRequest<{ status: string; machid: string; value: number }>(endpoint, { method: 'GET' });
  }

  async assignProducts(deviceId: number, products: AssignProductItem[]): Promise<ApiResponse<AssignProductsResponse>> {
    const endpoint = `${API_CONFIG.ENDPOINTS.ASSIGN_PRODUCTS}/${deviceId}/assign-products/${API_CONFIG.SESSION_ID}`;
    const requestBody = { products };
    const body = JSON.stringify(requestBody);
    
    const response = await this.makeRequest<AssignProductsResponse>(endpoint, {
      method: 'POST',
      body: body,
    });
    
    return response;
  }

  async getAvailableProducts(deviceId: number): Promise<ApiResponse<AvailableProductsResponse>> {
    const endpoint = `${API_CONFIG.ENDPOINTS.GET_AVAILABLE_PRODUCTS}/${deviceId}/available-products/${API_CONFIG.SESSION_ID}`;
    const response = await this.makeRequest<any>(endpoint, { method: 'GET' });
    
    // Если rows — строка, парсим её как JSON
    if (response && typeof response.rows === 'string') {
      try {
        response.rows = JSON.parse(response.rows);
      } catch (e) {
        console.error('Ошибка парсинга rows:', response.rows);
        return { error: 'Ошибка парсинга списка доступных товаров' };
      }
    }
    
    return response as AvailableProductsResponse;
  }

  async getOrders(machid: number | string): Promise<ApiResponse<OrdersResponse>> {
    // Преобразуем machid в число для URL
    const machidNum = typeof machid === 'string' ? parseInt(machid, 10) : machid;
    const endpoint = `${API_CONFIG.ENDPOINTS.GET_ORDERS}/${machidNum}?sessionid=${API_CONFIG.SESSION_ID}`;
    const response = await this.makeRequest<OrdersResponse>(endpoint, { method: 'GET' });
    return response;
  }
}

export const alashCloudAPI = new AlashCloudAPI();