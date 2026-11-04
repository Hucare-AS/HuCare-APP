import { useEffect, useState } from 'react';
import { Animated, Platform, Pressable } from 'react-native';

const TRACK_WIDTH = 52;
const TRACK_HEIGHT = 29;
const THUMB_SIZE = 23;
const EDGE_GAP = 3;
const THUMB_TRAVEL = TRACK_WIDTH - THUMB_SIZE - EDGE_GAP * 2;

type ToggleProps = {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
};

/**
 * 52×29 토글 스위치, 23px 원 (Figma 817:315).
 * 애니메이션되는 값이라 className 대신 인라인 style로 고정한다.
 */
export function Toggle({ label, checked, onChange }: ToggleProps) {
  const [progress] = useState(() => new Animated.Value(checked ? 1 : 0));

  useEffect(() => {
    Animated.timing(progress, {
      toValue: checked ? 1 : 0,
      duration: 150,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [checked, progress]);

  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, THUMB_TRAVEL] });

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      aria-checked={checked}
      hitSlop={8}
      onPress={() => onChange(!checked)}
      style={{
        width: TRACK_WIDTH,
        height: TRACK_HEIGHT,
        borderRadius: TRACK_HEIGHT / 2,
        paddingLeft: EDGE_GAP,
        justifyContent: 'center',
        backgroundColor: checked ? '#EF7000' : '#D4D4D4',
      }}
    >
      <Animated.View
        style={{
          width: THUMB_SIZE,
          height: THUMB_SIZE,
          borderRadius: THUMB_SIZE / 2,
          backgroundColor: '#FFFFFF',
          transform: [{ translateX }],
        }}
      />
    </Pressable>
  );
}
