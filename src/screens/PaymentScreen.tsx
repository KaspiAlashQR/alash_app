import React, { useEffect, useState, useRef } from 'react';
import { NativeModules } from 'react-native';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import Sound from 'react-native-sound';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import Svg, { Path } from 'react-native-svg';
import { RootStackParamList } from '../utils/navigation.types';
import { alashCloudAPI } from '../api/client';
import { cartService } from '../services/cartService';
// import { updateOrder } from '../api/orders';
// import { reduceStockFIFO } from '../api/stock';
// import { deviceStorage } from '../api/storage';
import { completePaidOrder, updateOrder } from '../api/orders';
import { CartItem } from '../api/types';
import PaymentSuccessContent from '../components/PaymentSuccessContent';
import { cameraSession } from '../services/cameraSession';
 
type PaymentScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Payment'>;
type PaymentScreenRouteProp = RouteProp<RootStackParamList, 'Payment'>;

interface PaymentScreenProps {
  navigation: PaymentScreenNavigationProp;
  route: PaymentScreenRouteProp;
}

const { width } = Dimensions.get('window');
const isTablet = width > 600;

const QR_SIZE = isTablet ? 320 : 260;
const POLL_INTERVAL_MS = 2000;
const TIMEOUT_MS = 2 * 60 * 1000;
const UNLOCK_TIMER_SECONDS = 15;

