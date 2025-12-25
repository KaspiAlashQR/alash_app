import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import Sound from 'react-native-sound';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { RootStackParamList } from '../utils/navigation.types';
import { alashCloudAPI } from '../api/client';
import { cartService } from '../services/cartService';
import { updateOrder } from '../api/orders';

type PaymentScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Payment'>;
type PaymentScreenRouteProp = RouteProp<RootStackParamList, 'Payment'>;

interface PaymentScreenProps {
  navigation: PaymentScreenNavigationProp;
  route: PaymentScreenRouteProp;
}

const { width } = Dimensions.get('window');
const isTablet = width > 600;

const QR_SIZE = isTablet ? 320 : 260;
const POLL_INTERVAL_MS = 2000;
const TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes
const UNLOCK_TIMER_SECONDS = 10; // Изменено с 5 на 10 секунд

const PaymentScreen: React.FC<PaymentScreenProps> = ({ navigation, route }) => {
  const { orderId, payUrl, internalOrderId } = route.params;
  const [remaining, setRemaining] = useState(TIMEOUT_MS);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [unlockTimer, setUnlockTimer] = useState(UNLOCK_TIMER_SECONDS);
  const [signalSent, setSignalSent] = useState(false);
  const timerRef = useRef<number | null>(null);
  const pollRef = useRef<number | null>(null);
  const unlockTimerRef = useRef<number | null>(null);
  const cameraTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  // Состояние камеры
  const [isCameraActive, setIsCameraActive] = useState(false);
  const { hasPermission, requestPermission } = useCameraPermission();
  const frontCamera = useCameraDevice('front');

  useEffect(() => {
    // Получаем сумму из корзины
    const cart = cartService.getCart();
    const total = cart.items.reduce((sum, item) => sum + (item.product.amount * item.quantity), 0);
    setPaymentAmount(total);
    mountedRef.current = true;
    const start = Date.now();

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const left = Math.max(TIMEOUT_MS - elapsed, 0);
      setRemaining(left);
      if (left <= 0) {
        clearAll();
        (async () => {
          const resp = await updateOrder(internalOrderId, { status: 'cancelled' });
          console.log('updateOrder(cancelled) response:', JSON.stringify(resp));
          if (!resp || resp.error) {
            console.error('updateOrder error:', resp && resp.error ? resp.error : resp);
          }
          navigation.navigate('Cart');
        })();
        // Alert removed
      }
    }, 1000) as unknown as number;

    const poll = async () => {
      try {
        const response = await alashCloudAPI.checkOrder(orderId);
        if (response && typeof response === 'object' && 'error' in response) {
          console.warn('checkOrder API error:', (response as any).error);
          return;
        }

        if (response === true) {
          clearAll();
          setPaymentSuccess(true);
          (async () => {
            const resp = await updateOrder(internalOrderId, { status: 'paid' });
            console.log('updateOrder(paid) response:', JSON.stringify(resp));
            if (!resp || resp.error) {
              console.error('updateOrder error:', resp && resp.error ? resp.error : resp);
            }
            playUnlockSignal();
          })();
        }
      } catch (err) {
        console.error('Ошибка проверки заказа:', err);
      }
    };

    pollRef.current = setInterval(poll, POLL_INTERVAL_MS) as unknown as number;
    poll();

    return () => {
      mountedRef.current = false;
      clearAll();
      clearUnlockTimer();
      stopCamera();
    };

    function clearAll() {
      if (timerRef.current) {
        clearInterval(timerRef.current as any);
        timerRef.current = null;
      }
      if (pollRef.current) {
        clearInterval(pollRef.current as any);
        pollRef.current = null;
      }
    }
  }, [orderId, navigation]);

  const startCamera = async () => {
    try {
      // Проверяем разрешения
      if (!hasPermission) {
        const granted = await requestPermission();
        if (!granted) {
          console.log('Нет разрешения на использование камеры');
          return;
        }
      }

      if (!frontCamera) {
        console.log('Фронтальная камера не найдена');
        return;
      }

      setIsCameraActive(true);
      console.log('Камера включена');

      // Автоматически выключить камеру через 10 секунд
      cameraTimerRef.current = setTimeout(() => {
        setIsCameraActive(false);
        console.log('Камера автоматически выключена через 10 секунд');
      }, UNLOCK_TIMER_SECONDS * 1000) as unknown as number;
    } catch (error) {
      console.error('Ошибка при включении камеры:', error);
    }
  };

  const stopCamera = () => {
    if (cameraTimerRef.current) {
      clearTimeout(cameraTimerRef.current);
      cameraTimerRef.current = null;
    }
    setIsCameraActive(false);
    console.log('Камера выключена');
  };

  const playUnlockSignal = () => {
    const unlockSound = new Sound('unlock_signal.wav', Sound.MAIN_BUNDLE, (error) => {
      if (error) {
        console.log('Failed to load sound', error);
        setSignalSent(false);
        startUnlockTimer();
        startCamera(); // Включаем камеру
        return;
      }
      unlockSound.play((success) => {
        if (success) {
          console.log('Unlock signal played successfully');
          setSignalSent(true);
          startUnlockTimer();
          startCamera(); // Включаем камеру
        } else {
          console.log('Unlock signal playback failed');
          setSignalSent(false);
          startUnlockTimer();
          startCamera(); // Включаем камеру даже если звук не сработал
        }
        unlockSound.release();
      });
    });
  };

  const startUnlockTimer = () => {
    setUnlockTimer(UNLOCK_TIMER_SECONDS);
    unlockTimerRef.current = setInterval(() => {
      setUnlockTimer(prev => {
        if (prev <= 1) {
          clearUnlockTimer();
          goToHome();
          return 0;
        }
        return prev - 1;
      });
    }, 1000) as unknown as number;
  };

  const clearUnlockTimer = () => {
    if (unlockTimerRef.current) {
      clearInterval(unlockTimerRef.current as any);
      unlockTimerRef.current = null;
    }
  };

  const goToHome = async () => {
    clearUnlockTimer();
    stopCamera();
    await cartService.clearCart();
    const resp = await updateOrder(internalOrderId, { status: 'cancelled' });
    console.log('updateOrder(cancelled) response:', JSON.stringify(resp));
    if (!resp || resp.error) {
      console.error('updateOrder error:', resp && resp.error ? resp.error : resp);
    }
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };

  const formatTime = (ms: number) => {
    const sec = Math.ceil(ms / 1000);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleCancel = async () => {
    // Остановить опрос и таймер
    if (timerRef.current) {
      clearInterval(timerRef.current as any);
      timerRef.current = null;
    }
    if (pollRef.current) {
      clearInterval(pollRef.current as any);
      pollRef.current = null;
    }
    // Обновить статус заказа
    const resp = await updateOrder(internalOrderId, { status: 'cancelled' });
    console.log('updateOrder(cancelled) response:', JSON.stringify(resp));
    if (!resp || resp.error) {
      console.error('updateOrder error:', resp && resp.error ? resp.error : resp);
    }
    navigation.navigate('Cart');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Превью камеры в правом верхнем углу */}
      {isCameraActive && frontCamera && hasPermission && (
        <View style={styles.cameraPreview}>
          <Camera
            style={styles.camera}
            device={frontCamera}
            isActive={isCameraActive}
            photo={false}
            video={false}
          />
        </View>
      )}

      <View style={styles.paymentWrapper}>
        <View style={styles.card}>
          {!paymentSuccess ? (
            <>
              <Text style={[styles.amount, isTablet && styles.amountTablet]}>
                {paymentAmount.toLocaleString('ru-RU')} ₸
              </Text>
              <View style={styles.qrWrapper}>
                <QRCode
                  value={payUrl}
                  size={isTablet ? 220 : 180}
                  backgroundColor="#fff"
                  color="black"
                />
              </View>
              <Text style={[styles.infoText, isTablet && styles.infoTextTablet]}>
                Отсканируйте QR-код в Kaspi.kz
              </Text>
              <Text style={[styles.timer, isTablet && styles.timerTablet]}>
                {formatTime(remaining)}
              </Text>
              <TouchableOpacity
                style={[styles.cancelButton, isTablet && styles.cancelButtonTablet]}
                onPress={handleCancel}
                activeOpacity={0.85}
              >
                <Text style={[styles.cancelButtonText, isTablet && styles.cancelButtonTextTablet]}>
                  Отмена и возврат в корзину
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[styles.successTitle, isTablet && styles.successTitleTablet]}>
                Спасибо за покупку!
              </Text>
              <Text style={[styles.successSubtitle, isTablet && styles.successSubtitleTablet]}>
                Открываем замок на 10 секунд
              </Text>
              <Text style={[styles.unlockTimer, isTablet && styles.unlockTimerTablet]}>
                {unlockTimer}
              </Text>
              <TouchableOpacity
                style={[styles.homeButton, isTablet && styles.homeButtonTablet]}
                onPress={goToHome}
                activeOpacity={0.85}
              >
                <Text style={[styles.homeButtonText, isTablet && styles.homeButtonTextTablet]}>
                  Закрыть
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F7FAFC' 
  },
  paymentWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7fafc',
    padding: 0,
    minHeight: '100%',
    minWidth: '100%',
  },
  card: {
    width: isTablet ? 480 : 340,
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingVertical: isTablet ? 40 : 28,
    paddingHorizontal: isTablet ? 36 : 20,
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOpacity: 0.10,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  qrWrapper: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginVertical: 18,
    shadowColor: '#3b82f6',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  successContent: {},
  amount: { 
    fontSize: isTablet ? 36 : 28, 
    fontWeight: 'bold', 
    color: '#1A202C',
    textAlign: 'center'
  },
  amountTablet: { 
    fontSize: 48
  },
  infoText: { 
    fontSize: isTablet ? 18 : 16, 
    color: '#4A5568', 
    textAlign: 'center',
    paddingHorizontal: 20
  },
  infoTextTablet: {
    fontSize: 20
  },
  timer: { 
    fontSize: isTablet ? 28 : 22, 
    fontWeight: '700', 
    color: '#1A202C',
    textAlign: 'center'
  },
  timerTablet: {
    fontSize: 32
  },
  cancelButton: { 
    paddingHorizontal: isTablet ? 32 : 24, 
    paddingVertical: isTablet ? 16 : 12, 
    borderRadius: isTablet ? 12 : 8, 
    backgroundColor: '#e5e7eb'
  },
  cancelButtonTablet: {
    paddingHorizontal: 40,
    paddingVertical: 20
  },
  cancelButtonText: { 
    color: '#1A202C', 
    fontWeight: '600',
    fontSize: isTablet ? 18 : 16,
    textAlign: 'center'
  },
  cancelButtonTextTablet: {
    fontSize: 20
  },
  successTitle: {
    fontSize: isTablet ? 42 : 32,
    fontWeight: 'bold',
    color: '#1A202C',
    textAlign: 'center',
    marginBottom: 20
  },
  successTitleTablet: {
    fontSize: 52
  },
  successSubtitle: {
    fontSize: isTablet ? 24 : 18,
    color: '#1A202C',
    textAlign: 'center',
    marginBottom: 30
  },
  successSubtitleTablet: {
    fontSize: 28
  },
  unlockTimer: {
    fontSize: isTablet ? 80 : 60,
    fontWeight: 'bold',
    color: '#1A202C',
    textAlign: 'center',
    marginBottom: 40
  },
  unlockTimerTablet: {
    fontSize: 100
  },
  waitingText: {
    fontSize: isTablet ? 24 : 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 40
  },
  waitingTextTablet: {
    fontSize: 28
  },
  homeButton: {
    paddingHorizontal: isTablet ? 40 : 32,
    paddingVertical: isTablet ? 20 : 16,
    borderRadius: isTablet ? 12 : 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: '#FFFFFF'
  },
  homeButtonTablet: {
    paddingHorizontal: 50,
    paddingVertical: 24
  },
  homeButtonText: {
    color: '#1A202C',
    fontWeight: '600',
    fontSize: isTablet ? 20 : 18,
    textAlign: 'center'
  },
  homeButtonTextTablet: {
    fontSize: 24
  },
  cameraPreview: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 320,
    height: 240,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#22c55e',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 1000,
  },
  camera: {
    width: '100%',
    height: '100%',
  },
});

export default PaymentScreen;
