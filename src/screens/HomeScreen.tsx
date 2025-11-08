import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  Home: undefined;
  Auth: undefined;
  AdminPanel: undefined;
};

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

const { width } = Dimensions.get('window');
const isTablet = width > 600;

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const handleLoginPress = () => {
    navigation.navigate('Auth');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Заголовок приложения */}
        <View style={styles.headerContainer}>
          <Text style={[styles.title, isTablet && styles.titleTablet]}>
            AlashCloud
          </Text>
          <Text style={[styles.subtitle, isTablet && styles.subtitleTablet]}>
            Административная панель
          </Text>
        </View>

        {/* Главная кнопка */}
        <TouchableOpacity
          onPress={handleLoginPress}
          style={[styles.loginButton, isTablet && styles.loginButtonTablet]}
          accessibilityLabel="Войти в панель администратора"
          accessibilityRole="button"
        >
          <Text style={[styles.buttonText, isTablet && styles.buttonTextTablet]}>
            Войти в панель
          </Text>
        </TouchableOpacity>

        {/* Дополнительная информация */}
        <View style={styles.infoContainer}>
          <Text style={[styles.infoText, isTablet && styles.infoTextTablet]}>
            Для доступа требуется PIN-код
          </Text>
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
  headerContainer: {
    marginBottom: 48,
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
    textAlign: 'center',
  },
  titleTablet: {
    fontSize: 48,
  },
  subtitle: {
    fontSize: 18,
    color: '#64748b',
    textAlign: 'center',
  },
  subtitleTablet: {
    fontSize: 24,
  },
  loginButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 32,
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
    minWidth: 200,
  },
  loginButtonTablet: {
    paddingHorizontal: 48,
    paddingVertical: 24,
    minWidth: 300,
  },
  buttonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonTextTablet: {
    fontSize: 24,
  },
  infoContainer: {
    marginTop: 64,
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  infoTextTablet: {
    fontSize: 16,
  },
});

export default HomeScreen;