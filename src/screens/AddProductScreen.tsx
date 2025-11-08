import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Dimensions, ScrollView, Alert, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { launchImageLibrary, launchCamera, ImagePickerResponse, MediaType } from 'react-native-image-picker';

type RootStackParamList = {
  Home: undefined;
  Auth: undefined;
  AdminPanel: undefined;
  AddProduct: undefined;
};

type AddProductScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AddProduct'>;

interface AddProductScreenProps {
  navigation: AddProductScreenNavigationProp;
}

const { width } = Dimensions.get('window');
const isTablet = width > 600;

const AddProductScreen: React.FC<AddProductScreenProps> = ({ navigation }) => {
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const handleCancel = () => {
    navigation.goBack();
  };

  const handleSave = () => {
    // Пока просто возвращаемся назад (фиктивное сохранение)
    navigation.goBack();
  };

  const handleSelectPhoto = () => {
    Alert.alert(
      'Выбор фото',
      'Выберите источник фото',
      [
        { 
          text: 'Камера', 
          onPress: () => openCamera() 
        },
        { 
          text: 'Галерея', 
          onPress: () => openGallery() 
        },
        { text: 'Отмена', style: 'cancel' },
      ]
    );
  };

  const openCamera = () => {
    const options = {
      mediaType: 'photo' as MediaType,
      quality: 0.8 as const,
      maxWidth: 800,
      maxHeight: 800,
    };

    launchCamera(options, (response: ImagePickerResponse) => {
      if (response.assets && response.assets[0]) {
        setSelectedPhoto(response.assets[0].uri || null);
      } else if (response.errorMessage) {
        Alert.alert('Ошибка', response.errorMessage);
      }
    });
  };

  const openGallery = () => {
    const options = {
      mediaType: 'photo' as MediaType,
      quality: 0.8 as const,
      maxWidth: 800,
      maxHeight: 800,
    };

    launchImageLibrary(options, (response: ImagePickerResponse) => {
      if (response.assets && response.assets[0]) {
        setSelectedPhoto(response.assets[0].uri || null);
      } else if (response.errorMessage) {
        Alert.alert('Ошибка', response.errorMessage);
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, isTablet && styles.headerTitleTablet]}>
            Добавить товар
          </Text>
        </View>

        {/* Form Content */}
        <View style={styles.formContainer}>
          {/* Photo Section */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet]}>
              Фото товара
            </Text>
            <TouchableOpacity 
              style={[styles.photoPlaceholder, isTablet && styles.photoPlaceholderTablet]}
              onPress={handleSelectPhoto}
            >
              {selectedPhoto ? (
                <Image 
                  source={{ uri: selectedPhoto }} 
                  style={styles.selectedImage}
                  resizeMode="cover"
                />
              ) : (
                <Text style={[styles.photoText, isTablet && styles.photoTextTablet]}>
                  📷 Выбрать фото
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Product Name */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet]}>
              Название товара
            </Text>
            <TextInput
              style={[styles.textInput, isTablet && styles.textInputTablet]}
              value={productName}
              onChangeText={setProductName}
              placeholder="Введите название товара"
              placeholderTextColor="#9ca3af"
            />
          </View>

          {/* Product Price */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet]}>
              Цена за единицу (₸)
            </Text>
            <TextInput
              style={[styles.textInput, isTablet && styles.textInputTablet]}
              value={productPrice}
              onChangeText={setProductPrice}
              placeholder="Введите цену"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
            />
          </View>

          {/* Buttons */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              onPress={handleSave}
              style={[styles.saveButton, isTablet && styles.saveButtonTablet]}
            >
              <Text style={[styles.saveButtonText, isTablet && styles.saveButtonTextTablet]}>
                Сохранить
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleCancel}
              style={[styles.cancelButton, isTablet && styles.cancelButtonTablet]}
            >
              <Text style={[styles.cancelButtonText, isTablet && styles.cancelButtonTextTablet]}>
                Отмена
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerTitleTablet: {
    fontSize: 32,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 24,
    maxWidth: isTablet ? 600 : '100%', // Ограничиваем ширину формы
    alignSelf: 'center',
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  labelTablet: {
    fontSize: 18,
  },
  photoPlaceholder: {
    backgroundColor: '#f3f4f6',
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    borderRadius: 12,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  photoPlaceholderTablet: {
    height: 120,
  },
  selectedImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  photoText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  photoTextTablet: {
    fontSize: 18,
  },
  textInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#374151',
  },
  textInputTablet: {
    paddingVertical: 14,
    fontSize: 18,
  },
  buttonsContainer: {
    marginTop: 24,
    gap: 12,
  },
  saveButton: {
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonTablet: {
    paddingVertical: 16,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  saveButtonTextTablet: {
    fontSize: 18,
  },
  cancelButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingVertical: 14,
    borderRadius: 8,
  },
  cancelButtonTablet: {
    paddingVertical: 16,
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  cancelButtonTextTablet: {
    fontSize: 18,
  },
});

export default AddProductScreen;