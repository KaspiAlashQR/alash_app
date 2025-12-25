import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Dimensions, ScrollView, Alert, Image, Platform, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { launchImageLibrary, launchCamera, ImagePickerResponse, MediaType, Asset } from 'react-native-image-picker';
import { RootStackParamList } from '../utils/navigation.types';
import { alashCloudAPI } from '../api/client';
import { deviceStorage } from '../api/storage';
import { isApiError, Category } from '../api/types';
import { API_CONFIG } from '../api/config';

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
  const [selectedCategory, setSelectedCategory] = useState<string>(product?.category || '');
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(product?.url || null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await alashCloudAPI.getCategories();
      if (response && 'categories' in response) {
        setCategories(response.categories);
      }
    } catch (error) {
      console.error('Ошибка загрузки категорий:', error);
    }
  };

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

    if (!selectedCategory.trim()) {
      Alert.alert('Ошибка', 'Выберите категорию товара');
      return;
    }

    setIsLoading(true);

    try {
      const deviceInfo = await deviceStorage.getDeviceInfo();
      if (!deviceInfo) {
        Alert.alert('Ошибка', 'Информация об устройстве не найдена');
        setIsLoading(false);
        return;
      }

      const deviceId = deviceInfo.device_id;

      let imageUrl: string | null = uploadedImageUrl;

      console.log('Selected photo before upload:', selectedPhoto);
      console.log('Uploaded image URL:', uploadedImageUrl);

      if (selectedPhoto && !uploadedImageUrl && selectedPhoto !== product?.url) {
        console.log('Uploading new image...');
        const uploadResponse = await uploadImageFile(selectedPhoto);
        if (!uploadResponse) {
          setIsLoading(false);
          return;
        }
        imageUrl = uploadResponse;
        console.log('Image uploaded successfully:', imageUrl);
      }

      if (isEditMode && product) {
        const editData = {
          device_id: deviceId,
          price_id: product.id,
          name: productName.trim(),
          amount: Number(productPrice),
          name2: productName2.trim() || productName.trim(),
          url: imageUrl,
          category: selectedCategory,
        };

        const response = await alashCloudAPI.editProduct(editData);
        
        if (response && isApiError(response)) {
          Alert.alert('Ошибка', response.error);
          return;
        }
      } else {
        const productData = {
          device_id: deviceId,
          name: productName.trim(),
          amount: Number(productPrice),
          name2: productName2.trim() || productName.trim(),
          url: imageUrl,
          category: selectedCategory,
        };

        const response = await alashCloudAPI.addProduct(productData);
        
        if (response && isApiError(response)) {
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

  const uploadImageFile = async (fileUri: string): Promise<string | null> => {
    try {
      console.log('uploadImageFile called with:', fileUri);
      
      const formData = new FormData();
      
      const fileName = fileUri.split('/').pop() || 'photo.jpg';
      const fileType = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';
      
      formData.append('file', {
        uri: fileUri,
        type: fileType,
        name: fileName,
      } as any);

      console.log('FormData prepared:', { uri: fileUri, type: fileType, name: fileName });

      const endpoint = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.UPLOAD_IMAGE}/${API_CONFIG.SESSION_ID}`;
      
      console.log('=== DIRECT UPLOAD IMAGE REQUEST ===');
      console.log('URL:', endpoint);
      console.log('File:', { uri: fileUri, type: fileType, name: fileName });
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_CONFIG.TOKEN}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      console.log('=== DIRECT UPLOAD IMAGE RESPONSE ===');
      console.log('Status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('Error response:', errorText);
        Alert.alert('Ошибка', 'Не удалось загрузить изображение');
        return null;
      }

      const responseData = await response.json();
      console.log('Success response:', responseData);
      console.log('============================');

      if (responseData && responseData.url) {
        setUploadedImageUrl(responseData.url);
        return responseData.url;
      }

      return null;
    } catch (error) {
      console.error('Ошибка загрузки изображения:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить изображение: ' + (error instanceof Error ? error.message : 'Unknown'));
      return null;
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
    };

    launchCamera(options, (response: ImagePickerResponse) => {
      if (response.assets && response.assets[0]) {
        const asset = response.assets[0];
        console.log('Camera photo selected:', asset.uri);
        setSelectedPhoto(asset.uri || null);
        setUploadedImageUrl(null);
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
        const asset = response.assets[0];
        console.log('Gallery photo selected:', asset.uri);
        setSelectedPhoto(asset.uri || null);
        setUploadedImageUrl(null);
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

          {/* Category Selector */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isTablet && styles.labelTablet]}>
              Категория *
            </Text>
            <TouchableOpacity
              style={[styles.textInput, isTablet && styles.textInputTablet, styles.categorySelector]}
              onPress={() => setCategoryModalVisible(true)}
              disabled={isLoading}
            >
              <Text style={[selectedCategory ? styles.categoryText : styles.categoryPlaceholder]}>
                {selectedCategory || 'Выберите категорию'}
              </Text>
            </TouchableOpacity>
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

      {/* Category Modal */}
      <Modal
        visible={categoryModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCategoryModalVisible(false)}
        >
          <View style={[styles.modalContent, isTablet && styles.modalContentTablet]}>
            <Text style={[styles.modalTitle, isTablet && styles.modalTitleTablet]}>
              Выберите категорию
            </Text>
            <ScrollView style={styles.categoryList}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryItem,
                    selectedCategory === category.name && styles.categoryItemSelected
                  ]}
                  onPress={() => {
                    setSelectedCategory(category.name);
                    setCategoryModalVisible(false);
                  }}
                >
                  <Text style={[
                    styles.categoryItemText,
                    selectedCategory === category.name && styles.categoryItemTextSelected
                  ]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalCloseButton, isTablet && styles.modalCloseButtonTablet]}
              onPress={() => setCategoryModalVisible(false)}
            >
              <Text style={styles.modalCloseButtonText}>Закрыть</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  categorySelector: {
    justifyContent: 'center',
  },
  categoryText: {
    fontSize: 16,
    color: '#374151',
  },
  categoryPlaceholder: {
    fontSize: 16,
    color: '#9ca3af',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalContentTablet: {
    width: '60%',
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalTitleTablet: {
    fontSize: 24,
    marginBottom: 20,
  },
  categoryList: {
    maxHeight: 300,
  },
  categoryItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  categoryItemSelected: {
    backgroundColor: '#FFE8DC',
  },
  categoryItemText: {
    fontSize: 16,
    color: '#374151',
  },
  categoryItemTextSelected: {
    color: '#FF8A50',
    fontWeight: '600',
  },
  modalCloseButton: {
    marginTop: 16,
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseButtonTablet: {
    paddingVertical: 14,
  },
  modalCloseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
});

export default AddProductScreen;