const KaspiLogo: React.FC<{ width?: number; height?: number }> = ({ width = 51, height = 51 }) => (
  <Svg width={width} height={height} viewBox="0 0 51 51" fill="none">
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M9.49674 0C9.66206 0 9.79716 0.129346 9.80628 0.29232L9.80677 0.309906V2.82853C9.80677 2.99378 9.67738 3.12883 9.51434 3.13794L9.49674 3.13844L3.13881 3.13838L3.13882 9.49584C3.13882 9.65519 3.0185 9.78646 2.86372 9.8038L2.84638 9.80526L2.82879 9.80575H0.310031C0.14471 9.80575 0.00961136 9.6764 0.000490783 9.51343L0 9.49584V2.83918C0 1.30673 1.21545 0.0545687 2.74059 0.00171709L2.7869 0.000483577L2.8395 0H9.49674ZM23.2957 6.66658C23.5537 6.66658 23.7642 6.87031 23.7748 7.12563L23.7752 7.14589V23.2954C23.7752 23.5534 23.5714 23.7637 23.316 23.7743L23.2957 23.7747H7.14495C6.88692 23.7747 6.6765 23.571 6.66588 23.3157L6.66546 23.2954V9.60849C6.66546 7.9934 7.92636 6.69282 9.52191 6.66697L9.57036 6.66658H23.2957ZM23.2957 26.3513C23.5442 26.3513 23.7499 26.5407 23.7732 26.7882L23.7747 26.809L23.7752 26.8306V29.4898L9.80423 29.4898V40.321H20.6363L20.6364 32.0662H23.7752V42.9802C23.7752 43.2285 23.5858 43.4342 23.3382 43.4575L23.3174 43.459L23.2957 43.4595H9.57036C7.98586 43.4595 6.71679 42.2024 6.66696 40.6133L6.66582 40.565L6.66546 40.5176V26.8306C6.66546 26.5823 6.85487 26.3767 7.10252 26.3534L7.12328 26.3519L7.14495 26.3513H23.2957ZM35.0492 40.3227L35.0492 31.7504H31.9104L31.9104 37.4652L26.3538 37.4652V42.9818L26.3542 43.0021C26.3648 43.2574 26.5752 43.4611 26.8333 43.4611H29.4926L29.4926 40.6037H34.9268L34.9268 43.4611H40.5586L40.6071 43.4607C42.2026 43.4349 43.4635 42.1343 43.4635 40.5192V34.6078H37.467V37.7463L40.3246 37.7462V40.3227H35.0492ZM2.82879 40.321C2.99411 40.321 3.12921 40.4503 3.13833 40.6133L3.13882 40.6309L3.13881 46.9883L9.33798 46.9884C9.4974 46.9884 9.62871 47.1086 9.64606 47.2634L9.64752 47.2807L9.64801 47.2983V49.8169C9.64801 49.9822 9.51861 50.1172 9.35557 50.1263L9.33798 50.1268H2.8395C1.30686 50.1268 0.0545731 48.9115 0.00171723 47.3865L0.000483618 47.3402L0 47.2876V40.6309C0 40.4657 0.129398 40.3306 0.292438 40.3215L0.310031 40.321H2.82879ZM49.8224 40.321C49.9877 40.321 50.1228 40.4503 50.1319 40.6133L50.1324 40.6309V47.2876C50.1324 48.8201 48.917 50.0722 47.3918 50.1251L47.3455 50.1263L47.2929 50.1268H40.6357C40.4704 50.1268 40.3353 49.9975 40.3261 49.8345L40.3256 49.8169V47.2983C40.3256 47.133 40.455 46.998 40.6181 46.9888L40.6357 46.9884L46.9935 46.9883L46.9936 40.6309C46.9936 40.4716 47.1139 40.3403 47.2687 40.3229L47.286 40.3215L47.3036 40.321H49.8224ZM18.5411 31.5906V38.2213H11.9096V31.5906H18.5411ZM34.8904 29.4898V26.3513H26.8333L26.813 26.3518C26.5576 26.3624 26.3538 26.5727 26.3538 26.8306V34.8872H29.4926L29.4926 29.4898L34.8904 29.4898ZM43.464 26.8104C43.4534 26.5551 43.2429 26.3513 42.9849 26.3513H40.3256L40.3255 29.2088L37.4679 29.2088V32.3473H40.6067L40.6067 29.4898L43.4644 29.4898V26.8306L43.464 26.8104ZM43.462 9.51281C43.4122 7.92367 42.1431 6.66658 40.5586 6.66658H26.8333L26.8116 6.6671L26.7908 6.66862C26.5432 6.69192 26.3538 6.89753 26.3538 7.14589V23.2954L26.3543 23.3171L26.3558 23.3379C26.3791 23.5854 26.5848 23.7747 26.8333 23.7747L29.4926 23.7747L29.4926 9.80496H40.3246V20.6362L37.7845 20.6363V23.7747L42.984 23.7747L43.0057 23.7742L43.0265 23.7727C43.2741 23.7494 43.4635 23.5438 43.4635 23.2954V9.60849L43.4632 9.56106L43.462 9.51281ZM35.2072 20.6362V23.7747H32.0684V20.6362H35.2072ZM9.80642 9.80488H20.6385V20.6361H9.80642V9.80488ZM18.5411 11.9051V18.5359H11.9096V11.9051H18.5411ZM38.2294 18.5359V11.9051H31.5979V18.5359H38.2294ZM50.1307 2.74029C50.0778 1.21533 48.8256 0 47.2929 0H40.6357L40.6181 0.000490585C40.455 0.00960747 40.3256 0.144652 40.3256 0.309906V2.82853L40.3261 2.84612L40.3276 2.86344C40.3449 3.01816 40.4763 3.13844 40.6357 3.13844L46.9935 3.13838L46.9936 9.49584L46.9941 9.51343C47.0032 9.6764 47.1383 9.80575 47.3036 9.80575H49.8224L49.84 9.80526C50.003 9.79614 50.1324 9.6611 50.1324 9.49584V2.83918L50.1319 2.78659L50.1307 2.74029Z"
      fill="#F14635"
    />
  </Svg>
);

