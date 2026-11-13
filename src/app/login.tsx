import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { ApiError } from '@/lib/api';
import { login, signup, useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';

type Mode = 'login' | 'signup';

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secure?: boolean;
  email?: boolean;
  autoComplete?: 'email' | 'password' | 'new-password' | 'name';
  onSubmitEditing?: () => void;
};

function Field({ label, value, onChangeText, secure, email, autoComplete, ...rest }: FieldProps) {
  return (
    <View className="gap-1">
      <Text className="font-semibold">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secure}
        keyboardType={email ? 'email-address' : 'default'}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete={autoComplete}
        returnKeyType="next"
        placeholderTextColor="#767676"
        className="h-12 rounded-lg border border-line bg-white px-4 font-sans text-[16px] text-ink"
        {...rest}
      />
    </View>
  );
}

function describe(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === 'VALIDATION_ERROR' && Object.keys(error.fields).length) {
      return '입력한 내용을 다시 확인해 주세요.';
    }
    return error.message;
  }
  return '잠시 후 다시 시도해 주세요.';
}

/** 보호자 로그인 · 가입. Figma 에 시안이 없어 기존 화면 스타일에 맞춰 만들었다. */
export default function LoginScreen() {
  const auth = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  if (auth.status === 'signedIn') return <Redirect href="/home" />;

  const isSignup = mode === 'signup';
  const canSubmit =
    !busy &&
    email.trim() !== '' &&
    password.length >= (isSignup ? 8 : 1) &&
    (!isSignup || !!name.trim());

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setMessage(null);
    try {
      if (isSignup) {
        const result = await signup(email, password, name);
        if (result === 'CONFIRM_EMAIL') {
          setMode('login');
          setMessage({ text: '메일함에서 인증을 마친 뒤 로그인해 주세요.', error: false });
          return;
        }
      } else {
        await login(email, password);
      }
      router.replace('/home');
    } catch (error) {
      setMessage({ text: describe(error), error: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="px-6 pb-10 pt-16"
        >
          <Text className="text-[36px] font-bold leading-[47px] tracking-[-0.9px] text-black">
            HuCare
          </Text>
          <Text className="mt-2 leading-[20px]">
            {isSignup ? '보호자 계정을 만들어 주세요' : '보호자 계정으로 로그인해 주세요'}
          </Text>

          <View className="mt-10 gap-4">
            {isSignup ? (
              <Field label="이름" value={name} onChangeText={setName} autoComplete="name" />
            ) : null}
            <Field
              label="이메일"
              value={email}
              onChangeText={setEmail}
              email
              autoComplete="email"
            />
            <Field
              label={isSignup ? '비밀번호 (8자 이상)' : '비밀번호'}
              value={password}
              onChangeText={setPassword}
              secure
              autoComplete={isSignup ? 'new-password' : 'password'}
              onSubmitEditing={submit}
            />
          </View>

          {message ? (
            <Text
              accessibilityLiveRegion="polite"
              className={cn('mt-4', message.error ? 'text-status-alert' : 'text-primary')}
            >
              {message.text}
            </Text>
          ) : null}

          <Button
            label={busy ? '잠시만요…' : isSignup ? '가입하기' : '로그인'}
            disabled={!canSubmit}
            onPress={submit}
            className={cn('mt-6', !canSubmit && 'opacity-50')}
          />
          <Button
            label={isSignup ? '이미 계정이 있어요' : '처음이신가요? 가입하기'}
            variant="neutral"
            disabled={busy}
            onPress={() => {
              setMode(isSignup ? 'login' : 'signup');
              setMessage(null);
            }}
            className="mt-2"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
