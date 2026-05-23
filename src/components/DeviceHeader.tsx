import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { DeviceInfo } from '../api/types';
import { alashCloudAPI } from '../api/client';
import { isApiError } from '../api/types';
import { DeviceSocketStatus } from '../services/deviceCommandSocket';

interface DeviceHeaderProps {
  deviceInfo: DeviceInfo;
  onAdminAccess: () => void;
  socketStatus: DeviceSocketStatus;
  onSocketReconnect: () => void;
}

const { width } = Dimensions.get('window');
const isTablet = width > 600;

const DeviceHeader: React.FC<DeviceHeaderProps> = ({ deviceInfo, onAdminAccess, socketStatus, onSocketReconnect }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [temperature, setTemperature] = useState<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchTemperature = async () => {
      const response = await alashCloudAPI.getTemperature(deviceInfo.machid);
      if (!isApiError(response) && 'value' in response) {
        setTemperature(response.value);
      }
    };

    fetchTemperature();
    const tempInterval = setInterval(fetchTemperature, 60000); // Обновляем каждую минуту

    return () => clearInterval(tempInterval);
  }, [deviceInfo.machid]);

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
      <View style={styles.leftSection}>
        <Text style={[styles.time, isTablet && styles.timeTablet]}>
          {formatTime(currentTime)}
        </Text>
        {temperature !== null && (
          <Text style={[styles.temperature, isTablet && styles.temperatureTablet]}>
            {temperature}°C
          </Text>
        )}
      </View>
      <View style={styles.deviceSection}>
        <TouchableOpacity
          onPress={socketStatus === 'connected' ? undefined : onSocketReconnect}
          activeOpacity={socketStatus === 'connected' ? 1 : 0.5}
          style={[
            styles.socketIndicator,
            socketStatus === 'connected' ? styles.socketIndicatorConnected : styles.socketIndicatorDisconnected,
          ]}
        />
        <TouchableOpacity 
          onPress={onAdminAccess}
          activeOpacity={0.7}
        >
          <Text style={[styles.time, isTablet && styles.timeTablet]}>
            {deviceInfo.machid}
          </Text>
        </TouchableOpacity>
        
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  deviceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  socketIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  socketIndicatorConnected: {
    backgroundColor: '#22c55e',
  },
  socketIndicatorDisconnected: {
    backgroundColor: '#ef4444',
  },
  time: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A202C',
  },
  timeTablet: {
    fontSize: 22,
  },
  temperature: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3182CE',
  },
  temperatureTablet: {
    fontSize: 22,
  },
});

export default DeviceHeader;