const KaspiCenterLogo: React.FC<{ width?: number; height?: number }> = ({ width = 36, height = 35 }) => (
  <Svg width={width} height={height} viewBox="0 0 36 35" fill="none">
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M22.3468 34.4864C20.9549 34.8219 19.4991 35 18.0005 35C17.8476 35 17.6951 34.9981 17.5431 34.9945C16.9292 34.8263 16.4699 34.542 16.2265 34.1542C15.4709 32.9516 15.4531 30.2135 15.4395 27.0475L15.4333 26.1435C15.4089 22.9496 15.3892 20.1957 16.5754 19.2081C17.035 18.8275 17.6883 18.7019 18.5747 18.8382C21.9362 19.3466 22.231 21.3705 22.4918 23.1617L22.4935 23.1731L22.522 23.3722L22.6772 24.3826L22.686 24.4386C22.9927 26.3876 23.6139 30.3346 23.6139 32.4037C23.6139 32.9258 23.5674 33.3269 23.4814 33.5469C23.3384 33.8865 22.924 34.2143 22.3468 34.4864ZM27.0855 32.6104C27.7716 32.2197 28.4287 31.786 29.053 31.3131C29.1327 31.1581 29.1955 30.9719 29.2411 30.7353C29.4115 29.9134 27.3486 25.2641 26.1964 25.7893C25.3126 26.2028 25.6553 30.9534 26.5687 32.4684C26.665 32.6223 26.8623 32.6474 27.0855 32.6104ZM31.7327 28.8142C31.6372 28.768 31.4602 28.6123 31.1424 28.1436C30.8139 27.6759 27.9841 23.4019 27.9841 18.503C27.9841 17.5413 29.3962 16.0395 30.6455 14.7208L30.6627 14.7026C31.591 13.7173 32.466 12.7887 32.7898 12.0578C33.2053 11.109 32.9155 10.4462 32.4552 10.2218C32.0398 10.022 31.416 10.1678 30.9781 10.931C30.2596 12.1667 30.0288 12.3974 28.9808 13.2244C27.949 14.0501 26.3097 14.8815 26.3097 13.8055C26.3097 13.4119 26.7281 12.6809 27.1388 11.9635C27.3345 11.6217 27.5284 11.283 27.6744 10.9853C28.1347 10.0517 27.6378 9.37623 26.6875 9.37623C24.8183 9.37623 23.5772 11.7122 23.5772 12.5212C23.5772 12.9103 23.6698 13.1389 23.7659 13.3762C23.8696 13.6322 23.9774 13.8983 23.9774 14.3869C23.9774 15.3353 21.9271 16.5657 19.9963 16.5657C18.0525 16.5657 16.9623 16.1626 16.555 15.0109L16.4268 14.6356C16.4155 14.6035 16.4044 14.5716 16.3933 14.5399C15.951 13.2747 15.6257 12.3441 15.0672 11.3726C14.7703 10.8583 14.3166 10.4983 13.9189 10.1829C13.9092 10.1752 13.8996 10.1676 13.89 10.1599C13.3593 9.75561 13.0851 9.38412 13.0276 9.10636C12.9747 8.83176 12.9459 8.3135 13.8514 7.11789C14.7559 5.92922 14.8825 5.03157 14.4301 4.56822C14.2658 4.40409 13.987 4.29835 13.6278 4.29835C12.9926 4.29835 12.1114 4.62819 11.2023 5.535C10.0989 6.6443 10.3462 7.70992 10.5076 8.40533C10.553 8.6005 10.5915 8.76652 10.5915 8.89615C10.5915 9.48859 10.3322 9.82379 9.48408 10.6283C8.63081 11.4373 8.33579 12.1311 8.23777 14.9174C8.20012 16.3536 7.94242 17.1799 7.71198 17.9131C7.51173 18.5554 7.3277 19.1592 7.31796 20.0316C7.30206 20.9987 7.46596 21.6218 7.6581 22.3408C7.84473 23.0058 8.04498 23.7668 8.17221 25.0407C8.39291 27.1769 8.29165 28.9532 7.83661 30.8069L7.81422 30.9291L7.80812 30.9532C7.73294 31.2502 7.64382 31.6022 7.52386 31.7323C2.96816 28.5572 0 23.3665 0 17.5036C0 7.83743 8.05918 0 18.0005 0C27.9158 0 35.9578 7.79577 36 17.4269V17.5791C35.9812 21.8614 34.3789 25.7816 31.7327 28.8142ZM11.2221 33.7168C11.5565 33.849 11.8958 33.9717 12.2398 34.0846C12.5494 33.8238 12.7419 33.089 12.6784 31.2921C12.5879 28.7231 12.1357 25.3355 11.4321 25.374C10.673 25.4194 10.3851 29.285 10.7171 31.8643C10.8257 32.688 10.9976 33.3176 11.2221 33.7168Z"
      fill="#F14635"
    />
  </Svg>
);

