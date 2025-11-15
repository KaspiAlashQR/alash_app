import { Product } from '../api/types';

export type RootStackParamList = {
  Home: undefined;
  Auth: undefined;
  AdminPanel: undefined;
  AddProduct: { mode: 'add' | 'edit'; product?: Product };
  InitialSetup: undefined;
  Cart: undefined;
  Payment: { orderId: number; payUrl: string };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}