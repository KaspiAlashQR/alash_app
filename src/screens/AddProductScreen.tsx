import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Dimensions, ScrollView, Alert, Image, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { launchImageLibrary, launchCamera, ImagePickerResponse, MediaType } from 'react-native-image-picker';
import { RootStackParamList } from '../utils/navigation.types';
import { alashCloudAPI } from '../api/client';
import { deviceStorage } from '../api/storage';
import { isApiError } from '../api/types';

type AddProductScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AddProduct'>;
type AddProductScreenProps = NativeStackScreenProps<RootStackParamList, 'AddProduct'>;

const { width } = Dimensions.get('window');
const isTablet = width > 600;

const AddProductScreen: React.FC<AddProductScreenProps> = ({ navigation, route }) => {
  const { mode, product } = route.params;
  const isEditMode = mode === 'edit';
  
  const [productName, setProductName] = useState(product?.name || '');
  const [productName2, setProductName2] = useState(product?.name2 || '');
  const [productPrice, setProductPrice] = useState(product?.amount?.toString() || '');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(product?.url || null);
  const [isLoading, setIsLoading] = useState(false);

  const handleCancel = () => {
    navigation.goBack();
  };

  const handleSave = async () => {
    if (!productName.trim()) {
      Alert.alert('Ошибка', 'Введите название товара');
      return;
    }

    if (!productPrice.trim() || isNaN(Number(productPrice))) {
      Alert.alert('Ошибка', 'Введите корректную цену');
      return;
    }

    setIsLoading(true);

    try {
      const deviceInfo = await deviceStorage.getDeviceInfo();
      if (!deviceInfo) {
        Alert.alert('Ошибка', 'Информация об устройстве не найдена');
        return;
      }

      let imageData: string | null = null;
      if (selectedPhoto) {
        if (selectedPhoto.startsWith('data:')) {
          const base64Data = selectedPhoto.split(',')[1];
          imageData = base64Data;
        } else {
          imageData = null;
        }
      }

      if (isEditMode && product) {
        const editData = {
          pid: product.id,
          name: productName.trim(),
          amount: productPrice.trim(),
          pin: "",
          data: "",
          name2: productName2.trim() || productName.trim(),
          image_data: imageData,
        };

        const response = await alashCloudAPI.editProduct(editData);
        
        if (response && typeof response === 'object' && 'error' in response) {
          Alert.alert('Ошибка', response.error);
          return;
        }
      } else {
        const productData = {
          pid: deviceInfo.device_id,
          name: productName.trim(),
          amount: productPrice.trim(),
          pin: "",
          data: "",
          name2: productName2.trim() || productName.trim(),
          image_data: imageData,
        };

        const response = await alashCloudAPI.addProduct(productData);
        
        if (response && typeof response === 'object' && 'error' in response) {
          Alert.alert('Ошибка', response.error);
          return;
        }
      }

      Alert.alert(
        'Успешно!',
        `Товар "${productName}" ${isEditMode ? 'обновлен' : 'добавлен'}`,
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.goBack();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Ошибка сохранения товара:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить товар');
    } finally {
      setIsLoading(false);
    }
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
      includeBase64: true,
    };

    launchCamera(options, (response: ImagePickerResponse) => {
      if (response.assets && response.assets[0]) {
        const asset = response.assets[0];
        if (asset.base64) {
          setSelectedPhoto(`data:image/jpeg;base64,${asset.base64}`);
        } else {
          setSelectedPhoto(asset.uri || null);
        }
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
      includeBase64: true,
    };

    launchImageLibrary(options, (response: ImagePickerResponse) => {
      if (response.assets && response.assets[0]) {
        const asset = response.assets[0];
        if (asset.base64) {
          setSelectedPhoto(`data:image/jpeg;base64,${asset.base64}`);
        } else {
          setSelectedPhoto(asset.uri || null);
        }
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
            {isEditMode ? 'Редактировать товар' : 'Добавить товар'}
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
      disabled={isLoading}
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
              editable={!isLoading}
            />
          </View>

          {/* Product Name 2 */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet]}>
              Описание (название на казахском)
            </Text>
            <TextInput
              style={[styles.textInput, isTablet && styles.textInputTablet]}
              value={productName2}
              onChangeText={setProductName2}
              placeholder="Введите описание товара"
              placeholderTextColor="#9ca3af"
              editable={!isLoading}
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
              editable={!isLoading}
            />
          </View>

          {/* Buttons */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              onPress={handleSave}
              disabled={isLoading}
              style={[
                styles.saveButton, 
                isTablet && styles.saveButtonTablet,
                isLoading && styles.disabledButton
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color="white" size={isTablet ? "large" : "small"} />
              ) : (
                <Text style={[styles.saveButtonText, isTablet && styles.saveButtonTextTablet]}>
                  {isEditMode ? 'Обновить' : 'Сохранить'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleCancel}
              disabled={isLoading}
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
    backgroundColor: '#FF8A50',
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
    backgroundColor: '#FF8A50',
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
  disabledButton: {
    backgroundColor: '#9ca3af',
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