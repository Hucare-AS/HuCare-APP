import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import { LoadState } from '@/components/load-state';
import { MeasurementBlock, SummaryCard } from '@/components/records';
import { Screen } from '@/components/screen';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import {
  average,
  formatFullDate,
  metricValues,
  parseDayKey,
  useDayRecord,
  type DayRecord,
  type DayStatus,
} from '@/lib/care';

const DAY_TITLE: Record<DayStatus, string> = {
  normal: '이 날은 평소와 같으셨어요',
  alert: '이 날은 알림이 있었어요',
  unknown: '이 날은 확인하지 못했어요',
};

function summaryDetail({ measurementCount, measurements }: DayRecord) {
  if (!measurementCount) return '확인된 기록이 없어요';
  const heart = average(metricValues(measurements, 'hr'));
  const oxygen = average(metricValues(measurements, 'spo2'));
  return [
    `${measurementCount}번 확인`,
    heart !== null ? `심박수 평균 ${heart}` : null,
    oxygen !== null ? `산소 ${oxygen}%` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

/**
 * 날짜별 기록 (Figma 799:1159). 주소: /records/day?date=2026-10-14
 * 정적 배포에서도 날짜마다 HTML 을 만들 필요가 없도록 날짜를 쿼리로 받는다.
 */
export default function DayRecordScreen() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  const insets = useScreenInsets();
  const valid = parseDayKey(date) !== null;
  const resource = useDayRecord(valid ? date! : null);
  const record = resource.data;

  return (
    <Screen>
      <View className="h-[57px] flex-row items-center gap-[18px] px-6">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="뒤로가기"
          hitSlop={12}
          onPress={() => router.dismissTo('/records/month')}
          className="active:opacity-60"
        >
          <Icon name="chevronBlack" style={{ transform: [{ rotate: '90deg' }] }} />
        </Pressable>
        <Text className="text-[20px] font-semibold leading-[30px] tracking-[-0.5px]">이번 달</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {record ? (
          <View className="px-6 pt-1">
            <Text variant="dateTitle">{formatFullDate(record.date)}</Text>
            <View className="mt-4">
              <SummaryCard title={DAY_TITLE[record.status]} detail={summaryDetail(record)} />
            </View>
            {record.measurements.length ? (
              <>
                <Text variant="section" className="mt-6 text-black">
                  그날 기록
                </Text>
                <View className="mt-1 gap-5">
                  {record.measurements.map((measurement) => (
                    <MeasurementBlock key={measurement.id} measurement={measurement} />
                  ))}
                </View>
              </>
            ) : null}
            <Text variant="note" className="mt-6">
              어르신이 카메라 앞에 계실 때만 확인돼요.
            </Text>
          </View>
        ) : valid || date === undefined ? (
          // 정적 HTML 에는 쿼리가 없으므로 하이드레이션이 어긋나지 않게 같은 로딩 화면을 그린다
          <LoadState resource={resource} />
        ) : (
          <Text className="px-6 pt-1 text-muted">이 날짜의 기록을 찾을 수 없어요.</Text>
        )}
      </ScrollView>
    </Screen>
  );
}
