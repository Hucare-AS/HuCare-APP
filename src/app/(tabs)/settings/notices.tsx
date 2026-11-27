import { router } from 'expo-router';

import { FlowRow, FlowScreen } from '@/components/flow-screen';
import { LoadState } from '@/components/load-state';
import { Text } from '@/components/ui/text';
import { formatDate, useDocuments } from '@/lib/care';

/** 공지사항 (Figma 989:5425). 백엔드 /documents 의 안내 문서를 보여준다 */
export default function NoticesScreen() {
  const resource = useDocuments();
  const docs = resource.data;

  return (
    <FlowScreen title="공지사항" subtitle="서비스 소식" back="/settings/support">
      {!docs ? (
        <LoadState resource={resource} />
      ) : docs.length ? (
        docs.map((doc) => (
          <FlowRow
            key={doc.id}
            title={doc.title}
            meta={doc.effectiveAt ? `서비스 안내 · ${formatDate(doc.effectiveAt)}` : '서비스 안내'}
            onPress={() =>
              router.navigate({ pathname: '/settings/article', params: { id: doc.id } })
            }
          />
        ))
      ) : (
        <Text className="py-6 text-muted">새 공지가 없어요.</Text>
      )}
    </FlowScreen>
  );
}
