import { router, useLocalSearchParams, type Href } from 'expo-router';

import { FlowRow, FlowScreen } from '@/components/flow-screen';

type Faq = {
  id: string;
  question: string;
  topic: string;
  answers: { title: string; meta: string; href?: Href }[];
  action: { label: string; href: Href };
};

/** 자주 묻는 질문 (Figma 989:5536 · 989:5593 · 989:5652). 백엔드에 FAQ API 가 없어 앱에 둔다 */
const FAQS: Faq[] = [
  {
    id: 'device',
    question: '기기가 연결되지 않아요',
    topic: '기기 연결 도움말',
    answers: [
      { title: '전원과 Wi-Fi 확인', meta: '기기 전원과 공유기 연결을 확인해 주세요.' },
      {
        title: '네트워크가 바뀌었나요?',
        meta: '기기 가까이에서 Wi-Fi를 변경해 주세요.',
        href: '/settings/wifi',
      },
    ],
    action: { label: '문의하기', href: '/settings/contact' },
  },
  {
    id: 'night',
    question: '밤에도 긴급 알림이 오나요?',
    topic: '알림 도움말',
    answers: [
      { title: '긴급 알림', meta: '낙상과 장시간 무움직임은 밤에도 알려드려요.' },
      { title: '일반 알림', meta: '방해금지 시간대를 설정할 수 있어요.', href: '/settings/quiet' },
    ],
    action: { label: 'FAQ로', href: '/settings/faq' },
  },
];

/** 자주 묻는 질문 목록과 답 (?q=device) */
export default function FaqScreen() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  const faq = FAQS.find((item) => item.id === q);

  if (faq) {
    return (
      <FlowScreen
        title={faq.question}
        subtitle={faq.topic}
        back="/settings/faq"
        action={{
          label: faq.action.label,
          onPress: () =>
            faq.action.href === '/settings/faq'
              ? router.setParams({ q: undefined })
              : router.navigate(faq.action.href),
        }}
      >
        {faq.answers.map((answer) => (
          <FlowRow key={answer.title} title={answer.title} meta={answer.meta} href={answer.href} />
        ))}
      </FlowScreen>
    );
  }

  return (
    <FlowScreen
      title="자주 묻는 질문"
      subtitle="이용 중 궁금한 내용을 확인하세요."
      back="/settings/support"
    >
      {FAQS.map((item) => (
        <FlowRow
          key={item.id}
          title={item.question}
          meta={item.topic}
          onPress={() => router.setParams({ q: item.id })}
        />
      ))}
    </FlowScreen>
  );
}
