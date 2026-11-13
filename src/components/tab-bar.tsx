import type { BottomTabBarProps } from 'expo-router/tabs';
import { Pressable, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { TAB_BAR_HEIGHT } from '@/constants/layout';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { cn } from '@/lib/cn';

const TAB_ICONS: Record<string, { idle: IconName; active: IconName }> = {
  home: { idle: 'tabHome', active: 'tabHomeActive' },
  records: { idle: 'tabRecords', active: 'tabRecordsActive' },
  alerts: { idle: 'tabAlerts', active: 'tabAlertsActive' },
  settings: { idle: 'tabSettings', active: 'tabSettingsActive' },
};

/** 탭 안에 중첩된 스택에서 탭바를 숨겨야 하는 화면 (탭 이름 기준) */
const HIDDEN_ON: Record<string, string[]> = {
  records: ['day'],
};

/**
 * 중첩 스택(Tabs.Screen 안의 Stack)에서 현재 포커스된 화면 이름.
 * 딥링크로 바로 들어온 첫 렌더에서는 nested state 가 아직 "stale" 상태라
 * index 없이 routes 만 채워져 있으므로, 그 경우 마지막 route 를 포커스로 간주한다.
 */
function getFocusedChildName(route: BottomTabBarProps['state']['routes'][number]) {
  const nested = route.state as { index?: number; routes: { name: string }[] } | undefined;
  if (!nested?.routes.length) return undefined;
  return nested.routes[nested.index ?? nested.routes.length - 1]?.name;
}

/**
 * Figma 하단 탭바: 흰 배경 · 상단 16px 라운드 · 그림자.
 * 화면 위에 겹쳐지므로(absolute) 탭 화면은 TAB_BAR_HEIGHT 만큼 하단 여백을 둔다.
 */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useScreenInsets();

  const focusedRoute = state.routes[state.index];
  const focusedChildName = getFocusedChildName(focusedRoute);
  if (focusedChildName && HIDDEN_ON[focusedRoute.name]?.includes(focusedChildName)) {
    return null;
  }

  return (
    <View className="absolute bottom-0 left-0 right-0 items-center">
      <View
        className="w-full max-w-screen rounded-t-2xl bg-white shadow-tabbar"
        style={{ paddingBottom: insets.bottom }}
      >
        <View
          className="flex-row items-start justify-between px-9 pt-[5px]"
          style={{ height: TAB_BAR_HEIGHT }}
        >
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const label = String(options.title ?? route.name);
            const focused = state.index === index;
            const icon = TAB_ICONS[route.name];

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            return (
              <Pressable
                key={route.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={label}
                onPress={onPress}
                className="size-[60px] items-center pt-[9px] active:opacity-60"
              >
                {icon ? <Icon name={focused ? icon.active : icon.idle} /> : null}
                <Text
                  className={cn('mt-[4px] font-semibold leading-[18px]', focused && 'text-primary')}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
