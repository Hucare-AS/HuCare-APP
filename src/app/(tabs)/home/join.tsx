import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { BoxInput, FormMessage, Note } from '@/components/care-form';
import { errorText } from '@/components/flow-screen';
import { TabScreen } from '@/components/tab-screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { ApiError } from '@/lib/api';
import {
  acceptInvite,
  declineInvite,
  inviteInput,
  previewInvite,
  type InvitePreview,
} from '@/lib/care';
import { cn } from '@/lib/cn';

const STATUS_NOTE: Record<'accepted' | 'declined' | 'cancelled', string> = {
  accepted: '이미 수락한 초대예요.',
  declined: '이미 거절한 초대예요.',
  cancelled: '취소된 초대예요. 주 보호자에게 새 코드를 요청해주세요.',
};

/** 코드로 받은 초대는 서버가 미리 보여주지 않아 수락 화면을 코드만으로 채운다 */
const CODE_ONLY: InvitePreview = {
  subjectName: '초대받은 대상',
  subjectDetail: '수락하면 홈에 대상이 추가돼요',
  inviterName: '주 보호자',
  status: 'pending',
  expiresAt: new Date(0),
};

type Step = 'input' | 'confirm' | 'expired';

/** 만료 · 사용된 코드 (백엔드 INVITATION_UNAVAILABLE) */
const isUnavailable = (reason: unknown) =>
  reason instanceof ApiError && (reason.code === 'INVITATION_UNAVAILABLE' || reason.status === 409);

/** 초대한 사람 줄. 이름을 모르면(코드 초대) 역할만 */
const inviterText = (preview: InvitePreview) =>
  preview === CODE_ONLY ? '주 보호자' : `${preview.inviterName} · 주 보호자`;

/**
 * 06-B 초대 코드 입력 (Figma 986:5900) → 06-D 초대를 수락할까요? (986:5955),
 * 만료된 코드면 06-C 코드가 만료됐어요 (986:5927).
 * 초대 링크(/invitations/{id}?token=)로 들어오면 ?invite= 로 넘겨받아 바로 확인한다.
 */
export default function JoinScreen() {
  const { invite } = useLocalSearchParams<{ invite?: string }>();
  const [code, setCode] = useState(invite ?? '');
  const [step, setStep] = useState<Step>('input');
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const show = (found: InvitePreview | null) => {
    if (found?.status === 'expired') {
      setStep('expired');
      setCode('');
      return;
    }
    if (found && found.status !== 'pending') {
      setMessage({ text: STATUS_NOTE[found.status], error: true });
      return;
    }
    setPreview(found ?? CODE_ONLY);
    setStep('confirm');
  };

  const check = async () => {
    if (busy || !code.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      show(await previewInvite(code));
    } catch (reason) {
      setMessage({ text: errorText(reason), error: true });
    } finally {
      setBusy(false);
    }
  };

  // 초대 링크로 들어왔으면 바로 확인한다
  useEffect(() => {
    if (!invite) return;
    let alive = true;
    previewInvite(invite).then(
      (result) => alive && show(result),
      (reason) => alive && setMessage({ text: errorText(reason), error: true }),
    );
    return () => {
      alive = false;
    };
  }, [invite]);

  const accept = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await acceptInvite(code);
      router.dismissTo('/home');
    } catch (reason) {
      if (isUnavailable(reason) || (reason instanceof Error && /새 코드/.test(reason.message))) {
        setStep('expired');
        setCode('');
      } else {
        setMessage({ text: errorText(reason), error: true });
      }
    } finally {
      setBusy(false);
    }
  };

  /** 취소: 링크 초대는 거절을 기록하고, 코드 초대는 입력 화면으로 돌아간다 */
  const cancel = async () => {
    if (preview && preview !== CODE_ONLY && invite) {
      try {
        await declineInvite(code);
      } catch {
        // 거절 기록에 실패해도 화면은 돌아간다
      }
    }
    setPreview(null);
    setStep('input');
    setCode('');
    setMessage({ text: '초대를 거절했어요.', error: false });
  };

  if (step === 'confirm' && preview) {
    return (
      <TabScreen
        title="초대를 수락할까요?"
        subtitle={`${preview.subjectName}의 보호자로 초대받았어요`}
      >
        <View className="mt-4 gap-[18px] px-6">
          <InfoRow
            title="대상"
            meta={[preview.subjectName, preview.subjectDetail].filter(Boolean).join(' · ')}
          />
          <InfoRow title="초대한 사람" meta={inviterText(preview)} />
          <InfoRow title="허용된 범위" meta="상태 · 기록 · 알림 조회 및 확인" />
          <Note
            title="사진 · 영상은 별도 권한이에요"
            body="지원 기기에서 주 보호자가 허용한 경우에만 볼 수 있어요."
          />
          <FormMessage text={message?.text ?? null} error={message?.error} />
          <Button
            label={busy ? '잠시만요…' : '초대 수락'}
            disabled={busy}
            onPress={accept}
            className={cn(busy && 'opacity-50')}
          />
          <Button label="취소" variant="outline" disabled={busy} onPress={cancel} />
        </View>
      </TabScreen>
    );
  }

  const expired = step === 'expired';
  return (
    <TabScreen
      title={expired ? '코드가 만료됐어요' : '초대 코드 입력'}
      subtitle={expired ? '발급 후 유효 시간이 지났어요' : '보호자로 참여하기'}
    >
      <View className="mt-4 gap-[18px] px-6">
        {expired ? (
          <View className="gap-2 rounded-lg bg-[#FFF0F0] p-4">
            <Text className="font-semibold leading-[20px] tracking-normal text-care-red">
              새 코드가 필요해요
            </Text>
            <Text className="text-[12px] leading-[17px] tracking-normal text-care-red">
              주 보호자에게 새 초대 코드를 요청해주세요.
            </Text>
          </View>
        ) : null}
        <BoxInput
          label={expired ? '초대 코드' : inviteInput.label}
          value={code}
          onChangeText={setCode}
          placeholder={expired ? '새 코드를 입력해주세요' : inviteInput.placeholder}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!busy}
          onSubmitEditing={check}
        />
        {expired ? null : (
          <Note title="초대한 분에게 받은 코드를 입력해주세요" body={inviteInput.hint} />
        )}
        <FormMessage text={message?.text ?? null} error={message?.error} />
        <Button
          label={busy ? '잠시만요…' : expired ? '다시 확인' : '초대 확인'}
          disabled={busy || !code.trim()}
          onPress={check}
          className={cn((busy || !code.trim()) && 'opacity-50')}
        />
        {expired ? (
          <Button
            label="이전 화면"
            variant="outline"
            onPress={() => {
              setStep('input');
              setMessage(null);
            }}
          />
        ) : null}
      </View>
    </TabScreen>
  );
}

/** HC/row (Figma 950:287): 제목 15px + 설명 12px */
function InfoRow({ title, meta }: { title: string; meta: string }) {
  return (
    <View className="gap-[5px] py-[10px]">
      <Text className="text-[15px] font-semibold leading-[22px] tracking-normal">{title}</Text>
      <Text className="text-[12px] leading-[17px] tracking-normal text-muted">{meta}</Text>
    </View>
  );
}
