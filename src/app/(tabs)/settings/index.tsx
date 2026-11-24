import { router } from 'expo-router';
import { useState, type PropsWithChildren, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { LoadState } from '@/components/load-state';
import { SubjectSheet, type SubjectField, type SubjectInfo } from '@/components/subject-sheet';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Select } from '@/components/ui/select';
import { Text } from '@/components/ui/text';
import { isApiMode } from '@/lib/api';
import { logout, useAuth } from '@/lib/auth';
import { FlowRow, FlowScreen } from '@/components/flow-screen';
import { removeMember, saveProfile, useProfile } from '@/lib/care';
import { cn } from '@/lib/cn';
import { updatePreferences, usePreferences, type Brightness } from '@/lib/preferences';

const BRIGHTNESS_OPTIONS: { value: Brightness; label: string }[] = [
  { value: 'auto', label: '자동' },
  { value: 'bright', label: '밝게' },
  { value: 'dark', label: '어둡게' },
];

const NOT_SET = '등록되지 않음';

function Section({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <View>
      <View className="h-[38px] justify-center">
        <Text className="font-light leading-[21px]">{title}</Text>
      </View>
      {children}
    </View>
  );
}

type RowProps = {
  title: string;
  detail?: string;
  detailClassName?: string;
  right?: ReactNode;
  /** 드롭다운이 열리면 아래 행 위로 올라오도록 */
  raised?: boolean;
  onPress?: () => void;
};

function Row({ title, detail, detailClassName, right, raised, onPress }: RowProps) {
  const className = cn('min-h-[50px] flex-row items-center justify-between', raised && 'z-10');
  const body = (
    <>
      <View className="flex-1 gap-1 pr-3">
        <Text className="text-[15px] font-semibold leading-[22px] tracking-[-0.375px]">
          {title}
        </Text>
        {detail ? <Text className={cn('leading-[21px]', detailClassName)}>{detail}</Text> : null}
      </View>
      {right}
    </>
  );
  // 누를 수 없는 행을 disabled Pressable 로 두면 웹에서 aria-disabled 가 안쪽 스위치까지 막는다
  if (!onPress) return <View className={className}>{body}</View>;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} className={className}>
      {body}
    </Pressable>
  );
}

const chevron = <Icon name="rowChevron" width={6.4} height={10} />;

function ProfileSection() {
  const resource = useProfile();
  const profile = resource.data;
  const [field, setField] = useState<SubjectField | null>(null);

  if (!profile) return <LoadState resource={resource} className="py-4" />;

  const info: SubjectInfo = {
    phone: profile.phone ?? '',
    place: profile.place ?? '',
    family: profile.family,
    careCenterPhone: profile.careCenterPhone ?? '',
  };
  const open = (f: SubjectField) => () => setField(f);

  return (
    <View className="gap-1">
      <View className="h-[38px] justify-center">
        <Text className="text-[20px] font-semibold leading-[30px] tracking-[-0.5px]">
          {profile.subjectLabel}
        </Text>
      </View>
      <View className="gap-4">
        <Row
          title="전화번호"
          detail={info.phone || NOT_SET}
          right={chevron}
          onPress={open('phone')}
        />
        <Row
          title="기기 설치 장소"
          detail={info.place || NOT_SET}
          right={chevron}
          onPress={open('place')}
        />
        <Row
          title="함께 보는 가족"
          detail={
            info.family.length ? info.family.map((member) => member.name).join(', ') : NOT_SET
          }
          right={chevron}
          onPress={open('family')}
        />
        <Row
          title="돌봄센터 연락처"
          detail={info.careCenterPhone || NOT_SET}
          right={chevron}
          onPress={open('careCenterPhone')}
        />
      </View>
      <SubjectSheet
        title={profile.subjectLabel}
        field={field}
        info={info}
        canManage={profile.canManage}
        onSave={(target, value) =>
          saveProfile(target === 'place' ? { place: value ?? '' } : { [target]: value })
        }
        onRemove={async (member) => {
          await removeMember(member.id, member.me);
          if (member.me) router.navigate('/home');
        }}
        onInvite={() => {
          setField(null);
          router.navigate('/settings/invite');
        }}
        onClose={() => setField(null)}
      />
    </View>
  );
}

/** 설정 (Figma 설정 플로우 main 989:3790 · 대상자 정보는 786:539) */
export default function SettingsScreen() {
  const preferences = usePreferences();
  const auth = useAuth();
  const profile = useProfile().data;

  return (
    <FlowScreen
      eyebrow="HuCare"
      title="설정"
      subtitle={
        profile
          ? `${profile.subjectLabel} · ${profile.canManage ? '주 보호자' : '보호자'}`
          : undefined
      }
    >
      <FlowRow title="기기 관리" meta="연결 상태와 설치 장소" href="/settings/devices" />
      <FlowRow title="알림 설정" meta="이벤트별 수신과 방해금지" href="/settings/notifications" />
      <FlowRow
        title="개인정보와 동의"
        meta="동의 이력과 데이터 삭제 요청"
        href="/settings/privacy"
      />
      <FlowRow title="앱 정보와 고객지원" meta="공지사항 · FAQ · 문의" href="/settings/support" />

      <View className="mt-6 gap-4">
        <Section title="대상자 정보">
          <ProfileSection />
        </Section>

        <View className="z-10">
          <Section title="화면">
            <Row
              raised
              title="화면 밝기"
              right={
                <Select
                  label="화면 밝기"
                  options={BRIGHTNESS_OPTIONS}
                  value={preferences.brightness}
                  onChange={(brightness) => updatePreferences({ brightness })}
                />
              }
            />
          </Section>
        </View>

        {isApiMode && auth.status === 'signedIn' ? (
          <Section title="계정">
            <Row title={`${auth.user.displayName}님`} />
            <Button
              label="로그아웃"
              variant="neutral"
              onPress={() => {
                logout();
                router.replace('/login');
              }}
              className="mt-2"
            />
          </Section>
        ) : null}

        <Text className="mt-2 text-center text-[13px] font-light leading-[18px] tracking-[-0.325px] text-muted">
          HuCare{'\n'}카메라 영상은 집 밖으로 나가지 않아요
        </Text>
      </View>
    </FlowScreen>
  );
}
