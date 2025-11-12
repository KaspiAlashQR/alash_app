import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { DeviceInfo } from '../api/types';

interface DeviceHeaderProps {
  deviceInfo: DeviceInfo;
  onAdminAccess: () => void;
}

const { width } = Dimensions.get('window');
const isTablet = width > 600;

const DeviceHeader: React.FC<DeviceHeaderProps> = ({ deviceInfo, onAdminAccess }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <View style={styles.header}>
      {/* Левая часть - ID устройства (кликабельный) */}
      <TouchableOpacity 
        style={styles.leftSection}
        onPress={onAdminAccess}
        activeOpacity={0.7}
      >
        <Text style={[styles.deviceId, isTablet && styles.deviceIdTablet]}>
          ID: {deviceInfo.machid}
        </Text>
        <Text style={[styles.deviceName, isTablet && styles.deviceNameTablet]}>
          {deviceInfo.device_name}
        </Text>
      </TouchableOpacity>

      {/* Правая часть - Время и дата */}
      <View style={styles.rightSection}>
        <Text style={[styles.time, isTablet && styles.timeTablet]}>
          {formatTime(currentTime)}
        </Text>
        <Text style={[styles.date, isTablet && styles.dateTablet]}>
          {formatDate(currentTime)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  leftSection: {
    flex: 1,
    alignItems: 'flex-start',
  },
  rightSection: {
    flex: 1,
    alignItems: 'flex-end',
  },
  deviceId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3182CE',
    marginBottom: 2,
  },
  deviceIdTablet: {
    fontSize: 18,
  },
  deviceName: {
    fontSize: 12,
    color: '#4A5568',
  },
  deviceNameTablet: {
    fontSize: 16,
  },
  time: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A202C',
    marginBottom: 2,
  },
  timeTablet: {
    fontSize: 20,
  },
  date: {
    fontSize: 12,
    color: '#4A5568',
  },
  dateTablet: {
    fontSize: 16,
  },
});

export default DeviceHeader;