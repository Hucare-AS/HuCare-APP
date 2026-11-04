import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { cn } from '@/lib/cn';

/**
 * 디자인 타이포 프리셋. (Pretendard 기준, 자간은 폰트 크기의 -2.5%)
 * size/weight 는 className 으로 덮어쓸 수 있다.
 */
export const textVariants = {
  /** 페이지 타이틀 24 / Bold */
  pageTitle: 'text-[24px] font-bold leading-[29px]',
  /** 섹션 타이틀 20 / SemiBold */
  section: 'text-[20px] font-semibold leading-[28px] tracking-[-0.5px]',
  /** 달력 · 날짜 타이틀 22 / SemiBold */
  dateTitle: 'text-[22px] font-semibold leading-[26px]',
  /** 카드 제목 16 / SemiBold */
  cardTitle: 'text-[16px] font-semibold leading-[19px]',
  /** 본문 14 / Regular */
  body: 'text-[14px] font-normal leading-[20px] tracking-[-0.35px]',
  /** 안내 문구 13 / Light */
  note: 'text-[13px] font-light leading-[17px] tracking-[-0.325px] text-muted',
} as const;

export type TextVariant = keyof typeof textVariants;

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  className?: string;
};

export function Text({ variant = 'body', className, ...props }: TextProps) {
  return (
    <RNText className={cn('font-sans text-ink', textVariants[variant], className)} {...props} />
  );
}
