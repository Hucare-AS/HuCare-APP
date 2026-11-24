import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { Note } from '@/components/care-form';
import { LoadState } from '@/components/load-state';
import { formatClock } from '@/components/subject-card';
import { TabScreen } from '@/components/tab-screen';
import { TrendChart } from '@/components/trend-chart';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { Text } from '@/components/ui/text';
import {
  buildTrend,
  formatDate,
  now,
  useHome,
  useTrendDays,
  type TrendMetric,
  type TrendPeriod,
  type TrendPoint,
} from '@/lib/care';

const PERIODS: { value: TrendPeriod; label: string }[] = [
  { value: 'day', label: '일간' },
  { value: 'week', label: '주간' },
  { value: 'month', label: '월간' },
  { value: 'year', label: '연간' },
];

const METRICS: { value: TrendMetric; label: string; unit: string }[] = [
  { value: 'hr', label: '심박수', unit: 'bpm' },
  { value: 'rr', label: '호흡수', unit: '회/분' },
  { value: 'spo2', label: '산소포화도', unit: '%' },
];

/** 어머니 · 오늘 · 11월 23일 */
function periodCaption(period: TrendPeriod) {
  const today = now();
  if (period === 'day') return `오늘 · ${formatDate(today)}`;
  if (period === 'week')
    return `최근 7일 · ${formatDate(new Date(today.getTime() - 6 * 86_400_000))}–${formatDate(today)}`;
  if (period === 'month') return `이번 달 · ${today.getMonth() + 1}월`;
  return `올해 · ${today.getFullYear()}년`;
}

function rangeDetail(period: TrendPeriod, count: number) {
  if (period === 'day') return `00:00–23:59 · 측정 ${count}회`;
  return `하루 평균을 이었어요 · 측정 ${count}회`;
}

/** 04-A 추세와 기록 (Figma 975:4275) */
export default function TrendScreen() {
  const [period, setPeriod] = useState<TrendPeriod>('day');
  const [metric, setMetric] = useState<TrendMetric>('hr');
  const [picked, setPicked] = useState<TrendPoint | null>(null);
  const subjectLabel = useHome().data?.subjectLabel;
  const resource = useTrendDays(period);
  const days = resource.data;
  const unit = METRICS.find((item) => item.value === metric)!;

  const trend = useMemo(
    () => (days ? buildTrend(days, metric, period) : null),
    [days, metric, period],
  );
  const points = trend?.segments.flat() ?? [];
  // 고른 점이 지금 그래프에 없으면 가장 최근 점을 보여준다
  const selected = points.find((point) => point === picked) ?? points[points.length - 1] ?? null;

  const change =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value);
      setPicked(null);
    };

  return (
    <TabScreen title="추세와 기록">
      <View className="mt-2 gap-2 px-6">
        <Segmented
          label="기간"
          options={PERIODS}
          value={period}
          onChange={change(setPeriod)}
          itemClassName="w-10 px-0"
        />
        <Segmented
          label="지표"
          options={METRICS}
          value={metric}
          onChange={change(setMetric)}
          activeClassName="bg-status-ok"
        />
        <Text className="leading-[20px] tracking-normal text-[#777777]">
          {[subjectLabel, periodCaption(period)].filter(Boolean).join(' · ')}
        </Text>

        {days === null ? (
          <Note
            title="연간 추세는 아직 볼 수 없어요"
            body="일간 · 주간 · 월간 추세를 먼저 확인해 주세요."
          />
        ) : !trend ? (
          <LoadState resource={resource} />
        ) : (
          <>
            <View className="gap-[10px] rounded-lg bg-white p-4">
              <Text className="text-[28px] font-bold leading-[41px] tracking-normal">
                {trend.average !== null ? `평균 ${trend.average} ${unit.unit}` : '측정 기록 없음'}
              </Text>
              <Text className="text-[12px] leading-[17px] tracking-normal text-[#777777]">
                {rangeDetail(period, trend.count)}
              </Text>
            </View>

            <View className="gap-[10px] rounded-lg bg-white p-4">
              <Text className="text-[13px] leading-[19px] tracking-normal text-[#777777]">
                {unit.label} · {unit.unit}
              </Text>
              <TrendChart
                trend={trend}
                selected={selected}
                onSelect={setPicked}
                label={`${unit.label} 그래프`}
              />
              <Text className="text-[10px] leading-[15px] tracking-normal text-[#777777]">
                주황 실선 측정값 점선 기간 평균
              </Text>
              <Text className="text-[10px] leading-[15px] tracking-normal text-care-green">
                회색 구간 측정 없음
              </Text>
            </View>

            {selected ? (
              <View className="gap-[5px] py-[10px]">
                <Text className="text-[15px] font-semibold leading-[22px] tracking-normal">
                  선택 구간 ·{' '}
                  {period === 'day' ? formatClock(selected.at) : formatDate(selected.at)}
                </Text>
                <Text className="text-[12px] leading-[17px] tracking-normal text-muted">
                  {period === 'day'
                    ? `${selected.value} ${unit.unit} · 확인된 측정`
                    : `평균 ${selected.value} ${unit.unit} · 측정 ${selected.count}회`}
                </Text>
              </View>
            ) : null}
          </>
        )}

        <Button
          label="측정 내역 보기"
          variant="outline"
          onPress={() => router.navigate('/records')}
          className="mt-2"
        />
      </View>
    </TabScreen>
  );
}
