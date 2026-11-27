import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/cn';

type SegmentedProps<T extends string> = {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** 고른 칸 배경. 기본 주황, 추세 지표는 초록 */
  activeClassName?: string;
  /** 칸마다 덧붙일 클래스 (추세 기간은 40px 고정 폭) */
  itemClassName?: string;
};

/** 흰 바탕 위 알약 탭 (Figma 976:4814 · 975:4298 · 975:4470) */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  activeClassName = 'bg-primary',
  itemClassName,
}: SegmentedProps<T>) {
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={label}
      className="flex-row gap-1 self-start rounded-lg bg-white px-[3px] py-1"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            className={cn(
              'items-center justify-center rounded-lg px-2 py-[5px] active:opacity-70',
              selected ? activeClassName : 'bg-white',
              itemClassName,
            )}
          >
            <Text className={cn('leading-[20px]', selected ? 'text-white' : 'text-black')}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
