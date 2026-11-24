import { FlowRow, FlowScreen } from '@/components/flow-screen';
import { useHome } from '@/lib/care';

/** 개인정보와 동의 (Figma 989:4998) */
export default function PrivacyScreen() {
  const subject = useHome().data?.subjectLabel;

  return (
    <FlowScreen
      title="개인정보와 동의"
      subtitle={subject ? `${subject}의 동의 내역을 관리해요.` : '동의 내역을 관리해요.'}
      back="/settings"
    >
      <FlowRow title="동의 이력" meta="돌봄 안내와 사진 저장 동의" href="/settings/consents" />
      <FlowRow title="사진 동의 철회" meta="사진 저장 중단" href="/settings/withdraw" />
      <FlowRow title="데이터 삭제 요청" meta="요청할 데이터 확인" href="/settings/delete" />
    </FlowScreen>
  );
}
