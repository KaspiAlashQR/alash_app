import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';


interface CategorySidebarProps {
  categories: string[];
  selectedCategory: string | null;
  onSelect: (cat: string) => void;
  isTablet: boolean;
  style?: any;
}

const iconNames: Record<string, string> = {
  'Напитки': 'cup',
  'Снеки': 'food-apple',
  'Сладости': 'candy',
  'Кондитерка': 'cake-variant',
  'Молочка': 'cow',
  'Хлеб': 'bread-slice',
  'Готовое': 'food-fork-drink',
  'Бакалея': 'basket',
  'Гигиена': 'face-woman',
  'Для дома': 'home-variant',
  'Мороженое': 'ice-cream',
  'ЗОЖ': 'leaf',
  'Все': 'apps',
};

const CategorySidebar: React.FC<CategorySidebarProps> = ({ categories, selectedCategory, onSelect, isTablet, style }) => {
  const sidebarWidth = isTablet ? 110 : 72;
  const categoryItemWidth = isTablet ? 88 : 60;
  const categoryIconSize = isTablet ? 48 : 36;
  const categoryIconFont = isTablet ? 28 : 20;
  const categoryLabelFont = isTablet ? 15 : 12;

  return (
    <View style={[styles.sidebar, { width: sidebarWidth, backgroundColor: '#f3f4f6', borderRadius: 20, paddingVertical: 12, paddingHorizontal: 0, shadowOpacity: 0.04 }, style]}> 
      <ScrollView contentContainerStyle={[styles.sidebarContent, { flexGrow: 1 }]} showsVerticalScrollIndicator={false}>
        {categories.map((cat) => {
          const iconName = iconNames[cat] || 'shape';

          const isActive = (cat === 'Все' && selectedCategory === null) || (selectedCategory === cat && cat !== 'Все');
          return (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryItem,
                { width: categoryItemWidth },
                isActive && styles.categoryItemActive
              ]}
              onPress={() => onSelect(cat)}
              activeOpacity={0.85}
            >
              <View style={[
                styles.categoryIconWrapper,
                { width: categoryIconSize, height: categoryIconSize, borderRadius: categoryIconSize / 2, backgroundColor: isActive ? '#e0e7ff' : '#f3f4f6', borderWidth: isActive ? 2 : 0, borderColor: isActive ? '#16a34a' : 'transparent' }
              ]}>
                <MaterialCommunityIcons
                  name={iconName}
                  size={categoryIconFont}
                  color={isActive ? '#16a34a' : '#94a3b8'}
                />
              </View>
              <Text style={[styles.categoryLabel, { fontSize: categoryLabelFont, color: isActive ? '#16a34a' : '#22223b' }]} numberOfLines={2}>{cat}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'flex-start',
    shadowColor: '#3b82f6',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 3
  },
  sidebarContent: {
    alignItems: 'center'
  },
  categoryItem: {
    alignItems: 'center',
    marginBottom: 10,
    borderRadius: 16,
    paddingVertical: 7,
    paddingHorizontal: 2,
    backgroundColor: 'transparent',
    minHeight: 70,
  },
  categoryItemActive: {
    backgroundColor: '#fff',
    shadowColor: '#3b82f6',
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 6,
  },
  categoryIconWrapper: {
    backgroundColor: '#f4f6fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 0,
  },
  categoryIcon: {
    // fontSize задаётся через пропсы
  },
  categoryLabel: {
    color: '#22223b',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2
  }
});

export default CategorySidebar;
