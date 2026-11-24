import { useEffect, useState } from 'react';
import { Image, Pressable, View } from 'react-native';

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

const clockOf = (item: Photo) => (item.at ? formatClock(item.at) : null);

/** 사진 (Figma HC/thumb 950:321). 이미지가 없으면(목업) 장소 · 시각만 적은 자리 표시 상자를 보여준다 */
function Thumb({ item, large, onPress }: { item: Photo; large?: boolean; onPress?: () => void }) {
  const clock = clockOf(item);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[item.title, clock].filter(Boolean).join(' ')}
      onPress={onPress}
      disabled={!onPress}
      className={cn(
        'items-center justify-center gap-2 overflow-hidden rounded-lg bg-sand active:opacity-70',
        !item.uri && 'p-4',
        large ? 'h-[260px]' : 'h-[128px] flex-1',
      )}
    >
      {item.uri ? (
        <Image
          source={{ uri: item.uri }}
          accessibilityIgnoresInvertColors
          resizeMode={large ? 'contain' : 'cover'}
          className="h-full w-full"
        />
      ) : (
        <>
          <Text className="text-[16px] font-semibold leading-[23px] tracking-normal text-care-green">
            {item.title}
          </Text>
          <Text className="text-[12px] leading-[17px] tracking-normal text-care-green">
            {clock ? `${clock} · 미리보기` : '미리보기'}
          </Text>
        </>
      )}
    </Pressable>
  );
}

/** 크게 볼 때 원본을 불러와 바꿔 끼운다. 실패하면 썸네일을 그대로 둔다 */
function useOriginal(photo: Photo | null) {
  const [original, setOriginal] = useState<{ id: string; uri: string } | null>(null);
  useEffect(() => {
    if (!photo?.loadOriginal) return;
    let alive = true;
    photo.loadOriginal().then(
      (uri) => alive && setOriginal({ id: photo.id, uri }),
      () => {},
    );
    return () => {
      alive = false;
    };
  }, [photo]);
  if (!photo) return null;
  return original?.id === photo.id ? { ...photo, uri: original.uri } : photo;
}

/** 08-A 사진 · 이벤트 영상 (Figma 976:4855) */
export default function PhotosScreen() {
  const home = useHome().data;
  const [tab, setTab] = useState<Tab>('photos');
  const [date, setDate] = useState(() => now());
  const [open, setOpen] = useState<Photo | null>(null);
  const large = useOriginal(open);
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
                {tab === 'photos'
                  ? (media.photoNote ?? '이 날짜의 사진이 없어요.')
                  : (media.videoNote ?? '이 날짜의 이벤트 영상이 없어요.')}
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
            <Thumb item={large ?? open} large />
            <Text className="text-muted">
              {[dotted(open.at ?? date), clockOf(open)].filter(Boolean).join(' ')} · {open.place}
            </Text>
          </View>
        ) : null}
      </BottomSheet>
    </TabScreen>
  );
}
