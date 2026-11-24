import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import {
  AuthHeader,
  AuthSubmit,
  AuthTitle,
  describeAuthError,
  meetsPasswordRule,
  PASSWORD_RULE,
  UnderlineField,
} from '@/components/auth-form';
import { Screen } from '@/components/screen';
import { Text } from '@/components/ui/text';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { completePasswordReset } from '@/lib/auth';
import { cn } from '@/lib/cn';

/**
 * 비밀번호 재설정 메일의 링크로 들어오는 화면 (시안 없음, 회원가입 화면 스타일을 따른다).
 * 메일 링크가 /reset-password?token_hash=... 로 오도록 Supabase 복구 메일 템플릿 설정이 필요하다.
 */
export default function ResetPasswordScreen() {
  const insets = useScreenInsets();
  const { token_hash: tokenHash } = useLocalSearchParams<{ token_hash?: string }>();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState<string | null>(
    tokenHash ? null : '메일에 있는 링크로 다시 들어와 주세요.',
  );

  const submit = async () => {
    if (busy || !tokenHash) return;
    if (!meetsPasswordRule(password)) return setMessage(`비밀번호는 ${PASSWORD_RULE}이어야 해요.`);
    if (password !== confirm) return setMessage('비밀번호 확인이 일치하지 않아요.');
    setBusy(true);
    setMessage(null);
    try {
      await completePasswordReset(tokenHash, password);
      setDone(true);
    } catch (error) {
      setMessage(describeAuthError(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen className="bg-white">
      <AuthHeader fallback="/login" />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="px-6"
        contentContainerStyle={{ paddingBottom: insets.bottom + 42 }}
      >
        <AuthTitle
          title="비밀번호 재설정"
          subtitle={done ? '새 비밀번호로 로그인하세요' : '새 비밀번호를 정해주세요'}
        />
        {done ? (
          <View className="mt-[60px]">
            <AuthSubmit label="로그인하러 가기" onPress={() => router.replace('/login')} />
          </View>
        ) : (
          <>
            <View className="mt-[60px] gap-4">
              <View className="gap-2">
                <UnderlineField
                  label="새 비밀번호"
                  strongLabel
                  value={password}
                  onChangeText={setPassword}
                  placeholder="비밀번호를 입력해주세요"
                  secure
                  reveal
                  autoComplete="new-password"
                />
                <Text className="leading-[20px] tracking-normal text-muted">{PASSWORD_RULE}</Text>
              </View>
              <UnderlineField
                label="새 비밀번호 확인"
                strongLabel
                value={confirm}
                onChangeText={setConfirm}
                placeholder="비밀번호를 재입력해주세요"
                secure
                reveal
                autoComplete="new-password"
                onSubmitEditing={submit}
              />
            </View>
            <View className="mt-[60px]">
              <AuthSubmit
                label={busy ? '잠시만요…' : '비밀번호 바꾸기'}
                disabled={busy || !tokenHash}
                onPress={submit}
              />
            </View>
          </>
        )}
        {message ? (
          <Text
            accessibilityLiveRegion="polite"
            className={cn('mt-4 text-center', 'text-status-alert')}
          >
            {message}
          </Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
