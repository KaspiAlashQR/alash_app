import React, { useEffect, useRef, useSyncExternalStore } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import ImouCameraView, { ImouCameraViewRef } from '../../Imou/typescript/ImouCameraView';
import { cameraSession } from '../services/cameraSession';

export const CameraSessionHost = () => {
  const state = useSyncExternalStore(cameraSession.subscribe, cameraSession.getSnapshot);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', status => {
      if (status !== 'active') cameraSession.background();
    });
    return () => subscription.remove();
  }, []);
  const params = state.parameters;
  if (!params) return null;
  const rect = state.rect;
  return (
    <View pointerEvents="none" style={[styles.host, {
      left: rect?.x ?? 0, top: rect?.y ?? 0, opacity: rect ? 1 : 0,
      width: rect?.width ?? 320, height: rect?.height ?? 240,
    }]}>
      <ImouCameraView
        key={`${state.id}:${state.attempt}`}
        ref={(player: ImouCameraViewRef | null) => cameraSession.attach(player)}
        {...params}
        style={styles.player}
        sessionId={`${state.id}:${state.attempt}:order-${state.orderId}`}
        streamType={0}
        autoPlay
        onPlayStart={() => cameraSession.playStarted(state.id, state.attempt)}
        onError={error => cameraSession.fail(state.id, state.attempt, `${error.code ?? ''} ${error.error}`)}
        onRecordStart={event => cameraSession.recordStarted(state.id, state.attempt, event.filePath)}
        onRecordStop={event => { void cameraSession.recordStopped(state.id, state.attempt, event.filePath); }}
        onRecordError={event => cameraSession.recordError(state.id, state.attempt, event.error)}
      />
      {state.phase === 'connecting' && <View style={styles.loading}>
        <Text style={styles.text}>Подключение камеры…</Text>
      </View>}
    </View>
  );
};

export const CameraSessionPreview = ({ orderId }: { orderId: number }) => {
  const view = useRef<View>(null);
  const state = useSyncExternalStore(cameraSession.subscribe, cameraSession.getSnapshot);
  useEffect(() => {
    const measure = () => view.current?.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) cameraSession.setRect(orderId, { x, y, width, height });
    });
    measure();
    const timer = setInterval(measure, 500);
    return () => { clearInterval(timer); cameraSession.setRect(orderId); };
  }, [orderId]);
  const failed = state.phase === 'failed' || state.phase === 'idle';
  return <View ref={view} collapsable={false} style={styles.placeholder}>
    <Text style={styles.text}>{failed ? 'Камера временно недоступна' : 'Подключение камеры…'}</Text>
  </View>;
};

const styles = StyleSheet.create({
  host: { position: 'absolute', overflow: 'hidden', backgroundColor: '#000' },
  player: { flex: 1 },
  placeholder: { flex: 1, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff', textAlign: 'center' },
  loading: { ...StyleSheet.absoluteFillObject, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
});
