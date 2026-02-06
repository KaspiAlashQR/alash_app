import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import {
  requireNativeComponent,
  UIManager,
  findNodeHandle,
  ViewStyle,
  StyleSheet,
  View,
  Platform,
} from 'react-native';

// Stream types
export const IMOU_STREAM_TYPE = {
  HD: 0,
  SD: 1,
} as const;

interface ImouCameraViewProps {
  deviceId: string;
  channelId?: number;
  accessToken: string;
  playToken?: string;  // Опционально - без него SDK использует "old streaming protocol"
  productId?: string;  // Product ID из API (НЕ deviceId!) - требуется для видео
  password?: string;  // Пароль камеры (ключ дешифровки)
  streamType?: number;
  autoPlay?: boolean;
  style?: ViewStyle;
  onPlayStart?: () => void;
  onPlayStop?: () => void;
  onError?: (error: { code?: number; error: string }) => void;
  onResolutionChanged?: (resolution: { width: number; height: number }) => void;
}

export interface ImouCameraViewRef {
  startPreview: () => void;
  stopPreview: () => void;
}

const COMPONENT_NAME = 'ImouPlayerView';

// Native component (Android only for now)
const NativeImouPlayerView = Platform.OS === 'android'
  ? requireNativeComponent<any>(COMPONENT_NAME)
  : View;

const ImouCameraView = forwardRef<ImouCameraViewRef, ImouCameraViewProps>(
  (
    {
      deviceId,
      channelId = 0,
      accessToken,
      playToken,
      productId,
      password,
      streamType = IMOU_STREAM_TYPE.SD,
      autoPlay = false,
      style,
      onPlayStart,
      onPlayStop,
      onError,
      onResolutionChanged,
    },
    ref
  ) => {
    const nativeRef = useRef<any>(null);

    const dispatchCommand = (command: string) => {
      if (Platform.OS !== 'android') {
        console.warn('ImouCameraView is only supported on Android');
        return;
      }

      const node = findNodeHandle(nativeRef.current);
      if (node) {
        const commands = UIManager.getViewManagerConfig(COMPONENT_NAME)?.Commands;
        const commandId = commands?.[command];
        if (commandId !== undefined) {
          UIManager.dispatchViewManagerCommand(node, commandId, []);
        }
      }
    };

    useImperativeHandle(ref, () => ({
      startPreview: () => dispatchCommand('startPreview'),
      stopPreview: () => dispatchCommand('stopPreview'),
    }));

    useEffect(() => {
      return () => {
        // Cleanup on unmount
        dispatchCommand('stopPreview');
      };
    }, []);

    if (Platform.OS !== 'android') {
      return (
        <View style={[styles.container, styles.placeholder, style]}>
          {/* Placeholder for iOS */}
        </View>
      );
    }

    return (
      <NativeImouPlayerView
        ref={nativeRef}
        style={[styles.container, style]}
        deviceId={deviceId}
        channelId={channelId}
        accessToken={accessToken}
        playToken={playToken || ''}
        productId={productId || ''} // Product ID из API (может быть пустым)
        password={password && password.length > 0 ? password : deviceId}
        streamType={streamType}
        autoPlay={autoPlay}
        onPlayStart={onPlayStart}
        onPlayStop={onPlayStop}
        onError={(event: any) => onError?.(event.nativeEvent)}
        onResolutionChanged={(event: any) => onResolutionChanged?.(event.nativeEvent)}
      />
    );
  }
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

ImouCameraView.displayName = 'ImouCameraView';

export default ImouCameraView;
