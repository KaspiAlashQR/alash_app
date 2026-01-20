import { API_CONFIG } from './config';
import { GetProductsListRequest, BatchProductsListResponse, CreateBatchRequest, CreateBatchResponse, AddProductToBatchRequest, AddProductToBatchResponse, GetBatchesListRequest, BatchesListResponse, BatchProductsDetailResponse } from './types';
import { getDeviceToken } from './storage';

export async function getProductsList(request: GetProductsListRequest): Promise<BatchProductsListResponse | { error: string }> {
  const startTime = Date.now();
  const endpoint = `${API_CONFIG.ENDPOINTS.GET_PRODUCTS_LIST}/${API_CONFIG.SESSION_ID}`;
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;

  try {
    const token = await getDeviceToken();
    if (!token) {
      return { error: 'Токен устройства не найден. Пожалуйста, пройдите авторизацию заново.' };
    }

    console.log('\n========== GET PRODUCTS LIST REQUEST ==========');
    console.log('URL:', url);
    console.log('Method:', 'POST');
    console.log('Body:', JSON.stringify(request, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const duration = Date.now() - startTime;
    const text = await response.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch (e) {
      console.log('Error parsing JSON:', text);
      throw new Error('JSON parse error');
    }

    console.log('\n========== GET PRODUCTS LIST RESPONSE ==========');
    console.log('Status:', response.status, response.statusText);
    console.log('Duration:', duration, 'ms');
    console.log('Response Body:', JSON.stringify(data, null, 2));
    console.log('================================================\n');

    if (!response.ok) {
      const errorText = await response.text();
      return { error: `HTTP ${response.status}: ${errorText || response.statusText}` };
    }

    return data;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log('\n========== GET PRODUCTS LIST ERROR ==========');
    console.log('Duration:', duration, 'ms');
    console.log('Error:', error instanceof Error ? error.message : String(error));
    console.log('============================================\n');
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

export async function getBatchesList(request: GetBatchesListRequest): Promise<BatchesListResponse | { error: string }> {
  const startTime = Date.now();
  const endpoint = `${API_CONFIG.ENDPOINTS.GET_BATCHES_LIST}/${API_CONFIG.SESSION_ID}`;
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;

  try {
    const token = await getDeviceToken();
    if (!token) {
      return { error: 'Токен устройства не найден. Пожалуйста, пройдите авторизацию заново.' };
    }

    console.log('\n========== GET BATCHES LIST REQUEST ==========');
    console.log('URL:', url);
    console.log('Method:', 'POST');
    console.log('Body:', JSON.stringify(request, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const duration = Date.now() - startTime;
    const text = await response.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch (e) {
      console.log('Error parsing JSON:', text);
      throw new Error('JSON parse error');
    }

    console.log('\n========== GET BATCHES LIST RESPONSE ==========');
    console.log('Status:', response.status, response.statusText);
    console.log('Duration:', duration, 'ms');
    console.log('Response Body:', JSON.stringify(data, null, 2));
    console.log('==============================================\n');

    if (!response.ok) {
      const errorText = await response.text();
      return { error: `HTTP ${response.status}: ${errorText || response.statusText}` };
    }

    return data;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log('\n========== GET BATCHES LIST ERROR ==========');
    console.log('Duration:', duration, 'ms');
    console.log('Error:', error instanceof Error ? error.message : String(error));
    console.log('===========================================\n');
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

export async function createBatch(request: CreateBatchRequest): Promise<CreateBatchResponse> {
  const startTime = Date.now();
  const endpoint = `${API_CONFIG.ENDPOINTS.CREATE_BATCH}/${API_CONFIG.SESSION_ID}`;
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;

  try {
    const token = await getDeviceToken();
    if (!token) {
      return { OK: false, error: 'Токен устройства не найден. Пожалуйста, пройдите авторизацию заново.' };
    }

    console.log('\n========== CREATE BATCH REQUEST ==========');
    console.log('URL:', url);
    console.log('Method:', 'POST');
    console.log('Body:', JSON.stringify(request, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const duration = Date.now() - startTime;
    const text = await response.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch (e) {
      console.log('Error parsing JSON:', text);
      throw new Error('JSON parse error');
    }

    console.log('\n========== CREATE BATCH RESPONSE ==========');
    console.log('Status:', response.status, response.statusText);
    console.log('Duration:', duration, 'ms');
    console.log('Response Body:', JSON.stringify(data, null, 2));
    console.log('=========================================\n');

    if (!response.ok) {
      const errorText = await response.text();
      return { OK: false, error: `HTTP ${response.status}: ${errorText || response.statusText}` };
    }

    return data;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log('\n========== CREATE BATCH ERROR ==========');
    console.log('Duration:', duration, 'ms');
    console.log('Error:', error instanceof Error ? error.message : String(error));
    console.log('=======================================\n');
    return { OK: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function addProductToBatch(batchId: number, request: AddProductToBatchRequest): Promise<AddProductToBatchResponse> {
  const startTime = Date.now();
  const endpoint = `${API_CONFIG.ENDPOINTS.ADD_PRODUCT_TO_BATCH}/${batchId}/products/${API_CONFIG.SESSION_ID}`;
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;

  try {
    const token = await getDeviceToken();
    if (!token) {
      return { OK: false, error: 'Токен устройства не найден. Пожалуйста, пройдите авторизацию заново.' };
    }

    console.log('\n========== ADD PRODUCT TO BATCH REQUEST ==========');
    console.log('URL:', url);
    console.log('Method:', 'POST');
    console.log('Body:', JSON.stringify(request, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const duration = Date.now() - startTime;
    const text = await response.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch (e) {
      console.log('Error parsing JSON:', text);
      throw new Error('JSON parse error');
    }

    console.log('\n========== ADD PRODUCT TO BATCH RESPONSE ==========');
    console.log('Status:', response.status, response.statusText);
    console.log('Duration:', duration, 'ms');
    console.log('Response Body:', JSON.stringify(data, null, 2));
    console.log('==================================================\n');

    if (!response.ok) {
      const errorText = await response.text();
      return { OK: false, error: `HTTP ${response.status}: ${errorText || response.statusText}` };
    }

    return data;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log('\n========== ADD PRODUCT TO BATCH ERROR ==========');
    console.log('Duration:', duration, 'ms');
    console.log('Error:', error instanceof Error ? error.message : String(error));
    console.log('==============================================\n');
    return { OK: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function getBatchProducts(batchId: number): Promise<BatchProductsDetailResponse | { error: string }> {
  const startTime = Date.now();
  const endpoint = `${API_CONFIG.ENDPOINTS.ADD_PRODUCT_TO_BATCH}/${batchId}/products/${API_CONFIG.SESSION_ID}`;
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;

  try {
    const token = await getDeviceToken();
    if (!token) {
      return { error: 'Токен устройства не найден. Пожалуйста, пройдите авторизацию заново.' };
    }

    console.log('\n========== GET BATCH PRODUCTS REQUEST ==========');
    console.log('URL:', url);
    console.log('Method:', 'GET');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const duration = Date.now() - startTime;
    const text = await response.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch (e) {
      console.log('Error parsing JSON:', text);
      throw new Error('JSON parse error');
    }

    console.log('\n========== GET BATCH PRODUCTS RESPONSE ==========');
    console.log('Status:', response.status, response.statusText);
    console.log('Duration:', duration, 'ms');
    console.log('Response Body:', JSON.stringify(data, null, 2));
    console.log('================================================\n');

    if (!response.ok) {
      return { error: data.error || `HTTP ${response.status}: ${response.statusText}` };
    }

    return data;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log('\n========== GET BATCH PRODUCTS ERROR ==========');
    console.log('Duration:', duration, 'ms');
    console.log('Error:', error instanceof Error ? error.message : String(error));
    console.log('=============================================\n');
    return { error: error instanceof Error ? error.message : String(error) };
  }
}