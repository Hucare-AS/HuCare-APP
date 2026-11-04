import { Modal, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { callSubject } from '@/lib/call';
import {
  acknowledgeEvent,
  eventBody,
  eventTitle,
  formatDate,
  formatTime,
  subject,
  type CareEvent,
} from '@/lib/care';

/** 김영희님이 오후 06:18에 확인했어요. */
export const ackMessage = (ack: NonNullable<CareEvent['ack']>) =>
  `${ack.by}님이 ${formatTime(ack.at)}에 확인했어요.`;

type AlertSheetProps = {
  event: CareEvent | null;
  onClose: () => void;
};

/** 알림 상세 하단 팝업 (Figma 803:88 미확인 · 818:1160 확인됨) */
export function AlertSheet({ event, onClose }: AlertSheetProps) {
  const insets = useScreenInsets();

  return (
    <Modal visible={!!event} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-end">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="닫기"
          onPress={onClose}
          className="absolute inset-0 bg-black/40"
        />
        {event ? (
          <View
            accessibilityViewIsModal
            className="w-full max-w-screen rounded-t-2xl bg-white px-6 pt-[35px]"
            style={{ paddingBottom: insets.bottom + 24 }}
          >
            <View className="absolute left-1/2 top-[15px] -ml-7 h-1 w-14 rounded-full bg-muted" />
            <Text className="text-[24px] font-semibold leading-[34px] tracking-[-0.6px] text-black">
              {eventTitle(event)}
            </Text>
            <Text className="mt-1 text-black">
              {formatDate(event.at)} {formatTime(event.at)}
            </Text>
            <View className="mt-2">
              {eventBody(event).map((line) => (
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
                label={`${subject.relation}에게 전화 걸기`}
                icon={<Icon name="phoneWhite" style={{ transform: [{ scaleX: -1 }] }} />}
                onPress={callSubject}
              />
              <Button
                label="확인했어요"
                variant="outline"
                onPress={() => {
                  acknowledgeEvent(event.id);
                  onClose();
                }}
              />
              <Button label="닫기" variant="neutral" onPress={onClose} />
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
