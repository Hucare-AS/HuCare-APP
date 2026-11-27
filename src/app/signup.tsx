import { Redirect, router } from 'expo-router';
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
  meetsPasswordRule,
  PASSWORD_RULE,
  UnderlineField,
} from '@/components/auth-form';
import { BottomSheet } from '@/components/bottom-sheet';
import { Screen } from '@/components/screen';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { signup, useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';

type BirthPart = 'year' | 'month' | 'day';

const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: THIS_YEAR - 1919 }, (_, index) => THIS_YEAR - index);
const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

const PART = {
  year: { unit: '년', width: 'w-[90px]', title: '태어난 해' },
  month: { unit: '월', width: 'w-[70px]', title: '태어난 달' },
  day: { unit: '일', width: 'w-[70px]', title: '태어난 날' },
} as const;

/** 생년월일 드롭다운 한 칸 (Figma Utest / Birthday 328:6551) */
function BirthField({
  part,
  value,
  onPress,
}: {
  part: BirthPart;
  value: number | null;
  onPress: () => void;
}) {
  const { unit, width } = PART[part];
  return (
    <Pressable
      accessibilityRole="combobox"
      accessibilityLabel={PART[part].title}
      onPress={onPress}
      className={cn(
        'h-[35px] flex-row items-center justify-end gap-[7px] rounded-lg border border-muted bg-white pl-[10px] pr-3 active:opacity-70',
        width,
      )}
    >
      <Text className={cn('leading-[20px] tracking-normal', value ? 'text-ink' : 'text-muted')}>
        {value ? `${value}${unit}` : unit}
      </Text>
      <Icon name="birthdayChevron" width={9} height={5.5} />
    </Pressable>
  );
}

/**
 * 회원가입 (Figma 946:1250).
 * 생년월일은 가입 API 에 항목이 없어 아직 서버로 보내지 않는다.
 */
export default function SignupScreen() {
  const auth = useAuth();
  const insets = useScreenInsets();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [birth, setBirth] = useState<Record<BirthPart, number | null>>({
    year: null,
    month: null,
    day: null,
  });
  const [picking, setPicking] = useState<BirthPart | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (auth.status === 'signedIn') return <Redirect href="/home" />;

  const daysInMonth =
    birth.year && birth.month ? new Date(birth.year, birth.month, 0).getDate() : 31;
  const options = {
    year: YEARS,
    month: MONTHS,
    day: Array.from({ length: daysInMonth }, (_, index) => index + 1),
  };

  const validate = () => {
    if (!name.trim()) return '이름을 입력해 주세요.';
    if (!email.trim()) return '이메일을 입력해 주세요.';
    if (!meetsPasswordRule(password)) return `비밀번호는 ${PASSWORD_RULE}이어야 해요.`;
    if (password !== confirm) return '비밀번호 확인이 일치하지 않아요.';
    return null;
  };

  const submit = async () => {
    if (busy) return;
    const invalid = validate();
    setError(invalid);
    if (invalid) return;
    setBusy(true);
    try {
      const result = await signup(email, password, name);
      if (result === 'CONFIRM_EMAIL') {
        router.replace({ pathname: '/login', params: { notice: 'confirm' } });
      } else {
        router.replace('/home');
      }
    } catch (reason) {
      setError(describeAuthError(reason));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen className="bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <AuthHeader fallback="/login" />
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="px-6"
          contentContainerStyle={{ paddingBottom: insets.bottom + 42 }}
        >
          <AuthTitle title="회원가입" subtitle="계정을 만들어주세요" />

          <View className="mt-9 items-center gap-[19px]">
            <GoogleButton className="w-[297px]" onPress={() => setError(GOOGLE_NOT_READY)} />
            <Text className="text-[12px] leading-[18px] tracking-[-0.3px]">또는</Text>
          </View>

          <View className="mt-[19px] gap-4">
            <UnderlineField
              label="이름"
              strongLabel
              value={name}
              onChangeText={setName}
              placeholder="이름을 입력해주세요"
              autoComplete="name"
            />
            <UnderlineField
              label="이메일"
              strongLabel
              value={email}
              onChangeText={setEmail}
              placeholder="이메일을 입력해주세요"
              keyboardType="email-address"
              autoComplete="email"
            />
            <View className="gap-2">
              <UnderlineField
                label="비밀번호"
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
              label="비밀번호 확인"
              strongLabel
              value={confirm}
              onChangeText={setConfirm}
              placeholder="비밀번호를 재입력해주세요"
              secure
              reveal
              autoComplete="new-password"
            />
          </View>

          <View className="mt-[37px] gap-2">
            <Text className="py-px font-semibold leading-[21px]">생년월일</Text>
            <View className="flex-row gap-2">
              {(['year', 'month', 'day'] as const).map((part) => (
                <BirthField
                  key={part}
                  part={part}
                  value={birth[part]}
                  onPress={() => setPicking(part)}
                />
              ))}
            </View>
          </View>

          {error ? (
            <Text accessibilityLiveRegion="polite" className="mt-6 text-center text-status-alert">
              {error}
            </Text>
          ) : null}

          <View className="mt-[78px] gap-[19px]">
            <AuthSubmit label={busy ? '잠시만요…' : '회원가입'} disabled={busy} onPress={submit} />
            <AuthSwitch
              question="이미 계정이 있으신가요?"
              action="로그인"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/login'))}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomSheet visible={!!picking} onClose={() => setPicking(null)}>
        {picking ? (
          <>
            <Text className="text-[24px] font-semibold leading-[34px] tracking-[-0.6px] text-black">
              {PART[picking].title}
            </Text>
            <ScrollView className="mt-3 max-h-[320px]">
              <View className="flex-row flex-wrap gap-2">
                {options[picking].map((option) => (
                  <Pressable
                    key={option}
                    accessibilityRole="button"
                    accessibilityState={{ selected: birth[picking] === option }}
                    onPress={() => {
                      const next = { ...birth, [picking]: option };
                      // 2월 30일처럼 없는 날이 되면 일을 비운다
                      if (next.year && next.month && next.day) {
                        const last = new Date(next.year, next.month, 0).getDate();
                        if (next.day > last) next.day = null;
                      }
                      setBirth(next);
                      setPicking(null);
                    }}
                    className={cn(
                      'h-10 w-[72px] items-center justify-center rounded-lg border border-line active:bg-sand',
                      birth[picking] === option && 'border-primary bg-sand',
                    )}
                  >
                    <Text>
                      {option}
                      {PART[picking].unit}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </>
        ) : null}
      </BottomSheet>
    </Screen>
  );
}
