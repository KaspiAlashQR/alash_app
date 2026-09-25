import React from 'react';
import { act, create } from 'react-test-renderer';
import { NativeModules } from 'react-native';
import PaymentScreen from '../src/screens/PaymentScreen';
import { alashCloudAPI } from '../src/api/client';
import { cameraSession } from '../src/services/cameraSession';

jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));
jest.mock('react-native-qrcode-svg', () => 'QRCode');
jest.mock('react-native-vision-camera', () => ({
  Camera: 'Camera', useCameraDevice: () => undefined,
  useCameraPermission: () => ({ hasPermission: true, requestPermission: jest.fn() }),
}));
jest.mock('react-native-svg', () => ({ __esModule: true, default: 'Svg', Path: 'Path' }));
jest.mock('react-native-sound', () => jest.fn().mockImplementation(() => ({ play: jest.fn(), stop: jest.fn(), release: jest.fn() })));
jest.mock('../src/components/PaymentSuccessContent', () => 'PaymentSuccessContent');
jest.mock('../src/api/client', () => ({ alashCloudAPI: { checkOrder: jest.fn() } }));
jest.mock('../src/api/orders', () => ({ completePaidOrder: jest.fn().mockResolvedValue({ OK: true }), updateOrder: jest.fn().mockResolvedValue({ OK: true }) }));
jest.mock('../src/services/cartService', () => ({ cartService: { getCart: jest.fn().mockReturnValue({ items: [] }), clearCart: jest.fn().mockResolvedValue(undefined) } }));
jest.mock('../src/services/cameraSession', () => ({ cameraSession: { begin: jest.fn(), paid: jest.fn(), leave: jest.fn() } }));

const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };
beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  NativeModules.AuxModule = { playUnlockSignal: jest.fn().mockResolvedValue(true) };
});
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); jest.restoreAllMocks(); });

test('paid order opens lock immediately without a camera callback and returns home after timer', async () => {
  (alashCloudAPI.checkOrder as jest.Mock).mockResolvedValue(true);
  const navigation = { reset: jest.fn() };
  const route = { params: { orderId: 123, internalOrderId: 456, payUrl: 'test', cartItems: [] } };
  let tree: ReturnType<typeof create>;
  await act(async () => {
    tree = create(<PaymentScreen navigation={navigation as never} route={route as never} />);
    await flush();
  });
  expect(cameraSession.begin).toHaveBeenCalledWith(456);
  expect(NativeModules.AuxModule.playUnlockSignal).toHaveBeenCalledTimes(1);
  expect(cameraSession.paid).toHaveBeenCalledWith(456);
  expect(navigation.reset).not.toHaveBeenCalled();
  await act(async () => { jest.advanceTimersByTime(15_000); await flush(); });
  expect(navigation.reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'Home' }] });
  await act(async () => tree!.unmount());
});

test('unpaid QR expiry never opens the lock and closes the camera session', async () => {
  (alashCloudAPI.checkOrder as jest.Mock).mockResolvedValue(false);
  const navigation = { reset: jest.fn() };
  const route = { params: { orderId: 124, internalOrderId: 457, payUrl: 'test', cartItems: [] } };
  let tree: ReturnType<typeof create>;
  await act(async () => {
    tree = create(<PaymentScreen navigation={navigation as never} route={route as never} />);
    await flush();
  });
  await act(async () => { jest.advanceTimersByTime(120_000); await flush(); });
  expect(NativeModules.AuxModule.playUnlockSignal).not.toHaveBeenCalled();
  expect(cameraSession.leave).toHaveBeenCalledWith(457);
  expect(navigation.reset).toHaveBeenCalled();
  await act(async () => tree!.unmount());
});
