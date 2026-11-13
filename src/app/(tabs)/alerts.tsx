import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AlertSheet, ackMessage } from '@/components/alert-sheet';
import { LoadState } from '@/components/load-state';
import { TabScreen } from '@/components/tab-screen';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import {
  dayKey,
  formatDate,
  formatTime,
  isSameDay,
  now,
  useEvents,
  type CareEvent,
} from '@/lib/care';

function dayLabel(date: Date) {
  const today = now();
  if (isSameDay(date, today)) return '오늘';
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  return isSameDay(date, yesterday) ? '어제' : formatDate(date);
}

function groupByDay(events: CareEvent[]) {
  const groups = new Map<string, CareEvent[]>();
  for (const event of events) {
    const key = dayKey(event.at);
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }
  return [...groups.values()];
}

function AlertCard({ event, onPress }: { event: CareEvent; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={event.title}
      onPress={onPress}
      className="gap-1 rounded-lg bg-sand px-3 py-4 active:opacity-70"
    >
      <View className="flex-row items-center justify-between">
        <View className="gap-1 px-1">
          <Text variant="cardTitle" className="tracking-normal text-black">
            {event.title}
          </Text>
          <Text className="leading-[21px] tracking-normal text-black">
            {formatDate(event.at)} {formatTime(event.at)}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          {event.ack ? null : (
            <Text className="font-semibold leading-[17px] tracking-normal text-primary">
              확인 필요
            </Text>
          )}
          <Icon
            name={event.ack ? 'chevronBlack' : 'chevronOrange'}
            style={{ transform: [{ rotate: '-90deg' }] }}
          />
        </View>
      </View>
      {event.ack ? (
        <View className="h-[33px] justify-center rounded-full bg-white px-[14px]">
          <Text className="font-medium text-primary">{ackMessage(event.ack)}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function DayDivider({ label }: { label: string }) {
  return (
    <View className="h-7 flex-row items-center gap-[17px]">
      <View className="h-px flex-1 bg-[#D9D9D9]" />
      <Text className="leading-[17px] tracking-normal text-muted">{label}</Text>
      <View className="h-px flex-1 bg-[#D9D9D9]" />
    </View>
  );
}

/** 알림 목록 (Figma 786:497) */
export default function AlertsScreen() {
  const resource = useEvents();
  const events = resource.data;
  const [openId, setOpenId] = useState<string | null>(null);
  const openEvent = events?.find((event) => event.id === openId) ?? null;

  return (
    <TabScreen title="알림" subtitle="확인이 필요한 일이 있으면 여기에 보여요">
      {!events ? <LoadState resource={resource} /> : null}
      {events && !events.length ? (
        <Text variant="note" className="mt-6 px-6">
          아직 받은 알림이 없어요.
        </Text>
      ) : null}
      <View className="mt-2 gap-2 px-6">
        {groupByDay(events ?? []).map((group) => (
          <View key={dayKey(group[0].at)} className="gap-1">
            <DayDivider label={dayLabel(group[0].at)} />
            <View className="gap-2">
              {group.map((event) => (
                <AlertCard key={event.id} event={event} onPress={() => setOpenId(event.id)} />
              ))}
            </View>
          </View>
        ))}
      </View>
      <AlertSheet event={openEvent} onClose={() => setOpenId(null)} />
    </TabScreen>
  );
}
