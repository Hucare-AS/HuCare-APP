import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Linking, Platform, Pressable, View } from 'react-native';
import Svg, { Line, Polygon, Rect } from 'react-native-svg';

import { BoxInput, FormMessage, Note } from '@/components/care-form';
import { errorText } from '@/components/flow-screen';
import { VitalCard } from '@/components/home-board';
import { DEVICE_LABEL } from '@/components/subject-card';
import { TabScreen } from '@/components/tab-screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Toggle } from '@/components/ui/toggle';
import { isApiMode } from '@/lib/api';
import {
  changeWifi,
  DeviceNotFoundError,
  registerDevice,
  setConsent,
  useHome,
  waitForDevice,
  type DeviceInfo,
} from '@/lib/care';
import { cn } from '@/lib/cn';

/**
 * 웹은 휴대폰 Bluetooth 로 기기를 찾거나 Wi-Fi 를 전달할 수 없다.
 * 백엔드 모드에서는 기기 번호(QR · 직접 입력)로 등록하고, 목업은 시안의 흐름을 그대로 보여준다.
 */
const CAN_SCAN = !isApiMode;

/** 목업에서 Bluetooth 로 찾은 기기 (Figma 986:4992) */
const NEARBY = { code: 'HC-4A2F', name: 'HuCare · 4A2F', detail: '레이더형 · 연결 가능한 기기' };
const NETWORK = { name: '우리집 Wi-Fi', detail: '신호 좋음 · 보안 네트워크' };

type Step =
  | 'ble'
  | 'qr'
  | 'wifi'
  | 'server'
  | 'guide'
  | 'consent'
  | 'done'
  | 'permission'
  | 'notFound'
  | 'wifiFail'
  | 'serverDelay';

/** HC/row (Figma 950:287) */
function InfoRow({ title, meta, right }: { title: string; meta: string; right?: ReactNode }) {
  return (
    <View className="flex-row items-center gap-3 py-[10px]">
      <View className="flex-1 gap-[5px]">
        <Text className="text-[15px] font-semibold leading-[22px] tracking-normal">{title}</Text>
        <Text className="text-[12px] leading-[17px] tracking-normal text-muted">{meta}</Text>
      </View>
      {right}
    </View>
  );
}

/** 빨간 안내 상자 (Figma 05-K · 05-L) */
function AlertNote({ title, body }: { title: string; body: string }) {
  return (
    <View className="gap-2 rounded-lg bg-[#FFF0F0] p-4">
      <Text className="font-semibold leading-[20px] tracking-normal text-care-red">{title}</Text>
      <Text className="text-[12px] leading-[17px] tracking-normal text-care-red">{body}</Text>
    </View>
  );
}

/** 5/7 설치 가이드 그림: 기기 → 측정 영역 */
function RangeDiagram() {
  return (
    <View className="gap-3 rounded-2xl bg-sand p-4">
      <Text className="text-[22px] font-bold leading-[30px] tracking-normal">기기 → 측정 영역</Text>
      <Svg width="100%" height={110} viewBox="0 0 300 110">
        <Polygon points="40,55 240,8 240,102" fill="#245C53" opacity={0.18} />
        <Line x1={40} y1={55} x2={220} y2={55} stroke="#EF7000" strokeDasharray="4 4" />
        <Rect x={16} y={34} width={36} height={42} rx={8} fill="#EF7000" />
        <Rect x={28} y={49} width={12} height={12} rx={6} fill="#FFFFFF" />
        <Rect
          x={220}
          y={30}
          width={66}
          height={50}
          rx={12}
          fill="#FFFFFF"
          stroke="#EF7000"
          strokeWidth={2}
        />
        <Line x1={60} y1={100} x2={200} y2={100} stroke="#EF7000" strokeWidth={1.5} />
        <Line x1={60} y1={94} x2={60} y2={106} stroke="#EF7000" strokeWidth={1.5} />
        <Line x1={200} y1={94} x2={200} y2={106} stroke="#EF7000" strokeWidth={1.5} />
      </Svg>
      <Text className="font-semibold leading-[22px] tracking-normal">거리 · 높이 · 각도 안내</Text>
      <Text className="text-[13px] leading-[19px] tracking-normal text-muted">
        선택한 모델의 설치 기준을 표시합니다.{'\n'}기기와 대상 사이의 가림을 확인해주세요.
      </Text>
    </View>
  );
}

