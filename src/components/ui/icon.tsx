import type { ImageStyle } from 'expo-image';
import type { StyleProp } from 'react-native';

import { Image } from '@/components/ui/image';

/** Figma 에서 내보낸 SVG 아이콘. 색상은 파일에 고정되어 있다. */
export const icons = {
  tabHome: require('@/assets/icons/tab-home.svg'),
  tabHomeActive: require('@/assets/icons/tab-home-active.svg'),
  tabRecords: require('@/assets/icons/tab-records.svg'),
  tabRecordsActive: require('@/assets/icons/tab-records-active.svg'),
  tabAlerts: require('@/assets/icons/tab-alerts.svg'),
  tabAlertsActive: require('@/assets/icons/tab-alerts-active.svg'),
  tabSettings: require('@/assets/icons/tab-settings.svg'),
  tabSettingsActive: require('@/assets/icons/tab-settings-active.svg'),
  /** 홈 평소 상태 헤더의 종 (Figma 818:1036, 26×26) */
  bellHome: require('@/assets/icons/bell-home.svg'),
  profile: require('@/assets/icons/profile.svg'),
  phoneOrange: require('@/assets/icons/phone-orange.svg'),
  phoneWhite: require('@/assets/icons/phone-white.svg'),
  /** 홈 알림보드에서 흰 알약과 이어지는 오목한 모서리 */
  cornerSmall: require('@/assets/icons/corner-small.svg'),
  cornerTall: require('@/assets/icons/corner-tall.svg'),
  metricHeart: require('@/assets/icons/metric-heart.svg'),
  metricLungs: require('@/assets/icons/metric-lungs.svg'),
  metricAir: require('@/assets/icons/metric-air.svg'),
  metricRhythm: require('@/assets/icons/metric-rhythm.svg'),
  metricGauge: require('@/assets/icons/metric-gauge.svg'),
  metricStamina: require('@/assets/icons/metric-stamina.svg'),
  shortcutToday: require('@/assets/icons/shortcut-today.svg'),
  shortcutMonth: require('@/assets/icons/shortcut-month.svg'),
  shortcutBell: require('@/assets/icons/shortcut-bell.svg'),
  shortcutSettings: require('@/assets/icons/shortcut-settings.svg'),
  /** ∨ 방향. 회전해서 좌우 화살표로 쓴다 */
  chevronBlack: require('@/assets/icons/chevron-black.svg'),
  chevronOrange: require('@/assets/icons/chevron-orange.svg'),
  /** > 방향 (5.2×9). 90도 돌려 드롭다운 ∨ 로 쓴다 */
  selectChevron: require('@/assets/icons/select-chevron.svg'),
  /** > 방향 (6.4×10) */
  rowChevron: require('@/assets/icons/row-chevron.svg'),
} as const;

export type IconName = keyof typeof icons;

type IconProps = {
  name: IconName;
  /** 정사각형 아이콘의 한 변. width/height 를 각각 주려면 아래 두 prop 사용 */
  size?: number;
  width?: number;
  height?: number;
  style?: StyleProp<ImageStyle>;
};

export function Icon({ name, size = 24, width, height, style }: IconProps) {
  return (
    <Image
      source={icons[name]}
      contentFit="contain"
      style={[{ width: width ?? size, height: height ?? size }, style]}
    />
  );
}
