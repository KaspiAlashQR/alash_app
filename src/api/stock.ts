import { API_CONFIG } from './config';

export interface ReduceStockRequest {
  invoice_product_id: number;
  quantity: number;
}

export interface ReduceStockResponse {
  OK: boolean;
  remaining_quantity?: number;
  error?: string;
}

/**
 * Уменьшает остаток товара на устройстве при оплате заказа
 * @param deviceId - ID устройства
 * @param invoiceProductId - ID товара из накладной
 * @param quantity - количество проданного товара
 */
export async function reduceStock(
  deviceId: number,
  invoiceProductId: number,
  quantity: number
): Promise<ReduceStockResponse> {
  try {
    const endpoint = `${API_CONFIG.ENDPOINTS.REDUCE_STOCK}/${deviceId}/reduce-stock/${API_CONFIG.SESSION_ID}`;
    const url = `${API_CONFIG.BASE_URL}${endpoint}`;
    
    const requestBody = {
      invoice_product_id: invoiceProductId,
      quantity: quantity,
    };
    const body = JSON.stringify(requestBody);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_CONFIG.TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: body,
    });

    const responseText = await response.text();

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Ошибка парсинга ответа:', parseError);
      return {
        OK: false,
        error: 'Ошибка парсинга ответа сервера',
      };
    }

    if (!response.ok) {
      return {
        OK: false,
        error: responseData.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    return responseData;
  } catch (error) {
    console.error('Ошибка уменьшения остатка:', error);
    return {
      OK: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Уменьшает остаток для нескольких товаров
 * @param deviceId - ID устройства
 * @param items - массив товаров с invoice_product_id и quantity
 */
export async function reduceStockMultiple(
  deviceId: number,
  items: Array<{ invoice_product_id: number; quantity: number }>
): Promise<Array<{ success: boolean; invoice_product_id: number; error?: string }>> {
  const results = await Promise.all(
    items.map(async (item) => {
      const result = await reduceStock(deviceId, item.invoice_product_id, item.quantity);
      return {
        success: result.OK,
        invoice_product_id: item.invoice_product_id,
        error: result.error,
      };
    })
  );
  
  return results;
}

