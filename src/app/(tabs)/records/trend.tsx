import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

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
  trendRange,
  useHome,
  useTrend,
  type Trend,
  type TrendConfidence,
  type TrendMetric,
  type TrendMissing,
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

/** 어머니 · 이번 주 · 10월 26일–11월 1일 */
function periodCaption(period: TrendPeriod) {
  const today = now();
  if (period === 'day') return `오늘 · ${formatDate(today)}`;
  if (period === 'week') {
    const [from, until] = trendRange('week', today);
    return `이번 주 · ${formatDate(from)}–${formatDate(new Date(until.getTime() - 86_400_000))}`;
  }
  if (period === 'month') return `이번 달 · ${today.getMonth() + 1}월`;
  return `올해 · ${today.getFullYear()}년`;
}

function rangeDetail(period: TrendPeriod, count: number) {
  if (period === 'day') return `00:00–23:59 · 측정 ${count}회`;
  return `하루 평균을 이었어요 · 측정 ${count}회`;
}

const CONFIDENCE_LABEL: Record<TrendConfidence, string> = {
  verified: '확인된 측정',
  assumed: '추정한 값',
  mixed: '확인 · 추정 섞임',
  unknown: '측정',
};

/** 값이 하나도 없을 때. 0 이나 정상으로 보이지 않게 이유를 적는다 */
const MISSING_TEXT: Record<TrendMissing, string> = {
  no_device_binding: '기기를 연결하기 전이라 기록이 없어요.',
  offline: '기기 연결이 끊겨 기록이 없어요.',
  unsupported: '이 기기는 이 지표를 재지 않아요.',
  insufficient_quality: '측정 품질이 낮아 값을 보여드리지 않아요.',
  not_measured: '이 기간에는 측정 기록이 없어요.',
};

function baselineText(trend: Trend, unit: string) {
  const { baseline } = trend;
  if (baseline.status === 'unsupported') return null;
  if (baseline.status === 'collecting') {
    return baseline.requiredDays
      ? `개인 기준선을 만드는 중이에요 (${baseline.validDays}/${baseline.requiredDays}일)`
      : '개인 기준선을 만드는 중이에요';
  }
  const base = `개인 기준선 ${Math.round(baseline.value)} ${unit}`;
  if (trend.average === null) return base;
  const diff = Math.round(trend.average - baseline.value);
  return diff === 0
    ? `${base} · 기준선과 같아요`
    : `${base} · 평균이 ${diff > 0 ? '+' : ''}${diff}`;
}

/** 04-A 추세와 기록 (Figma 975:4275) */
export default function TrendScreen() {
  const [period, setPeriod] = useState<TrendPeriod>('day');
  const [metric, setMetric] = useState<TrendMetric>('hr');
  const [picked, setPicked] = useState<TrendPoint | null>(null);
  const subjectLabel = useHome().data?.subjectLabel;
  const resource = useTrend(metric, period);
  const series = resource.data;
  const unit = METRICS.find((item) => item.value === metric)!;

  const trend = useMemo(() => (series ? buildTrend(series, period) : null), [series, period]);
  const baseline = trend ? baselineText(trend, unit.unit) : null;
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

        {!trend ? (
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
              {baseline ? (
                <Text className="text-[12px] leading-[17px] tracking-normal text-care-green">
                  {baseline}
                </Text>
              ) : null}
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
                emptyText={MISSING_TEXT[trend.missing ?? 'not_measured']}
              />
              <Text className="text-[10px] leading-[15px] tracking-normal text-[#777777]">
                주황 실선 측정값 점선 기간 평균
                {trend.baseline.status === 'ready' ? ' · 초록 점선 개인 기준선' : ''}
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
                    ? `${selected.value} ${unit.unit} · ${CONFIDENCE_LABEL[selected.confidence ?? 'unknown']}`
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
