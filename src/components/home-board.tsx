import { router, useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { LoadState } from '@/components/load-state';
import { DetailMetricsRow } from '@/components/metrics';
import { Screen } from '@/components/screen';
import { DEVICE_LABEL, formatClock } from '@/components/subject-card';
import { useTabBarSpace } from '@/components/tab-screen';
import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { Segmented } from '@/components/ui/segmented';
import { Text } from '@/components/ui/text';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { callPhone } from '@/lib/call';
import {
  acknowledgeEvent,
  formatDate,
  isSameDay,
  now,
  todayKey,
  useDayRecord,
  useEvents,
  useHome,
  useProfile,
  useTrend,
  withTopic,
  type BaselineDelta,
  type HomeSummary,
  type Measurement,
  type Metric,
  type Presence,
  type TimelineBar,
  type TrendPeriod,
} from '@/lib/care';
import { cn } from '@/lib/cn';

const BAR_TONES: Record<TimelineBar['tone'], string> = {
  idle: 'bg-metric-tension/20',
  home: 'bg-status-ok',
  checked: 'bg-status-alert',
};

const PERIODS: { value: TrendPeriod; label: string }[] = [
  { value: 'day', label: '일간' },
  { value: 'week', label: '주간' },
  { value: 'month', label: '월간' },
  { value: 'year', label: '연간' },
];

const PRESENCE_TITLE: Record<Presence, (place: string) => string> = {
  present: (place) => `지금 ${place}에 계세요`,
  measuring: (place) => `지금 ${place}에서 건강을 확인하고 있어요`,
  absent: () => '지금 안 계세요',
  difficult: () => '지금 확인이 어려워요',
  unknown: () => '지금 상태를 알 수 없어요',
};

/** 오늘 14:32 · 어제면 날짜 */
function whenText(at: Date) {
  return isSameDay(at, now()) ? `오늘 ${formatClock(at)}` : `${formatDate(at)} ${formatClock(at)}`;
}

function LegendDot({ label, className }: { label: string; className: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <View className={cn('size-[5px] rounded-full', className)} />
      <Text className="text-[13px] leading-[16px] tracking-normal text-black">{label}</Text>
    </View>
  );
}

/** 주황 머리 (Figma 02-B 986:5502): 대상 이름 · 장소 · 기기 · 마지막 확인, 그리고 지금 상태 또는 확인할 알림 */
function SubjectHeader({ home, phone }: { home: HomeSummary; phone: string | null }) {
  const insets = useScreenInsets();
  const alert = home.primaryEvent;
  const place = home.place ?? '집';
  const meta = [
    home.place,
    home.device ? DEVICE_LABEL[home.device] : null,
    home.latest ? whenText(home.latest.at) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View
      className="gap-3 rounded-b-2xl bg-primary px-6 pb-6"
      style={{ paddingTop: insets.top + 4 }}
    >
      <View className="h-9 flex-row items-center justify-between">
        <Text className="text-[24px] font-bold leading-[31px] tracking-[-0.6px] text-white">
          HuCare
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="알림"
          onPress={() => router.navigate('/alerts')}
          className="size-9 items-center justify-center rounded-full bg-white/80 active:opacity-60"
        >
          <Icon name="tabAlerts" />
        </Pressable>
      </View>
      <Text className="text-[24px] font-bold leading-[35px] tracking-normal text-white">
        {home.subjectLabel}
      </Text>
      {meta ? <Text className="leading-[20px] tracking-normal text-white">{meta}</Text> : null}

      {alert ? (
        <View className="gap-2 rounded-lg bg-sand p-4">
          <Text className="font-semibold leading-[20px] tracking-normal">
            {withTopic(home.subjectLabel)} 확인이 필요해요
          </Text>
          <Text className="text-[12px] leading-[17px] tracking-normal">
            {alert.title} · {whenText(alert.at)}
          </Text>
          <View className="mt-1 flex-row gap-2">
            <Button
              label="전화 걸기"
              variant="outline"
              icon={<Icon name="phoneOrange" style={{ transform: [{ scaleX: -1 }] }} />}
              disabled={!phone}
              onPress={() => callPhone(phone)}
              className={cn('flex-1', !phone && 'opacity-50')}
            />
            <Button
              label="확인했어요"
              onPress={() => acknowledgeEvent(alert.id).catch(() => {})}
              className="flex-1"
            />
          </View>
        </View>
      ) : (
        <View className="gap-2 rounded-lg bg-sand p-4">
          <Text className="font-semibold leading-[20px] tracking-normal">
            {PRESENCE_TITLE[home.presence](place)}
          </Text>
          <Text className="text-[12px] leading-[17px] tracking-normal">
            {[home.statusMessage.replace(/\.$/, ''), home.latest ? whenText(home.latest.at) : null]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
      )}
    </View>
  );
}

type VitalProps = {
  label: string;
  metric: Metric;
  unit: string;
  icon: IconName;
  valueClassName: string;
  baseline: BaselineDelta | undefined;
  at: Date;
};

function baselineText(baseline: BaselineDelta | undefined) {
  if (!baseline) return null;
  if (baseline.status === 'collecting') return '기준선 생성 중';
  const diff = Math.round(baseline.deviation);
  return `기준선 대비 ${diff > 0 ? '+' : ''}${diff}`;
}

/** HC/metric (Figma 961:4313): 값 · 기준선 대비 · 측정 시각과 신뢰도 */
export function VitalCard({ label, metric, unit, icon, valueClassName, baseline, at }: VitalProps) {
  const missing = metric.value === null;
  const delta = missing ? null : baselineText(baseline);
  return (
    <View className="flex-1 gap-2 rounded-lg bg-white p-4 shadow-card">
      <View className="flex-row items-center justify-between">
        <Text className="text-[13px] font-medium leading-[19px] tracking-normal text-muted">
          {label}
        </Text>
        <Icon name={icon} size={20} />
      </View>
      <View className="flex-row items-end gap-1">
        <Text
          accessibilityLabel={missing ? `${label} 측정값 없음` : undefined}
          className={cn(
            'text-[32px] font-bold leading-[40px] tracking-normal',
            missing ? 'text-muted' : valueClassName,
          )}
        >
          {missing ? '-' : Math.round(metric.value!)}
        </Text>
        {missing ? null : (
          <Text className="pb-[5px] text-[14px] leading-[20px] tracking-normal text-muted">
            {unit}
          </Text>
        )}
      </View>
      {delta ? (
        <Text className="text-[11px] leading-[16px] tracking-normal text-care-green">{delta}</Text>
      ) : null}
      <Text className="text-[10px] leading-[15px] tracking-normal text-muted">
        {[formatClock(at), metric.confidence].filter(Boolean).join(' · ')}
      </Text>
    </View>
  );
}

function Vitals({ measurement, home }: { measurement: Measurement; home: HomeSummary }) {
  return (
    <View className="flex-row gap-3">
      <VitalCard
        label="심박수"
        metric={measurement.metrics.hr}
        unit="bpm"
        icon="metricHeart"
        valueClassName="text-metric-heart"
        baseline={home.baselines.hr}
        at={measurement.at}
      />
      <VitalCard
        label="호흡수"
        metric={measurement.metrics.rr}
        unit="회/분"
        icon="metricLungs"
        valueClassName="text-metric-breath"
        baseline={home.baselines.rr}
        at={measurement.at}
      />
    </View>
  );
}

/** 일간: 오늘 시간대별 재실 · 건강 확인 막대 */
function DayBars() {
  const timeline = useDayRecord(todayKey()).data?.timeline ?? [];
  return (
    <>
      <View className="h-[121px] rounded-lg bg-white px-[11px] pt-[10px]">
        <View className="h-[86px] flex-row items-end justify-center gap-px">
          {timeline.map((bar, index) => (
            <View
              key={index}
              className={cn('w-3 rounded', BAR_TONES[bar.tone])}
              style={{ height: bar.height }}
            />
          ))}
        </View>
        <View className="mt-1 flex-row justify-between">
          {['0시', '06시', '12시', '18시', '24시'].map((hour) => (
            <Text
              key={hour}
              className="text-[12px] font-medium leading-[17px] tracking-[-0.3px] text-muted"
            >
              {hour}
            </Text>
          ))}
        </View>
      </View>
      <View className="flex-row gap-[11px]">
        <LegendDot label="집에 계셨어요" className="bg-status-ok" />
        <LegendDot label="건강 확인됨" className="bg-status-alert" />
      </View>
    </>
  );
}

const PERIOD_TICKS: Record<Exclude<TrendPeriod, 'day'>, string[]> = {
  week: ['월', '화', '수', '목', '금', '토', '일'],
  month: ['1일', '8일', '15일', '22일', '29일'],
  year: ['1월', '4월', '7월', '10월', '12월'],
};

/** 주간 · 월간 · 연간: 날마다 건강을 확인한 횟수 */
function PeriodBars({ period }: { period: Exclude<TrendPeriod, 'day'> }) {
  const resource = useTrend('hr', period);
  const buckets = resource.data?.buckets ?? [];
  const max = Math.max(1, ...buckets.map((bucket) => bucket.count));
  return (
    <>
      <View className="h-[121px] rounded-lg bg-white px-[11px] pt-[10px]">
        {resource.data ? (
          <View className="h-[86px] flex-row items-end gap-px">
            {buckets.map((bucket) => (
              <View
                key={bucket.start.getTime()}
                className={cn(
                  'flex-1 rounded',
                  bucket.count ? 'bg-status-alert' : 'bg-metric-tension/20',
                )}
                style={{ height: bucket.count ? Math.max(4, (bucket.count / max) * 86) : 2 }}
              />
            ))}
          </View>
        ) : (
          <LoadState resource={resource} className="h-[86px] justify-center" />
        )}
        <View className="mt-1 flex-row justify-between">
          {PERIOD_TICKS[period].map((tick) => (
            <Text
              key={tick}
              className="text-[12px] font-medium leading-[17px] tracking-[-0.3px] text-muted"
            >
              {tick}
            </Text>
          ))}
        </View>
      </View>
      <View className="flex-row gap-[11px]">
        <LegendDot label="건강 확인 횟수" className="bg-status-alert" />
      </View>
    </>
  );
}

/** 오늘 이벤트 N건 · 확인할 이벤트가 남았는지 */
function TodayEvents() {
  const events = useEvents().data ?? [];
  const today = events.filter((event) => isSameDay(event.at, now()));
  const open = today.filter((event) => !event.ack).length;
  return (
    <View className="gap-[5px] py-[10px]">
      <Text className="text-[15px] font-semibold leading-[22px] tracking-normal">
        오늘 이벤트 {today.length}건
      </Text>
      <Text className="text-[12px] leading-[17px] tracking-normal text-muted">
        {open
          ? '확인이 필요한 이벤트가 있어요'
          : today.length
            ? '모두 확인했어요'
            : '오늘은 이벤트가 없어요'}
      </Text>
    </View>
  );
}

/** 한 대상의 대시보드 (Figma 02-B 986:5501). 대상이 1명이면 홈, 여러 명이면 대상 카드를 눌러 들어온다. */
export function HomeBoard() {
  const homeResource = useHome();
  const home = homeResource.data;
  const phone = useProfile().data?.phone ?? null;
  const [expanded, setExpanded] = useState(false);
  const [period, setPeriod] = useState<TrendPeriod>('day');
  const bottomSpace = useTabBarSpace();
  const latest = home?.latest ?? null;

  // 주황 머리가 상태바까지 덮으므로 홈에서만 상태바 글자를 흰색으로 둔다
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, []),
  );

  if (!home) {
    return (
      <Screen>
        <LoadState resource={homeResource} className="flex-1 justify-center" />
      </Screen>
    );
  }

  return (
    <Screen top={false}>
      <ScrollView contentContainerStyle={{ paddingBottom: bottomSpace }}>
        <SubjectHeader home={home} phone={phone} />

        <View className="gap-[18px] px-6 pt-4">
          {latest ? (
            <>
              <Vitals measurement={latest} home={home} />
              {expanded ? <DetailMetricsRow measurement={latest} /> : null}
              <Button
                label={expanded ? '접기' : '자세한 값 더보기'}
                variant="ghost"
                accessibilityState={{ expanded }}
                onPress={() => setExpanded(!expanded)}
              />
            </>
          ) : (
            <Text variant="note">아직 확인된 건강 기록이 없어요.</Text>
          )}

          <TodayEvents />
          <Button label="기록 자세히 보기" onPress={() => router.navigate('/records')} />

          <View className="gap-1">
            <View className="flex-row items-center justify-between">
              <Text className="text-[20px] font-semibold leading-[28px] tracking-[-0.5px] text-black">
                최근 기록
              </Text>
              <Segmented
                label="최근 기록 기간"
                options={PERIODS}
                value={period}
                onChange={setPeriod}
                itemClassName="w-10 px-0"
              />
            </View>
            <View className="gap-2">
              {period === 'day' ? <DayBars /> : <PeriodBars period={period} />}
            </View>
          </View>

          {/* 사진은 카메라형 기기만 남긴다 (레이더형은 숨김) */}
          {home.device === 'camera' ? (
            <Button label="사진 보기" variant="ghost" onPress={() => router.push('/home/photos')} />
          ) : null}
          <Button
            label="대상 추가"
            variant="outline"
            onPress={() => router.push('/home/register')}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
