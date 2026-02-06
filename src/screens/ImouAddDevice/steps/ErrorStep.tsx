import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { styles } from '../styles';

interface Props {
  errorMessage: string;
  onRetry: () => void;
  onCancel: () => void;
}

export const ErrorStep: React.FC<Props> = ({ errorMessage, onRetry, onCancel }) => (
  <View style={styles.stepContent}>
    <Icon name="alert-circle" size={80} color="#ef4444" style={styles.stepIcon} />
    <Text style={styles.stepTitle}>Ошибка</Text>
    <Text style={styles.stepDescription}>{errorMessage}</Text>

    <TouchableOpacity style={styles.primaryButton} onPress={onRetry}>
      <Text style={styles.primaryButtonText}>Попробовать снова</Text>
    </TouchableOpacity>

    <TouchableOpacity style={styles.secondaryButton} onPress={onCancel}>
      <Text style={styles.secondaryButtonText}>Отмена</Text>
    </TouchableOpacity>
  </View>
);
