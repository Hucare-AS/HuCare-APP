import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { FieldBox, Note } from '@/components/care-form';
import { LoadState } from '@/components/load-state';
import { DEVICE_LABEL, formatClock } from '@/components/subject-card';
import { TabScreen } from '@/components/tab-screen';
import { Segmented } from '@/components/ui/segmented';
import { Text } from '@/components/ui/text';
import { dayKey, now, useHome, useMedia, type Photo } from '@/lib/care';
import { cn } from '@/lib/cn';

type Tab = 'photos' | 'videos';

const TABS: { value: Tab; label: string }[] = [
  { value: 'photos', label: '사진' },
  { value: 'videos', label: '이벤트 영상' },
];

/** 2026.11.23 */
const dotted = (date: Date) =>
  `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;

/** 사진 자리 (Figma HC/thumb 950:321). 실제 이미지가 오기 전까지 장소 · 시각만 보여준다 */
function Thumb({ item, large, onPress }: { item: Photo; large?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title} ${formatClock(item.at)}`}
      onPress={onPress}
      disabled={!onPress}
      className={cn(
        'items-center justify-center gap-2 rounded-lg bg-sand p-4 active:opacity-70',
        large ? 'h-[260px]' : 'h-[128px] flex-1',
      )}
    >
      <Text className="text-[16px] font-semibold leading-[23px] tracking-normal text-care-green">
        {item.title}
      </Text>
      <Text className="text-[12px] leading-[17px] tracking-normal text-care-green">
        {formatClock(item.at)} · 미리보기
      </Text>
    </Pressable>
  );
}

/** 08-A 사진 · 이벤트 영상 (Figma 976:4855) */
export default function PhotosScreen() {
  const home = useHome().data;
  const [tab, setTab] = useState<Tab>('photos');
  const [date, setDate] = useState(() => now());
  const [open, setOpen] = useState<Photo | null>(null);
  const resource = useMedia(dayKey(date));
  const media = resource.data;
  const isToday = dayKey(date) === dayKey(now());

  const move = (delta: number) =>
    setDate(new Date(date.getFullYear(), date.getMonth(), date.getDate() + delta));

  const subtitle = home
    ? [home.subjectLabel, home.device ? DEVICE_LABEL[home.device] : null]
        .filter(Boolean)
        .join(' · ')
    : undefined;
  const items = media?.supported ? (tab === 'photos' ? media.photos : media.videos) : [];
  const rows = Array.from({ length: Math.ceil(items.length / 2) }, (_, index) =>
    items.slice(index * 2, index * 2 + 2),
  );

  return (
    <TabScreen title="사진" subtitle={subtitle}>
      <View className="mt-4 gap-[18px] px-6">
        <Segmented label="사진 종류" options={TABS} value={tab} onChange={setTab} />
        <FieldBox label="날짜">
          <View className="flex-row items-center gap-3">
            <Text className="text-[16px] leading-[23px]">{dotted(date)}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="이전 날"
              hitSlop={8}
              onPress={() => move(-1)}
              className="active:opacity-60"
            >
              <Text className="text-[16px] leading-[23px]">이전</Text>
            </Pressable>
            <Text className="text-[16px] leading-[23px]">/</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="다음 날"
              accessibilityState={{ disabled: isToday }}
              disabled={isToday}
              hitSlop={8}
              onPress={() => move(1)}
              className={cn('active:opacity-60', isToday && 'opacity-30')}
            >
              <Text className="text-[16px] leading-[23px]">다음</Text>
            </Pressable>
          </View>
        </FieldBox>

        {!media ? (
          <LoadState resource={resource} />
        ) : !media.supported ? (
          <Note title="사진을 볼 수 없어요" body={media.reason} />
        ) : (
          <>
            {rows.length ? (
              rows.map((row) => (
                <View key={row[0].id} className="flex-row gap-3">
                  {row.map((item) => (
                    <Thumb key={item.id} item={item} onPress={() => setOpen(item)} />
                  ))}
                  {row.length === 1 ? <View className="flex-1" /> : null}
                </View>
              ))
            ) : (
              <Text className="py-6 text-center text-muted">
                {tab === 'photos' ? '이 날짜의 사진이 없어요.' : '이 날짜의 이벤트 영상이 없어요.'}
              </Text>
            )}
            <Note
              title={
                tab === 'photos' ? '사진을 선택하면 크게 볼 수 있어요' : '알림이 생긴 순간만 남아요'
              }
              body="촬영 시각과 대상을 함께 표시합니다."
            />
          </>
        )}
      </View>

      <BottomSheet visible={!!open} onClose={() => setOpen(null)}>
        {open ? (
          <View className="gap-3">
            <Text className="text-[24px] font-semibold leading-[34px] tracking-[-0.6px] text-black">
              {home?.subjectLabel ?? open.title}
            </Text>
            <Thumb item={open} large />
            <Text className="text-muted">
              {dotted(open.at)} {formatClock(open.at)} · {open.place}
            </Text>
          </View>
        ) : null}
      </BottomSheet>
    </TabScreen>
  );
}
