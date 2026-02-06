import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SoftApWifiItem } from '../../../../Imou/typescript/imou';
import { styles } from '../styles';

interface Props {
  loading: boolean;
  wifiList: SoftApWifiItem[];
  onSelectWifi: (wifi: SoftApWifiItem) => void;
  onRefresh: () => void;
}

export const SelectWifiStep: React.FC<Props> = ({ loading, wifiList, onSelectWifi, onRefresh }) => {
  if (loading) {
    return (
      <View style={[styles.scrollContent, styles.stepContent]}>
        <Text style={styles.stepTitle}>Выберите WiFi сеть</Text>
        <Text style={styles.stepDescription}>
          Выберите сеть, к которой будет подключено устройство
        </Text>
        <ActivityIndicator size="large" color="#2563eb" style={{ marginVertical: 32 }} />
      </View>
    );
  }

  if (wifiList.length === 0) {
    return (
      <View style={[styles.scrollContent, styles.stepContent]}>
        <Text style={styles.stepTitle}>Выберите WiFi сеть</Text>
        <Text style={styles.stepDescription}>
          Выберите сеть, к которой будет подключено устройство
        </Text>
        <View style={styles.emptyWifiList}>
          <Icon name="wifi-off" size={48} color="#9ca3af" />
          <Text style={styles.emptyWifiText}>WiFi сети не найдены</Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={onRefresh}>
            <Text style={styles.secondaryButtonText}>Обновить</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <FlatList
      data={wifiList}
      keyExtractor={(item, index) => `${item.ssid}-${index}`}
      contentContainerStyle={styles.wifiListContent}
      ListHeaderComponent={
        <View style={styles.wifiListHeader}>
          <Text style={styles.stepTitle}>Выберите WiFi сеть</Text>
          <Text style={styles.stepDescription}>
            Выберите сеть, к которой будет подключено устройство
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.wifiItem} onPress={() => onSelectWifi(item)}>
          <Icon
            name={
              item.signal >= 75
                ? 'wifi-strength-4'
                : item.signal >= 50
                  ? 'wifi-strength-3'
                  : item.signal >= 25
                    ? 'wifi-strength-2'
                    : 'wifi-strength-1'
            }
            size={24}
            color={item.isOpen ? '#6b7280' : '#2563eb'}
          />
          <View style={styles.wifiItemInfo}>
            <Text style={styles.wifiItemSsid}>{item.ssid}</Text>
            <Text style={styles.wifiItemAuth}>{item.isOpen ? 'Открытая сеть' : 'Защищённая'}</Text>
          </View>
          {!item.isOpen && <Icon name="lock" size={16} color="#9ca3af" style={{ marginRight: 8 }} />}
          <Icon name="chevron-right" size={24} color="#9ca3af" />
        </TouchableOpacity>
      )}
      ListFooterComponent={
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <Icon name="refresh" size={20} color="#2563eb" />
          <Text style={styles.refreshButtonText}>Обновить список</Text>
        </TouchableOpacity>
      }
    />
  );
};
