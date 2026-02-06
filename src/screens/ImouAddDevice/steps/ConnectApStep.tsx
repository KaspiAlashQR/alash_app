import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Platform, Linking } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { styles } from '../styles';

interface Props {
  deviceApSsid: string;
  loading: boolean;
  onConnect: () => void;
  onCheckConnection: () => void;
}

export const ConnectApStep: React.FC<Props> = ({
  deviceApSsid,
  loading,
  onConnect,
  onCheckConnection,
}) => (
  <View style={styles.stepContent}>
    <Icon name="wifi" size={64} color="#2563eb" style={styles.stepIcon} />
    <Text style={styles.stepTitle}>Подключение к камере</Text>
    <Text style={styles.stepDescription}>Подключите планшет к WiFi точке камеры</Text>

    <View style={styles.apInfoBox}>
      <Text style={styles.apInfoLabel}>Имя сети (SSID):</Text>
      <Text style={styles.apInfoValue}>{deviceApSsid}</Text>
      <Text style={styles.apInfoHint}>Пароль обычно не требуется</Text>
    </View>

    <View style={styles.warningBox}>
      <Icon name="alert-circle-outline" size={20} color="#f59e0b" />
      <Text style={styles.warningText}>
        Android покажет "Нет интернета" - это нормально! Нажмите "Подключиться" или "Сохранить
        подключение".
      </Text>
    </View>

    <TouchableOpacity
      style={[styles.primaryButton, loading && styles.disabledButton]}
      onPress={onConnect}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.primaryButtonText}>Подключиться автоматически</Text>
      )}
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.secondaryButton}
      onPress={() => {
        if (Platform.OS === 'android') {
          Linking.sendIntent('android.settings.WIFI_SETTINGS');
        }
      }}
      disabled={loading}
    >
      <Text style={styles.secondaryButtonText}>Открыть настройки WiFi</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={[styles.secondaryButton, { marginTop: 8 }]}
      onPress={onCheckConnection}
      disabled={loading}
    >
      <Text style={styles.secondaryButtonText}>Я подключился → Продолжить</Text>
    </TouchableOpacity>
  </View>
);
