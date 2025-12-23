import { API_CONFIG } from './config';
import { DeviceInfo, ApiResponse, isApiError, isDeviceInfo, Product, ProductsResponse, isProductsResponse, AddProductRequest, AddProductResponse, EditProductRequest } from './types';

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
    const endpoint = `${API_CONFIG.ENDPOINTS.GET_PRICES}/${deviceId}/${API_CONFIG.SESSION_ID}`;
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

  private validateImageSize(imageData: string): boolean {
    const sizeInBytes = (imageData.length * 3) / 4;
    const sizeInMB = sizeInBytes / (1024 * 1024);
    return sizeInMB <= 10;
  }

  async addProduct(productData: AddProductRequest): Promise<ApiResponse<AddProductResponse>> {
    if (productData.image_data && !this.validateImageSize(productData.image_data)) {
      return { error: 'Размер изображения не должен превышать 10 МБ' };
    }

    return this.makeRequest<AddProductResponse>(API_CONFIG.ENDPOINTS.ADD_PRICE, {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  }

  async editProduct(productData: EditProductRequest): Promise<ApiResponse<boolean>> {
    if (productData.image_data && !this.validateImageSize(productData.image_data)) {
      return { error: 'Размер изображения не должен превышать 10 МБ' };
    }

    return this.makeRequest<boolean>(API_CONFIG.ENDPOINTS.EDIT_PRICE, {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  }

  async deleteProduct(productId: number): Promise<ApiResponse<boolean>> {
    const endpoint = `${API_CONFIG.ENDPOINTS.DELETE_PRICE}/${productId}`;
    return this.makeRequest<boolean>(endpoint, { method: 'POST' });
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
}

export const alashCloudAPI = new AlashCloudAPI();