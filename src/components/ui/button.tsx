import type { ReactNode } from 'react';
import { Pressable, type PressableProps } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/cn';

const VARIANTS = {
  /** 주황 채움 */
  primary: { box: 'bg-primary', label: 'text-white' },
  /** 흰 배경 + 주황 테두리 */
  outline: { box: 'border border-primary bg-white', label: 'text-primary' },
  /** 투명 배경 + 주황 테두리 (회색 화면 위) */
  ghost: { box: 'border border-primary bg-white/20', label: 'text-primary' },
  /** 흰 배경 + 회색 테두리 */
  neutral: { box: 'border border-muted bg-white', label: 'text-muted' },
  /** 주황 그라데이션 위 흰 버튼 */
  white: { box: 'bg-white', label: 'text-primary' },
  /** 주황 그라데이션 위 반투명 버튼 */
  whiteSoft: { box: 'bg-white/70', label: 'text-primary' },
} as const;

type ButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: keyof typeof VARIANTS;
  icon?: ReactNode;
  className?: string;
};

/** 42px 높이 공통 버튼 */
export function Button({ label, variant = 'primary', icon, className, ...props }: ButtonProps) {
  const style = VARIANTS[variant];
  return (
    <Pressable
      accessibilityRole="button"
      className={cn(
        'h-[42px] flex-row items-center justify-center gap-2 rounded-lg active:opacity-70',
        style.box,
        className,
      )}
      {...props}
    >
      {icon}
      <Text className={cn('font-semibold', style.label)}>{label}</Text>
    </Pressable>
  );
}
