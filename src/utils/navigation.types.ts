export type RootStackParamList = {
  Home: undefined;
  Auth: undefined;
  AdminPanel: undefined;
  AddProduct: undefined;
  InitialSetup: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}