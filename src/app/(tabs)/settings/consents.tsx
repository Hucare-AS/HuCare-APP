import { FlowRow, FlowScreen } from '@/components/flow-screen';
import { LoadState } from '@/components/load-state';
import { DEVICE_LABEL } from '@/components/subject-card';
import { formatDate, useConsents, useHome, type ConsentItem } from '@/lib/care';

const PURPOSE_LABEL: Record<ConsentItem['purpose'], { title: string; required: boolean }> = {
  metrics: { title: '돌봄 대상 고지 · 동의', required: true },
  photo: { title: '얼굴 사진 저장', required: false },
  video: { title: '이벤트 영상 저장', required: false },
};

function decisionText(item: ConsentItem) {
  const { required } = PURPOSE_LABEL[item.purpose];
  if (item.granted === null) return required ? '설치 시 확인' : '선택 동의 · 고르지 않음';
  const state = item.granted ? '동의함' : '철회함';
  const when = item.decidedAt ? ` · ${formatDate(item.decidedAt)}` : '';
  return `${required ? '필수' : '선택'} 동의 · ${state}${when}`;
}

/** 동의 이력 (Figma 989:5060) */
export default function ConsentsScreen() {
  const resource = useConsents();
  const home = useHome().data;
  const items = resource.data;

  return (
    <FlowScreen
      title="동의 이력"
      subtitle={
        home
          ? [home.subjectLabel, home.device ? `${DEVICE_LABEL[home.device]} 기기` : null]
              .filter(Boolean)
              .join(' · ')
          : undefined
      }
      back="/settings/privacy"
    >
      {items ? (
        <>
          {items.map((item) => (
            <FlowRow
              key={item.purpose}
              title={PURPOSE_LABEL[item.purpose].title}
              meta={decisionText(item)}
            />
          ))}
          <FlowRow title="사진 동의 관리" meta="사진 저장 동의 철회" href="/settings/withdraw" />
        </>
      ) : (
        <LoadState resource={resource} />
      )}
    </FlowScreen>
  );
}
