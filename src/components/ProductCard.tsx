import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Product } from '../api/types';

interface ProductCardProps {
  product: Product;
  onPress?: (product: Product) => void;
  onEdit?: (product: Product) => void;
  onDelete?: (product: Product) => void;
  showActions?: boolean;
}

const { width } = Dimensions.get('window');
const isTablet = width > 600;
const cardWidth = isTablet ? (width - 80) / 3 - 16 : (width - 60) / 2 - 12;

const ProductCard: React.FC<ProductCardProps> = ({ product, onPress, onEdit, onDelete, showActions = false }) => {
  const handlePress = () => {
    if (onPress) {
      onPress(product);
    }
  };

  return (
    <View 
      style={[styles.card, { width: cardWidth }]}
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
        
        <Text style={styles.productDescription} numberOfLines={2}>
          {product.name_kz || product.name2 || ''}
        </Text>
        
        <View style={styles.priceContainer}>
          <Text style={styles.price}>
            {(product.selling_price || product.amount || 0).toLocaleString('ru-RU')} ₸
          </Text>
        </View>
        
        {showActions && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={(e) => {
                e.stopPropagation();
                onEdit && onEdit(product);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.editButtonText}>Редактировать</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={(e) => {
                e.stopPropagation();
                onDelete && onDelete(product);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.deleteButtonText}>Удалить</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
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
    height: isTablet ? 160 : 130,
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
    marginBottom: 4,
    textAlign: 'center',
  },
  productDescription: {
    fontSize: isTablet ? 14 : 12,
    color: '#6b7280',
    marginBottom: 8,
    minHeight: isTablet ? 34 : 30,
    textAlign: 'center',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: 'bold',
    color: '#3b82f6',
    marginTop: 2,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 8,
  },
  editButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    flex: 1,
    shadowColor: '#3b82f6',
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  editButtonText: {
    color: 'white',
    fontSize: isTablet ? 12 : 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    flex: 1,
    shadowColor: '#ef4444',
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: isTablet ? 12 : 11,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default ProductCard;