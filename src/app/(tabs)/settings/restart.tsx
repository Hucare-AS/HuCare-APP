import { router } from 'expo-router';
import { useState } from 'react';

import { errorText, FlowMessage, FlowRow, FlowScreen } from '@/components/flow-screen';
import { LoadState } from '@/components/load-state';
import { deviceName, useDevice } from '@/components/settings-shared';
import { restartDevice } from '@/lib/care';

/** 기기를 재시작할까요? (Figma 989:4262) → 재시작을 요청했어요 (989:4321) */
export default function RestartScreen() {
  const { resource, device } = useDevice();
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!device) {
    return (
      <FlowScreen title="기기 재시작" back="/settings/devices">
        <LoadState resource={resource} />
      </FlowScreen>
    );
  }
  const back = { pathname: '/settings/device' as const, params: { id: device.id } };
  const toDevice = () => router.dismissTo(back);

  if (done) {
    return (
      <FlowScreen
        title="재시작을 요청했어요"
        subtitle={deviceName(device)}
        back={back}
        action={{ label: '기기 상태로', onPress: toDevice }}
      >
        <FlowRow title="연결 상태 확인" meta="기기가 다시 연결되면 상태를 확인해 주세요." />
      </FlowScreen>
    );
  }

  const restart = async () => {
    setBusy(true);
    setError(null);
    try {
      await restartDevice(device.id);
      setDone(true);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
    }
  };

  return (
    <FlowScreen
      title="기기를 재시작할까요?"
      subtitle={deviceName(device)}
      back={back}
      action={{ label: busy ? '요청하는 중…' : '재시작하기', onPress: restart, disabled: busy }}
    >
      <FlowRow title="잠시 연결이 끊겨요" meta="재시작하는 동안 새 기록이 잠시 멈춰요." />
      <FlowRow title="취소" meta="기기 상태로 돌아가기" onPress={toDevice} />
      <FlowMessage text={error} />
    </FlowScreen>
  );
}
