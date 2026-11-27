import { router } from 'expo-router';
import { useState } from 'react';

import { errorText, FlowMessage, FlowRow, FlowScreen, goBack } from '@/components/flow-screen';
import { LoadState } from '@/components/load-state';
import { setConsent, useConsents } from '@/lib/care';

/** 사진 동의를 철회할까요? (Figma 989:5122) → 철회했어요 (989:5181) */
export default function WithdrawScreen() {
  const resource = useConsents();
  const photo = resource.data?.find((item) => item.purpose === 'photo');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return (
      <FlowScreen
        title="사진 동의를 철회했어요"
        subtitle="얼굴 사진 저장 · 철회됨"
        back="/settings/privacy"
        action={{ label: '설정으로', onPress: () => router.dismissTo('/settings') }}
      >
        <FlowRow title="돌봄 기록" meta="수치와 이벤트 기록은 계속 확인할 수 있어요." />
      </FlowScreen>
    );
  }

  if (!resource.data) {
    return (
      <FlowScreen title="사진 동의 철회" back="/settings/privacy">
        <LoadState resource={resource} />
      </FlowScreen>
    );
  }

  if (photo?.granted !== true) {
    return (
      <FlowScreen
        title="사진 동의 철회"
        subtitle="얼굴 사진 저장은 선택 항목이에요."
        back="/settings/privacy"
      >
        <FlowRow title="철회할 동의가 없어요" meta="지금은 얼굴 사진을 저장하지 않아요." />
      </FlowScreen>
    );
  }

  const withdraw = async () => {
    setBusy(true);
    setError(null);
    try {
      await setConsent('photo', false);
      setDone(true);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
    }
  };

  return (
    <FlowScreen
      title="사진 동의를 철회할까요?"
      subtitle="얼굴 사진 저장은 선택 항목이에요."
      back="/settings/privacy"
      action={{ label: busy ? '철회하는 중…' : '동의 철회하기', onPress: withdraw, disabled: busy }}
    >
      <FlowRow title="철회 후" meta="새 얼굴 사진을 저장하지 않고, 저장된 사진도 지워요." />
      <FlowRow title="취소" meta="동의 유지" onPress={() => goBack('/settings/privacy')} />
      <FlowMessage text={error} />
    </FlowScreen>
  );
}
