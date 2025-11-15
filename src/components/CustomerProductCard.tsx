import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Product } from '../api/types';
import { cartService } from '../services/cartService';

interface CustomerProductCardProps {
  product: Product;
}

const { width } = Dimensions.get('window');
const isTablet = width > 600;
const cardWidth = isTablet ? (width - 80) / 3 - 16 : (width - 60) / 2 - 12;

const CustomerProductCard: React.FC<CustomerProductCardProps> = ({ product }) => {
  const [quantity, setQuantity] = useState(0);

  useEffect(() => {
    const unsubscribe = cartService.subscribe(() => {
      setQuantity(cartService.getItemQuantity(product.id));
    });

    setQuantity(cartService.getItemQuantity(product.id));

    return unsubscribe;
  }, [product.id]);

  const handleAddToCart = async () => {
    await cartService.addToCart(product, 1);
  };

  const handleIncreaseQuantity = async () => {
    await cartService.updateQuantity(product.id, quantity + 1);
  };

  const handleDecreaseQuantity = async () => {
    if (quantity > 0) {
      await cartService.updateQuantity(product.id, quantity - 1);
    }
  };

  return (
    <View style={[styles.card, { width: cardWidth }]}>
      <View style={styles.imageContainer}>
        {product.url ? (
          <Image 
            source={{ uri: product.url }} 
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
          {product.name}
        </Text>
        
        <View style={styles.actionsContainer}>
          {quantity === 0 ? (
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddToCart}
            >
              <Text style={styles.addButtonText}>{product.amount.toLocaleString('ru-RU')} ₸</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.quantityContainer}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={handleDecreaseQuantity}
              >
                <Text style={styles.quantityButtonText}>−</Text>
              </TouchableOpacity>
              
              <Text style={styles.quantityText}>{quantity}</Text>
              
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={handleIncreaseQuantity}
              >
                <Text style={styles.quantityButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    width: '100%',
    height: isTablet ? 180 : 160,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
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
    fontSize: isTablet ? 16 : 14,
    fontWeight: '600',
    color: '#1A202C',
    marginBottom: 12,
    textAlign: 'center',
  },
  actionsContainer: {
    marginTop: 4,
  },
  addButton: {
    backgroundColor: '#16a34a',
    paddingVertical: isTablet ? 12 : 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: isTablet ? 16 : 14,
    fontWeight: '600',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButton: {
    backgroundColor: '#16a34a',
    width: isTablet ? 40 : 36,
    height: isTablet ? 40 : 36,
    borderRadius: isTablet ? 20 : 18,
    justifyContent: 'center',
    alignItems: 'center',
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