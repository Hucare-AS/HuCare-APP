import { router, useFocusEffect, type Href } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { CareBoard } from '@/components/care-board';
import { DetailMetricsRow, VitalsRow } from '@/components/metrics';
import { Screen } from '@/components/screen';
import { useTabBarSpace } from '@/components/tab-screen';
import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { getTodayRecord, todayTimeline, useEvents, type TimelineBar } from '@/lib/care';
import { cn } from '@/lib/cn';

const SHORTCUTS: { label: string; icon: IconName; width: number; height: number; href: Href }[] = [
  { label: '오늘 기록', icon: 'shortcutToday', width: 18.5, height: 22, href: '/records' },
  { label: '한달 기록', icon: 'shortcutMonth', width: 21, height: 22, href: '/records/month' },
  { label: '알람', icon: 'shortcutBell', width: 22, height: 22, href: '/alerts' },
  { label: '설정', icon: 'shortcutSettings', width: 24, height: 24, href: '/settings' },
];

const BAR_TONES: Record<TimelineBar['tone'], string> = {
  idle: 'bg-metric-tension/20',
  home: 'bg-status-ok',
  checked: 'bg-status-alert',
};

const HOURS = ['0시', '06시', '12시', '18시', '24시'];

function LegendDot({ label, className }: { label: string; className: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <View className={cn('size-[5px] rounded-full', className)} />
      <Text className="text-[13px] leading-[16px] tracking-normal text-black">{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const events = useEvents();
  const [expanded, setExpanded] = useState(false);
  const bottomSpace = useTabBarSpace();
  const today = getTodayRecord();
  const latest = today.measurements[today.measurements.length - 1];
  const alert = events.find((event) => !event.ack) ?? null;

  // 보드가 상태바까지 덮으므로 홈에서만 상태바 글자를 흰색으로 둔다
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, []),
  );

  return (
    <Screen top={false}>
      <ScrollView contentContainerStyle={{ paddingBottom: bottomSpace }}>
        <CareBoard alert={alert} />

        <View className="gap-6 px-6 pt-8">
          <View>
            <Text variant="section" className="text-black">
              오늘 건강
            </Text>
            <View className="gap-2">
              <VitalsRow measurement={latest} />
              {expanded ? <DetailMetricsRow /> : null}
            </View>
            <Button
              label={expanded ? '접기' : '자세한 값 더보기'}
              variant="ghost"
              accessibilityState={{ expanded }}
              onPress={() => setExpanded(!expanded)}
              className="mt-4"
            />
          </View>

          <View className="gap-1">
            <Text variant="section" className="text-black">
              바로가기
            </Text>
            <View className="flex-row justify-between px-[13px] pt-1">
              {SHORTCUTS.map((shortcut) => (
                <Pressable
                  key={shortcut.label}
                  accessibilityRole="button"
                  accessibilityLabel={shortcut.label}
                  onPress={() => router.navigate(shortcut.href)}
                  className="items-center gap-[6px] active:opacity-60"
                >
                  <View className="size-[45px] items-center justify-center rounded-lg bg-white shadow-shortcut">
                    <Icon name={shortcut.icon} width={shortcut.width} height={shortcut.height} />
                  </View>
                  <Text className="font-semibold text-black">{shortcut.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View className="gap-1">
            <Text variant="section" className="text-black">
              오늘 하루
            </Text>
            <View className="gap-2">
              <View className="h-[121px] rounded-lg bg-white px-[11px] pt-[10px]">
                <View className="h-[86px] flex-row items-end justify-center gap-px">
                  {todayTimeline.map((bar, index) => (
                    <View
                      key={index}
                      className={cn('w-3 rounded', BAR_TONES[bar.tone])}
                      style={{ height: bar.height }}
                    />
                  ))}
                </View>
                <View className="mt-1 flex-row justify-between">
                  {HOURS.map((hour) => (
                    <Text
                      key={hour}
                      className="text-[12px] font-medium leading-[17px] tracking-[-0.3px] text-muted"
                    >
                      {hour}
                    </Text>
                  ))}
                </View>
              </View>
              <View className="flex-row gap-[11px]">
                <LegendDot label="집에 계셨어요" className="bg-status-ok" />
                <LegendDot label="건강 확인됨" className="bg-status-alert" />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
