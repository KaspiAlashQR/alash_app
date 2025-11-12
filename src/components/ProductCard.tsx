import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Product } from '../api/types';

interface ProductCardProps {
  product: Product;
  onPress?: (product: Product) => void;
}

const { width } = Dimensions.get('window');
const isTablet = width > 600;
const cardWidth = isTablet ? (width - 80) / 3 - 16 : (width - 60) / 2 - 12;

const ProductCard: React.FC<ProductCardProps> = ({ product, onPress }) => {
  const handlePress = () => {
    if (onPress) {
      onPress(product);
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.card, { width: cardWidth }]} 
      onPress={handlePress}
      activeOpacity={0.8}
    >
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
        
        <Text style={styles.productDescription} numberOfLines={2}>
          {product.name2}
        </Text>
        
        <View style={styles.priceContainer}>
          <Text style={styles.price}>
            {product.amount.toLocaleString('ru-RU')} ₸
          </Text>
        </View>
      </View>
    </TouchableOpacity>
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
    height: isTablet ? 140 : 120,
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
    marginBottom: 4,
  },
  productDescription: {
    fontSize: isTablet ? 14 : 12,
    color: '#4A5568',
    marginBottom: 8,
    minHeight: isTablet ? 34 : 30,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: isTablet ? 18 : 16,
    fontWeight: 'bold',
    color: '#3182CE',
  },
});

export default ProductCard;