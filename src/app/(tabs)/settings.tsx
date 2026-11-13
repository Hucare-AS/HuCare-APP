import { router } from 'expo-router';
import type { PropsWithChildren, ReactNode } from 'react';
import { View } from 'react-native';

import { LoadState } from '@/components/load-state';
import { TabScreen } from '@/components/tab-screen';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Select } from '@/components/ui/select';
import { Text } from '@/components/ui/text';
import { Toggle } from '@/components/ui/toggle';
import { isApiMode } from '@/lib/api';
import { logout, useAuth } from '@/lib/auth';
import {
  updateNotificationPrefs,
  useNotificationPrefs,
  useProfile,
  type NightAlert,
} from '@/lib/care';
import { cn } from '@/lib/cn';
import { updatePreferences, usePreferences, type Brightness } from '@/lib/preferences';

const NIGHT_OPTIONS: { value: NightAlert; label: string }[] = [
  { value: 'as-is', label: '그대로 받기' },
  { value: 'morning', label: '아침에 모아 받기' },
];

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
};

function Row({ title, detail, detailClassName, right, raised }: RowProps) {
  return (
    <View className={cn('min-h-[50px] flex-row items-center justify-between', raised && 'z-10')}>
      <View className="flex-1 gap-1 pr-3">
        <Text className="text-[15px] font-semibold leading-[22px] tracking-[-0.375px]">
          {title}
        </Text>
        {detail ? <Text className={cn('leading-[21px]', detailClassName)}>{detail}</Text> : null}
      </View>
      {right}
    </View>
  );
}

const chevron = <Icon name="rowChevron" width={6.4} height={10} />;

function NotificationSection() {
  const resource = useNotificationPrefs();
  const prefs = resource.data;

  if (!prefs) return <LoadState resource={resource} className="py-4" />;

  return (
    <View className="gap-4">
      <Row
        title="낙상"
        detail="넘어지셨을 때 항상 바로 알려드려요"
        right={
          <Toggle
            label="낙상"
            checked={prefs.fall}
            onChange={(fall) => updateNotificationPrefs({ fall })}
          />
        }
      />
      <Row
        title="비활동"
        detail="오래 움직임이 없을 때"
        right={
          <Toggle
            label="비활동"
            checked={prefs.inactive}
            onChange={(inactive) => updateNotificationPrefs({ inactive })}
          />
        }
      />
      <Row
        title="기기 꺼짐"
        detail="기기가 꺼졌을 때"
        right={
          <Toggle
            label="기기 꺼짐"
            checked={prefs.deviceOff}
            onChange={(deviceOff) => updateNotificationPrefs({ deviceOff })}
          />
        }
      />
      <Row
        raised
        title="야간 알림"
        detail="넘어짐은 밤에도 바로 알려드려요"
        detailClassName="text-[13px] font-light leading-[17px] tracking-[-0.325px]"
        right={
          <Select
            label="야간 알림"
            options={NIGHT_OPTIONS}
            value={prefs.nightAlert}
            onChange={(nightAlert) => updateNotificationPrefs({ nightAlert })}
          />
        }
      />
    </View>
  );
}

function ProfileSection() {
  const resource = useProfile();
  const profile = resource.data;

  if (!profile) return <LoadState resource={resource} className="py-4" />;

  return (
    <View className="gap-1">
      <View className="h-[38px] justify-center">
        <Text className="text-[20px] font-semibold leading-[30px] tracking-[-0.5px]">
          {profile.subjectLabel}
        </Text>
      </View>
      <View className="gap-4">
        <Row title="전화번호" detail={profile.phone ?? NOT_SET} right={chevron} />
        <Row title="기기 설치 장소" detail={profile.place ?? NOT_SET} right={chevron} />
        <Row
          title="함께 보는 가족"
          detail={profile.family.length ? profile.family.join(', ') : NOT_SET}
          right={chevron}
        />
        <Row title="돌봄센터 연락처" detail={profile.careCenterPhone ?? NOT_SET} right={chevron} />
      </View>
    </View>
  );
}

/** 설정 (Figma 786:539) */
export default function SettingsScreen() {
  const preferences = usePreferences();
  const auth = useAuth();

  return (
    <TabScreen title="설정">
      <View className="mt-4 gap-4 px-6">
        <View className="z-20">
          <Section title="알림 받기">
            <NotificationSection />
          </Section>
        </View>

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

        <Section title="보안">
          <Row title="개인정보 처리방침" right={chevron} />
        </Section>

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
    </TabScreen>
  );
}
