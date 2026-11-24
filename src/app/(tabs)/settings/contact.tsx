import { router } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { FieldBox } from '@/components/care-form';
import { errorText, FlowMessage, FlowRow, FlowScreen } from '@/components/flow-screen';
import { Segmented } from '@/components/ui/segmented';
import { sendSupport } from '@/lib/care';

type Topic = '기기 연결' | '알림' | '계정' | '기타';

const TOPICS: { value: Topic; label: string }[] = [
  { value: '기기 연결', label: '기기 연결' },
  { value: '알림', label: '알림' },
  { value: '계정', label: '계정' },
  { value: '기타', label: '기타' },
];

/** 문의하기 (Figma 989:5711) → 문의를 접수했어요 (989:5775) */
export default function ContactScreen() {
  const [topic, setTopic] = useState<Topic>('기기 연결');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState<Topic | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (sent) {
    return (
      <FlowScreen
        title="문의를 접수했어요"
        subtitle="고객지원"
        back="/settings/support"
        action={{ label: '고객지원으로', onPress: () => router.dismissTo('/settings/support') }}
      >
        <FlowRow title="접수 내용" meta={`${sent} 문의`} />
        <FlowRow
          title="CS 모드"
          meta="상담 중에 기기 진단을 공유할 수 있어요."
          href="/settings/cs"
        />
      </FlowScreen>
    );
  }

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      await sendSupport(`[${topic}] ${message.trim()}`);
      setMessage('');
      setSent(topic);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
    }
  };

  return (
    <FlowScreen
      title="문의하기"
      subtitle="고객지원"
      back="/settings/support"
      action={{
        label: busy ? '보내는 중…' : '문의 보내기',
        onPress: send,
        disabled: busy || !message.trim(),
      }}
    >
      <View className="gap-[14px] pb-2">
        <Segmented label="문의 유형" options={TOPICS} value={topic} onChange={setTopic} />
        <FieldBox label="문의 내용">
          <TextInput
            accessibilityLabel="문의 내용"
            value={message}
            onChangeText={setMessage}
            placeholder="예: Wi-Fi를 바꾼 뒤 기기 연결이 끊겼어요."
            placeholderTextColor="#767676"
            multiline
            maxLength={2000}
            editable={!busy}
            className="min-h-[96px] p-0 font-sans text-[16px] leading-[23px] text-ink outline-none"
            style={{ textAlignVertical: 'top' }}
          />
        </FieldBox>
      </View>
      <FlowRow title="회신 안내" meta="로그인한 계정으로 답변을 보내 드려요." />
      <FlowMessage text={error} />
    </FlowScreen>
  );
}
