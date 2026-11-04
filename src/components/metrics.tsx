import { View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { detailMetrics, type Measurement } from '@/lib/care';
import { cn } from '@/lib/cn';

/** 초록 상태 칩 (괜찮아요 · 평소와 비슷해요) */
export function StatusChip({ label, className }: { label: string; className?: string }) {
  return (
    <View className={cn('h-[22px] justify-center rounded-lg bg-status-ok/20 px-[10px]', className)}>
      <Text
        numberOfLines={1}
        className="text-[13px] font-semibold leading-[17px] tracking-[-0.325px] text-status-ok"
      >
        {label}
      </Text>
    </View>
  );
}

type MetricCardProps = {
  label: string;
  value: number;
  unit?: string;
  valueClassName: string;
  icon: IconName;
  chip?: string;
  /** 2행(지표) 카드: 라벨이 두 줄까지 들어가도록 더 높다 */
  tall?: boolean;
};

/** 110px 카드 + 오른쪽 위에 걸친 아이콘 원 (Figma 832:1264) */
function MetricCard({
  label,
  value,
  unit,
  valueClassName,
  icon,
  chip = '괜찮아요',
  tall = false,
}: MetricCardProps) {
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
            className={cn('text-[32px] font-bold leading-[32px] tracking-normal', valueClassName)}
          >
            {value}
          </Text>
          {unit ? (
            <Text className="text-[14px] font-medium leading-[17px] tracking-normal text-muted">
              {unit}
            </Text>
          ) : null}
        </View>
        <StatusChip
          label={chip}
          className={cn('absolute', tall ? 'bottom-[7px] px-2' : 'top-[89px]')}
        />
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
        value={measurement.heartRate}
        unit="bpm"
        valueClassName="text-metric-heart"
        icon="metricHeart"
      />
      <MetricCard
        label="호흡수"
        value={measurement.breathRate}
        unit="회/분"
        valueClassName="text-metric-breath"
        icon="metricLungs"
      />
      <MetricCard
        label="산소포화도"
        value={measurement.oxygen}
        unit="%"
        valueClassName="text-metric-oxygen"
        icon="metricAir"
      />
    </View>
  );
}

/** "자세한 값 더보기"로 펼치는 카드 3개 (Figma 831:681) */
export function DetailMetricsRow() {
  const chip = '평소와 비슷해요';
  return (
    <View className="flex-row gap-1">
      <MetricCard
        tall
        label="심장 리듬 안정도"
        value={detailMetrics.rhythm}
        valueClassName="text-metric-rhythm"
        icon="metricRhythm"
        chip={chip}
      />
      <MetricCard
        tall
        label="긴장도"
        value={detailMetrics.tension}
        valueClassName="text-metric-tension"
        icon="metricGauge"
        chip={chip}
      />
      <MetricCard
        tall
        label="체력 지표"
        value={detailMetrics.stamina}
        valueClassName="text-metric-stamina"
        icon="metricStamina"
        chip={chip}
      />
    </View>
  );
}
