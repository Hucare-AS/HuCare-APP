import { FlowRow, FlowScreen } from '@/components/flow-screen';
import { quietLabel } from '@/components/settings-shared';
import { useNotificationPrefs } from '@/lib/care';

/** 알림 설정 (Figma 989:4488) */
export default function NotificationsScreen() {
  const prefs = useNotificationPrefs().data;

  return (
    <FlowScreen title="알림 설정" subtitle="수신할 알림과 시간을 관리해요." back="/settings">
      <FlowRow title="이벤트별 수신" meta="긴급 · 주의 · 기기 알림" href="/settings/events" />
      <FlowRow
        title="방해금지 시간"
        meta={prefs?.quietHours ? `${quietLabel(prefs.quietHours)}` : '밤 시간대 일반 알림 관리'}
        href="/settings/quiet"
      />
      <FlowRow
        title="일일 요약"
        meta={prefs?.dailySummary ? '하루 돌봄 기록 알림 · 받는 중' : '하루 돌봄 기록 알림'}
        href="/settings/daily"
      />
    </FlowScreen>
  );
}
