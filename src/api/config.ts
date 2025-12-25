export const API_CONFIG = {
  BASE_URL: 'https://alashcloud.kz',
  TOKEN: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhcGlfYWNjZXNzIiwiaWF0IjoxNzAwMDAwMDAwfQ.a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2',
  SESSION_ID: '00000000-0000-0000-0000-000000000000', 
  ENDPOINTS: {
    DEVICE_INFO: '/go/devinfo',
    GET_PRICES: '/go/prices',
    GET_DEVICE_PRODUCTS: '/go/devices', // /{device_id}/products/{sessionid}
    ADD_PRICE: '/go/prices',
    EDIT_PRICE: '/go/prices/edit',
    DELETE_PRICE: '/go/prices/delete',
    UPLOAD_IMAGE: '/go/upload/image',
    GET_CATEGORIES: '/go/categories',
    NEW_ORDER: '/neword',
    CHECK_ORDER: '/checkord',
    GO_ORDERS: '/go/orders',
  },
};