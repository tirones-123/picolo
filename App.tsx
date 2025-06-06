import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import { useFonts, Montserrat_400Regular, Montserrat_800ExtraBold } from '@expo-google-fonts/montserrat';
import { Text, Platform } from 'react-native';
import Superwall from '@superwall/react-native-superwall';
import { showPaywall } from './src/utils/superwall';

import Navigation from './src/navigation';
import { useGameStore } from './src/store/useGameStore';
import { initRC } from './src/utils/revenueCat';
import { trackAppOpen } from './src/utils/analytics';

// Initialize Sentry
const SENTRY_DSN = Constants.expoConfig?.extra?.SENTRY_DSN as string;
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    enableAutoSessionTracking: true,
    // Debug only in development
    debug: __DEV__,
  });
}

export default function App() {
  // Load Montserrat fonts
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_800ExtraBold,
    'FugazOne-Regular': require('./assets/fonts/FugazOne-Regular.ttf'),
  });

  // Set default font for all Text components once fonts are loaded
  if (fontsLoaded && !(Text as any)._hasSetDefaultFont) {
    const TextAny = Text as any;
    TextAny._hasSetDefaultFont = true;
    TextAny.defaultProps = {
      ...(TextAny.defaultProps || {}),
      style: [{ fontFamily: 'Montserrat_400Regular' }, (TextAny.defaultProps?.style || {})],
    };
  }

  // Get setPremium function from store
  const setPremium = useGameStore(state => state.setPremium);
  const premium = useGameStore(state => state.premium);
  
  // Initialize RevenueCat and track app open
  useEffect(() => {
    // Initialize RevenueCat
    initRC(setPremium).catch(error => {
      console.error('Failed to initialize RevenueCat:', error);
      Sentry.captureException(error);
    });
    
    // Initialize Superwall
    const superwallKey = Platform.OS === 'ios'
      ? (Constants.expoConfig?.extra?.SUPERWALL_KEY_IOS as string | undefined)
      : (Constants.expoConfig?.extra?.SUPERWALL_KEY_ANDROID as string | undefined);

    if (superwallKey) {
      try {
        Superwall.configure({ apiKey: superwallKey });
      } catch (e) {
        console.error('Failed to configure Superwall:', e);
        Sentry.captureException(e as Error);
      }
    } else if (__DEV__) {
      console.warn('[Superwall] API key not provided – skipping initialization.');
    }
    
    (async () => {
      // Le paywall « app_open » est maintenant géré via le placement automatique
      // « session_start » depuis le dashboard Superwall ; on ne déclenche plus
      // manuellement de paywall ici.
    })();

    trackAppOpen();
  }, [setPremium, premium]);
  
  if (!fontsLoaded) {
    // You can replace null with a splash screen if desired
    return null;
  }

  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <StatusBar style="light" />
      <Navigation />
    </SafeAreaProvider>
  );
}; 