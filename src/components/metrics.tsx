import { View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { Assessment, Measurement, Metric } from '@/lib/care';
import { cn } from '@/lib/cn';

export type ChipTone = 'ok' | 'alert';

/** 상태 칩. 초록: 괜찮아요 · 평소와 비슷해요, 주황: 평소와 달라요 */
export function StatusChip({
  label,
  tone = 'ok',
  className,
}: {
  label: string;
  tone?: ChipTone;
  className?: string;
}) {
  return (
    <View
      className={cn(
        'h-[22px] justify-center rounded-lg px-[10px]',
        tone === 'ok' ? 'bg-status-ok/20' : 'bg-status-alert/20',
        className,
      )}
    >
      <Text
        numberOfLines={1}
        className={cn(
          'text-[13px] font-semibold leading-[17px] tracking-[-0.325px]',
          tone === 'ok' ? 'text-status-ok' : 'text-status-alert',
        )}
      >
        {label}
      </Text>
    </View>
  );
}

/** 판정에 맞는 칩. 판단할 수 없으면 칩을 보이지 않는다 */
export function chipFor(assessment: Assessment, usualLabel = '괜찮아요') {
  if (assessment === 'usual') return { label: usualLabel, tone: 'ok' as const };
  if (assessment === 'changed') return { label: '평소와 달라요', tone: 'alert' as const };
  return null;
}

type MetricCardProps = {
  label: string;
  metric: Metric;
  unit?: string;
  valueClassName: string;
  icon: IconName;
  /** 평소와 비슷할 때 칩 문구 */
  usualLabel?: string;
  /** 2행(지표) 카드: 라벨이 두 줄까지 들어가도록 더 높다 */
  tall?: boolean;
};

/** 110px 카드 + 오른쪽 위에 걸친 아이콘 원 (Figma 832:1264) */
function MetricCard({
  label,
  metric,
  unit,
  valueClassName,
  icon,
  usualLabel,
  tall = false,
}: MetricCardProps) {
  const chip = chipFor(metric.assessment, usualLabel);
  const missing = metric.value === null;
  return (
    <View className="flex-1 pt-[11px]">
      <View
        className={cn(
          'mr-[2px] items-center rounded-lg bg-white shadow-card',
          tall ? 'h-[138px]' : 'h-[118px]',
        )}
      >
        <Text
          className={cn(
            'absolute left-3 top-3 text-[13px] font-medium leading-[16px] tracking-normal text-black',
            tall && 'w-[60px]',
          )}
        >
          {label}
        </Text>
        <View
          className={cn('absolute flex-row items-end gap-1', tall ? 'top-[55px]' : 'top-[43px]')}
        >
          <Text
            accessibilityLabel={missing ? `${label} 측정값 없음` : undefined}
            className={cn(
              'text-[32px] font-bold leading-[32px] tracking-normal',
              missing ? 'text-muted' : valueClassName,
            )}
          >
            {missing ? '-' : Math.round(metric.value!)}
          </Text>
          {unit && !missing ? (
            <Text className="text-[14px] font-medium leading-[17px] tracking-normal text-muted">
              {unit}
            </Text>
          ) : null}
        </View>
        {chip ? (
          <StatusChip
            label={chip.label}
            tone={chip.tone}
            className={cn('absolute', tall ? 'bottom-[7px] px-2' : 'top-[89px]')}
          />
        ) : null}
      </View>
      {/* 360px 폭에서는 원이 '산소포화도' 라벨을 가리지 않도록 줄인다 */}
      <View className="absolute right-0 top-0 size-8 items-center justify-center rounded-full bg-white shadow-badge min-[375px]:h-[42px] min-[375px]:w-10">
        <Icon name={icon} size={20} />
      </View>
    </View>
  );
}

/** 심박수 · 호흡수 · 산소포화도 카드 3개 */
export function VitalsRow({ measurement }: { measurement: Measurement }) {
  return (
    <View className="flex-row gap-1">
      <MetricCard
        label="심박수"
        metric={measurement.metrics.hr}
        unit="bpm"
        valueClassName="text-metric-heart"
        icon="metricHeart"
      />
      <MetricCard
        label="호흡수"
        metric={measurement.metrics.rr}
        unit="회/분"
        valueClassName="text-metric-breath"
        icon="metricLungs"
      />
      <MetricCard
        label="산소포화도"
        metric={measurement.metrics.spo2}
        unit="%"
        valueClassName="text-metric-oxygen"
        icon="metricAir"
      />
    </View>
  );
}

/** "자세한 값 더보기"로 펼치는 카드 3개 (Figma 831:681) */
export function DetailMetricsRow({ measurement }: { measurement: Measurement }) {
  const usualLabel = '평소와 비슷해요';
  return (
    <View className="flex-row gap-1">
      <MetricCard
        tall
        label="심장 리듬 안정도"
        metric={measurement.metrics.hrv}
        valueClassName="text-metric-rhythm"
        icon="metricRhythm"
        usualLabel={usualLabel}
      />
      <MetricCard
        tall
        label="긴장도"
        metric={measurement.metrics.stress}
        valueClassName="text-metric-tension"
        icon="metricGauge"
        usualLabel={usualLabel}
      />
      <MetricCard
        tall
        label="체력 지표"
        metric={measurement.metrics.vo2max}
        valueClassName="text-metric-stamina"
        icon="metricStamina"
        usualLabel={usualLabel}
      />
    </View>
  );
}
