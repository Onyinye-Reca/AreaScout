import { IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono';
import {
  SchibstedGrotesk_400Regular, SchibstedGrotesk_500Medium, SchibstedGrotesk_600SemiBold,
  SchibstedGrotesk_700Bold, SchibstedGrotesk_800ExtraBold,
} from '@expo-google-fonts/schibsted-grotesk';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../lib/auth';
import { LocationProvider } from '../lib/location';
import { SavedProvider } from '../lib/saved';
import { colors } from '../lib/theme';

SplashScreen.preventAutoHideAsync();

function Routes() {
  const { user, ready } = useAuth();
  useEffect(() => { if (ready) SplashScreen.hideAsync(); }, [ready]);
  if (!ready) return null;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SchibstedGrotesk_400Regular, SchibstedGrotesk_500Medium, SchibstedGrotesk_600SemiBold,
    SchibstedGrotesk_700Bold, SchibstedGrotesk_800ExtraBold, IBMPlexMono_500Medium,
  });
  if (!loaded) return null;
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SavedProvider>
          <LocationProvider>
            <StatusBar style="dark" />
            <Routes />
          </LocationProvider>
        </SavedProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
