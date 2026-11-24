import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { BoxInput } from '@/components/care-form';
import { errorText, FlowMessage, FlowRow, FlowScreen } from '@/components/flow-screen';
import { LoadState } from '@/components/load-state';
import { CONNECTION_LABEL, deviceName, useDevice } from '@/components/settings-shared';
import { changeWifi } from '@/lib/care';

/** 기기가 찾은 주변 네트워크 (기기 Bluetooth 연결 전까지는 예시) */
const NETWORKS = ['우리집_2G', '우리집_5G'];

type Step =
  { name: 'pick' } | { name: 'password'; network: string } | { name: 'done'; network: string };

/** Wi-Fi 변경 (Figma 989:4092) → 네트워크 연결 (989:4149) → Wi-Fi를 변경했어요 (989:4208) */
export default function WifiScreen() {
  const { resource, device } = useDevice();
  const [step, setStep] = useState<Step>({ name: 'pick' });
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!device) {
    return (
      <FlowScreen title="Wi-Fi 변경" back="/settings/devices">
        <LoadState resource={resource} />
      </FlowScreen>
    );
  }
  const back = { pathname: '/settings/device' as const, params: { id: device.id } };

  if (step.name === 'done') {
    return (
      <FlowScreen
        title="Wi-Fi를 변경했어요"
        subtitle={deviceName(device)}
        back={back}
        action={{ label: '기기 상태로', onPress: () => router.dismissTo(back) }}
      >
        <FlowRow title={CONNECTION_LABEL.online} meta={step.network} />
      </FlowScreen>
    );
  }

  if (step.name === 'password') {
    const connect = async () => {
      setBusy(true);
      setError(null);
      try {
        await changeWifi(device.id, step.network, password);
        setPassword('');
        setStep({ name: 'done', network: step.network });
      } catch (reason) {
        setError(errorText(reason));
      } finally {
        setBusy(false);
      }
    };
    return (
      <FlowScreen
        title="네트워크 연결"
        subtitle={step.network}
        back={back}
        action={{
          label: busy ? '연결하는 중…' : '연결하기',
          onPress: connect,
          disabled: busy || !password,
        }}
      >
        <View className="mb-2">
          <BoxInput
            label="Wi-Fi 비밀번호"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy}
          />
        </View>
        <FlowRow title="기기에 전달" meta="Bluetooth를 켜고 기기 가까이에 있어 주세요." />
        <FlowMessage text={error} />
      </FlowScreen>
    );
  }

  return (
    <FlowScreen title="Wi-Fi 변경" subtitle="기기 가까이에서 진행해 주세요." back={back}>
      <FlowRow title="현재 네트워크" meta={device.network ?? '기기에서 확인할 수 있어요'} />
      {NETWORKS.filter((network) => network !== device.network).map((network) => (
        <FlowRow
          key={network}
          title="새 네트워크 선택"
          meta={network}
          onPress={() => setStep({ name: 'password', network })}
        />
      ))}
    </FlowScreen>
  );
}
