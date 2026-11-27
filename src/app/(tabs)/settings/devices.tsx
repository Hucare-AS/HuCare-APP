import { router } from 'expo-router';

import { FlowRow, FlowScreen } from '@/components/flow-screen';
import { LoadState } from '@/components/load-state';
import { Text } from '@/components/ui/text';
import { CONNECTION_LABEL, deviceName } from '@/components/settings-shared';
import { useDevices, useHome } from '@/lib/care';

/** 기기 관리 (Figma 989:3857) */
export default function DevicesScreen() {
  const resource = useDevices();
  const subject = useHome().data?.subjectLabel;
  const devices = resource.data;

  return (
    <FlowScreen title="기기 관리" subtitle="등록된 기기" back="/settings">
      {!devices ? (
        <LoadState resource={resource} />
      ) : devices.length ? (
        devices.map((device) => (
          <FlowRow
            key={device.id}
            title={deviceName(device)}
            meta={[subject, CONNECTION_LABEL[device.connection]].filter(Boolean).join(' · ')}
            onPress={() =>
              router.navigate({ pathname: '/settings/device', params: { id: device.id } })
            }
          />
        ))
      ) : (
        <Text className="py-6 text-muted">
          연결된 기기가 없어요. 홈에서 대상을 등록하고 기기를 연결해 주세요.
        </Text>
      )}
    </FlowScreen>
  );
}
