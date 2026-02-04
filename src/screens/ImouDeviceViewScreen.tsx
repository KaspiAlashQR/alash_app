import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ImouCameraView, ImouCameraViewRef, IMOU_STREAM_TYPE } from '../../Imou/typescript/imou';
import imouSDK from '../../Imou/typescript/imou';
import { RootStackParamList } from '../utils/navigation.types';

type ImouDeviceViewScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ImouDeviceView'>;
type ImouDeviceViewScreenRouteProp = RouteProp<RootStackParamList, 'ImouDeviceView'>;

interface Props {
  navigation: ImouDeviceViewScreenNavigationProp;
  route: ImouDeviceViewScreenRouteProp;
}

const { width } = Dimensions.get('window');
const isTablet = width > 600;

const ImouDeviceViewScreen: React.FC<Props> = ({ navigation, route }) => {
  const { deviceId, deviceName, channelId } = route.params;
  const cameraRef = useRef<ImouCameraViewRef>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string>('');
  const [playToken, setPlayToken] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [streamType, setStreamType] = useState<number>(IMOU_STREAM_TYPE.HD);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    initCamera();
  }, []);

  const initCamera = async () => {
    try {
      setLoading(true);
      setError(null);
      await imouSDK.initialize();
      const token = await imouSDK.getAccessToken();
      setAccessToken(token);
      const kitToken = await imouSDK.getKitToken(deviceId, channelId);
      setPlayToken(kitToken.kitToken);
      setLoading(false);
    } catch (err: any) {
      setError(err?.message || 'Ошибка инициализации');
      setLoading(false);
    }
  };

  const handlePlayStart = () => {
    setIsPlaying(true);
  };

  const handlePlayStop = () => {
    setIsPlaying(false);
  };

  const handleError = (err: { code?: number; error: string }) => {
    setError(err.error);
    setIsPlaying(false);
  };

  const togglePlay = () => {
    if (isPlaying) {
      cameraRef.current?.stopPreview();
    } else {
      cameraRef.current?.startPreview();
    }
  };

  const toggleStreamType = () => {
    const newType = streamType === IMOU_STREAM_TYPE.HD ? IMOU_STREAM_TYPE.SD : IMOU_STREAM_TYPE.HD;
    setStreamType(newType);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <SafeAreaView style={[styles.container, isFullscreen && styles.fullscreenContainer]}>
      {!isFullscreen && (
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {deviceName}
          </Text>
          <View style={styles.headerPlaceholder} />
        </View>
      )}

      <View style={[styles.videoContainer, isFullscreen && styles.fullscreenVideo]}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>Подключение...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Icon name="alert-circle" size={48} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={initCamera}>
              <Text style={styles.retryButtonText}>Повторить</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ImouCameraView
            ref={cameraRef}
            deviceId={deviceId}
            accessToken={accessToken}
            playToken={playToken}
            channelId={parseInt(channelId, 10)}
            streamType={streamType}
            autoPlay={true}
            style={styles.cameraView}
            onPlayStart={handlePlayStart}
            onPlayStop={handlePlayStop}
            onError={handleError}
          />
        )}

        {isFullscreen && (
          <TouchableOpacity style={styles.exitFullscreenButton} onPress={toggleFullscreen}>
            <Icon name="fullscreen-exit" size={28} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {!isFullscreen && !loading && !error && (
        <View style={styles.controlsContainer}>
          <View style={styles.controlsRow}>
            <TouchableOpacity style={styles.controlButton} onPress={togglePlay}>
              <Icon name={isPlaying ? 'pause' : 'play'} size={28} color="#374151" />
              <Text style={styles.controlLabel}>{isPlaying ? 'Пауза' : 'Играть'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={toggleStreamType}>
              <Icon name="quality-high" size={28} color="#374151" />
              <Text style={styles.controlLabel}>
                {streamType === IMOU_STREAM_TYPE.HD ? 'HD' : 'SD'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={toggleFullscreen}>
              <Icon name="fullscreen" size={28} color="#374151" />
              <Text style={styles.controlLabel}>Полный</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  fullscreenContainer: {
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: isTablet ? 20 : 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerPlaceholder: {
    width: 40,
  },
  videoContainer: {
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    borderRadius: 12,
    margin: 16,
    overflow: 'hidden',
  },
  fullscreenVideo: {
    flex: 1,
    margin: 0,
    borderRadius: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1f2937',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    padding: 24,
  },
  errorText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cameraView: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  exitFullscreenButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  controlsContainer: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  controlButton: {
    alignItems: 'center',
    padding: 12,
  },
  controlLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
});

export default ImouDeviceViewScreen;
