import Constants from 'expo-constants';

import { FlowRow, FlowScreen } from '@/components/flow-screen';
import { useSupportState } from '@/lib/care';

/** 앱 정보와 고객지원 (Figma 989:5353) */
export default function SupportScreen() {
  const { csMode } = useSupportState();

  return (
    <FlowScreen title="앱 정보와 고객지원" subtitle="HuCare" back="/settings">
      <FlowRow title="공지사항" meta="서비스 소식" href="/settings/notices" />
      <FlowRow title="자주 묻는 질문" meta="기기와 알림 도움말" href="/settings/faq" />
      <FlowRow title="문의하기" meta="도움이 필요한 내용을 보내 주세요." href="/settings/contact" />
      <FlowRow
        title="CS 모드"
        meta={csMode ? '고객지원용 설정 · 켜짐' : '고객지원용 설정'}
        href="/settings/cs"
      />
      <FlowRow title="앱 버전" meta={Constants.expoConfig?.version ?? '확인할 수 없음'} />
    </FlowScreen>
  );
}
