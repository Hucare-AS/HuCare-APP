import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { BoxInput, FormMessage, Note } from '@/components/care-form';
import { TabScreen } from '@/components/tab-screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import {
  acceptInvite,
  declineInvite,
  formatDate,
  formatTime,
  inviteInput,
  previewInvite,
  type InvitePreview,
} from '@/lib/care';
import { cn } from '@/lib/cn';

const STATUS_NOTE: Record<Exclude<InvitePreview['status'], 'pending'>, string> = {
  accepted: '이미 수락한 초대예요.',
  declined: '이미 거절한 초대예요.',
  expired: '만료된 초대예요. 초대한 분에게 새 코드를 요청하세요.',
  cancelled: '취소된 초대예요.',
};

function reasonText(reason: unknown) {
  return reason instanceof Error && reason.message ? reason.message : '잠시 후 다시 시도해 주세요.';
}

/**
 * 06-B 초대 코드 입력 (Figma 976:4828) → 누가 어떤 대상에 초대했는지 확인 → 수락 · 거절.
 * 초대 링크(/invitations/{id}?token=)로 들어오면 ?invite= 로 넘겨받아 바로 확인한다.
 */
export default function JoinScreen() {
  const { invite } = useLocalSearchParams<{ invite?: string }>();
  const [code, setCode] = useState(invite ?? '');
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const check = async (value = code) => {
    if (busy || !value.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      setPreview(await previewInvite(value));
    } catch (reason) {
      setMessage({ text: reasonText(reason), error: true });
    } finally {
      setBusy(false);
    }
  };

  // 초대 링크로 들어왔으면 바로 확인한다
  useEffect(() => {
    if (!invite) return;
    let alive = true;
    previewInvite(invite).then(
      (result) => alive && setPreview(result),
      (reason) => alive && setMessage({ text: reasonText(reason), error: true }),
    );
    return () => {
      alive = false;
    };
  }, [invite]);

  const respond = async (accept: boolean) => {
    setBusy(true);
    setMessage(null);
    try {
      if (accept) {
        await acceptInvite(code);
        router.dismissTo('/home');
      } else {
        await declineInvite(code);
        setPreview(null);
        setCode('');
        setMessage({ text: '초대를 거절했어요.', error: false });
      }
    } catch (reason) {
      setMessage({ text: reasonText(reason), error: true });
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
          onChangeText={(next) => {
            setCode(next);
            setPreview(null);
          }}
          placeholder={inviteInput.placeholder}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!busy}
          onSubmitEditing={() => check()}
        />

        {preview ? (
          <View className="gap-2 rounded-lg bg-white p-4 shadow-subject">
            <Text className="text-[18px] font-semibold leading-[26px] tracking-normal">
              {preview.inviterName}님이 {preview.subjectName} 돌봄에 초대했어요
            </Text>
            <Text className="text-[12px] leading-[17px] tracking-normal text-muted">
              {preview.status === 'pending'
                ? `${formatDate(preview.expiresAt)} ${formatTime(preview.expiresAt)}까지 수락할 수 있어요.`
                : STATUS_NOTE[preview.status]}
            </Text>
          </View>
        ) : (
          <Note title="초대한 분에게 받은 코드를 입력해주세요" body={inviteInput.hint} />
        )}

        <FormMessage text={message?.text ?? null} error={message?.error} />

        {preview?.status === 'pending' ? (
          <>
            <Button
              label={busy ? '잠시만요…' : '참여하기'}
              disabled={busy}
              onPress={() => respond(true)}
              className={cn(busy && 'opacity-50')}
            />
            <Button
              label="거절하기"
              variant="outline"
              disabled={busy}
              onPress={() => respond(false)}
            />
          </>
        ) : preview ? null : (
          <Button
            label={busy ? '잠시만요…' : '초대 확인'}
            disabled={busy || !code.trim()}
            onPress={() => check()}
            className={cn((busy || !code.trim()) && 'opacity-50')}
          />
        )}
      </View>
    </TabScreen>
  );
}
