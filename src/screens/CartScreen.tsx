import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions, Alert, Image, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../utils/navigation.types';
import { cartService } from '../services/cartService';
import { Cart, CartItem } from '../api/types';
import { alashCloudAPI } from '../api/client';
import { deviceStorage } from '../api/storage';
import { createInternalOrder } from '../api/orders';

type CartScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Cart'>;

interface CartScreenProps {
  navigation: CartScreenNavigationProp;
}

const { width } = Dimensions.get('window');
const isTablet = width > 600;

// Компонент счетчика с локальным состоянием
const QuantityCounter: React.FC<{
  quantity: number;
  productPrice: number;
  remainingQuantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
}> = ({ quantity, productPrice, remainingQuantity, onIncrement, onDecrement }) => {
  // Мгновенный расчет цены
  const currentTotal = productPrice * quantity;

  return (
    <View style={styles.itemActions}>
      <View style={styles.quantityContainer}>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={onDecrement}
          activeOpacity={0.7}
        >
          <Text style={styles.quantityButtonText}>−</Text>
        </TouchableOpacity>
        
        <Text style={styles.quantityText}>{quantity}</Text>
        
        <TouchableOpacity
          style={[
            styles.quantityButton,
            quantity >= remainingQuantity && styles.quantityButtonDisabled
          ]}
          onPress={onIncrement}
          activeOpacity={0.7}
          disabled={quantity >= remainingQuantity}
        >
          <Text style={styles.quantityButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.itemTotal}>
        {currentTotal.toLocaleString('ru-RU')} ₸
      </Text>
    </View>
  );
};

// Компонент для мгновенного отображения общей суммы
const CartTotal: React.FC<{ cart: Cart }> = ({ cart }) => {
  // Прямой расчет без локального состояния
  const currentTotal = cart.items.reduce((sum, item) => {
    const price = item.product.selling_price || item.product.amount || 0;
    return sum + (price * item.quantity);
  }, 0);

  return (
    <View style={styles.totalContainer}>
      <Text style={styles.totalLabel}>Итого:</Text>
      <Text style={styles.totalAmount}>
        {currentTotal.toLocaleString('ru-RU')} ₸
      </Text>
    </View>
  );
};

