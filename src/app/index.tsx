import { router } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { Image } from '@/components/ui/image';
import { Text } from '@/components/ui/text';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { currentUser } from '@/lib/auth';

const SPLASH_DURATION_MS = 1500;
const logo = require('@/assets/images/hulab-logo.png');

/** 스플래시 (Figma 786:264). 잠시 보여준 뒤 로그인돼 있으면 홈, 아니면 로그인으로 이동한다. */
export default function SplashScreen() {
  const insets = useScreenInsets();

  useEffect(() => {
    const timer = setTimeout(
      () => router.replace(currentUser() ? '/home' : '/login'),
      SPLASH_DURATION_MS,
    );
    return () => clearTimeout(timer);
  }, []);

  return (
    <View className="flex-1 items-center bg-[#FCFCFC]">
      <Text className="absolute top-[27%] text-[36px] font-bold leading-[47px] tracking-[-0.9px] text-black">
        HuCare
      </Text>
      <View className="absolute" style={{ bottom: insets.bottom + 26 }}>
        <Image
          source={logo}
          accessibilityLabel="huLAB"
          contentFit="contain"
          className="h-[34px] w-[102px]"
        />
      </View>
    </View>
  );
}
