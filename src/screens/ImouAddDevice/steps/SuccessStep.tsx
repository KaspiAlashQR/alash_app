import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { styles } from '../styles';

interface Props {
  deviceModel?: string;
  onDone: () => void;
}

export const SuccessStep: React.FC<Props> = ({ deviceModel, onDone }) => (
  <View style={styles.stepContent}>
    <Icon name="check-circle" size={80} color="#22c55e" style={styles.stepIcon} />
    <Text style={styles.stepTitle}>Камера настроена!</Text>
    <Text style={styles.stepDescription}>
      {deviceModel || 'Камера'} успешно подключена к WiFi и добавлена в ваш аккаунт
    </Text>

    <TouchableOpacity style={styles.primaryButton} onPress={onDone}>
      <Text style={styles.primaryButtonText}>Готово</Text>
    </TouchableOpacity>
  </View>
);
