import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { styles } from '../styles';
import { WizardState } from '../types';

interface Props {
  state: WizardState;
  onUpdateDeviceInfo: (field: 'deviceSn' | 'deviceCode', value: string) => void;
  onValidate: () => void;
}

export const EnterSnStep: React.FC<Props> = ({ state, onUpdateDeviceInfo, onValidate }) => (
  <View style={styles.stepContent}>
    <Icon name="barcode-scan" size={64} color="#2563eb" style={styles.stepIcon} />
    <Text style={styles.stepTitle}>Введите данные устройства</Text>
    <Text style={styles.stepDescription}>
      Серийный номер (SN) и код безопасности (SK) находятся на наклейке устройства
    </Text>

    <TextInput
      style={styles.input}
      placeholder="Серийный номер (SN)"
      value={state.deviceInfo.deviceSn}
      onChangeText={text => onUpdateDeviceInfo('deviceSn', text.toUpperCase())}
      autoCapitalize="characters"
      editable={!state.loading}
    />

    <TextInput
      style={styles.input}
      placeholder="Код безопасности (SC)"
      value={state.deviceInfo.deviceCode}
      onChangeText={text => onUpdateDeviceInfo('deviceCode', text)}
      autoCapitalize="characters"
      editable={!state.loading}
    />

    <TouchableOpacity
      style={[styles.primaryButton, state.loading && styles.disabledButton]}
      onPress={onValidate}
      disabled={state.loading}
    >
      {state.loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.primaryButtonText}>Далее</Text>
      )}
    </TouchableOpacity>
  </View>
);
