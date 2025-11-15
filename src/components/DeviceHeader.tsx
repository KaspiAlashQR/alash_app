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
      <Text style={[styles.time, isTablet && styles.timeTablet]}>
        {formatTime(currentTime)}
      </Text>
      <TouchableOpacity 
        onPress={onAdminAccess}
        activeOpacity={0.7}
      >
        <Text style={[styles.time, isTablet && styles.timeTablet]}>
          {deviceInfo.machid}
        </Text>
      </TouchableOpacity>
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
  time: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A202C',
  },
  timeTablet: {
    fontSize: 22,
  },
});

export default DeviceHeader;