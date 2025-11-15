import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  StyleSheet, 
  Dimensions, 
  ActivityIndicator 
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
      Alert.alert('Ошибка', 'Введите ID машины');
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

        <View style={styles.header}>
          <Text style={[styles.title, isTablet && styles.titleTablet]}>
            AlashCloud
          </Text>
          <Text style={[styles.subtitle, isTablet && styles.subtitleTablet]}>
            Первичная настройка
          </Text>
        </View>


        <View style={styles.form}>
          <Text style={[styles.label, isTablet && styles.labelTablet]}>
            ID машины
          </Text>
          
          <TextInput
            style={[styles.input, isTablet && styles.inputTablet]}
            value={machineId}
            onChangeText={handleMachineIdChange}
            placeholder="Введите ID вашей машины"
            placeholderTextColor="#999"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
            editable={!isLoading}
            keyboardType="ascii-capable"
          />
          
          <Text style={[styles.hint, isTablet && styles.hintTablet]}>
            ID машины можно найти на корпусе устройства
          </Text>


          <TouchableOpacity
            style={[
              styles.submitButton,
              isTablet && styles.submitButtonTablet,
              isLoading && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={isLoading || machineId.trim().length === 0}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" size={isTablet ? "large" : "small"} />
            ) : (
              <Text style={[styles.submitButtonText, isTablet && styles.submitButtonTextTablet]}>
                Подключить машину
              </Text>
            )}
          </TouchableOpacity>
        </View>


        <View style={styles.footer}>
          <Text style={[styles.footerText, isTablet && styles.footerTextTablet]}>
            После подключения вы сможете управлять машиной через панель администратора
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A202C',
    marginBottom: 8,
  },
  titleTablet: {
    fontSize: 36,
  },
  subtitle: {
    fontSize: 16,
    color: '#718096',
  },
  subtitleTablet: {
    fontSize: 20,
  },
  form: {
    marginBottom: 48,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 12,
  },
  labelTablet: {
    fontSize: 20,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1A202C',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  inputTablet: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    fontSize: 20,
    borderRadius: 16,
  },
  hint: {
    fontSize: 14,
    color: '#718096',
    marginTop: 8,
    marginBottom: 24,
    textAlign: 'center',
  },
  hintTablet: {
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#3182CE',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  submitButtonTablet: {
    paddingVertical: 20,
    minHeight: 60,
    borderRadius: 16,
  },
  submitButtonDisabled: {
    backgroundColor: '#A0AEC0',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButtonTextTablet: {
    fontSize: 20,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 20,
  },
  footerTextTablet: {
    fontSize: 16,
    lineHeight: 24,
  },
});

export default InitialSetupScreen;