import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Image, StyleSheet, Dimensions, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../utils/navigation.types';
import { alashCloudAPI } from '../api/client';
import { cartService } from '../services/cartService';

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

const PaymentScreen: React.FC<PaymentScreenProps> = ({ navigation, route }) => {
  const { orderId, payUrl } = route.params;
  const [remaining, setRemaining] = useState(TIMEOUT_MS);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const timerRef = useRef<number | null>(null);
  const pollRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

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
        Alert.alert('Время ожидания истекло', 'Платеж не был подтвержден. Возврат в корзину.');
        navigation.navigate('Cart');
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
          Alert.alert('Оплата подтверждена', 'Спасибо за покупку!', [
            { text: 'OK', onPress: async () => { await cartService.clearCart(); navigation.navigate('Home'); } }
          ]);
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

  const formatTime = (ms: number) => {
    const sec = Math.ceil(ms / 1000);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const qrImage = `https://chart.googleapis.com/chart?cht=qr&chs=${QR_SIZE}x${QR_SIZE}&chl=${encodeURIComponent(payUrl)}`;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={[styles.amount, isTablet && styles.amountTablet]}>
          {paymentAmount.toLocaleString('ru-RU')} ₸
        </Text>
        <View style={styles.qrContainer}>
          <Image source={{ uri: qrImage }} style={styles.qrImage} />
        </View>
        <Text style={styles.infoText}>Отсканируйте QR код в Kaspi.kz</Text>
        <Text style={styles.timer}>{formatTime(remaining)}</Text>
        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.navigate('Cart')}>
          <Text style={styles.cancelButtonText}>Отмена и возврат в корзину</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7FAFC' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
  amount: { fontSize: 32, fontWeight: 'bold', marginBottom: 30, color: '#16a34a' },
  amountTablet: { fontSize: 42, marginBottom: 40 },
  qrContainer: { 
    backgroundColor: 'white', 
    padding: 20, 
    borderRadius: 12, 
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  qrImage: { width: QR_SIZE, height: QR_SIZE },
  infoText: { marginBottom: 12, fontSize: 16, color: '#4A5568', textAlign: 'center' },
  timer: { marginBottom: 20, fontSize: 20, fontWeight: '700', color: '#1A202C' },
  cancelButton: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, backgroundColor: '#e5e7eb' },
  cancelButtonText: { color: '#1A202C', fontWeight: '600' },
});

export default PaymentScreen;
