import { Platform } from 'react-native';
import { useSafeAreaInsets, type EdgeInsets } from 'react-native-safe-area-context';

/**
 * 웹 브라우저에는 상태바(44px)·홈 인디케이터(34px)가 없어 safe area 가 0 이 된다.
 * Figma 는 그 영역을 전제로 여백을 잡았으므로, 웹에서는 최소 여백을 보장해 준다.
 * 네이티브와 iOS PWA(standalone) 는 실제 inset 이 더 크므로 그대로 쓴다.
 */
const MIN_INSETS = Platform.select({
  web: { top: 24, bottom: 16 },
  default: { top: 0, bottom: 0 },
});

export function useScreenInsets(): EdgeInsets {
  const insets = useSafeAreaInsets();
  return {
    ...insets,
    top: Math.max(insets.top, MIN_INSETS.top),
    bottom: Math.max(insets.bottom, MIN_INSETS.bottom),
  };
}
