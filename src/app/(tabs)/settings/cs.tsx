import { useState } from 'react';

import { errorText, FlowMessage, FlowRow, FlowScreen } from '@/components/flow-screen';
import { setCsMode, useSupportState } from '@/lib/care';

/**
 * CS 모드 · 꺼짐 (Figma 989:5829) / 켜짐 (989:5883).
 * 접수한 문의에 지난 하루 동안의 기기 통신 진단을 상담 담당자가 볼 수 있게 한다 (하루 뒤 자동 만료).
 */
export default function CsScreen() {
  const { ticket, csMode } = useSupportState();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    setBusy(true);
    setError(null);
    try {
      await setCsMode(!csMode);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
    }
  };

  return (
    <FlowScreen
      title="CS 모드"
      subtitle={
        csMode ? '지원이 끝나면 모드를 꺼 주세요.' : '고객지원 안내를 받는 동안 사용해 주세요.'
      }
      back="/settings/support"
      action={{
        label: busy ? '바꾸는 중…' : csMode ? 'CS 모드 끄기' : 'CS 모드 켜기',
        onPress: toggle,
        disabled: busy || !ticket,
      }}
    >
      <FlowRow title="현재 상태" meta={csMode ? '켜짐' : '꺼짐'} />
      {ticket ? (
        <FlowRow title="공유 범위" meta="지난 하루의 기기 통신 진단 · 하루 뒤 자동으로 꺼져요." />
      ) : (
        <FlowRow
          title="문의를 먼저 접수해 주세요"
          meta="접수한 문의에만 CS 모드를 켤 수 있어요."
          href="/settings/contact"
        />
      )}
      <FlowMessage text={error} />
    </FlowScreen>
  );
}
