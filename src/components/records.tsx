import { router } from 'expo-router';
import { View } from 'react-native';

import { StatusChip, VitalsRow } from '@/components/metrics';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { formatTime, type Measurement } from '@/lib/care';

/** 오늘 기록 / 이번 달 기록 전환 버튼 */
export function RecordTabs({ active }: { active: 'today' | 'month' }) {
  return (
    <View className="mt-[22px] flex-row gap-2 px-6">
      <Button
        label="오늘 기록"
        variant={active === 'today' ? 'primary' : 'outline'}
        accessibilityState={{ selected: active === 'today' }}
        onPress={() => active !== 'today' && router.replace('/records')}
        className="flex-1"
      />
      <Button
        label="이번 달 기록"
        variant={active === 'month' ? 'primary' : 'outline'}
        accessibilityState={{ selected: active === 'month' }}
        onPress={() => active !== 'month' && router.replace('/records/month')}
        className="flex-1"
      />
    </View>
  );
}

/** 베이지 요약 카드 */
export function SummaryCard({ title, detail }: { title: string; detail: string }) {
  return (
    <View className="justify-center gap-1 rounded-lg bg-sand px-[19px] py-[20px]">
      <Text variant="cardTitle" className="tracking-normal text-black">
        {title}
      </Text>
      <Text className="font-medium leading-[17px] tracking-normal text-black">{detail}</Text>
    </View>
  );
}

/** 측정 시각 + 상태 칩 + 지표 카드 */
export function MeasurementBlock({ measurement }: { measurement: Measurement }) {
  return (
    <View className="gap-[9px]">
      <View className="flex-row items-end justify-between">
        <Text className="text-[16px] leading-[19px] tracking-normal text-black">
          {formatTime(measurement.at)}에 확인했어요
        </Text>
        <StatusChip label="괜찮아요" />
      </View>
      <VitalsRow measurement={measurement} />
    </View>
  );
}
