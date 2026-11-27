import { router } from 'expo-router';

import { FlowRow, FlowScreen } from '@/components/flow-screen';
import { LoadState } from '@/components/load-state';
import { CONNECTION_LABEL, deviceName, useDevice } from '@/components/settings-shared';
import { useHome } from '@/lib/care';

/** 기기 상태 (Figma 989:3909 거실 기기) */
export default function DeviceScreen() {
  const { resource, device } = useDevice();
  const subject = useHome().data?.subjectLabel;

  if (!device) {
    return (
      <FlowScreen title="기기" back="/settings/devices">
        <LoadState resource={resource} />
      </FlowScreen>
    );
  }

  const go =
    (
      pathname: '/settings/firmware' | '/settings/wifi' | '/settings/restart' | '/settings/unlink',
    ) =>
    () =>
      router.navigate({ pathname, params: { id: device.id } });

  return (
    <FlowScreen
      title={deviceName(device)}
      subtitle={[CONNECTION_LABEL[device.connection], subject].filter(Boolean).join(' · ')}
      back="/settings/devices"
    >
      <FlowRow title="설치 장소" meta={device.place ?? '등록되지 않음'} />
      <FlowRow title="펌웨어" meta="설치된 버전 확인" onPress={go('/settings/firmware')} />
      <FlowRow
        title="Wi-Fi 변경"
        meta={device.network ? `현재 네트워크 · ${device.network}` : '기기 가까이에서 변경해요'}
        onPress={go('/settings/wifi')}
      />
      <FlowRow title="기기 재시작" meta="연결 문제 해결" onPress={go('/settings/restart')} />
      <FlowRow title="기기 연결 해지" meta="소유 관계 해제" onPress={go('/settings/unlink')} />
    </FlowScreen>
  );
}
