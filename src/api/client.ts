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
      const data = await response.json();



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
    const endpoint = `${API_CONFIG.ENDPOINTS.GET_PRICES}/${deviceId}`;
    return this.makeRequest<ProductsResponse>(endpoint, { method: 'GET' });
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
}

export const alashCloudAPI = new AlashCloudAPI();