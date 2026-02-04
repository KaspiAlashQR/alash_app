import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Dimensions } from 'react-native';
// import { Camera, CameraDevice } from 'react-native-vision-camera'; // Закомментировано - фронтальная камера
import { CartItem } from '../api/types';
import { deviceStorage } from '../api/storage';
import { imouSDK, ImouCameraView } from '../../Imou/typescript/imou';
import type { ImouCameraViewRef } from '../../Imou/typescript/imou';

interface PaymentSuccessContentProps {
  unlockTimer: number;
  cartItems: CartItem[];
  totalAmount: number;
  // Закомментировано - пропсы фронтальной камеры
  // frontCamera: CameraDevice | undefined;
  // hasPermission: boolean;
  // isCameraActive: boolean;
  showUnlockInstruction?: boolean;
}

const { width } = Dimensions.get('window');
const isTablet = width > 600;

const PaymentSuccessContent: React.FC<PaymentSuccessContentProps> = ({
  unlockTimer,
  cartItems,
  totalAmount,
  // Закомментировано - пропсы фронтальной камеры
  // frontCamera,
  // hasPermission,
  // isCameraActive,
  showUnlockInstruction,
}) => {
  const [isBlinking, setIsBlinking] = useState(true);
  
  // IMOU Camera State
  const [imouCameraReady, setImouCameraReady] = useState(false);
  const [imouDeviceId, setImouDeviceId] = useState<string>('');
  const [imouPassword, setImouPassword] = useState<string>('');
  const [imouAccessToken, setImouAccessToken] = useState<string>('');
  const [imouPlayToken, setImouPlayToken] = useState<string>('');
  const [imouError, setImouError] = useState<string | null>(null);
  const imouCameraRef = useRef<ImouCameraViewRef>(null);

  // Инициализация IMOU камеры
  useEffect(() => {
    const initImouCamera = async () => {
      console.log('[IMOU] ====== Starting camera initialization ======');
      try {
        // Получаем настройки камеры из хранилища
        console.log('[IMOU] Step 1: Getting camera settings from storage...');
        const cameraSettings = await deviceStorage.getCameraSettings();
        console.log('[IMOU] Camera settings result:', JSON.stringify(cameraSettings, null, 2));
        
        if (!cameraSettings?.deviceId) {
          console.log('[IMOU] ERROR: No deviceId in camera settings');
          setImouError('Камера не настроена');
          return;
        }

        const deviceId = cameraSettings.deviceId;
        const password = cameraSettings.password ?? cameraSettings.deviceId;
        setImouDeviceId(deviceId);
        setImouPassword(password);
        console.log('[IMOU] Step 2: Device ID set:', deviceId, 'Password:', password ? 'SET' : 'USING_DEVICE_ID');

        console.log('[IMOU] Step 3: Getting local access_token...');
        const localAccessToken = await imouSDK.getAccessToken();
        console.log('[IMOU] Local access_token obtained:', localAccessToken.substring(0, 20) + '...');

        console.log('[IMOU] Step 4: Initializing SDK with local access_token...');
        try {
          const sdkResult = await imouSDK.initSDK(localAccessToken);
          console.log('[IMOU] SDK initSDK result:', sdkResult);
        } catch (sdkError: any) {
          console.error('[IMOU] SDK initSDK ERROR:', sdkError?.message || sdkError);
        }

        console.log('[IMOU] Step 5: Getting local kit_token...');
        const kitTokenData = await imouSDK.getKitToken(deviceId, '0', '0');
        console.log('[IMOU] Local kit_token obtained:', kitTokenData.kitToken.substring(0, 30) + '...');

        setImouAccessToken(localAccessToken);
        setImouPlayToken(kitTokenData.kitToken);
        setImouCameraReady(true);
        console.log('[IMOU] ====== Camera initialization SUCCESS (local SDK only) ======');
      } catch (error: any) {
        console.error('[IMOU] ====== Camera initialization FAILED ======');
        console.error('[IMOU] Error type:', typeof error);
        console.error('[IMOU] Error message:', error?.message);
        console.error('[IMOU] Error stack:', error?.stack);
        console.error('[IMOU] Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
        setImouError(`Ошибка: ${error?.message || 'Неизвестная ошибка'}`);
      }
    };

    initImouCamera();

    return () => {
      // Остановить стрим при размонтировании
      if (imouCameraRef.current) {
        imouCameraRef.current.stopPreview();
      }
    };
  }, []);

  // Мигание для текста "Дверь открыта"
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking((prev) => !prev);
    }, 500); // Мигание каждые 500ms

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
                password={imouPassword}
                streamType={1} // SD stream для экономии ресурсов
                autoPlay={true}
                onPlayStart={() => console.log('IMOU Camera: playback started')}
                onPlayStop={() => console.log('IMOU Camera: playback stopped')}
                onError={(error) => {
                  console.error('IMOU Camera error:', error);
                  setImouError(error.error);
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

