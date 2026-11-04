import { router } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { TAB_BAR_HEIGHT } from '@/constants/layout';
import { useScreenInsets } from '@/hooks/use-screen-insets';

/** 탭바에 가리지 않도록 스크롤 내용 끝에 둘 여백 */
export function useTabBarSpace() {
  const insets = useScreenInsets();
  return TAB_BAR_HEIGHT + insets.bottom + 24;
}

type TabScreenProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
}>;

/** 기록 · 알림 · 설정 공통 틀: HuCare 헤더 + 페이지 타이틀 + 스크롤 영역 */
export function TabScreen({ title, subtitle, children }: TabScreenProps) {
  const bottomSpace = useTabBarSpace();

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: bottomSpace }}>
        <View className="px-6 pt-1">
          <View className="h-9 flex-row items-center justify-between">
            <Text className="text-[20px] font-bold leading-[26px] tracking-[-0.5px]">HuCare</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="알림"
              onPress={() => router.navigate('/alerts')}
              className="size-9 items-center justify-center rounded-full bg-white active:opacity-60"
            >
              <Icon name="tabAlerts" />
            </Pressable>
          </View>
          <Text variant="pageTitle" className="mt-2">
            {title}
          </Text>
          {subtitle ? <Text className="mt-1 leading-[17px]">{subtitle}</Text> : null}
        </View>
        {children}
      </ScrollView>
    </Screen>
  );
}
