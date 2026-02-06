import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Props, WIZARD_STEPS } from './types';
import { styles } from './styles';
import { useDeviceSetup } from './useDeviceSetup';
import {
  EnterSnStep,
  ResetDeviceStep,
  ConnectApStep,
  SelectWifiStep,
  EnterPasswordStep,
  ConfiguringStep,
  SuccessStep,
  ErrorStep,
} from './steps';

const ImouAddDeviceScreen: React.FC<Props> = ({ navigation }) => {
  const {
    state,
    updateState,
    handleBack,
    handleClose,
    validateSn,
    connectToAp,
    checkApConnection,
    loadWifiList,
    selectWifi,
    configureWifi,
    getCurrentStepIndex,
  } = useDeviceSetup(() => navigation.goBack());

  const renderStepContent = () => {
    switch (state.currentStep) {
      case 'enter_sn':
        return (
          <EnterSnStep
            state={state}
            onUpdateDeviceInfo={(field, value) =>
              updateState({ deviceInfo: { ...state.deviceInfo, [field]: value } })
            }
            onValidate={validateSn}
          />
        );

      case 'reset_device':
        return (
          <ResetDeviceStep
            deviceApSsid={state.deviceApSsid}
            onNext={() => updateState({ currentStep: 'connect_ap' })}
          />
        );

      case 'connect_ap':
        return (
          <ConnectApStep
            deviceApSsid={state.deviceApSsid}
            loading={state.loading}
            onConnect={connectToAp}
            onCheckConnection={checkApConnection}
          />
        );

      case 'select_wifi':
        return null;

      case 'enter_password':
        return (
          <EnterPasswordStep
            ssid={state.selectedWifi?.ssid || ''}
            password={state.wifiPassword}
            showPassword={state.showPassword}
            loading={state.loading}
            onPasswordChange={password => updateState({ wifiPassword: password })}
            onToggleShowPassword={() => updateState({ showPassword: !state.showPassword })}
            onSubmit={() => configureWifi()}
          />
        );

      case 'configuring':
      case 'binding':
        return (
          <ConfiguringStep
            currentStep={state.currentStep}
            bindingStatus={state.bindingStatus}
            bindingProgress={state.bindingProgress}
          />
        );

      case 'success':
        return (
          <SuccessStep
            deviceModel={state.deviceInfo.deviceModel}
            onDone={() => navigation.goBack()}
          />
        );

      case 'error':
        return (
          <ErrorStep
            errorMessage={state.errorMessage}
            onRetry={() => updateState({ currentStep: 'enter_sn', errorMessage: '' })}
            onCancel={() => navigation.goBack()}
          />
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={handleBack}>
          <Icon name="arrow-left" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Настройка камеры</Text>
        <TouchableOpacity style={styles.headerButton} onPress={handleClose}>
          <Icon name="close" size={24} color="#374151" />
        </TouchableOpacity>
      </View>

      <View style={styles.progressContainer}>
        {WIZARD_STEPS.map((step, index) => (
          <React.Fragment key={step.key}>
            <View
              style={[
                styles.progressStep,
                index <= getCurrentStepIndex() && styles.progressStepActive,
                index < getCurrentStepIndex() && styles.progressStepCompleted,
              ]}
            >
              {index < getCurrentStepIndex() ? (
                <Icon name="check" size={14} color="#fff" />
              ) : (
                <Text
                  style={[
                    styles.progressStepText,
                    index <= getCurrentStepIndex() && styles.progressStepTextActive,
                  ]}
                >
                  {step.label}
                </Text>
              )}
            </View>
            {index < WIZARD_STEPS.length - 1 && (
              <View
                style={[
                  styles.progressLine,
                  index < getCurrentStepIndex() && styles.progressLineActive,
                ]}
              />
            )}
          </React.Fragment>
        ))}
      </View>

      {state.currentStep === 'select_wifi' ? (
        <SelectWifiStep
          loading={state.loading}
          wifiList={state.wifiList}
          onSelectWifi={selectWifi}
          onRefresh={loadWifiList}
        />
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {renderStepContent()}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default ImouAddDeviceScreen;
