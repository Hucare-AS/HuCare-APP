import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { FlowRow, FlowScreen } from '@/components/flow-screen';
import { LoadState } from '@/components/load-state';
import { Text } from '@/components/ui/text';
import { useDocument } from '@/lib/care';

/**
 * 마크다운 본문을 항목으로 나눈다. "## 제목" 다음 문단을 설명으로 묶고,
 * 제목이 없는 문단은 그대로 글로 둔다.
 */
function sections(markdown: string) {
  const blocks: { title: string | null; body: string }[] = [];
  for (const raw of markdown.split(/\n{2,}/)) {
    const lines = raw.trim().split('\n');
    if (!lines[0]) continue;
    const heading = /^#{1,6}\s+(.*)$/.exec(lines[0]);
    blocks.push(
      heading
        ? { title: heading[1], body: lines.slice(1).join(' ') }
        : { title: null, body: lines.join(' ') },
    );
  }
  return blocks;
}

/** 공지 본문 (Figma 989:5477 HuCare 이용 안내) */
export default function ArticleScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const resource = useDocument(id);
  const doc = resource.data;

  return (
    <FlowScreen
      title={doc?.title ?? '공지사항'}
      subtitle="공지사항"
      back="/settings/notices"
      action={{ label: '공지 목록으로', onPress: () => router.dismissTo('/settings/notices') }}
    >
      {doc ? (
        sections(doc.body).map((block, index) =>
          block.title ? (
            <FlowRow key={index} title={block.title} meta={block.body} />
          ) : (
            <View key={index} className="py-3">
              <Text className="text-[13px] font-light leading-[20px]">{block.body}</Text>
            </View>
          ),
        )
      ) : (
        <LoadState resource={resource} />
      )}
    </FlowScreen>
  );
}
