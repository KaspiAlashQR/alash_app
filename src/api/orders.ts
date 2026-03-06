import { API_CONFIG } from './config';
import { GoOrderCreate, GoOrderResponse, GoOrderUpdateFields } from './types';
import { getDeviceToken } from './storage';

export async function createInternalOrder(order: GoOrderCreate): Promise<GoOrderResponse> {
  try {
    const token = await getDeviceToken();
    if (!token) {
      return { OK: false, error: 'Токен устройства не найден. Пожалуйста, пройдите авторизацию заново.' };
    }

    const response = await fetch(
      API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.GO_ORDERS,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: order.amount,
          device_id: order.device_id,
          product_name: order.product_name,
          url: order.url || '',
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      let parsedError: any = null;
      try {
        parsedError = JSON.parse(errorText);
      } catch {
        parsedError = null;
      }
      return {
        OK: false,
        statusCode: response.status,
        error: parsedError?.error || `HTTP ${response.status}: ${errorText || response.statusText}`,
        subscription_status: parsedError?.subscription_status,
      };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    return { OK: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function updateOrder(orderId: number, fields: GoOrderUpdateFields): Promise<GoOrderResponse> {
  try {
    const token = await getDeviceToken();
    if (!token) {
      return { OK: false, error: 'Токен устройства не найден. Пожалуйста, пройдите авторизацию заново.' };
    }

    const response = await fetch(
      `${API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.GO_ORDERS}/${orderId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fields),
      }
    );
    const data = await response.json();
    return data;
  } catch (error) {
    return { OK: false, error: error instanceof Error ? error.message : String(error) };
  }
}
