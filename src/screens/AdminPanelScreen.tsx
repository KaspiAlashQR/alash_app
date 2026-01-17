import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Sound from 'react-native-sound';
import { RootStackParamList } from '../utils/navigation.types';

type AdminPanelScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AdminPanel'>;

interface AdminPanelScreenProps {
  navigation: AdminPanelScreenNavigationProp;
}

const { width } = Dimensions.get('window');
const isTablet = width > 600;

const AdminPanelScreen: React.FC<AdminPanelScreenProps> = ({ navigation }) => {
  const handleLogout = async () => {
    navigation.navigate('Home');
  };

  const playUnlockSignal = () => {
    const unlockSound = new Sound('unlock_signal.wav', Sound.MAIN_BUNDLE, (error) => {
      if (error) {
        console.log('Failed to load sound', error);
        return;
      }
      unlockSound.play((success) => {
        if (success) {
          console.log('Unlock signal played successfully');
        } else {
          console.log('Unlock signal playback failed');
        }
        unlockSound.release();
      });
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#fff' }] }>
      <View style={styles.navHeader}>
        <Text style={[styles.logoText, isTablet && styles.logoTextTablet]}>
          GoMarket Admin
        </Text>

        <View style={styles.headerButtons}>
          <TouchableOpacity
            onPress={playUnlockSignal}
            style={[styles.unlockButton, isTablet && styles.unlockButtonTablet]}
          >
            <Text style={[styles.unlockButtonText, isTablet && styles.unlockButtonTextTablet]}>
              Открыть замок
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLogout}
            style={[styles.logoutButton, isTablet && styles.logoutButtonTablet]}
          >
            <Text style={[styles.logoutButtonText, isTablet && styles.logoutButtonTextTablet]}>
              Выйти
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.contentContainer} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  navHeader: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
    marginBottom: 8,
  },
  logoText: {
    color: '#22223b',
    fontSize: 28,
    fontWeight: '700',
    flex: 1,
    letterSpacing: 0.2,
    textAlign: 'left',
  },
  logoTextTablet: {
    fontSize: 24,
  },
  logoutButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#3b82f6',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  logoutButtonTablet: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
    letterSpacing: 0.2,
  },
  logoutButtonTextTablet: {
    fontSize: 16,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  unlockButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#10b981',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  unlockButtonTablet: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  unlockButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  unlockButtonTextTablet: {
    fontSize: 18,
  },
  contentContainer: {
    flex: 1,
  },
});

export default AdminPanelScreen;