import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { LinearGradient } from '@/components/ui/linear-gradient';
import { Text } from '@/components/ui/text';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { callPhone } from '@/lib/call';
import {
  acknowledgeEvent,
  formatDateWithWeekday,
  formatElapsed,
  formatTime,
  givenName,
  now,
  withTopic,
  type HomeSummary,
  type Presence,
} from '@/lib/care';
import { cn } from '@/lib/cn';

/** Figma 그라데이션(CSS 각도)을 시작·끝 좌표로 옮긴 값. 평소 상태의 끝색은 100% 지점의 색이다. */
const GRADIENTS = {
  alert: {
    colors: ['#FA8831', '#FA8831', '#FF686A'],
    locations: [0, 0.78431, 1],
    start: { x: 0.338, y: -0.076 },
    end: { x: 0.662, y: 1.076 },
  },
  normal: {
    colors: ['#0066CC', '#0066CC', '#00AFB7'],
    locations: [0, 0.66187, 1],
    start: { x: 0.361, y: -0.123 },
    end: { x: 0.639, y: 1.123 },
  },
} as const;

const PRESENCE_COPY: Record<Presence, string> = {
  present: '지금 계세요',
  measuring: '지금 계세요・건강 확인중',
  absent: '지금 안 계세요',
  difficult: '지금 확인이 어려워요',
  unknown: '지금 상태를 알 수 없어요',
};

function headline({ subjectLabel, status, statusMessage, primaryEvent }: HomeSummary) {
  if (primaryEvent) return `${withTopic(subjectLabel)} 확인이 필요해요`;
  if (status === 'ok') return `${withTopic(subjectLabel)} 오늘도 평소와 같으세요`;
  return statusMessage;
}

type CareBoardProps = {
  home: HomeSummary;
  /** 대상자 전화번호. 없으면 전화 걸기 버튼을 누를 수 없다 */
  phone: string | null;
};

/**
 * 홈 상단 알림보드.
 * 확인이 필요한 알림이 있으면 주황(818:608), 없으면 파랑(818:1104) 보드를 보여준다.
 */
export function CareBoard({ home, phone }: CareBoardProps) {
  const insets = useScreenInsets();
  const alert = home.primaryEvent;
  const bellIcon = alert ? 'tabAlerts' : 'bellHome';
  const greeting = home.guardianName
    ? `안녕하세요, ${givenName(home.guardianName)}님`
    : '안녕하세요';

  return (
    <LinearGradient
      {...(alert ? GRADIENTS.alert : GRADIENTS.normal)}
      className={cn('overflow-hidden rounded-b-2xl', alert ? 'pb-[23px]' : 'pb-[31px]')}
      style={{ paddingTop: insets.top + 4 }}
    >
      <View className="h-9 flex-row items-center justify-between px-6">
        <Text className="text-[24px] font-bold leading-[31px] tracking-[-0.6px] text-white">
          HuCare
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="알림"
          onPress={() => router.navigate('/alerts')}
          className="size-9 items-center justify-center rounded-full bg-white/80 active:opacity-60"
        >
          <Icon name={bellIcon} size={alert ? 24 : 26} />
        </Pressable>
      </View>

      <View className={cn('mt-5', alert ? 'pl-[26px]' : 'pl-6')}>
        <Text className="text-[16px] leading-[21px] tracking-[-0.4px] text-white">
          {formatDateWithWeekday(now())}
        </Text>
        <Text className="mt-[5px] text-[24px] font-bold leading-[34px] tracking-[-0.6px] text-white">
          {greeting}
          {'\n'}
          {headline(home)}
        </Text>
      </View>

      <View className="relative mr-6 mt-[21px]">
        <Icon
          name="cornerSmall"
          width={16}
          height={15}
          style={{ position: 'absolute', top: -15, left: 0, transform: [{ scaleY: -1 }] }}
        />
        <View className="h-[75px] flex-row items-center gap-3 rounded-r-full bg-white pl-6">
          <Icon name="profile" size={40} />
          <View>
            <View className="flex-row gap-3">
              <Text className="font-bold text-black">{home.subjectLabel}</Text>
              {home.place ? <Text className="font-bold text-black">{home.place}</Text> : null}
            </View>
            <Text className="mt-[2px] font-light text-black">{PRESENCE_COPY[home.presence]}</Text>
          </View>
        </View>
        {alert ? (
          <Icon
            name="cornerSmall"
            width={16}
            height={15}
            style={{ position: 'absolute', bottom: -15, left: 0 }}
          />
        ) : (
          <Icon
            name="cornerTall"
            width={16}
            height={31}
            style={{ position: 'absolute', bottom: -31, left: 0 }}
          />
        )}
      </View>

      {alert ? (
        <View className="mt-6 pl-[26px] pr-6">
          <Text className="font-semibold text-white">{alert.title}</Text>
          <Text className="font-light text-white">
            {formatTime(alert.at)}・{formatElapsed(alert.at)}
          </Text>
          <View className="mt-3 flex-row gap-2">
            <Button
              label="전화 걸기"
              variant="white"
              icon={<Icon name="phoneOrange" style={{ transform: [{ scaleX: -1 }] }} />}
              disabled={!phone}
              onPress={() => callPhone(phone)}
              className={cn('flex-1', !phone && 'opacity-50')}
            />
            <Button
              label="확인했어요"
              variant="whiteSoft"
              onPress={() => acknowledgeEvent(alert.id).catch(() => {})}
              className="flex-1"
            />
          </View>
        </View>
      ) : null}
    </LinearGradient>
  );
}
