import { API_CONFIG } from './config';
import { DeviceInfo, ApiResponse, isApiError, isDeviceInfo, Product, ProductsResponse, isProductsResponse } from './types';
import { apiLogger } from '../utils/apiLogger';

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

    apiLogger.logRequest(method, url, headers, options.body);

    try {
      const response = await fetch(url, { ...options, headers });
      const duration = Date.now() - startTime;
      const data = await response.json();

      apiLogger.logResponse(url, response.status, response.statusText, data, duration);

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
      apiLogger.logError(url, error, duration);
      
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
      apiLogger.logDeviceValidation(machid, false, undefined, response.error);
      return { isValid: false, error: response.error };
    }
    
    if (isDeviceInfo(response)) {
      apiLogger.logDeviceValidation(machid, true, response);
      return { isValid: true, deviceInfo: response };
    }
    
    const error = 'Неожиданный формат ответа сервера';
    apiLogger.logDeviceValidation(machid, false, undefined, error);
    return { isValid: false, error };
  }
}

export const alashCloudAPI = new AlashCloudAPI();