import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/cn';

type SelectProps<T extends string> = {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

/** 131×33 드롭다운 (Figma 817:401). 펼친 목록은 아래 요소 위로 겹쳐 뜬다. */
export function Select<T extends string>({ label, options, value, onChange }: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <View className={cn('relative w-[131px]', open && 'z-10')}>
      <Pressable
        accessibilityRole="combobox"
        accessibilityLabel={label}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        className="h-[33px] flex-row items-center justify-between rounded-lg border border-line bg-white pl-[13px] pr-[13px]"
      >
        <Text className="text-[15px] leading-[22px] tracking-[-0.375px]">{selected?.label}</Text>
        <Icon
          name="selectChevron"
          width={5.2}
          height={9}
          style={{ transform: [{ rotate: open ? '-90deg' : '90deg' }] }}
        />
      </Pressable>

      {open ? (
        <View className="absolute left-0 right-0 top-[37px] overflow-hidden rounded-lg border border-line bg-white">
          {options.map((option) => (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected: option.value === value }}
              onPress={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={cn(
                'h-[33px] justify-center pl-[13px] active:bg-sand',
                option.value === value && 'bg-sand',
              )}
            >
              <Text className="text-[14px]">{option.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
