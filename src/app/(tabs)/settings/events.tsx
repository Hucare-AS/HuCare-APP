import { FlowRow, FlowScreen } from '@/components/flow-screen';
import { useNotificationPrefs } from '@/lib/care';

/**
 * 이벤트별 수신 (Figma 989:4550).
 * 낙상 · 장시간 무움직임은 모든 보호자가 항상 받고(백엔드 mandatory_event_types),
 * 기준선 이탈만 보호자마다 고른다.
 */
export default function EventsScreen() {
  const prefs = useNotificationPrefs().data;

  return (
    <FlowScreen
      title="이벤트별 수신"
      subtitle="보호자 역할에 따라 수신 범위가 달라요."
      back="/settings/notifications"
    >
      <FlowRow title="낙상 · 장시간 무움직임" meta="모든 보호자 · 항상 수신" />
      <FlowRow title="기준선 이탈" meta="주 보호자 수신 · 보호자 선택" />
      <FlowRow title="기기 끊김 · 품질 저하" meta="주 보호자에게 알림" />
      <FlowRow title="보호자 추가 · 해지" meta="주 보호자에게 알림" />
      <FlowRow
        title="보호자 수신 설정"
        meta={`기준선 이탈 알림 선택${prefs ? (prefs.baselineDeviation ? ' · 받는 중' : ' · 꺼짐') : ''}`}
        href="/settings/baseline"
      />
    </FlowScreen>
  );
}
