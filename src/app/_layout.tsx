import '../global.css';

import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import Head from 'expo-router/head';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// 디자인이 라이트 테마 단일이므로 시스템 다크모드와 무관하게 라이트 테마를 고정한다.
const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: '#F2F3F5' },
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Head>
          <title>HuCare</title>
        </Head>
        <ThemeProvider value={theme}>
          <Stack screenOptions={{ headerShown: false }} />
          <StatusBar style="dark" />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
