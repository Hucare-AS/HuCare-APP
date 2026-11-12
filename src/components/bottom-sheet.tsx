import type { PropsWithChildren } from 'react';
import { Modal, Pressable, View } from 'react-native';

import { useScreenInsets } from '@/hooks/use-screen-insets';

type BottomSheetProps = PropsWithChildren<{ visible: boolean; onClose: () => void }>;

/** 딤 배경 + 손잡이가 있는 하단 팝업 껍데기 (AlertSheet · SubjectSheet 공용) */
export function BottomSheet({ visible, onClose, children }: BottomSheetProps) {
  const insets = useScreenInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-end">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="닫기"
          onPress={onClose}
          className="absolute inset-0 bg-black/40"
        />
        {visible ? (
          <View
            accessibilityViewIsModal
            className="w-full max-w-screen rounded-t-2xl bg-white px-6 pt-[35px]"
            style={{ paddingBottom: insets.bottom + 24 }}
          >
            <View className="absolute left-1/2 top-[15px] -ml-7 h-1 w-14 rounded-full bg-muted" />
            {children}
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
