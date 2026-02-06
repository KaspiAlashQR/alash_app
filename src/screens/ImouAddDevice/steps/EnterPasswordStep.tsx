import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { styles } from '../styles';

interface Props {
  ssid: string;
  password: string;
  showPassword: boolean;
  loading: boolean;
  onPasswordChange: (password: string) => void;
  onToggleShowPassword: () => void;
  onSubmit: () => void;
}

export const EnterPasswordStep: React.FC<Props> = ({
  ssid,
  password,
  showPassword,
  loading,
  onPasswordChange,
  onToggleShowPassword,
  onSubmit,
}) => (
  <View style={styles.stepContent}>
    <Icon name="lock" size={64} color="#2563eb" style={styles.stepIcon} />
    <Text style={styles.stepTitle}>Введите пароль WiFi</Text>
    <Text style={styles.stepDescription}>Сеть: {ssid}</Text>

    <View style={styles.passwordInputContainer}>
      <TextInput
        style={styles.passwordInput}
        placeholder="Пароль WiFi"
        value={password}
        onChangeText={onPasswordChange}
        secureTextEntry={!showPassword}
        editable={!loading}
      />
      <TouchableOpacity style={styles.showPasswordButton} onPress={onToggleShowPassword}>
        <Icon name={showPassword ? 'eye-off' : 'eye'} size={24} color="#6b7280" />
      </TouchableOpacity>
    </View>

    <TouchableOpacity
      style={[styles.primaryButton, loading && styles.disabledButton]}
      onPress={onSubmit}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.primaryButtonText}>Подключить</Text>
      )}
    </TouchableOpacity>
  </View>
);
