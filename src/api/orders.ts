import { API_CONFIG } from './config';
import { GoOrderCreate, GoOrderResponse, GoOrderUpdateFields } from './types';


export async function createInternalOrder(order: GoOrderCreate): Promise<GoOrderResponse> {
  try {
    const response = await fetch(
      API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.GO_ORDERS,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_CONFIG.TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...order,
          product_name: order.product_name, // JSON-объект
          url: order.url ?? '',
        }),
      }
    );
    const data = await response.json();
    return data;
  } catch (error) {
    return { OK: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function updateOrder(orderId: number, fields: GoOrderUpdateFields): Promise<GoOrderResponse> {
  try {
    const response = await fetch(
      `${API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.GO_ORDERS}/${orderId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${API_CONFIG.TOKEN}`,
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
