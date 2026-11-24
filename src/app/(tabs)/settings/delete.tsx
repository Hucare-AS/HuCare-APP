import { router } from 'expo-router';
import { useState } from 'react';

import { errorText, FlowMessage, FlowRow, FlowScreen, goBack } from '@/components/flow-screen';
import { requestDeletion, useHome } from '@/lib/care';

/**
 * 데이터 삭제 요청 (Figma 989:5235) → 삭제 요청을 접수했어요 (989:5299).
 * 백엔드 삭제 요청은 사진 삭제(delete_photos)와 돌봄 종료(end_care)뿐이라, 여기서는 저장된 사진 삭제를 요청한다.
 */
export default function DeleteScreen() {
  const subject = useHome().data?.subjectLabel ?? '돌봄 대상';
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return (
      <FlowScreen
        title="삭제 요청을 접수했어요"
        subtitle={`${subject} · 접수됨`}
        back="/settings/privacy"
        action={{ label: '설정으로', onPress: () => router.dismissTo('/settings') }}
      >
        <FlowRow title="처리 문의" meta="고객지원으로 문의하기" href="/settings/contact" />
      </FlowScreen>
    );
  }

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      await requestDeletion('delete_photos');
      setDone(true);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
    }
  };

  return (
    <FlowScreen
      title="데이터 삭제 요청"
      subtitle="삭제를 요청할 대상을 확인해 주세요."
      back="/settings/privacy"
      action={{ label: busy ? '보내는 중…' : '삭제 요청 보내기', onPress: send, disabled: busy }}
    >
      <FlowRow title="돌봄 대상" meta={subject} />
      <FlowRow title="요청 내용" meta="이 대상의 저장된 사진 삭제 요청" />
      <FlowRow
        title="취소"
        meta="개인정보와 동의로 돌아가기"
        onPress={() => goBack('/settings/privacy')}
      />
      <FlowMessage text={error} />
    </FlowScreen>
  );
}