/**
 * 대상 등록 2~7단계 (Figma 986:5462) 와 기기 연결 예외 (986:5442).
 * 1단계(register)에서 대상을 만든 뒤 들어온다. ?place= 는 1단계에서 고른 설치 장소.
 */
export default function ConnectScreen() {
  const { place: placeParam } = useLocalSearchParams<{ place?: string }>();
  const place = placeParam || '거실';
  const home = useHome().data;
  const subject = home?.subjectLabel ?? '대상';
  const [step, setStep] = useState<Step>(CAN_SCAN ? 'ble' : 'permission');
  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [code, setCode] = useState('');
  const [manual, setManual] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [consents, setConsents] = useState({ metrics: true, photo: false, video: false });
  const [purposeOpen, setPurposeOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [wifiDone, setWifiDone] = useState(false);

  const go = (next: Step) => {
    setMessage(null);
    setStep(next);
  };

  /** 2단계: 기기 등록 · 대상 연결 */
  const connect = async (value: string) => {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      setDevice(await registerDevice(value, place));
      go('wifi');
    } catch (reason) {
      if (reason instanceof DeviceNotFoundError) go('notFound');
      else setMessage(errorText(reason));
    } finally {
      setBusy(false);
    }
  };

  /** 3단계: Wi-Fi 정보를 기기에 전달 */
  const sendWifi = async () => {
    if (!device || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      if (password === 'wrong') throw new Error('wifi');
      await changeWifi(device.id, NETWORK.name, password);
      setWifiDone(true);
      go('server');
    } catch (reason) {
      if (reason instanceof Error && reason.message === 'wifi') go('wifiFail');
      else setMessage(errorText(reason));
    } finally {
      setBusy(false);
    }
  };

  // 4단계: 서버에 붙을 때까지 기다린다
  useEffect(() => {
    if (step !== 'server' || !device) return;
    let alive = true;
    waitForDevice(device.id).then(
      (online) => alive && setStep(online ? 'guide' : 'serverDelay'),
      () => alive && setStep('serverDelay'),
    );
    return () => {
      alive = false;
    };
  }, [step, device]);

  /** 6단계: 필수 · 선택 동의 */
  const agree = async () => {
    setBusy(true);
    setMessage(null);
    setNotice(null);
    try {
      await setConsent('metrics', true);
      if (consents.photo) await setConsent('photo', true);
      if (consents.video) await setConsent('video', true);
    } catch (reason) {
      // 동의 주체 확인 전이면 동의를 저장할 수 없다. 연결은 끝났으니 다음 단계로 간다
      setNotice(`${errorText(reason)} 동의가 저장되면 측정이 시작돼요.`);
    } finally {
      setBusy(false);
      go('done');
    }
  };

  const cancel = () => router.dismissTo('/home');
  const kindLabel = device?.kind ? DEVICE_LABEL[device.kind] : '기기';

  switch (step) {
    case 'ble':
      return (
        <TabScreen title="가까운 기기 찾기" subtitle="2 / 7 · Bluetooth 연결">
          <View className="mt-4 gap-[18px] px-6">
            <View className="gap-[10px] rounded-lg bg-white p-4">
              <Text className="text-[20px] font-semibold leading-[28px] tracking-normal">
                기기를 가까이 두세요
              </Text>
              <Text className="text-[13px] leading-[19px] tracking-normal text-muted">
                전원 표시등이 켜져 있는지 확인해주세요.
              </Text>
            </View>
            <InfoRow title={NEARBY.name} meta={NEARBY.detail} />
            <FormMessage text={message} error />
            <Button
              label={busy ? '연결하는 중…' : '이 기기 연결'}
              disabled={busy}
              onPress={() => connect(NEARBY.code)}
            />
            <Button label="QR 코드로 연결" variant="outline" onPress={() => go('qr')} />
            <Note
              title="주변 기기 권한이 필요해요"
              body="기기를 찾는 동안에만 Bluetooth를 사용합니다."
            />
          </View>
        </TabScreen>
      );

    case 'qr':
      return (
        <TabScreen title="기기 QR 코드 스캔" subtitle="2 / 7 · 다른 연결 방법">
          <View className="mt-4 gap-[18px] px-6">
            <View className="items-center gap-3 rounded-lg bg-white p-4">
              <Text className="self-start text-[16px] font-semibold leading-[23px] tracking-normal">
                QR 코드를 화면 안에 맞춰주세요
              </Text>
              <View className="aspect-square w-[78%] items-center justify-center rounded-2xl border-2 border-primary bg-surface">
                {Platform.OS === 'web' ? (
                  <Text className="px-6 text-center text-[12px] leading-[17px] text-muted">
                    웹에서는 카메라로 스캔할 수 없어요.{'\n'}기기 번호를 직접 입력해주세요.
                  </Text>
                ) : null}
              </View>
              <Text className="text-[12px] leading-[17px] text-muted">
                기기 뒷면 또는 포장에 있어요.
              </Text>
            </View>
            {manual ? (
              <>
                <BoxInput
                  label="기기 번호"
                  value={code}
                  onChangeText={setCode}
                  placeholder="기기 뒷면의 번호"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable={!busy}
                  onSubmitEditing={() => connect(code)}
                />
                <FormMessage text={message} error />
                <Button
                  label={busy ? '연결하는 중…' : '연결하기'}
                  disabled={busy || !code.trim()}
                  onPress={() => connect(code)}
                  className={cn((busy || !code.trim()) && 'opacity-50')}
                />
              </>
            ) : (
              <Button
                label="기기 번호 직접 입력"
                variant="outline"
                onPress={() => setManual(true)}
              />
            )}
            {CAN_SCAN ? (
              <Button label="Bluetooth로 찾기" variant="outline" onPress={() => go('ble')} />
            ) : null}
          </View>
        </TabScreen>
      );

    case 'wifi':
      return (
        <TabScreen title="Wi-Fi에 연결해요" subtitle="3 / 7 · 네트워크 설정">
          <View className="mt-4 gap-[18px] px-6">
            <InfoRow title={NETWORK.name} meta={NETWORK.detail} />
            <BoxInput
              label="비밀번호"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!busy}
            />
            <InfoRow
              title="비밀번호 표시"
              meta="입력한 비밀번호를 확인해요"
              right={
                <Toggle label="비밀번호 표시" checked={showPassword} onChange={setShowPassword} />
              }
            />
            <Note
              title="지원 네트워크 확인"
              body="주파수 · 보안 방식은 기기 모델 안내를 따라주세요."
            />
            <FormMessage text={message} error />
            <Button
              label={busy ? '연결하는 중…' : '연결하기'}
              disabled={busy || !password}
              onPress={sendWifi}
              className={cn((busy || !password) && 'opacity-50')}
            />
            {message && !CAN_SCAN ? (
              <Button
                label="기기가 이미 Wi-Fi에 연결돼 있어요"
                variant="outline"
                onPress={() => go('server')}
              />
            ) : (
              <Button
                label="네트워크 다시 검색"
                variant="outline"
                onPress={() => setPassword('')}
              />
            )}
          </View>
        </TabScreen>
      );

    case 'server':
      return (
        <TabScreen title="서버에 연결하고 있어요" subtitle="4 / 7 · 연결 확인">
          <View className="mt-4 gap-[18px] px-6">
            <InfoRow title="Bluetooth 연결 완료" meta="기기를 찾았어요" />
            <InfoRow
              title={wifiDone ? 'Wi-Fi 연결 완료' : 'Wi-Fi 확인'}
              meta={wifiDone ? NETWORK.name : '기기에 저장된 네트워크를 사용해요'}
            />
            <InfoRow title="서버 등록 중" meta="잠시만 기다려주세요" />
            <Note title="기기 전원을 유지해주세요" body="연결 완료 후 설치 위치를 안내해드려요." />
            <Button label="설정 취소" variant="outline" onPress={cancel} />
          </View>
        </TabScreen>
      );

    case 'guide':
      return (
        <TabScreen title="설치 위치를 맞춰주세요" subtitle="5 / 7 · 모델별 설치 가이드">
          <View className="mt-4 gap-[18px] px-6">
            <RangeDiagram />
            <InfoRow title="거리" meta="모델 권장 범위 이내인지 확인" />
            <InfoRow title="각도 · 높이" meta="감지 영역이 대상을 향하도록 조정" />
            <InfoRow title="가림 여부" meta="가구 · 벽 · 물체의 간섭 확인" />
            <Button label="설치 확인 완료" onPress={() => go('consent')} />
          </View>
        </TabScreen>
      );

    case 'consent':
      return (
        <TabScreen title="동의 내용을 확인해주세요" subtitle="6 / 7 · 정보 처리 동의">
          <View className="mt-4 gap-[18px] px-6">
            <InfoRow
              title="필수 · 측정정보 처리"
              meta="동의해야 측정을 시작할 수 있어요"
              right={
                <Toggle
                  label="필수 측정정보 처리 동의"
                  checked={consents.metrics}
                  onChange={(metrics) => setConsents({ ...consents, metrics })}
                />
              }
            />
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: purposeOpen }}
              onPress={() => setPurposeOpen(!purposeOpen)}
              className="active:opacity-60"
            >
              <InfoRow
                title="처리 목적 · 보관기간 보기"
                meta={
                  purposeOpen
                    ? '돌봄 상태 확인과 알림을 위해 심박 · 호흡 · 재실 정보를 처리하고, 돌봄 종료나 삭제 요청 시 파기해요.'
                    : '필수 동의 상세를 먼저 확인'
                }
              />
            </Pressable>
            <InfoRow
              title="선택 · 사진 저장"
              meta="카메라형 기기만 사진을 남겨요"
              right={
                <Toggle
                  label="선택 사진 저장 동의"
                  checked={consents.photo}
                  onChange={(photo) => setConsents({ ...consents, photo })}
                />
              }
            />
            <InfoRow
              title="선택 · 이벤트 영상 저장"
              meta="알림이 생긴 순간만 남아요"
              right={
                <Toggle
                  label="선택 이벤트 영상 저장 동의"
                  checked={consents.video}
                  onChange={(video) => setConsents({ ...consents, video })}
                />
              }
            />
            <Note
              title="선택 동의는 나중에 바꿀 수 있어요"
              body="동의하지 않은 사진 · 영상은 수집하지 않아요."
            />
            <Button
              label={busy ? '저장하는 중…' : '동의하고 첫 측정'}
              disabled={busy || !consents.metrics}
              onPress={agree}
              className={cn((busy || !consents.metrics) && 'opacity-50')}
            />
          </View>
        </TabScreen>
      );

    case 'done': {
      const latest = home?.latest ?? null;
      return (
        <TabScreen title="첫 측정을 확인했어요" subtitle="7 / 7 · 설치 완료">
          <View className="mt-4 gap-[18px] px-6">
            <Note
              title={`${subject}의 기기가 연결됐어요`}
              body={[
                device?.place ?? place,
                home?.device ? DEVICE_LABEL[home.device] : kindLabel,
                '서버 연결 정상',
              ].join(' · ')}
            />
            {latest ? (
              <View className="flex-row gap-3">
                <VitalCard
                  label="심박수"
                  metric={latest.metrics.hr}
                  unit="bpm"
                  icon="metricHeart"
                  valueClassName="text-metric-heart"
                  baseline={{ status: 'collecting' }}
                  at={latest.at}
                />
                <VitalCard
                  label="호흡수"
                  metric={latest.metrics.rr}
                  unit="회/분"
                  icon="metricLungs"
                  valueClassName="text-metric-breath"
                  baseline={{ status: 'collecting' }}
                  at={latest.at}
                />
              </View>
            ) : (
              <InfoRow
                title="첫 측정을 기다리고 있어요"
                meta="측정이 끝나면 대시보드에 바로 보여요."
              />
            )}
            <InfoRow title="재실 · 움직임" meta="측정 환경 정상" />
            {notice ? <FormMessage text={notice} error /> : null}
            <Button label="대시보드로 이동" onPress={() => router.replace('/home/board')} />
            <Button
              label="보호자 초대하기"
              variant="outline"
              onPress={() => router.navigate('/settings/invite')}
            />
          </View>
        </TabScreen>
      );
    }

    case 'permission':
      return (
        <TabScreen title="권한을 허용해주세요" subtitle="연결 복구 · 권한 거부">
          <View className="mt-4 gap-[18px] px-6">
            {Platform.OS === 'web' ? (
              <Note
                title="이 브라우저에서는 주변 기기를 찾을 수 없어요"
                body="QR 코드나 기기 번호로 연결해주세요. 휴대폰 앱에서는 Bluetooth로 찾을 수 있어요."
              />
            ) : (
              <>
                <Note
                  title="주변 기기 권한이 꺼져 있어요"
                  body="기기를 찾으려면 설정에서 권한을 허용해주세요."
                />
                <Button label="설정에서 권한 허용" onPress={() => Linking.openSettings()} />
              </>
            )}
            <Button label="QR 코드로 연결" variant="outline" onPress={() => go('qr')} />
            <InfoRow
              title="카메라 권한을 거부한 경우"
              meta="기기 번호 직접 입력 또는 BLE 찾기 사용"
            />
          </View>
        </TabScreen>
      );

    case 'notFound':
      return (
        <TabScreen title="기기를 찾지 못했어요" subtitle="연결 복구 · 기기 미발견">
          <View className="mt-4 gap-[18px] px-6">
            <Note
              title="기기 상태를 확인해주세요"
              body="전원과 페어링 표시등을 확인하고 가까이 이동해주세요."
            />
            <InfoRow title="1. 전원 확인" meta="기기가 켜져 있는지 확인" />
            <InfoRow title="2. 페어링 모드 확인" meta="모델별 버튼 안내 보기" />
            <InfoRow title="3. 다른 계정 연결 확인" meta="이미 등록된 기기는 주 보호자에게 문의" />
            <Button
              label="다시 찾기"
              onPress={() => {
                setCode('');
                go(CAN_SCAN ? 'ble' : 'qr');
              }}
            />
            <Button
              label="QR 코드로 연결"
              variant="outline"
              onPress={() => {
                setManual(true);
                go('qr');
              }}
            />
          </View>
        </TabScreen>
      );

    case 'wifiFail':
      return (
        <TabScreen title="Wi-Fi 연결에 실패했어요" subtitle="연결 복구 · 네트워크 단계">
          <View className="mt-4 gap-[18px] px-6">
            <AlertNote
              title="비밀번호를 다시 확인해주세요"
              body="입력한 네트워크에 연결하지 못했어요."
            />
            <View className="gap-2 rounded-lg border border-care-line bg-white p-4">
              <Text className="text-[12px] leading-[17px] tracking-normal text-muted">
                네트워크
              </Text>
              <Text className="text-[16px] leading-[23px]">{NETWORK.name}</Text>
            </View>
            <BoxInput
              label="비밀번호"
              value={password}
              onChangeText={setPassword}
              placeholder="다시 입력해주세요"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!busy}
            />
            <FormMessage text={message} error />
            <Button
              label={busy ? '연결하는 중…' : '다시 연결'}
              disabled={busy || !password}
              onPress={sendWifi}
              className={cn((busy || !password) && 'opacity-50')}
            />
            <Button
              label="다른 네트워크 선택"
              variant="outline"
              onPress={() => {
                setPassword('');
                go('wifi');
              }}
            />
          </View>
        </TabScreen>
      );

    case 'serverDelay':
      return (
        <TabScreen title="서버 연결이 지연돼요" subtitle="연결 복구 · 서버 등록 단계">
          <View className="mt-4 gap-[18px] px-6">
            <AlertNote
              title="Wi-Fi는 연결되어 있어요"
              body="인터넷 연결을 확인한 뒤 다시 시도해주세요."
            />
            <InfoRow title="진행 상태" meta="BLE 완료 · Wi-Fi 완료 · 서버 실패" />
            <Button label="서버 연결 재시도" onPress={() => go('server')} />
            <Button label="Wi-Fi 변경" variant="outline" onPress={() => go('wifi')} />
            <Button
              label="고객지원 문의"
              variant="outline"
              onPress={() => router.navigate('/settings/contact')}
            />
          </View>
        </TabScreen>
      );
  }
}
