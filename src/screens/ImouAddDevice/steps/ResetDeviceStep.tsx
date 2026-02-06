import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { styles } from '../styles';

interface Props {
  deviceApSsid: string;
  onNext: () => void;
}

export const ResetDeviceStep: React.FC<Props> = ({ deviceApSsid, onNext }) => (
  <View style={styles.stepContent}>
    <Icon name="restart" size={64} color="#f59e0b" style={styles.stepIcon} />
    <Text style={styles.stepTitle}>Сброс устройства</Text>
    <Text style={styles.stepDescription}>
      Для настройки WiFi устройство должно быть в режиме сопряжения
    </Text>

    <View style={styles.instructionsList}>
      <View style={styles.instructionItem}>
        <View style={styles.instructionNumber}>
          <Text style={styles.instructionNumberText}>1</Text>
        </View>
        <Text style={styles.instructionText}>
          Нажмите и удерживайте кнопку Reset на устройстве 5-10 секунд
        </Text>
      </View>
      <View style={styles.instructionItem}>
        <View style={styles.instructionNumber}>
          <Text style={styles.instructionNumberText}>2</Text>
        </View>
        <Text style={styles.instructionText}>
          Дождитесь голосового сообщения или мигания индикатора
        </Text>
      </View>
      <View style={styles.instructionItem}>
        <View style={styles.instructionNumber}>
          <Text style={styles.instructionNumberText}>3</Text>
        </View>
        <Text style={styles.instructionText}>Устройство создаст WiFi точку: {deviceApSsid}</Text>
      </View>
    </View>

    <TouchableOpacity style={styles.primaryButton} onPress={onNext}>
      <Text style={styles.primaryButtonText}>Устройство готово</Text>
    </TouchableOpacity>
  </View>
);