const CartScreen: React.FC<CartScreenProps> = ({ navigation }) => {
  const [cart, setCart] = useState<Cart>({ items: [], total: 0 });
  const [cancelTimer, setCancelTimer] = useState<number>(30); // 30 секунд
  const scaleAnim = useRef(new Animated.Value(1)).current; // Анимация масштаба для кнопки "Отмена"

  useEffect(() => {
    const unsubscribe = cartService.subscribe((updatedCart) => {
      setCart(updatedCart);
    });

    setCart(cartService.getCart());

    return unsubscribe;
  }, []);

  // Сброс таймера при изменении корзины
  useEffect(() => {
    if (cart.items.length === 0) {
      setCancelTimer(30); // Сбрасываем таймер если корзина пуста
      return;
    }
    // Сбрасываем таймер при изменении корзины (добавлении/удалении товаров)
    setCancelTimer(30);
  }, [cart.items.length]);

  // Пульсирующая анимация для кнопки "Отмена"
  useEffect(() => {
    if (cart.items.length === 0) {
      // Останавливаем анимацию если корзина пуста
      scaleAnim.setValue(1);
      return;
    }

    // Создаем пульсирующую анимацию
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1, // Увеличиваем на 10%
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1, // Возвращаем к исходному размеру
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    pulseAnimation.start();

    return () => {
      pulseAnimation.stop();
      scaleAnim.setValue(1);
    };
  }, [cart.items.length, scaleAnim]);

  // Таймер обратного отсчета для кнопки "Отмена"
  useEffect(() => {
    if (cart.items.length === 0) {
      return; // Не запускаем таймер если корзина пуста
    }

    const interval = setInterval(() => {
      setCancelTimer((prev) => {
        if (prev <= 1) {
          // Таймер истек - очищаем корзину и возвращаемся на Home
          clearInterval(interval);
          (async () => {
            await cartService.clearCart();
            navigation.navigate('Home');
          })();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [cart.items.length, navigation]);

  const handleQuantityChange = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      cartService.removeFromCart(productId);
    } else {
      cartService.updateQuantity(productId, newQuantity);
    }
    // Явно обновляем состояние корзины после изменения
    setCart(cartService.getCart());
  }

  const handleIncrement = (productId: number, currentQuantity: number, remainingQuantity: number) => {
    if (currentQuantity < remainingQuantity) {
      handleQuantityChange(productId, currentQuantity + 1);
    }
  };

  const handleDecrement = (productId: number, currentQuantity: number) => {
    handleQuantityChange(productId, currentQuantity - 1);
  };

  const handleClearCart = async () => {
    // Очищаем корзину и возвращаемся на Home
    await cartService.clearCart();
    navigation.navigate('Home');
  };

  // Форматирование времени для таймера (MM:SS)
  const formatTimer = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCheckout = async () => {
    if (cart.items.length === 0) {
      Alert.alert('Корзина пуста', 'Добавьте товары в корзину перед оформлением заказа');
      return;
    }

    try {
      const stored = await deviceStorage.getDeviceInfo();
      if (!stored) {
        Alert.alert('Ошибка', 'Не удалось получить информацию об устройстве');
        return;
      }

      const sum = cart.items.reduce((total, item) => {
        const price = item.product.selling_price || item.product.amount || 0;
        return total + (price * item.quantity);
      }, 0);
      const product_name = cart.items.map(item => ({ 
        name: item.product.name_ru || item.product.name || '', 
        quantity: item.quantity 
      }));

      const internalOrderResp = await createInternalOrder({
        amount: sum,
        device_id: parseInt(stored.machid),
        product_name,
        url: '',
      });

      if (!internalOrderResp || internalOrderResp.error || typeof internalOrderResp.id !== 'number') {
        Alert.alert('Ошибка', 'Не удалось создать внутренний заказ. Попробуйте ещё раз.');
        return;
      }
      const internalOrderId = internalOrderResp.id;
      const createResp = await alashCloudAPI.createOrder(stored.machid, Math.round(sum));
      if (!createResp || (createResp as any).error || typeof (createResp as any).id !== 'number') {
        Alert.alert('Ошибка', 'Не удалось создать платежный заказ. Попробуйте ещё раз.');
        return;
      }
      const orderId = (createResp as any).id as number;
      const payUrl = `https://kaspi.kz/pay/AlashCoffeeNew?16246=${orderId}`;
      
      // Сохраняем товары из корзины для уменьшения остатка после оплаты
      navigation.navigate('Payment', { 
        orderId, 
        payUrl, 
        internalOrderId,
        cartItems: cart.items, // Передаем товары через route.params
      });
    } catch (err) {
      console.error('checkout error', err);
      Alert.alert('Ошибка', 'Произошла ошибка при оформлении заказа');
    }
  };

  const renderCartItem = (item: CartItem) => (
    <View key={item.product.id} style={styles.cartItem}>
      <View style={styles.itemImageContainer}>
        {item.product.image_url || item.product.url ? (
          <Image 
            source={{ uri: item.product.image_url || item.product.url || '' }} 
            style={styles.itemImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Text style={styles.placeholderText}>Нет фото</Text>
          </View>
        )}
      </View>

      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.product.name_ru || item.product.name || ''}</Text>
        <View style={styles.itemPriceAndStock}>
          <Text style={styles.itemPrice}>{(item.product.selling_price || item.product.amount || 0).toLocaleString('ru-RU')} ₸</Text>
          <Text style={styles.itemStock}>Остаток: {item.product.remaining_quantity || 0} шт</Text>
        </View>
      </View>

      <QuantityCounter
        quantity={item.quantity}
        productPrice={item.product.selling_price || item.product.amount || 0}
        remainingQuantity={item.product.remaining_quantity || 0}
        onIncrement={() => handleIncrement(item.product.id, item.quantity, item.product.remaining_quantity || 0)}
        onDecrement={() => handleDecrement(item.product.id, item.quantity)}
      />
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#fff' }] }>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Назад</Text>
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Корзина</Text>
        
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {cart.items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Корзина пуста</Text>
            <Text style={styles.emptySubtext}>Добавьте товары из каталога</Text>
          </View>
        ) : (
          <View style={styles.cartContent}>
            {cart.items.map(renderCartItem)}
          </View>
        )}
      </ScrollView>

      {cart.items.length > 0 && (
        <View style={styles.footer}>
          <CartTotal cart={cart} />
          
          <View style={styles.buttonRow}>
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleClearCart}
              >
                <Text style={styles.cancelButtonText}>
                  Отмена {formatTimer(cancelTimer)}
                </Text>
              </TouchableOpacity>
            </Animated.View>
            
            <TouchableOpacity
              style={styles.checkoutButton}
              onPress={handleCheckout}
            >
              <Text style={styles.checkoutButtonText}>
                Оплатить с Kaspi QR
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  backButtonText: {
    fontSize: isTablet ? 18 : 16,
    color: '#3182CE',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: isTablet ? 24 : 20,
    fontWeight: 'bold',
    color: '#1A202C',
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: isTablet ? 24 : 20,
    fontWeight: 'bold',
    color: '#4A5568',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: isTablet ? 18 : 16,
    color: '#718096',
    textAlign: 'center',
  },
  cartContent: {
    padding: 16,
  },
  cartItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  itemImageContainer: {
    width: isTablet ? 80 : 60,
    height: isTablet ? 80 : 60,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F7FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 10,
    color: '#A0AEC0',
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: '600',
    color: '#1A202C',
    marginBottom: 4,
  },
  itemPriceAndStock: {
    marginTop: 4,
  },
  itemPrice: {
    fontSize: isTablet ? 14 : 12,
    color: '#FF8A50',
    fontWeight: '600',
    marginBottom: 2,
  },
  itemStock: {
    fontSize: isTablet ? 12 : 10,
    color: '#6b7280',
    fontWeight: '500',
  },
  itemActions: {
    alignItems: 'flex-end',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  quantityButton: {
    backgroundColor: '#FF8A50',
    width: isTablet ? 32 : 28,
    height: isTablet ? 32 : 28,
    borderRadius: isTablet ? 16 : 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.5,
  },
  quantityButtonText: {
    color: 'white',
    fontSize: isTablet ? 18 : 16,
    fontWeight: 'bold',
  },
  quantityText: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: 'bold',
    color: '#1A202C',
    marginHorizontal: 12,
    minWidth: 24,
    textAlign: 'center',
  },

  itemTotal: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: 'bold',
    color: '#1A202C',
  },
  footer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: 'bold',
    color: '#1A202C',
  },
  totalAmount: {
    fontSize: isTablet ? 24 : 20,
    fontWeight: 'bold',
    color: '#FF8A50',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    backgroundColor: '#dc2626',
    paddingVertical: isTablet ? 16 : 14,
    paddingHorizontal: isTablet ? 20 : 16,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: isTablet ? 120 : 100,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: isTablet ? 16 : 14,
    fontWeight: 'bold',
  },
  checkoutButton: {
    backgroundColor: '#FF8A50',
    paddingVertical: isTablet ? 16 : 14,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
  },
  checkoutButtonText: {
    color: 'white',
    fontSize: isTablet ? 18 : 16,
    fontWeight: 'bold',
  },
});

export default CartScreen;