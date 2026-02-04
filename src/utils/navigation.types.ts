import { Product, CartItem } from '../api/types';

export type RootStackParamList = {
  Home: undefined;
  Auth: undefined;
  AdminPanel: undefined;
  AddProduct: { mode: 'add' | 'edit'; product?: Product };
  InitialSetup: undefined;
  Cart: undefined;
  Payment: { orderId: number; payUrl: string; internalOrderId: number; cartItems: CartItem[] };
  BatchDetails: { batchId: number; batchNumber: string };
  ImouDeviceList: undefined;
  ImouDeviceView: { deviceId: string; deviceName: string; channelId: string };
  ImouAddDevice: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}