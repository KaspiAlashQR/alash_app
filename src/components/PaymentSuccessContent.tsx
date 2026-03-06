import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Dimensions } from 'react-native';
// import { Camera, CameraDevice } from 'react-native-vision-camera'; // Закомментировано - фронтальная камера
import { CartItem } from '../api/types';
import { deviceStorage } from '../api/storage';
import { ImouCameraView } from '../../Imou/typescript/imou';
import type { ImouCameraViewRef } from '../../Imou/typescript/imou';
import { imouTokenService } from '../../Imou/typescript/imou.token-service';
import { addPendingRecording, processUploadQueue } from '../services/recordingQueue';

interface PaymentSuccessContentProps {
  unlockTimer: number;
  cartItems: CartItem[];
  totalAmount: number;
  recordOrderId: number;
  showUnlockInstruction?: boolean;
  onCameraReady?: () => void;
  onCameraFailed?: () => void;
}

const { width } = Dimensions.get('window');
const isTablet = width > 600;

const PaymentSuccessContent: React.FC<PaymentSuccessContentProps> = ({
  unlockTimer,
  cartItems,
  totalAmount,
  recordOrderId,
  showUnlockInstruction,
  onCameraReady,
  onCameraFailed,
}) => {
  const [isBlinking, setIsBlinking] = useState(true);

  const [imouCameraReady, setImouCameraReady] = useState(false);
  const [imouDeviceId, setImouDeviceId] = useState<string>('');
  const [imouAccessToken, setImouAccessToken] = useState<string>('');
  const [imouPlayToken, setImouPlayToken] = useState<string>('');
  const [imouProductId, setImouProductId] = useState<string | undefined>(undefined);
  const [imouError, setImouError] = useState<string | null>(null);
  const imouCameraRef = useRef<ImouCameraViewRef>(null);
  const cameraCallbackFired = useRef(false);
  const recordStartedRef = useRef(false);
  const cameraTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  useEffect(() => {
    const initImouCamera = async () => {
      try {
        console.log('[Camera] initImouCamera: starting initialization for recordOrderId:', recordOrderId);
        const cameraSettings = await deviceStorage.getCameraSettings();
        if (!cameraSettings?.deviceId) {
          console.warn('[Camera] initImouCamera: Camera not configured - deviceId missing');
          setImouError('Камера не настроена');
          onCameraFailed?.();
          return;
        }
        console.log('[Camera] initImouCamera: device found. deviceId:', cameraSettings.deviceId);
        setImouDeviceId(cameraSettings.deviceId);

        console.log('[Camera] initImouCamera: requesting tokens from token service');
        const { accessToken, playToken, productId } = await imouTokenService.getCameraTokens(cameraSettings.deviceId);
        console.log('[Camera] initImouCamera: tokens received. accessToken:', !!accessToken, 'playToken:', !!playToken, 'productId:', productId);

        setImouAccessToken(accessToken);
        setImouPlayToken(playToken);
        if (productId) setImouProductId(productId);
        setImouCameraReady(true);
        console.log('[Camera] initImouCamera: camera ready set to true');

        // Timeout: if camera doesn't respond to onPlayStart or onError within 20 seconds, continue without it
        cameraTimeoutRef.current = setTimeout(() => {
          if (!cameraCallbackFired.current) {
            console.warn('[Camera] initImouCamera: Timeout 20s - camera did not respond, continuing without it');
            cameraCallbackFired.current = true;
            setImouError('Камера не ответила');
            onCameraFailed?.();
          }
        }, 20000);
        console.log('[Camera] initImouCamera: timeout set for 20 seconds');
      } catch (error: any) {
        console.error('[Camera] initImouCamera error:', error?.message || error);
        setImouError(error?.message || 'Ошибка инициализации');
        onCameraFailed?.();
      }
    };

    initImouCamera();

    return () => {
      console.log('[Camera] Cleanup: PaymentSuccessContent unmounting. recordOrderId:', recordOrderId, 'recordStarted:', recordStartedRef.current);
      if (cameraTimeoutRef.current) {
        console.log('[Camera] Cleanup: clearing camera timeout');
        clearTimeout(cameraTimeoutRef.current);
        cameraTimeoutRef.current = null;
      }
      if (recordStartedRef.current) {
        console.log('[Camera] Cleanup: stopping active recording. orderId:', recordOrderId);
        imouCameraRef.current?.stopRecord();
        recordStartedRef.current = false;
        console.log('[Camera] Cleanup: recording stopped on unmount');
      }
      if (imouCameraRef.current) {
        console.log('[Camera] Cleanup: stopping preview');
        imouCameraRef.current.stopPreview();
        console.log('[Camera] Cleanup: preview stopped');
      }
      // Upload any pending recordings on unmount
      console.log('[Camera] Cleanup: processing remaining uploads for orderId:', recordOrderId);
      processUploadQueue().catch(e =>
        console.error('[Camera] Upload queue error on unmount:', e),
      );
      console.log('[Camera] Cleanup: complete');
    };
  }, []);

  
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking((prev) => !prev);
    }, 500); 

    return () => clearInterval(blinkInterval);
  }, []);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {/* Верхний блок: Список товаров + Камера */}
      <View style={styles.topSection}>
        {/* Левая часть - Список товаров */}
        <View style={styles.orderListContainer}>
          <View style={styles.orderHeader}>
            <Text style={[styles.orderTitle, isTablet && styles.orderTitleTablet]}>
              Ваш заказ:
            </Text>
            <View style={styles.totalInHeader}>
              <Text style={styles.totalLabel}>ИТОГО: </Text>
              <Text style={styles.totalAmount}>
                {totalAmount.toLocaleString('ru-RU')}₸
              </Text>
            </View>
          </View>
          <ScrollView 
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            {cartItems.map((item, index) => {
              const price = item.product.selling_price || item.product.amount || 0;
              return (
                <View key={index} style={styles.orderItem}>
                  <Image
                    source={{ uri: item.product.image_url || item.product.url || 'https://via.placeholder.com/60' }}
                    style={styles.productImage}
                  />
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={1}>
                      {item.product.name_ru || item.product.name || ''}
                    </Text>
                    <Text style={styles.productDetails}>
                      {item.quantity} шт × {price.toLocaleString('ru-RU')}₸
                    </Text>
                    <Text style={styles.productTotal}>
                      = {(item.quantity * price).toLocaleString('ru-RU')}₸
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* Правая часть - IMOU Камера видеонаблюдения */}
        <View style={styles.cameraContainer}>
          <View style={styles.cameraWrapper}>
            {/* Закомментировано - фронтальная камера планшета
            {isCameraActive && frontCamera && hasPermission && (
              <Camera
                style={styles.camera}
                device={frontCamera}
                isActive={isCameraActive}
                photo={false}
                video={false}
              />
            )}
            */}
            
            {/* IMOU Камера видеонаблюдения */}
            {imouCameraReady && imouDeviceId && imouAccessToken && imouPlayToken ? (
              <ImouCameraView
                ref={imouCameraRef}
                style={styles.camera}
                deviceId={imouDeviceId}
                channelId={0}
                accessToken={imouAccessToken}
                playToken={imouPlayToken}
                productId={imouProductId}
                streamType={0}
                autoPlay={true}
                onPlayStart={() => {
                  console.log('[Camera] onPlayStart: video stream started. deviceId:', imouDeviceId, 'recordOrderId:', recordOrderId);
                  if (cameraTimeoutRef.current) {
                    console.log('[Camera] onPlayStart: clearing timeout');
                    clearTimeout(cameraTimeoutRef.current);
                    cameraTimeoutRef.current = null;
                  }
                  if (!cameraCallbackFired.current) {
                    cameraCallbackFired.current = true;
                    console.log('[Camera] onPlayStart: calling onCameraReady callback');
                    onCameraReady?.();
                  }
                  if (!recordStartedRef.current) {
                    recordStartedRef.current = true;
                    console.log('[Camera] onPlayStart: starting record for orderId:', recordOrderId);
                    imouCameraRef.current?.startRecord(String(recordOrderId));
                    console.log('[Camera] onPlayStart: record start command sent');
                  }
                }}
                onPlayStop={() => {
                  console.log('[Camera] onPlayStop: video stream stopped. recordOrderId:', recordOrderId, 'recordStarted:', recordStartedRef.current);
                  if (recordStartedRef.current) {
                    console.log('[Camera] onPlayStop: stopping record for orderId:', recordOrderId);
                    imouCameraRef.current?.stopRecord();
                    recordStartedRef.current = false;
                    console.log('[Camera] onPlayStop: record stopped');
                  }
                }}
                onRecordStart={async ({ filePath }) => {
                  console.log('[Camera] onRecordStart: recording started. filePath:', filePath, 'recordOrderId:', recordOrderId);
                  try {
                    await addPendingRecording({
                      orderId: recordOrderId,
                      filePath,
                      createdAt: new Date().toISOString(),
                      uploaded: false,
                    });
                    console.log('[Camera] onRecordStart: recording added to queue. orderId:', recordOrderId);
                  } catch (e) {
                    console.error('[Camera] recordingQueue add error:', e);
                  }
                }}
                onRecordStop={() => {
                  console.log('[Camera] onRecordStop: recording stopped. orderId:', recordOrderId, 'recordStarted:', recordStartedRef.current);
                  recordStartedRef.current = false;
                  console.log('[Camera] onRecordStop: processing upload queue for orderId:', recordOrderId);
                  processUploadQueue().catch(e =>
                    console.error('[Camera] Upload queue error:', e),
                  );
                  console.log('[Camera] onRecordStop: upload queue processing completed');
                }}
                onRecordError={({ error }) => {
                  console.error('[Camera] onRecordError: recording error. orderId:', recordOrderId, 'error:', error);
                  console.log('[Camera] onRecordError: processing remaining uploads for orderId:', recordOrderId);
                  processUploadQueue().catch(e =>
                    console.error('[Camera] Upload queue error on record error:', e),
                  );
                }}
                onError={(error) => {
                  console.error('[Camera] onError: camera error triggered. recordOrderId:', recordOrderId, 'errorCode:', error?.error || error, 'recordStarted:', recordStartedRef.current);
                  if (cameraTimeoutRef.current) {
                    console.log('[Camera] onError: clearing timeout');
                    clearTimeout(cameraTimeoutRef.current);
                    cameraTimeoutRef.current = null;
                  }
                  setImouError(error.error || 'Ошибка соединения');
                  if (!cameraCallbackFired.current) {
                    console.log('[Camera] onError: calling onCameraFailed callback');
                    cameraCallbackFired.current = true;
                    onCameraFailed?.();
                  } else {
                    console.log('[Camera] onError: callback already fired, ignoring');
                  }
                }}
              />
            ) : (
              <View style={styles.cameraPlaceholder}>
                {imouError ? (
                  <Text style={styles.cameraErrorText}>{imouError}</Text>
                ) : (
                  <Text style={styles.cameraLoadingText}>Загрузка камеры...</Text>
                )}
              </View>
            )}
          </View>
          <Text style={styles.surveillanceText}>
            🔴 Ведется видеонаблюдение
          </Text>
        </View>
      </View>

      {/* Центральная часть */}
      <View style={styles.centerSection}>
        <Text style={[styles.thankYouText, isTablet && styles.thankYouTextTablet]}>
          Спасибо за покупку!
        </Text>

        {showUnlockInstruction ? (
          <View style={styles.instructionContainer}>
            <Text style={[styles.instructionText, { opacity: isBlinking ? 1 : 0.3 }]}>
              Дождитесь зелёного света, чтобы открыть дверь.
            </Text>
            <Text style={[styles.instructionText, { opacity: isBlinking ? 1 : 0.3 }]}>
              Дверь открывается на 15 секунд, только один раз.
            </Text>
            <Text style={[styles.instructionText, { opacity: isBlinking ? 1 : 0.3 }]}>
              После закрытия дверь блокируется автоматически.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.timerBlock}>
              <Text style={[styles.timerText, isTablet && styles.timerTextTablet]}>
                {formatTimer(unlockTimer)}
              </Text>
            </View>
            {unlockTimer > 0 ? (
              <Text
                style={[styles.doorOpenText, { opacity: isBlinking ? 1 : 0.3 }]}
              >
                🔴 Дверь открыта, возьмите товары
              </Text>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: isTablet ? 40 : 20,
    paddingVertical: isTablet ? 32 : 20,
  },
  topSection: {
    flexDirection: 'row',
    marginBottom: isTablet ? 40 : 24,
  },
  // Левая часть - Список товаров
  orderListContainer: {
    flex: 1,
    marginRight: isTablet ? 24 : 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: isTablet ? 20 : 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    height: 200,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#1A202C',
  },
  orderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A202C',
  },
  orderTitleTablet: {
    fontSize: 22,
  },
  totalInHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  orderItem: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  productImage: {
    width: isTablet ? 60 : 48,
    height: isTablet ? 60 : 48,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: '600',
    color: '#1A202C',
    marginBottom: 4,
  },
  productDetails: {
    fontSize: isTablet ? 14 : 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  productTotal: {
    fontSize: isTablet ? 15 : 13,
    fontWeight: 'bold',
    color: '#F14635',
  },
  totalLabel: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: 'bold',
    color: '#1A202C',
  },
  totalAmount: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: 'bold',
    color: '#F14635',
  },
  // Правая часть - Камера
  cameraContainer: {
    width: isTablet ? 280 : 200,
    height: 200,
    alignItems: 'center',
  },
  cameraWrapper: {
    width: '100%',
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#F14635',
    marginBottom: 8,
  },
  camera: {
    width: '100%',
    height: '100%',
  },
  cameraPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1A202C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraLoadingText: {
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'center',
  },
  cameraErrorText: {
    color: '#F14635',
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  surveillanceText: {
    fontSize: isTablet ? 12 : 10,
    color: '#6B7280',
    fontWeight: '600',
    textAlign: 'center',
  },
  // Центральная часть
  centerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thankYouText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A202C',
    marginBottom: 24,
    textAlign: 'center',
  },
  thankYouTextTablet: {
    fontSize: 32,
    marginBottom: 32,
  },
  timerBlock: {
    backgroundColor: '#F14635',
    paddingHorizontal: isTablet ? 24 : 20,
    paddingVertical: isTablet ? 12 : 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  timerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  timerTextTablet: {
    fontSize: 20,
  },
  doorOpenText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  instructionContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  instructionText: {
    fontSize: isTablet ? 18 : 16,
    fontWeight: '600',
    color: '#1A202C',
    textAlign: 'center',
    marginBottom: 8,
  },
});

export default PaymentSuccessContent;

