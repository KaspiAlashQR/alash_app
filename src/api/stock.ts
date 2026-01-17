import { API_CONFIG } from './config';


export async function reduceStockFIFO(
  deviceId: number,
  items: Array<{ product_id: number; quantity: number }>
): Promise<Array<{ success: boolean; product_id: number; error?: string }>> {
  const results: Array<{ success: boolean; product_id: number; error?: string }> = [];
  try {

    const productsUrl = `${API_CONFIG.BASE_URL}/go/devices/${deviceId}/products/${API_CONFIG.SESSION_ID}`;
    const productsResp = await fetch(productsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_CONFIG.TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    const productsData = await productsResp.json();
    if (!productsResp.ok || !productsData.rows) {
      return items.map(item => ({ success: false, product_id: item.product_id, error: 'Ошибка получения партий товара' }));
    }

    for (const item of items) {
      let remainingToReduce = item.quantity;

      const batches = productsData.rows
        .filter((row: any) => row.product_id === item.product_id && row.remaining_quantity > 0)
        .sort((a: any, b: any) => a.priority - b.priority);

      for (const batch of batches) {
        if (remainingToReduce <= 0) break;
        const reduceQty = Math.min(batch.remaining_quantity, remainingToReduce);

        const endpoint = `${API_CONFIG.BASE_URL}/go/devices/${deviceId}/reduce-stock/${API_CONFIG.SESSION_ID}`;
        const body = JSON.stringify({ product_id: item.product_id, quantity: reduceQty });
        const resp = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${API_CONFIG.TOKEN}`,
            'Content-Type': 'application/json',
          },
          body,
        });
        const respData = await resp.json();
        if (!resp.ok || !respData.OK) {
          results.push({ success: false, product_id: item.product_id, error: respData.error || 'Ошибка списания товара' });
          remainingToReduce = 0;
          break;
        }
        remainingToReduce -= reduceQty;
      }
      if (remainingToReduce > 0) {
        results.push({ success: false, product_id: item.product_id, error: `Недостаточно товара. Не хватает: ${remainingToReduce}` });
      } else {
        results.push({ success: true, product_id: item.product_id });
      }
    }
    return results;
  } catch (error) {
    return items.map(item => ({ success: false, product_id: item.product_id, error: error instanceof Error ? error.message : String(error) }));
  }
}

