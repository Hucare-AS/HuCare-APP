import { router, type Href } from 'expo-router';
import type { PropsWithChildren, ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Screen } from '@/components/screen';
import { useTabBarSpace } from '@/components/tab-screen';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/cn';

type FlowAction = { label: string; onPress: () => void; disabled?: boolean };

type FlowScreenProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  /** 제목 위 작은 주황 글씨 (설정 첫 화면의 HuCare) */
  eyebrow?: string;
  /** 뒤로가기로 갈 곳. 없으면 뒤로가기 버튼을 그리지 않는다 */
  back?: Href;
  /** 아래에 붙는 주황 버튼 */
  action?: FlowAction;
}>;

/**
 * 정해 둔 상위 화면으로 돌아간다. 스택에 있으면 그 화면까지 닫고, 없으면(주소로 바로 들어오면) 바꿔 연다.
 * router.back() 은 새로고침 뒤 스택 첫 화면(설정)으로 가 버려 쓰지 않는다.
 */
export function goBack(parent: Href) {
  router.dismissTo(parent);
}

/**
 * 설정 플로우 공통 틀 (Figma 앱 기본 설정 플로우 986:5865).
 * 흰 배경 + 뒤로가기 + 24px 제목 · 14px 부제 + 항목 목록 + 탭바 위 주황 버튼.
 */
export function FlowScreen({ title, subtitle, eyebrow, back, action, children }: FlowScreenProps) {
  const tabSpace = useTabBarSpace();

  return (
    <Screen className="bg-white">
      {back ? (
        <View className="h-[57px] justify-center px-[9px]">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="뒤로가기"
            hitSlop={8}
            onPress={() => goBack(back)}
            className="size-[45px] items-center justify-center active:opacity-60"
          >
            <Icon name="chevronBlack" style={{ transform: [{ rotate: '90deg' }] }} />
          </Pressable>
        </View>
      ) : null}
      <ScrollView contentContainerStyle={{ paddingBottom: tabSpace + (action ? 64 : 0) }}>
        <View className={cn('gap-[7px] px-6', back ? 'pt-[3px]' : 'pt-6')}>
          {eyebrow ? (
            <Text className="text-[13px] font-semibold leading-[18px] text-primary">{eyebrow}</Text>
          ) : null}
          <Text className="text-[24px] font-bold leading-[29px] tracking-normal">{title}</Text>
          {subtitle ? (
            <Text className="text-[14px] leading-[17px] tracking-normal text-muted">
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View className="mt-[30px] px-6">{children}</View>
      </ScrollView>
      {action ? (
        <View className="absolute left-0 right-0 px-6" style={{ bottom: tabSpace - 8 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !!action.disabled }}
            disabled={action.disabled}
            onPress={action.onPress}
            className={cn(
              'h-12 items-center justify-center rounded-lg bg-primary active:opacity-70',
              action.disabled && 'opacity-50',
            )}
          >
            <Text className="text-[16px] font-semibold text-white">{action.label}</Text>
          </Pressable>
        </View>
      ) : null}
    </Screen>
  );
}

type FlowRowProps = {
  title: string;
  meta?: string | null;
  /** 누르면 이동하는 항목이면 오른쪽에 > 를 그린다 */
  onPress?: () => void;
  href?: Href;
  /** 오른쪽 끝 (토글 등). 있으면 > 대신 그린다 */
  right?: ReactNode;
  metaClassName?: string;
};

/** 설정 항목 한 줄 (78px). 제목 15px · 설명 13px */
export function FlowRow({ title, meta, onPress, href, right, metaClassName }: FlowRowProps) {
  const press = onPress ?? (href ? () => router.navigate(href) : undefined);
  const body = (
    <>
      <View className="flex-1 pr-3">
        <Text className="text-[15px] font-semibold leading-[22px] tracking-[-0.375px]">
          {title}
        </Text>
        {meta ? (
          <Text
            className={cn(
              'text-[13px] font-light leading-[20px] tracking-[-0.325px]',
              metaClassName,
            )}
          >
            {meta}
          </Text>
        ) : null}
      </View>
      {right ?? (press ? <Icon name="rowChevron" width={6.4} height={10} /> : null)}
    </>
  );
  const className = 'min-h-[78px] flex-row items-center py-2';
  if (!press) return <View className={className}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={press}
      className={cn(className, 'active:opacity-60')}
    >
      {body}
    </Pressable>
  );
}

/** 오류 · 진행 안내 한 줄 */
export function FlowMessage({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <Text accessibilityLiveRegion="polite" className="mt-2 text-[13px] text-care-red">
      {text}
    </Text>
  );
}

/** 오류를 화면에 보여줄 문장으로 */
export function errorText(reason: unknown) {
  return reason instanceof Error && reason.message ? reason.message : '잠시 후 다시 시도해 주세요.';
}
