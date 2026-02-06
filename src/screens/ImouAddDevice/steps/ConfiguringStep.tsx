import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { styles } from '../styles';
import { WizardStep } from '../types';

interface Props {
  currentStep: WizardStep;
  bindingStatus: string;
  bindingProgress: number;
}

export const ConfiguringStep: React.FC<Props> = ({ currentStep, bindingStatus, bindingProgress }) => (
  <View style={styles.stepContent}>
    <ActivityIndicator size="large" color="#2563eb" style={styles.stepIcon} />
    <Text style={styles.stepTitle}>
      {currentStep === 'configuring' ? 'Настройка устройства' : 'Привязка устройства'}
    </Text>
    <Text style={styles.stepDescription}>
      {bindingStatus ||
        (currentStep === 'configuring'
          ? 'Передача настроек WiFi на устройство...'
          : 'Ожидание подключения устройства к сети...')}
    </Text>

    <View style={styles.progressBarContainer}>
      <View style={[styles.progressBar, { width: `${bindingProgress}%` }]} />
    </View>
    <Text style={styles.progressText}>{bindingProgress}%</Text>

    <Text style={styles.waitText}>
      {currentStep === 'binding'
        ? 'Устройство подключается к WiFi. Это может занять до 2 минут.'
        : 'Пожалуйста, подождите'}
    </Text>
  </View>
);
