import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, ActivityIndicator, TextInput, Alert } from 'react-native';
import { alashCloudAPI } from '../../api/client';
import { deviceStorage } from '../../api/storage';
import { Order } from '../../api/types';

const { width } = Dimensions.get('window');
const isTablet = width > 600;

const StatisticsTab: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  
  // Устанавливаем период по умолчанию (последние 7 дней)
  useEffect(() => {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7);
    
    setDateTo(today.toISOString().split('T')[0]);
    setDateFrom(weekAgo.toISOString().split('T')[0]);
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const deviceInfo = await deviceStorage.getDeviceInfo();
      if (!deviceInfo) {
        Alert.alert('Ошибка', 'Не удалось получить информацию об устройстве');
        return;
      }

      // Преобразуем machid в число для API
      const machid = typeof deviceInfo.machid === 'string' ? parseInt(deviceInfo.machid, 10) : deviceInfo.machid;
      const response = await alashCloudAPI.getOrders(machid);
      if (response && 'error' in response) {
        Alert.alert('Ошибка', response.error || 'Не удалось загрузить транзакции');
        return;
      }

      if (response && 'orders' in response) {
        // Парсим product_name если это строка
        const parsedOrders = response.orders.map(order => {
          let productName = order.product_name;
          if (typeof productName === 'string') {
            try {
              productName = JSON.parse(productName);
            } catch (e) {
              console.error('Ошибка парсинга product_name:', e);
              productName = [];
            }
          }
          return {
            ...order,
            product_name: productName,
          };
        });
        
        // Фильтруем только paid и по дате
        let filteredOrders = parsedOrders.filter(order => order.status === 'paid');
        
        if (dateFrom && dateTo) {
          filteredOrders = filteredOrders.filter(order => {
            const orderDate = new Date(order.created_at);
            const fromDate = new Date(dateFrom);
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999); // Конец дня
            return orderDate >= fromDate && orderDate <= toDate;
          });
        }
        
        // Сортируем по дате (новые сначала)
        filteredOrders.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        setOrders(filteredOrders);
      }
    } catch (error) {
      console.error('Ошибка загрузки транзакций:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить транзакции');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dateFrom && dateTo) {
      loadOrders();
    }
  }, [dateFrom, dateTo]);

  // Вычисляем статистику для диаграммы
  const getDailyStats = () => {
    const dailyMap = new Map<string, number>();
    
    orders.forEach(order => {
      const date = new Date(order.created_at).toISOString().split('T')[0];
      const current = dailyMap.get(date) || 0;
      dailyMap.set(date, current + order.amount);
    });
    
    const sortedDates = Array.from(dailyMap.keys()).sort();
    return sortedDates.map(date => ({
      date,
      amount: dailyMap.get(date) || 0,
    }));
  };

  const dailyStats = getDailyStats();
  const totalAmount = orders.reduce((sum, order) => sum + order.amount, 0);
  const maxAmount = Math.max(...dailyStats.map(s => s.amount), 1);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={[styles.title, isTablet && styles.titleTablet]}>Транзакции</Text>
      </View>

      {/* Выбор периода */}
      <View style={styles.periodContainer}>
        <View style={styles.periodRow}>
          <View style={styles.dateInputContainer}>
            <Text style={styles.dateLabel}>С:</Text>
            <TextInput
              style={styles.dateInput}
              value={dateFrom}
              onChangeText={setDateFrom}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9ca3af"
            />
          </View>
          
          <View style={styles.dateInputContainer}>
            <Text style={styles.dateLabel}>По:</Text>
            <TextInput
              style={styles.dateInput}
              value={dateTo}
              onChangeText={setDateTo}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9ca3af"
            />
          </View>
        </View>
        
        <TouchableOpacity style={styles.refreshButton} onPress={loadOrders}>
          <Text style={styles.refreshButtonText}>Обновить</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      ) : (
        <>
          {/* Диаграмма продаж */}
          {dailyStats.length > 0 && (
            <View style={styles.chartContainer}>
              <Text style={[styles.chartTitle, isTablet && styles.chartTitleTablet]}>
                Продажи за период: {totalAmount.toLocaleString('ru-RU')} ₸
              </Text>
              <View style={styles.chart}>
                {dailyStats.map((stat, index) => {
                  const height = (stat.amount / maxAmount) * 200;
                  const date = new Date(stat.date);
                  const dayLabel = date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
                  
                  return (
                    <View key={index} style={styles.barContainer}>
                      <View style={[styles.bar, { height: Math.max(height, 10) }]} />
                      <Text style={styles.barLabel}>{dayLabel}</Text>
                      <Text style={styles.barAmount}>{stat.amount.toLocaleString('ru-RU')} ₸</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Таблица транзакций */}
          <View style={styles.tableContainer}>
            <Text style={[styles.tableTitle, isTablet && styles.tableTitleTablet]}>
              Список транзакций ({orders.length})
            </Text>
            
            {orders.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Нет транзакций за выбранный период</Text>
              </View>
            ) : (
              <View style={styles.table}>
                {/* Заголовок таблицы */}
                <View style={[styles.tableRow, styles.tableHeader]}>
                  <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 2 }]}>Товар</Text>
                  <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1 }]}>Количество</Text>
                  <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1 }]}>Сумма</Text>
                  <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1.5 }]}>Дата</Text>
                </View>
                
                {/* Строки таблицы */}
                {orders.map((order) => {
                  // Убеждаемся, что product_name это массив
                  const products = Array.isArray(order.product_name) 
                    ? order.product_name 
                    : (typeof order.product_name === 'string' 
                        ? (() => {
                            try {
                              return JSON.parse(order.product_name);
                            } catch {
                              return [];
                            }
                          })()
                        : []);
                  
                  return (
                    <View key={order.id} style={styles.tableRow}>
                      <View style={[styles.tableCell, { flex: 2 }]}>
                        {products.map((product: any, idx: number) => (
                          <Text key={idx} style={styles.productName}>
                            {product?.name || 'Неизвестный товар'}
                          </Text>
                        ))}
                      </View>
                      <View style={[styles.tableCell, { flex: 1 }]}>
                        {products.map((product: any, idx: number) => (
                          <Text key={idx} style={styles.productQuantity}>
                            {product?.quantity || 0} шт
                          </Text>
                        ))}
                      </View>
                    <View style={[styles.tableCell, { flex: 1 }]}>
                      <Text style={styles.productAmount}>
                        {order.amount.toLocaleString('ru-RU')} ₸
                      </Text>
                    </View>
                    <View style={[styles.tableCell, { flex: 1.5 }]}>
                      <Text style={styles.productDate}>
                        {formatDate(order.created_at)}
                      </Text>
                    </View>
                  </View>
                  );
                })}
              </View>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: isTablet ? 24 : 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
  },
  titleTablet: {
    fontSize: 28,
  },
  periodContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  periodRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  dateInputContainer: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  dateInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    fontSize: 14,
    color: '#1f2937',
  },
  refreshButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  chartTitleTablet: {
    fontSize: 20,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 250,
    paddingVertical: 16,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '80%',
    backgroundColor: '#FF6B35',
    borderRadius: 4,
    marginBottom: 8,
    minHeight: 10,
  },
  barLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 4,
  },
  barAmount: {
    fontSize: 10,
    color: '#374151',
    fontWeight: '600',
    marginTop: 2,
  },
  tableContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tableTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  tableTitleTablet: {
    fontSize: 20,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
  },
  table: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  tableHeader: {
    backgroundColor: '#f9fafb',
    borderBottomWidth: 2,
    borderBottomColor: '#d1d5db',
  },
  tableCell: {
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  tableHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  productName: {
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 4,
  },
  productQuantity: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  productAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  productDate: {
    fontSize: 12,
    color: '#6b7280',
  },
});

export default StatisticsTab;
