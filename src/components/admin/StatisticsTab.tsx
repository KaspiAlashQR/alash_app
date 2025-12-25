import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const isTablet = width > 600;

const StatisticsTab: React.FC = () => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.placeholderContainer}>
        <Text style={styles.placeholderIcon}>📊</Text>
        <Text style={styles.placeholderTitle}>Статистика</Text>
        <Text style={styles.placeholderText}>
          Здесь будет отображаться статистика продаж, популярные товары, выручка и другие аналитические данные
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flexGrow: 1,
    padding: isTablet ? 24 : 16,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  placeholderIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  placeholderTitle: {
    fontSize: isTablet ? 24 : 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  placeholderText: {
    fontSize: isTablet ? 16 : 14,
    color: '#9ca3af',
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 22,
  },
});

export default StatisticsTab;




