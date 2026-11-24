import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { BoxInput, FormMessage, Note } from '@/components/care-form';
import { TabScreen } from '@/components/tab-screen';
import { Button } from '@/components/ui/button';
import { inviteInput, joinByInvite } from '@/lib/care';
import { cn } from '@/lib/cn';

/** 06-B 초대 코드 입력 (Figma 976:4828) */
export default function JoinScreen() {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (busy || !code.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await joinByInvite(code);
      router.dismissTo('/home');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <TabScreen title="초대 코드 입력" subtitle="보호자로 참여하기">
      <View className="mt-4 gap-[18px] px-6">
        <BoxInput
          label={inviteInput.label}
          value={code}
          onChangeText={setCode}
          placeholder={inviteInput.placeholder}
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={submit}
        />
        <Note title="초대한 분에게 받은 코드를 입력해주세요" body={inviteInput.hint} />
        <FormMessage text={error} error />
        <Button
          label={busy ? '잠시만요…' : '초대 확인'}
          disabled={busy || !code.trim()}
          onPress={submit}
          className={cn((busy || !code.trim()) && 'opacity-50')}
        />
      </View>
    </TabScreen>
  );
}
