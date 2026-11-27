import { router } from 'expo-router';
import { useState } from 'react';

import { errorText, FlowMessage, FlowRow, FlowScreen } from '@/components/flow-screen';
import { LoadState } from '@/components/load-state';
import { useDevice } from '@/components/settings-shared';
import { unlinkDevice, useHome, useProfile } from '@/lib/care';

/** 기기 연결을 해지할까요? (Figma 989:4375) → 기기 연결을 해지했어요 (989:4434) */
export default function UnlinkScreen() {
  const { resource, device } = useDevice();
  const subject = useHome().data?.subjectLabel;
  const canManage = useProfile().data?.canManage ?? false;
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return (
      <FlowScreen
        title="기기 연결을 해지했어요"
        subtitle={subject}
        back="/settings"
        action={{ label: '설정으로', onPress: () => router.dismissTo('/settings') }}
      >
        <FlowRow title="연결된 기기 없음" meta="새 소유자에게 이전 기록이 이어지지 않아요." />
      </FlowScreen>
    );
  }

  if (!device) {
    return (
      <FlowScreen title="기기 연결 해지" back="/settings/devices">
        <LoadState resource={resource} />
      </FlowScreen>
    );
  }
  const back = { pathname: '/settings/device' as const, params: { id: device.id } };

  const unlink = async () => {
    setBusy(true);
    setError(null);
    try {
      await unlinkDevice(device);
      setDone(true);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
    }
  };

  return (
    <FlowScreen
      title="기기 연결을 해지할까요?"
      subtitle="주 보호자만 해지할 수 있어요."
      back={back}
      action={{
        label: busy ? '해지하는 중…' : '연결 해지하기',
        onPress: unlink,
        disabled: busy || !canManage,
      }}
    >
      <FlowRow title="소유 관계가 해제돼요" meta="새 소유자는 기기를 초기화한 뒤 등록해야 해요." />
      <FlowRow title="취소" meta="기기 연결 유지" onPress={() => router.dismissTo(back)} />
      <FlowMessage text={canManage ? error : '주 보호자에게 해지를 요청해 주세요.'} />
    </FlowScreen>
  );
}
