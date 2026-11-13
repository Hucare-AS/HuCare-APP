import { View } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { callPhone } from '@/lib/call';
import { acknowledgeEvent, formatDate, formatTime, useProfile, type CareEvent } from '@/lib/care';
import { cn } from '@/lib/cn';

/** 김영희님이 오후 06:18에 확인했어요. */
export const ackMessage = (ack: NonNullable<CareEvent['ack']>) =>
  `${ack.by}님이 ${formatTime(ack.at)}에 확인했어요.`;

type AlertSheetProps = {
  event: CareEvent | null;
  onClose: () => void;
};

/** 알림 상세 하단 팝업 (Figma 803:88 미확인 · 818:1160 확인됨) */
export function AlertSheet({ event, onClose }: AlertSheetProps) {
  const profile = useProfile().data;
  const phone = profile?.phone ?? null;

  return (
    <BottomSheet visible={!!event} onClose={onClose}>
      {event ? (
        <>
          <Text className="text-[24px] font-semibold leading-[34px] tracking-[-0.6px] text-black">
            {event.title}
          </Text>
          <Text className="mt-1 text-black">
            {formatDate(event.at)} {formatTime(event.at)}
          </Text>
          <View className="mt-2">
            {event.lines.map((line) => (
              <Text key={line} className="font-medium text-black">
                {line}
              </Text>
            ))}
          </View>
          {event.ack ? (
            <View className="mt-[10px] h-[33px] justify-center rounded-full bg-sand px-[14px]">
              <Text className="font-medium text-primary">{ackMessage(event.ack)}</Text>
            </View>
          ) : null}
          <View className="mt-[14px] gap-2">
            <Button
              label={profile ? `${profile.subjectLabel}에게 전화 걸기` : '전화 걸기'}
              icon={<Icon name="phoneWhite" style={{ transform: [{ scaleX: -1 }] }} />}
              disabled={!phone}
              onPress={() => callPhone(phone)}
              className={cn(!phone && 'opacity-50')}
            />
            <Button
              label="확인했어요"
              variant="outline"
              onPress={() => {
                acknowledgeEvent(event.id).catch(() => {});
                onClose();
              }}
            />
            <Button label="닫기" variant="neutral" onPress={onClose} />
          </View>
        </>
      ) : null}
    </BottomSheet>
  );
}
