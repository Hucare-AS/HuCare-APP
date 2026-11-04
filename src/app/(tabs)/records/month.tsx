import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { RecordTabs, SummaryCard } from '@/components/records';
import { TabScreen } from '@/components/tab-screen';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import {
  dayKey,
  getDayRecord,
  getMonthRecords,
  isSameDay,
  NOW,
  useEvents,
  type DayStatus,
} from '@/lib/care';
import { cn } from '@/lib/cn';

const STATUS_DOT: Record<DayStatus, string> = {
  normal: 'bg-status-ok',
  alert: 'bg-status-alert',
  unknown: 'bg-muted',
};

const LEGEND: { status: DayStatus; label: string }[] = [
  { status: 'normal', label: '평소와 같던 날' },
  { status: 'alert', label: '알림 있던 날' },
  { status: 'unknown', label: '확인 못 한 날' },
];

/** 해당 월을 포함하는 일요일 시작 주 단위 날짜 */
function buildWeeks(year: number, month: number) {
  const first = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0).getDate();
  const weekCount = Math.ceil((first.getDay() + lastDay) / 7);
  return Array.from({ length: weekCount }, (_, week) =>
    Array.from(
      { length: 7 },
      (_, weekday) => new Date(year, month, 1 - first.getDay() + week * 7 + weekday),
    ),
  );
}

function DayCell({ date, month }: { date: Date; month: number }) {
  const inMonth = date.getMonth() === month;
  const record = inMonth ? getDayRecord(date) : null;
  const today = isSameDay(date, NOW);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${date.getMonth() + 1}월 ${date.getDate()}일`}
      disabled={!record}
      onPress={() => router.push({ pathname: '/records/[date]', params: { date: dayKey(date) } })}
      className={cn(
        'flex-1 items-center justify-center gap-2 border py-[13px] active:opacity-60',
        today ? 'rounded border-[#EDF1FF]' : 'border-transparent bg-white',
      )}
    >
      <Text className={cn('leading-[17px] tracking-normal', !inMonth && 'text-muted')}>
        {date.getDate()}
      </Text>
      <View className={cn('size-[5px] rounded-full', record && STATUS_DOT[record.status])} />
    </Pressable>
  );
}

/** 이번 달 기록 (Figma 793:919) */
export default function MonthRecordScreen() {
  const events = useEvents();
  const [cursor, setCursor] = useState({ year: NOW.getFullYear(), month: NOW.getMonth() });
  const { year, month } = cursor;
  const isCurrentMonth = year === NOW.getFullYear() && month === NOW.getMonth();

  const days = getMonthRecords(year, month);
  const normalDays = days.filter((day) => day.status === 'normal').length;
  const unknownDays = days.filter((day) => day.status === 'unknown').length;
  const alertCount = events.filter(
    ({ at }) => at.getFullYear() === year && at.getMonth() === month,
  ).length;
  const monthLabel = isCurrentMonth ? '이번 달' : `${month + 1}월`;

  const move = (delta: number) => {
    const next = new Date(year, month + delta, 1);
    setCursor({ year: next.getFullYear(), month: next.getMonth() });
  };

  return (
    <TabScreen title="기록" subtitle="어르신 건강이 확인된 기록이에요">
      <RecordTabs active="month" />
      <View className="mt-4 px-6">
        {days.length ? (
          <SummaryCard
            title={`${monthLabel} ${days.length}일 중 ${normalDays}일은 평소와 같으셨어요`}
            detail={`알림 ${alertCount}건 · 확인 못 한 날 ${unknownDays}일`}
          />
        ) : (
          <SummaryCard title={`${monthLabel} 기록이 없어요`} detail="확인된 날이 없어요" />
        )}

        <View className="mt-[18px] flex-row items-center justify-center gap-4">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="이전 달"
            hitSlop={8}
            onPress={() => move(-1)}
            className="active:opacity-60"
          >
            <Icon name="chevronBlack" style={{ transform: [{ rotate: '90deg' }] }} />
          </Pressable>
          <Text variant="dateTitle">
            {year}년 {month + 1}월
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="다음 달"
            accessibilityState={{ disabled: isCurrentMonth }}
            disabled={isCurrentMonth}
            hitSlop={8}
            onPress={() => move(1)}
            className={cn('active:opacity-60', isCurrentMonth && 'opacity-30')}
          >
            <Icon name="chevronBlack" style={{ transform: [{ rotate: '-90deg' }] }} />
          </Pressable>
        </View>

        <View className="mt-4">
          {buildWeeks(year, month).map((week) => (
            <View key={dayKey(week[0])} className="flex-row">
              {week.map((date) => (
                <DayCell key={dayKey(date)} date={date} month={month} />
              ))}
            </View>
          ))}
        </View>

        <View className="mt-2 flex-row gap-2">
          {LEGEND.map(({ status, label }) => (
            <View key={status} className="flex-row items-center gap-2">
              <View className={cn('size-[5px] rounded-full', STATUS_DOT[status])} />
              <Text className="text-[13px] leading-[16px] tracking-normal text-black">{label}</Text>
            </View>
          ))}
        </View>

        <Text variant="note" className="mt-6">
          날짜를 누르면 그날 기록을 자세히 볼 수 있어요.
        </Text>
      </View>
    </TabScreen>
  );
}