const PaymentScreen: React.FC<PaymentScreenProps> = ({ navigation, route }) => {
  const { orderId, payUrl, internalOrderId, cartItems } = route.params;
  const [remaining, setRemaining] = useState(TIMEOUT_MS);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [unlockTimer, setUnlockTimer] = useState(UNLOCK_TIMER_SECONDS);
  const [signalSent, setSignalSent] = useState(false);
  const [savedCartItems, setSavedCartItems] = useState<CartItem[]>([]);
  const [showUnlockInstruction, setShowUnlockInstruction] = useState(false);
  const timerRef = useRef<number | null>(null);
  const pollRef = useRef<number | null>(null);
  const unlockTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const backgroundMusicRef = useRef<Sound | null>(null);
  const musicIntervalRef = useRef<number | null>(null);
  const unlockInstructionTimeoutRef = useRef<number | null>(null);
  const transitionTimeoutRef = useRef<number | null>(null);
  const goingHomeRef = useRef(false);
  const signalSentRef = useRef(false);
  const timerDoneRef = useRef(false);
  const paymentSuccessRef = useRef(false);
  const pollInFlightRef = useRef(false);
  const paymentProcessingRef = useRef(false);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const { hasPermission, requestPermission } = useCameraPermission();
  const frontCamera = useCameraDevice('front');

  useEffect(() => {
    const itemsToUse = cartItems && cartItems.length > 0 ? cartItems : cartService.getCart().items;
    const total = itemsToUse.reduce((sum, item) => {
      const price = item.product.selling_price || item.product.amount || 0;
      return sum + (price * item.quantity);
    }, 0);
    setPaymentAmount(total);
    setSavedCartItems(itemsToUse);
    mountedRef.current = true;
    cameraSession.begin(internalOrderId || orderId);
    const start = Date.now();

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const left = Math.max(TIMEOUT_MS - elapsed, 0);
      setRemaining(left);
      if (left <= 0) {
        clearAll();
        cameraSession.leave(internalOrderId || orderId);
        if (!paymentSuccessRef.current) {
          (async () => {
            const resp = await updateOrder(internalOrderId, { status: 'cancelled' });
            console.log('[Payment] updateOrder(cancelled) response:', JSON.stringify(resp));
            if (!resp || resp.error) {
              console.error('[Payment] updateOrder error:', resp && resp.error ? resp.error : resp);
            }
            await cartService.clearCart();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Home' }],
            });
          })();
        } else {
          console.log('[Payment] Payment already successful, skipping timeout navigation');
        }
      }
    }, 1000) as unknown as number;

    const poll = async () => {
      if (
        pollInFlightRef.current ||
        paymentProcessingRef.current ||
        paymentSuccessRef.current
      ) {
        return;
      }

      pollInFlightRef.current = true;

      try {
        const response = await alashCloudAPI.checkOrder(orderId);

        if (
          response &&
          typeof response === 'object' &&
          'error' in response
        ) {
          console.warn(
            '[Payment] checkOrder API error:',
            (response as any).error
          );
          return;
        }

        if (response !== true) {
          return;
        }

        if (
          paymentProcessingRef.current ||
          paymentSuccessRef.current
        ) {
          return;
        }

        paymentProcessingRef.current = true;
        paymentSuccessRef.current = true;
        clearAll();

        console.log(
          '[Payment] Payment confirmed. transactionId:',
          orderId
        );

        setPaymentSuccess(true);
        console.log('[Payment] unlock_requested', { orderId: internalOrderId || orderId });
        void handlePaidOrder();
        cameraSession.paid(internalOrderId || orderId);

        void (async () => {
          let completionResult: Awaited<
            ReturnType<typeof completePaidOrder>
          > | null = null;

          for (let attempt = 1; attempt <= 5; attempt += 1) {
            completionResult = await completePaidOrder(
              internalOrderId,
              orderId
            );

            if (completionResult.OK) {
              console.log(
                '[Payment] Order completed:',
                JSON.stringify(completionResult)
              );
              break;
            }

            console.error(
              `[Payment] completePaidOrder attempt ${attempt} failed:`,
              completionResult.error
            );

            if (attempt < 5) {
              await new Promise<void>(resolve => {
                setTimeout(() => resolve(), attempt * 1000);
              });
            }
          }

          if (!completionResult?.OK) {
            console.error(
              '[Payment] Order payment confirmed, but stock processing failed'
            );
          }
        })();
      } catch (err) {
        console.error('[Payment] Check order error:', err);
      } finally {
        pollInFlightRef.current = false;
      }
    };

    pollRef.current = setInterval(poll, POLL_INTERVAL_MS) as unknown as number;
    poll();

    return () => {
      cameraSession.leave(internalOrderId || orderId);
      mountedRef.current = false;
      clearAll();
      clearUnlockTimer();
      stopBackgroundMusic();
      stopCamera();
      if (unlockInstructionTimeoutRef.current) {
        clearTimeout(unlockInstructionTimeoutRef.current as any);
        unlockInstructionTimeoutRef.current = null;
      }
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current as any);
        transitionTimeoutRef.current = null;
      }
      console.log('[Payment] Component cleanup: paymentSuccess:', paymentSuccessRef.current, 'goingHome:', goingHomeRef.current);
    };

    function clearAll() {
      if (timerRef.current) {
        clearInterval(timerRef.current as any);
        timerRef.current = null;
      }
      if (pollRef.current) {
        clearInterval(pollRef.current as any);
        pollRef.current = null;
      }
    }
  }, [orderId, navigation]);

  const startCamera = async () => {
    try {

      if (!hasPermission) {
        const granted = await requestPermission();
        if (!granted) {
          console.log('[Payment] Camera permission not granted');
          return;
        }
      }

      if (!frontCamera) {
        console.log('[Payment] Front camera not found');
        return;
      }

      setIsCameraActive(true);
      console.log('[Payment] Camera enabled');
    } catch (error) {
      console.error('[Payment] Error enabling camera:', error);
    }
  };

  const stopCamera = () => {
    setIsCameraActive(false);
    console.log('[Payment] Camera disabled');
  };

  const handlePaidOrder = async () => {
    console.log('[Payment] handlePaidOrder: invoked. mounted:', mountedRef.current, 'signalSent:', signalSentRef.current, 'timerDone:', timerDoneRef.current, 'paymentSuccess:', paymentSuccessRef.current);
    if (!mountedRef.current) {
      console.log('[Payment] handlePaidOrder: component unmounted, cancelling');
      return;
    }
    console.log('[Payment] handlePaidOrder: hiding unlock instruction and starting timer');
    setShowUnlockInstruction(false);
    startUnlockTimer();
    // playUnlockSignal manages its own retry loop and will only mark signalSent=true
    // once the signal is actually confirmed (or AuxModule is unavailable / 60s timeout).
    // It never throws, so no try/catch needed here.
    console.log('[Payment] handlePaidOrder: calling playUnlockSignal');
    playUnlockSignal().then(() => {
      console.log('[Payment] handlePaidOrder: playUnlockSignal returned');
    }).catch(e => {
      // Should not happen — playUnlockSignal resolves without throwing
      console.error('[Payment] handlePaidOrder: playUnlockSignal unexpected rejection:', e);
    });
    if (!mountedRef.current) {
      console.log('[Payment] handlePaidOrder: component unmounted before playSuccessSound, skipping');
      return;
    }
    try {
      console.log('[Payment] handlePaidOrder: playing success sound');
      playSuccessSound();
    } catch (e) {
      console.error('[Payment] handlePaidOrder: playSuccessSound error:', e);
    }
  };

  const playUnlockSignal = async (): Promise<void> => {
    console.log('[Payment] playUnlockSignal: AuxModule available:', !!(NativeModules.AuxModule?.playUnlockSignal));
    console.log('[Payment] playUnlockSignal: starting camera');
    startCamera();
    console.log('[Payment] playUnlockSignal: camera started, checking AuxModule');

    if (!NativeModules.AuxModule || !NativeModules.AuxModule.playUnlockSignal) {
      console.warn('[Payment] playUnlockSignal: AuxModule unavailable, skipping signal');
      signalSentRef.current = true;
      setSignalSent(true);
      tryGoToHome();
      return;
    }

    // Retry until signal is confirmed sent, component unmounts, or safety timeout expires (60 s)
    const MAX_RETRY_MS = 60_000;
    const retryStart = Date.now();
    let attempt = 0;

    while (!signalSentRef.current && mountedRef.current) {
      if (Date.now() - retryStart > MAX_RETRY_MS) {
        console.warn('[Payment] playUnlockSignal: 60s safety timeout reached, forcing signal done');
        break;
      }
      attempt++;
      try {
        console.log(`[Payment] playUnlockSignal: attempt ${attempt}`);
        await NativeModules.AuxModule.playUnlockSignal();
        console.log('[Payment] playUnlockSignal: signal sent successfully on attempt', attempt);
        signalSentRef.current = true;
        setSignalSent(true);
        tryGoToHome();
        return;
      } catch (e) {
        console.error(`[Payment] playUnlockSignal: attempt ${attempt} failed:`, e);
        if (!mountedRef.current) break;
        console.log('[Payment] playUnlockSignal: retrying in 2s...');
        await new Promise<void>(r => setTimeout(r, 2000));
      }
    }

    if (!signalSentRef.current) {
      // Safety net: max retries exhausted or unmounted without success
      console.warn('[Payment] playUnlockSignal: exiting retry loop, forcing signal done');
      signalSentRef.current = true;
      setSignalSent(true);
      tryGoToHome();
    }
  };


  const successSoundRef = useRef<Sound | null>(null);
  const playSuccessSound = () => {
    if (successSoundRef.current) {
      successSoundRef.current.stop(() => {
        successSoundRef.current?.release();
        successSoundRef.current = null;
      });
    }
    const successSound = new Sound('apple_pay_success.mp3', Sound.MAIN_BUNDLE, (error) => {
      if (!error) {
        successSound.play(() => {
          successSound.release();
          successSoundRef.current = null;
        });
        successSoundRef.current = successSound;
      }
    });
  };

  const startBackgroundMusic = () => {

  };

  const stopBackgroundMusic = () => {
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.stop();
      backgroundMusicRef.current.release();
      backgroundMusicRef.current = null;
    }
    if (musicIntervalRef.current) {
      clearInterval(musicIntervalRef.current as any);
      musicIntervalRef.current = null;
    }
  };

  const startUnlockTimer = () => {
    console.log('[Payment] startUnlockTimer: starting for', UNLOCK_TIMER_SECONDS, 'seconds. paymentSuccess:', paymentSuccessRef.current);
    timerDoneRef.current = false;
    setUnlockTimer(UNLOCK_TIMER_SECONDS);
    unlockTimerRef.current = setInterval(() => {
      if (!mountedRef.current) {
        console.log('[Payment] startUnlockTimer: component unmounted, clearing timer');
        clearUnlockTimer();
        return;
      }
      setUnlockTimer(prev => {
        const nextVal = prev - 1;
        if (nextVal % 5 === 0 || nextVal <= 3) {
          console.log('[Payment] startUnlockTimer: countdown:', nextVal, 'seconds');
        }
        if (nextVal <= 0) {
          console.log('[Payment] startUnlockTimer: timer completed. calling tryGoToHome');
          clearUnlockTimer();
          timerDoneRef.current = true;
          tryGoToHome();
          return 0;
        }
        return nextVal;
      });
    }, 1000) as unknown as number;
    console.log('[Payment] startUnlockTimer: interval started');
  };

  const clearUnlockTimer = () => {
    if (unlockTimerRef.current) {
      clearInterval(unlockTimerRef.current as any);
      unlockTimerRef.current = null;
    }
  };

  const tryGoToHome = () => {
    console.log('[Payment] tryGoToHome: signalSent:', signalSentRef.current, 'timerDone:', timerDoneRef.current, 'goingHome:', goingHomeRef.current, 'mounted:', mountedRef.current, 'paymentSuccess:', paymentSuccessRef.current);
    if (!signalSentRef.current || !timerDoneRef.current) {
      console.log('[Payment] tryGoToHome: conditions not met, waiting...');
      return;
    }
    if (goingHomeRef.current) {
      console.log('[Payment] tryGoToHome: already transitioning, skipping');
      return;
    }
    if (!mountedRef.current) {
      console.log('[Payment] tryGoToHome: component unmounted, skipping');
      return;
    }
    if (!paymentSuccessRef.current) {
      console.log('[Payment] tryGoToHome: payment not confirmed, skipping');
      return;
    }
    goingHomeRef.current = true;
    console.log('[Payment] tryGoToHome: ALL CONDITIONS MET - transitioning to Home');
    clearUnlockTimer();
    stopBackgroundMusic();
    stopCamera();
    cartService.clearCart().catch(() => {}).finally(() => {
      if (mountedRef.current) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      }
    });
  };

  const formatTime = (ms: number) => {
    const sec = Math.ceil(ms / 1000);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleCancel = async () => {
    if (paymentSuccessRef.current) {
      console.log('[Payment] handleCancel: payment already confirmed, ignoring');
      return;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current as any);
      timerRef.current = null;
    }
    if (pollRef.current) {
      clearInterval(pollRef.current as any);
      pollRef.current = null;
    }

    cameraSession.leave(internalOrderId || orderId);
    const resp = await updateOrder(internalOrderId, { status: 'cancelled' });
    console.log('[Payment] updateOrder(cancelled) response:', JSON.stringify(resp));
    if (!resp || resp.error) {
      console.error('[Payment] updateOrder error:', resp && resp.error ? resp.error : resp);
    }

    await cartService.clearCart();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {!paymentSuccess ? (
        <View style={styles.contentWrapper}>
          <View style={styles.logoHeader}>
            <KaspiLogo width={51} height={51} />
            <Text style={styles.logoTitle}>
              Kaspi QR
            </Text>
          </View>
          
          <View style={styles.qrWrapper}>
            <QRCode
              value={payUrl}
              size={isTablet ? 220 : 180}
              backgroundColor="#fff"
              color="black"
            />
            <View style={styles.qrCenterLogo}>
              <KaspiCenterLogo width={isTablet ? 45 : 36} height={isTablet ? 44 : 35} />
            </View>
          </View>
          
          <Text style={[styles.amount, isTablet && styles.amountTablet]}>
            {paymentAmount.toLocaleString('ru-RU')} ₸
          </Text>
          
          <TouchableOpacity
            style={[styles.cancelButton, isTablet && styles.cancelButtonTablet]}
            onPress={handleCancel}
            activeOpacity={0.85}
          >
            <Text style={[styles.cancelButtonText, isTablet && styles.cancelButtonTextTablet]}>
              Отмена через {formatTime(remaining)}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <PaymentSuccessContent
          unlockTimer={unlockTimer}
          cartItems={savedCartItems}
          totalAmount={paymentAmount}
          recordOrderId={internalOrderId || orderId}
          showUnlockInstruction={showUnlockInstruction}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFFFFF' 
  },
  contentWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  logoTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A202C',
    marginLeft: 12,
  },
  qrWrapper: {
    padding: 12,
    marginVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  qrCenterLogo: {
    position: 'absolute',
    top: isTablet ? 100 : 84,
    left: isTablet ? 100 : 84,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    padding: 4,
  },
  successContent: {},
  amount: { 
    fontSize: isTablet ? 36 : 28, 
    fontWeight: 'bold', 
    color: '#1A202C',
    textAlign: 'center'
  },
  amountTablet: { 
    fontSize: 48
  },
  infoText: { 
    fontSize: isTablet ? 18 : 16, 
    color: '#4A5568', 
    textAlign: 'center',
    paddingHorizontal: 20
  },
  infoTextTablet: {
    fontSize: 20
  },
  cancelButton: { 
    paddingHorizontal: isTablet ? 32 : 24, 
    paddingVertical: isTablet ? 16 : 12, 
    borderRadius: isTablet ? 12 : 8, 
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 18,
  },
  cancelButtonTablet: {
    paddingHorizontal: 40,
    paddingVertical: 20
  },
  cancelButtonText: { 
    color: '#6B7280', 
    fontWeight: '600',
    fontSize: isTablet ? 18 : 16,
    textAlign: 'center'
  },
  cancelButtonTextTablet: {
    fontSize: 20
  },
});

export default PaymentScreen;
