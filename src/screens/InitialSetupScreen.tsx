import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  StyleSheet, 
  Dimensions, 
  ActivityIndicator,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { alashCloudAPI } from '../api/client';
import { deviceStorage } from '../api/storage';

type RootStackParamList = {
  Home: undefined;
  Auth: undefined;
  AdminPanel: undefined;
  InitialSetup: undefined;
};

type InitialSetupScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'InitialSetup'>;

interface InitialSetupScreenProps {
  navigation: InitialSetupScreenNavigationProp;
}

const { width } = Dimensions.get('window');
const isTablet = width > 600;

const InitialSetupScreen: React.FC<InitialSetupScreenProps> = ({ navigation }) => {
  const [machineId, setMachineId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleMachineIdChange = (value: string) => {
    const cleanValue = value.replace(/[^a-zA-Z0-9]/g, '');
    if (cleanValue.length <= 20) {
      setMachineId(cleanValue);
    }
  };

  const handleSubmit = async () => {
    if (machineId.trim().length === 0) {
      Alert.alert('Ошибка', 'Введите ID маркета');
      return;
    }

    setIsLoading(true);

    try {
      const result = await alashCloudAPI.validateDevice(machineId.trim());
      
      if (result.isValid && result.deviceInfo) {
        await deviceStorage.saveDeviceData(result.deviceInfo);
        await deviceStorage.markFirstLaunchComplete();
        
        Alert.alert(
          'Успешно!', 
          `Устройство "${result.deviceInfo.device_name}" настроено.\n\nВы будете перенаправлены в панель администратора для завершения настройки.`,
          [
            { 
              text: 'Продолжить', 
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'AdminPanel' }],
                });
              }
            }
          ]
        );
        
      } else {
        const errorMessage = result.error || 'Устройство не найдено';
        Alert.alert('Ошибка', errorMessage);
      }
      
    } catch (error) {
      console.error('Ошибка при проверке устройства:', error);
      Alert.alert(
        'Ошибка сети', 
        'Не удалось проверить устройство. Проверьте подключение к интернету и попробуйте снова.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.formWrapper}>
          {/* Логотип в начале */}
          <Image 
            source={require('../orange.png')} 
            style={[styles.logoImage, isTablet && styles.logoImageTablet]}
            resizeMode="contain"
          />

          {/* Поле ввода */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, isTablet && styles.labelTablet]}>
              ID маркета
            </Text>
            <TextInput
              style={[styles.input, isTablet && styles.inputTablet]}
              value={machineId}
              onChangeText={handleMachineIdChange}
              placeholder="Введите ID вашего маркета"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
              editable={!isLoading}
              keyboardType="ascii-capable"
            />
          </View>

          {/* Кнопка */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                isTablet && styles.submitButtonTablet,
                (isLoading || machineId.trim().length === 0) && styles.submitButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={isLoading || machineId.trim().length === 0}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" size={isTablet ? "large" : "small"} />
              ) : (
                <Text style={[styles.submitButtonText, isTablet && styles.submitButtonTextTablet]}>
                  Подключить маркет
                </Text>
              )}
            </TouchableOpacity>
          </View>
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
  formWrapper: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    padding: 20,
    borderRadius: 12,
  },
  logoImage: {
    width: isTablet ? 200 : 150,
    height: isTablet ? 200 : 150,
    marginBottom: 0,
  },
  logoImageTablet: {
    width: 250,
    height: 250,
  },
  inputContainer: {
    width: '100%',
    maxWidth: 400,
    marginBottom: 0,
    marginTop: -50,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    textAlign: 'left',
  },
  labelTablet: {
    fontSize: 18,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 8,
  },
  inputTablet: {
    paddingVertical: 18,
    fontSize: 18,
  },
  hint: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    marginBottom: 0,
    textAlign: 'left',
  },
  hintTablet: {
    fontSize: 16,
  },
  buttonsContainer: {
    width: '100%',
    maxWidth: 400,
    marginTop: 0,
  },
  submitButton: {
    backgroundColor: '#FF8A50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF8A50',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 48,
  },
  submitButtonTablet: {
    paddingVertical: 20,
    minHeight: 60,
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButtonTextTablet: {
    fontSize: 18,
  },
});

export default InitialSetupScreen;