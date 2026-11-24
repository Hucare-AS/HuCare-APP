import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/cn';

/** 서버 오류를 화면 문장으로 */
export function describeAuthError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === 'VALIDATION_ERROR' && Object.keys(error.fields).length) {
      return '입력한 내용을 다시 확인해 주세요.';
    }
    return error.message;
  }
  return '잠시 후 다시 시도해 주세요.';
}

/** 흰 헤더 + 왼쪽 < (Figma 946:1199). 돌아갈 화면이 없으면 fallback 으로 간다 */
export function AuthHeader({ fallback }: { fallback?: '/login' }) {
  return (
    <View className="h-[57px] overflow-hidden">
      <Icon name="backHeader" width={393} height={57} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="뒤로가기"
        onPress={() => {
          if (router.canGoBack()) router.back();
          else if (fallback) router.replace(fallback);
        }}
        className="absolute bottom-0 left-0 top-0 w-[60px] active:opacity-60"
      />
    </View>
  );
}

/** 로그인 · 회원가입 제목 */
export function AuthTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View className="mt-[21px] items-center gap-[6px]">
      <Text className="text-[24px] font-medium leading-[20px] tracking-[-0.5px] text-ink">
        {title}
      </Text>
      <Text className="text-[15px] leading-[22px] tracking-[-0.375px] text-ink">{subtitle}</Text>
    </View>
  );
}

/** Google로 계속하기 (37px, 0.5px 회색 테두리) */
export function GoogleButton({ onPress, className }: { onPress: () => void; className?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Google로 계속하기"
      onPress={onPress}
      className={cn(
        'h-[37px] justify-center rounded-[4px] border-[0.5px] border-muted bg-white active:opacity-70',
        className,
      )}
    >
      <View className="absolute left-[11px]">
        <Icon name="google" width={20.4} height={18} />
      </View>
      <Text className="text-center leading-[20px] tracking-[-0.5px] text-ink">
        Google로 계속하기
      </Text>
    </Pressable>
  );
}

type UnderlineFieldProps = Omit<TextInputProps, 'secureTextEntry'> & {
  label: string;
  /** 회원가입은 SemiBold, 로그인은 Medium */
  strongLabel?: boolean;
  secure?: boolean;
  /** 비밀번호 보기 버튼 */
  reveal?: boolean;
};

/** 라벨 + 밑줄 입력칸 (Figma 946:1186) */
export function UnderlineField({
  label,
  strongLabel,
  secure,
  reveal,
  ...props
}: UnderlineFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <View className="gap-2">
      <Text
        className={cn(
          'py-px leading-[21px] text-ink',
          strongLabel ? 'font-semibold' : 'font-medium',
        )}
      >
        {label}
      </Text>
      <View className="gap-1">
        <View className="flex-row items-center">
          <TextInput
            accessibilityLabel={label}
            secureTextEntry={secure && !visible}
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor="#767676"
            className="h-[24px] flex-1 p-0 font-sans text-[14px] font-light leading-[21px] tracking-[-0.35px] text-ink outline-none"
            {...props}
          />
          {reveal ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={visible ? `${label} 숨기기` : `${label} 보기`}
              accessibilityState={{ selected: visible }}
              hitSlop={8}
              onPress={() => setVisible(!visible)}
              className={cn('active:opacity-60', !visible && 'opacity-60')}
            >
              <Icon name="eye" />
            </Pressable>
          ) : null}
        </View>
        <View className={cn('h-px bg-muted', reveal && 'mr-[48px]')} />
      </View>
    </View>
  );
}

/** 아직 계정이 없으신가요?   회원가입 */
export function AuthSwitch({
  question,
  action,
  onPress,
}: {
  question: string;
  action: string;
  onPress: () => void;
}) {
  return (
    <View className="flex-row justify-center">
      <Text className="text-[13px] font-light leading-[19.5px] tracking-[-0.325px] text-muted">
        {question}
        {'   '}
      </Text>
      <Pressable accessibilityRole="link" onPress={onPress} className="active:opacity-60">
        <Text className="text-[13px] font-semibold leading-[19.5px] tracking-[-0.325px] text-primary">
          {action}
        </Text>
      </Pressable>
    </View>
  );
}

/** 주황 46px 제출 버튼 */
export function AuthSubmit({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={cn(
        'h-[46px] items-center justify-center rounded-lg bg-primary active:opacity-70',
        disabled && 'opacity-50',
      )}
    >
      <Text className="font-semibold leading-[21px] text-white">{label}</Text>
    </Pressable>
  );
}

/** 8자 이상, 대문자 · 숫자 · 특수문자 포함 */
export const PASSWORD_RULE = '8자 이상, 대문자 포함, 숫자 포함, 특수문자 포함';

export function meetsPasswordRule(password: string) {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

/** Google 로그인은 클라이언트 ID 가 아직 없어 안내만 한다 */
export const GOOGLE_NOT_READY = 'Google 로그인은 아직 준비 중이에요. 이메일로 계속해 주세요.';
