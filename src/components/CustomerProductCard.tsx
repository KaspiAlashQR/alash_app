import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Product } from '../api/types';
import { cartService } from '../services/cartService';

interface CustomerProductCardProps {
  product: Product;
}

const { width } = Dimensions.get('window');
const isTablet = width > 600;

const CustomerProductCard: React.FC<CustomerProductCardProps> = ({ product }) => {
  const [quantity, setQuantity] = useState(0);

  useEffect(() => {
    const unsubscribe = cartService.subscribe(() => {
      setQuantity(cartService.getItemQuantity(product.id));
    });

    setQuantity(cartService.getItemQuantity(product.id));

    return unsubscribe;
  }, [product.id]);

  const handleCardPress = async () => {
    if (quantity === 0) {
      const remainingQty = product.remaining_quantity || 0;
      if (remainingQty > 0) {
        await cartService.addToCart(product, 1);
      }
    }
  };

  const handleIncreaseQuantity = async () => {
    const remainingQty = product.remaining_quantity || 0;
    if (quantity < remainingQty) {
      await cartService.updateQuantity(product.id, quantity + 1);
    }
  };

  const handleDecreaseQuantity = async () => {
    if (quantity > 0) {
      await cartService.updateQuantity(product.id, quantity - 1);
    }
  };

  return (
    <TouchableOpacity 
      style={styles.card}
      onPress={handleCardPress}
      activeOpacity={quantity === 0 ? 0.7 : 1}
      disabled={quantity > 0}
    >
      <View style={styles.imageContainer}>
        {product.image_url || product.url ? (
          <Image 
            source={{ uri: product.image_url || product.url || '' }} 
            style={styles.productImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Text style={styles.placeholderText}>Нет фото</Text>
          </View>
        )}
      </View>
      
      <View style={styles.contentContainer}>
        <Text style={styles.productName} numberOfLines={2}>
          {product.name_ru || product.name || ''}
        </Text>
        
        <View style={styles.priceAndStockContainer}>
          <Text style={styles.productPrice}>
            {(product.selling_price || product.amount || 0).toLocaleString('ru-RU')} ₸
          </Text>
          
          <Text style={styles.stockText}>
            Остаток: {product.remaining_quantity || 0} шт
          </Text>
        </View>
        
        {quantity > 0 && (
          <View style={styles.actionsContainer}>
            <View style={styles.quantityContainer}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={handleDecreaseQuantity}
              >
                <Text style={styles.quantityButtonText}>−</Text>
              </TouchableOpacity>
              
              <Text style={styles.quantityText}>{quantity}</Text>
              
              <TouchableOpacity
                style={[
                  styles.quantityButton,
                  (product.remaining_quantity || 0) <= quantity && styles.quantityButtonDisabled
                ]}
                onPress={handleIncreaseQuantity}
                disabled={(product.remaining_quantity || 0) <= quantity}
              >
                <Text style={styles.quantityButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  imageContainer: {
    width: '100%',
    height: isTablet ? 180 : 160,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
  },
  productImage: {
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
    fontSize: 12,
    color: '#A0AEC0',
  },
  contentContainer: {
    padding: 12,
  },
  productName: {
    fontSize: isTablet ? 18 : 16,
    fontWeight: '700',
    color: '#22223b',
    marginBottom: 12,
    textAlign: 'center',
    minHeight: 50,
  },
  priceAndStockContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: 'bold',
    color: '#FF8A50',
  },
  stockText: {
    fontSize: isTablet ? 14 : 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  actionsContainer: {
    marginTop: 8,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButton: {
    backgroundColor: '#FF6B35',
    width: isTablet ? 40 : 36,
    height: isTablet ? 40 : 36,
    borderRadius: isTablet ? 20 : 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  quantityButtonDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.5,
  },
  quantityButtonText: {
    color: 'white',
    fontSize: isTablet ? 20 : 18,
    fontWeight: 'bold',
  },
  quantityText: {
    fontSize: isTablet ? 18 : 16,
    fontWeight: 'bold',
    color: '#1A202C',
    marginHorizontal: 16,
    minWidth: 30,
    textAlign: 'center',
  },
});

export default CustomerProductCard;