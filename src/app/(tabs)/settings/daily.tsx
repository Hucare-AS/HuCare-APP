import { FlowRow, FlowScreen } from '@/components/flow-screen';
import { LoadState } from '@/components/load-state';
import { updateNotificationPrefs, useNotificationPrefs } from '@/lib/care';

/** 일일 요약 · 수신 꺼짐 (Figma 989:4890) / 수신 중 (989:4944) */
export default function DailyScreen() {
  const resource = useNotificationPrefs();
  const prefs = resource.data;

  if (!prefs) {
    return (
      <FlowScreen title="일일 요약" back="/settings/notifications">
        <LoadState resource={resource} />
      </FlowScreen>
    );
  }
  const on = prefs.dailySummary;

  return (
    <FlowScreen
      title="일일 요약"
      subtitle="하루의 돌봄 기록을 알림으로 받아요."
      back="/settings/notifications"
      action={{
        label: on ? '요약 끄기' : '요약 받기',
        onPress: () => updateNotificationPrefs({ dailySummary: !on }),
      }}
    >
      {on ? (
        <FlowRow title="수신 중" meta="방해금지 시간에는 일반 알림 정책을 따라요." />
      ) : (
        <FlowRow title="수신 꺼짐" meta="보호자마다 따로 설정해요." />
      )}
    </FlowScreen>
  );
}
