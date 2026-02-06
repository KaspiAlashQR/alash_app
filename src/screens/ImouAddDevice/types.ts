import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../utils/navigation.types';
import { SoftApWifiItem } from '../../../Imou/typescript/imou';

export type ImouAddDeviceScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ImouAddDevice'>;

export interface Props {
  navigation: ImouAddDeviceScreenNavigationProp;
}

export type WizardStep =
  | 'enter_sn'
  | 'reset_device'
  | 'connect_ap'
  | 'select_wifi'
  | 'enter_password'
  | 'configuring'
  | 'binding'
  | 'success'
  | 'error';

export interface DeviceInfo {
  deviceSn: string;
  deviceCode: string;
  deviceModel?: string;
  brand?: string;
}

export interface WizardState {
  currentStep: WizardStep;
  deviceInfo: DeviceInfo;
  loading: boolean;
  errorMessage: string;
  wifiList: SoftApWifiItem[];
  selectedWifi: SoftApWifiItem | null;
  wifiPassword: string;
  showPassword: boolean;
  deviceApSsid: string;
  isConnectedToAp: boolean;
  bindingProgress: number;
  bindingStatus: string;
}

export interface StepInfo {
  key: string;
  label: string;
}

export const WIZARD_STEPS: StepInfo[] = [
  { key: 'enter_sn', label: '1' },
  { key: 'reset_device', label: '2' },
  { key: 'connect_ap', label: '3' },
  { key: 'select_wifi', label: '4' },
  { key: 'configuring', label: '5' },
  { key: 'success', label: '6' },
];

export interface StepProps {
  state: WizardState;
  onUpdateState: (updates: Partial<WizardState>) => void;
  onNext: () => void;
  onBack: () => void;
}
