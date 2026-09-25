import React from 'react';
import { act, create } from 'react-test-renderer';
import { Platform } from 'react-native';

jest.mock('react-native/Libraries/ReactNative/requireNativeComponent', () => ({
  __esModule: true, default: () => 'ImouPlayerView',
}));

test('payment playback keeps the committed serial-number key and native connection parameters', async () => {
  const platform = jest.replaceProperty(Platform, 'OS', 'android');
  const ImouCameraView = require('../Imou/typescript/ImouCameraView').default;
  let tree: ReturnType<typeof create>;
  await act(async () => {
    tree = create(<ImouCameraView deviceId="CAMERA_SN" accessToken="sub-token"
      playToken="play-token" productId="product" channelId={0} streamType={0} autoPlay />);
  });
  const props = tree!.root.findByType('ImouPlayerView' as never).props;
  expect(props).toMatchObject({ deviceId: 'CAMERA_SN', password: 'CAMERA_SN',
    accessToken: 'sub-token', playToken: 'play-token', productId: 'product',
    channelId: 0, streamType: 0, autoPlay: true });
  await act(async () => tree!.unmount());
  platform.restore();
});
