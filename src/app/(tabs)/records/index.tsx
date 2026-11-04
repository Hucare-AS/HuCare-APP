import { View } from 'react-native';

import { MeasurementBlock, RecordTabs, SummaryCard } from '@/components/records';
import { TabScreen } from '@/components/tab-screen';
import { Text } from '@/components/ui/text';
import { getTodayRecord, isSameDay, NOW, useEvents } from '@/lib/care';

/** 오늘 기록 (Figma 786:455) */
export default function TodayRecordScreen() {
  const events = useEvents();
  const today = getTodayRecord();
  const alertCount = events.filter((event) => isSameDay(event.at, NOW)).length;
  const [heartMin, heartMax] = today.heartRange ?? [];

  return (
    <TabScreen title="기록" subtitle="어르신 건강이 확인된 기록이에요">
      <RecordTabs active="today" />
      <View className="mt-4 px-6">
        <SummaryCard
          title={`오늘 ${today.measurements.length}번 확인했어요`}
          detail={`알림 ${alertCount}건 · 심박수 ${heartMin}~${heartMax}`}
        />
        <Text variant="section" className="mt-6 text-black">
          시간별
        </Text>
        <View className="mt-1 gap-5">
          {today.measurements.map((measurement) => (
            <MeasurementBlock key={measurement.id} measurement={measurement} />
          ))}
        </View>
        <Text variant="note" className="mt-6">
          비어 있는 시간이 있어도 괜찮아요. 카메라 앞에 계실 때만 확인됩니다.
        </Text>
      </View>
    </TabScreen>
  );
}
