import type { PropsWithChildren } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/cn';

/** 흰 상자 + 작은 라벨 (Figma HC/field 950:299) */
export function FieldBox({ label, children }: PropsWithChildren<{ label: string }>) {
  return (
    <View className="gap-2 rounded-lg border border-care-line bg-white p-4">
      <Text className="text-[12px] leading-[17px] tracking-normal text-muted">{label}</Text>
      {children}
    </View>
  );
}

/** FieldBox 안에서 바로 입력하는 칸 */
export function BoxInput({ label, className, ...props }: TextInputProps & { label: string }) {
  return (
    <FieldBox label={label}>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#767676"
        className={cn(
          'p-0 font-sans text-[16px] leading-[23px] text-ink outline-none',
          className as string,
        )}
        {...props}
      />
    </FieldBox>
  );
}

/** FieldBox 를 눌러 고르는 칸 (예: 연령대 선택) */
export function BoxPicker({
  label,
  value,
  placeholder,
  onPress,
}: {
  label: string;
  value: string | null;
  placeholder: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}>
      <FieldBox label={label}>
        <Text className={cn('text-[16px] leading-[23px]', !value && 'text-muted')}>
          {value ?? placeholder}
        </Text>
      </FieldBox>
    </Pressable>
  );
}

/** 베이지 안내 상자 (Figma HC/note 950:290 · HC/info 950:296) */
export function Note({
  title,
  body,
  className,
}: {
  title: string;
  body: string;
  className?: string;
}) {
  return (
    <View className={cn('gap-2 rounded-lg bg-sand p-4', className)}>
      <Text className="font-semibold leading-[20px] tracking-normal">{title}</Text>
      <Text className="text-[12px] leading-[17px] tracking-normal">{body}</Text>
    </View>
  );
}

/** 입력 오류 · 결과 안내 한 줄 */
export function FormMessage({ text, error }: { text: string | null; error?: boolean }) {
  if (!text) return null;
  return (
    <Text
      accessibilityLiveRegion="polite"
      className={cn(error ? 'text-status-alert' : 'text-care-green')}
    >
      {text}
    </Text>
  );
}
