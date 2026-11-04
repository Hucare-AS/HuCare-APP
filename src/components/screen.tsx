import type { PropsWithChildren } from 'react';
import { View } from 'react-native';

import { useScreenInsets } from '@/hooks/use-screen-insets';
import { cn } from '@/lib/cn';

type ScreenProps = PropsWithChildren<{
  /** 상단 safe area 적용 여부. 그라데이션이 상태바까지 닿는 홈은 끈다 */
  top?: boolean;
  className?: string;
}>;

/**
 * 모든 화면의 루트. 웹에서는 데스크톱 폭에서도 모바일 컬럼(max 430px)으로 가운데 정렬한다.
 * 하단 safe area 는 탭바가 처리하고, 탭바가 없는 화면은 스크롤 내용에서 여백을 둔다.
 */
export function Screen({ children, top = true, className }: ScreenProps) {
  const insets = useScreenInsets();

  return (
    <View className="flex-1 items-center bg-[#F2F3F5]">
      <View
        className={cn('w-full max-w-screen flex-1 bg-surface', className)}
        style={{ paddingTop: top ? insets.top : 0 }}
      >
        {children}
      </View>
    </View>
  );
}
