import { FlowRow, FlowScreen } from '@/components/flow-screen';
import { LoadState } from '@/components/load-state';
import { updateNotificationPrefs, useNotificationPrefs } from '@/lib/care';

/** 기준선 이탈 알림 · 수신 중 (Figma 989:4622) / 꺼짐 (989:4676) */
export default function BaselineScreen() {
  const resource = useNotificationPrefs();
  const prefs = resource.data;

  if (!prefs) {
    return (
      <FlowScreen title="기준선 이탈 알림" back="/settings/events">
        <LoadState resource={resource} />
      </FlowScreen>
    );
  }
  const on = prefs.baselineDeviation;

  return (
    <FlowScreen
      title="기준선 이탈 알림"
      subtitle="평소 기준선에서 벗어나면 알려드려요."
      back="/settings/events"
      action={{
        label: on ? '수신 끄기' : '수신 켜기',
        onPress: () => updateNotificationPrefs({ baselineDeviation: !on }),
      }}
    >
      {on ? (
        <FlowRow title="수신 중" meta="기준선 이탈이 지속되면 알려드려요." />
      ) : (
        <FlowRow title="수신 꺼짐" meta="긴급 알림은 계속 받아요." />
      )}
    </FlowScreen>
  );
}
