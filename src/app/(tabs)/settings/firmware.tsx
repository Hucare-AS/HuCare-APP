import { router } from 'expo-router';
import { useState } from 'react';

import { errorText, FlowMessage, FlowRow, FlowScreen } from '@/components/flow-screen';
import { LoadState } from '@/components/load-state';
import { deviceName, useDevice } from '@/components/settings-shared';
import { checkFirmware, type FirmwareCheck } from '@/lib/care';

/** 펌웨어 (Figma 989:3981) → 버전 확인 결과 (989:4038) */
export default function FirmwareScreen() {
  const { resource, device } = useDevice();
  const [result, setResult] = useState<FirmwareCheck | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!device) {
    return (
      <FlowScreen title="펌웨어" back="/settings/devices">
        <LoadState resource={resource} />
      </FlowScreen>
    );
  }
  const back = { pathname: '/settings/device' as const, params: { id: device.id } };

  if (result !== undefined) {
    return (
      <FlowScreen
        title="버전 확인 결과"
        subtitle={deviceName(device)}
        back={back}
        action={{ label: '기기 상태로', onPress: () => router.dismissTo(back) }}
      >
        {result === null ? (
          <FlowRow
            title="새 버전을 확인할 수 없어요"
            meta={`설치된 버전 ${device.firmware ?? '확인 중'} · 업데이트 정보는 아직 제공되지 않아요.`}
          />
        ) : result.latest ? (
          <FlowRow title="최신 버전이에요" meta="설치된 버전을 계속 사용할 수 있어요." />
        ) : (
          <FlowRow
            title="새 버전이 있어요"
            meta={`${result.version ?? '새 버전'} · 기기가 연결되면 자동으로 받아요.`}
          />
        )}
      </FlowScreen>
    );
  }

  const check = async () => {
    setBusy(true);
    setError(null);
    try {
      setResult(await checkFirmware(device.id));
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
    }
  };

  return (
    <FlowScreen title="펌웨어" subtitle={deviceName(device)} back={back}>
      <FlowRow title="설치된 버전" meta={device.firmware ?? '확인 중'} />
      <FlowRow
        title="새 버전 확인"
        meta={busy ? '확인하는 중…' : '업데이트 가능 여부 확인'}
        onPress={busy ? undefined : check}
      />
      <FlowMessage text={error} />
    </FlowScreen>
  );
}
