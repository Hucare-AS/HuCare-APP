import { useState } from 'react';

import { FlowRow, FlowScreen } from '@/components/flow-screen';
import { quietLabel } from '@/components/settings-shared';
import { updateNotificationPrefs, type QuietHours } from '@/lib/care';

/** 시안의 방해금지 시간 */
const NIGHT: QuietHours = { start: '22:00', end: '07:00' };

/**
 * 방해금지 시간 (Figma 989:4730) → 설정했어요 (989:4787) / 껐어요 (989:4841).
 * 긴급 알림(낙상 · 장시간 무움직임)은 방해금지를 무시한다.
 */
export default function QuietScreen() {
  const [result, setResult] = useState<'on' | 'off' | null>(null);

  const choose = (hours: QuietHours | null) => {
    updateNotificationPrefs({ quietHours: hours });
    setResult(hours ? 'on' : 'off');
  };
  const again = { label: '시간 설정으로', onPress: () => setResult(null) };

  if (result === 'on') {
    return (
      <FlowScreen
        title="방해금지를 설정했어요"
        subtitle={quietLabel(NIGHT)}
        back="/settings/notifications"
        action={again}
      >
        <FlowRow title="긴급 알림" meta="낙상과 장시간 무움직임은 바로 알려드려요." />
      </FlowScreen>
    );
  }
  if (result === 'off') {
    return (
      <FlowScreen
        title="방해금지를 껐어요"
        subtitle="일반 알림도 바로 받아요."
        back="/settings/notifications"
        action={again}
      />
    );
  }

  return (
    <FlowScreen
      title="방해금지 시간"
      subtitle="긴급 알림은 시간대와 관계없이 받아요."
      back="/settings/notifications"
    >
      <FlowRow
        title="밤 10시 ~ 오전 7시"
        meta="이 시간 동안 일반 알림을 쉬어요."
        onPress={() => choose(NIGHT)}
      />
      <FlowRow title="사용 안 함" meta="일반 알림도 바로 받기" onPress={() => choose(null)} />
    </FlowScreen>
  );
}
