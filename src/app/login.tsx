import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';

import {
  AuthHeader,
  AuthSubmit,
  AuthSwitch,
  AuthTitle,
  describeAuthError,
  GOOGLE_NOT_READY,
  GoogleButton,
  PASSWORD_RULE,
  UnderlineField,
} from '@/components/auth-form';
import { Screen } from '@/components/screen';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { login, requestPasswordReset, useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';

type Message = { text: string; error: boolean } | null;

/** 로그인 (Figma 946:1159) */
export default function LoginScreen() {
  const auth = useAuth();
  const insets = useScreenInsets();
  const { notice } = useLocalSearchParams<{ notice?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(
    notice === 'confirm'
      ? { text: '메일함에서 인증을 마친 뒤 로그인해 주세요.', error: false }
      : null,
  );

  if (auth.status === 'signedIn') return <Redirect href="/home" />;

  const canSubmit = !busy && email.trim() !== '' && password !== '';

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setMessage(null);
    try {
      await login(email, password, remember);
      router.replace('/home');
    } catch (error) {
      setMessage({ text: describeAuthError(error), error: true });
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    if (!email.trim()) {
      setMessage({ text: '비밀번호를 찾을 이메일을 먼저 입력해 주세요.', error: true });
      return;
    }
    try {
      await requestPasswordReset(email);
      setMessage({
        text: '비밀번호 재설정 메일을 보냈어요. 메일함을 확인해 주세요.',
        error: false,
      });
    } catch (error) {
      setMessage({ text: describeAuthError(error), error: true });
    }
  };

  return (
    <Screen className="bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <AuthHeader />
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="grow px-[26px]"
          contentContainerStyle={{ paddingBottom: insets.bottom + 42 }}
        >
          <AuthTitle title="로그인" subtitle="계속하려면 로그인하세요" />

          <GoogleButton
            className="mt-[126px]"
            onPress={() => setMessage({ text: GOOGLE_NOT_READY, error: true })}
          />
          <Text className="mt-4 text-center text-[13px] leading-[19.5px] tracking-[-0.325px]">
            또는
          </Text>

          <View className="mt-[42px] gap-[15px]">
            <UnderlineField
              label="이메일"
              value={email}
              onChangeText={setEmail}
              placeholder="이메일을 입력해주세요"
              keyboardType="email-address"
              autoComplete="email"
              returnKeyType="next"
            />
            <View className="gap-2">
              <UnderlineField
                label="비밀번호"
                value={password}
                onChangeText={setPassword}
                placeholder="비밀번호를 입력해주세요"
                secure
                autoComplete="password"
                onSubmitEditing={submit}
              />
              <Text className="leading-[20px] tracking-normal text-muted">{PASSWORD_RULE}</Text>
            </View>
          </View>

          <View className="mt-1 flex-row items-center justify-between">
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: remember }}
              onPress={() => setRemember(!remember)}
              className="flex-row items-center gap-[11px] active:opacity-60"
            >
              {remember ? (
                <View className="h-[17px] w-[19px] items-center justify-center rounded-full bg-primary">
                  <View className="size-[7px] rounded-full bg-white" />
                </View>
              ) : (
                <Icon name="keepCircle" width={19} height={17} />
              )}
              <Text className="text-[12px] leading-[20px] tracking-[-0.5px] opacity-60">
                로그인 유지하기
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={resetPassword}
              className="active:opacity-60"
            >
              <Text className="text-[12px] leading-[20px] tracking-[-0.5px] underline opacity-60">
                비밀번호 찾기
              </Text>
            </Pressable>
          </View>

          <View className="mt-[33px]">
            <AuthSubmit
              label={busy ? '잠시만요…' : '로그인'}
              disabled={!canSubmit}
              onPress={submit}
            />
          </View>
          {message ? (
            <Text
              accessibilityLiveRegion="polite"
              className={cn(
                'mt-4 text-center',
                message.error ? 'text-status-alert' : 'text-care-green',
              )}
            >
              {message.text}
            </Text>
          ) : null}

          <View className="min-h-10 flex-1" />
          <AuthSwitch
            question="아직 계정이 없으신가요?"
            action="회원가입"
            onPress={() => router.push('/signup')}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
