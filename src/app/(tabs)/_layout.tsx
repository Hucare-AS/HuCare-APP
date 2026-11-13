import { Redirect, Tabs } from 'expo-router';

import { TabBar } from '@/components/tab-bar';
import { useAuth } from '@/lib/auth';

export default function TabLayout() {
  const auth = useAuth();

  // 저장된 세션을 읽기 전(정적 렌더링 · 하이드레이션 중)에는 아무것도 그리지 않는다
  if (auth.status === 'unknown') return null;
  if (auth.status === 'signedOut') return <Redirect href="/login" />;

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' } }}
    >
      <Tabs.Screen name="home" options={{ title: '홈' }} />
      <Tabs.Screen name="records" options={{ title: '기록' }} />
      <Tabs.Screen name="alerts" options={{ title: '알림' }} />
      <Tabs.Screen name="settings" options={{ title: '설정' }} />
    </Tabs>
  );
}
