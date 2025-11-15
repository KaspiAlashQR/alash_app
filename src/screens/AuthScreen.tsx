import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { KioskModule } from '../utils/KioskModule';

type RootStackParamList = {
  Home: undefined;
  Auth: undefined;
  AdminPanel: undefined;
};

type AuthScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Auth'>;

interface AuthScreenProps {
  navigation: AuthScreenNavigationProp;
}

const CORRECT_PIN = '202501';
const { width } = Dimensions.get('window');
const isTablet = width > 600;

const AuthScreen: React.FC<AuthScreenProps> = ({ navigation }) => {
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handlePinChange = (value: string) => {
    // Разрешаем только цифры и ограничиваем длину
    const numericValue = value.replace(/[^0-9]/g, '');
    if (numericValue.length <= 6) {
      setPin(numericValue);
    }
  };

  const handleSubmit = async () => {
    if (pin.length === 0) {
      Alert.alert('Ошибка', 'Введите PIN-код');
      return;
    }

    setIsLoading(true);

    setTimeout(async () => {
      if (pin === CORRECT_PIN) {
        try {
          if (Platform.OS === 'android') {
            await KioskModule.disableKioskMode();
            console.log('Киоск режим отключен для админки');
          }
          setIsLoading(false);
          navigation.navigate('AdminPanel');
        } catch (error) {
          console.warn('Ошибка отключения киоск режима:', error);
          setIsLoading(false);
          navigation.navigate('AdminPanel');
        }
      } else {
        setIsLoading(false);
        Alert.alert(
          'Ошибка авторизации', 
          'Неверный PIN-код. Попробуйте еще раз.',
          [{ text: 'OK', onPress: () => setPin('') }]
        );
      }
    }, 500);
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, isTablet && styles.inputLabelTablet]}>
            PIN-код
          </Text>
          <TextInput
            style={[styles.input, isTablet && styles.inputTablet]}
            value={pin}
            onChangeText={handlePinChange}
            keyboardType="numeric"
            secureTextEntry
            placeholder="••••••••••••"
            placeholderTextColor="#9ca3af"
            maxLength={6}
            accessibilityLabel="Поле ввода PIN-кода"
            editable={!isLoading}
          />

        </View>

        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isLoading || pin.length === 0}
            style={[
              styles.submitButton,
              isTablet && styles.submitButtonTablet,
              (isLoading || pin.length === 0) && styles.disabledButton
            ]}
            accessibilityLabel="Войти в систему"
            accessibilityRole="button"
          >
            <Text style={[styles.submitButtonText, isTablet && styles.submitButtonTextTablet]}>
              {isLoading ? 'Проверка...' : 'Войти'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleGoBack}
            disabled={isLoading}
            style={[styles.backButton, isTablet && styles.backButtonTablet]}
            accessibilityLabel="Вернуться назад"
            accessibilityRole="button"
          >
            <Text style={[styles.backButtonText, isTablet && styles.backButtonTextTablet]}>
              Назад
            </Text>
          </TouchableOpacity>
        </View>

        
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  inputContainer: {
    width: '100%',
    maxWidth: 400,
    marginBottom: 32,
  },
  inputLabel: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  inputLabelTablet: {
    fontSize: 20,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 20,
    textAlign: 'center',
    letterSpacing: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputTablet: {
    paddingVertical: 20,
    fontSize: 24,
  },
  inputHint: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  inputHintTablet: {
    fontSize: 16,
  },
  buttonsContainer: {
    width: '100%',
    maxWidth: 400,
    gap: 16,
  },
  submitButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonTablet: {
    paddingVertical: 20,
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  submitButtonTextTablet: {
    fontSize: 22,
  },
  backButton: {
    borderWidth: 2,
    borderColor: '#d1d5db',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: 'white',
  },
  backButtonTablet: {
    paddingVertical: 20,
  },
  backButtonText: {
    color: '#374151',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  backButtonTextTablet: {
    fontSize: 22,
  },
  hintContainer: {
    marginTop: 32,
    alignItems: 'center',
  },
  hintText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  hintTextTablet: {
    fontSize: 16,
  },
});

export default AuthScreen;