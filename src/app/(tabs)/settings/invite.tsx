import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { FormMessage, Note } from '@/components/care-form';
import { errorText } from '@/components/flow-screen';
import { TabScreen } from '@/components/tab-screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { cachedInvite, issueInvite, now, useProfile, type Invite } from '@/lib/care';
import { shareText } from '@/lib/share';

/** 482917 → 482 917 */
const spaced = (code: string) => code.replace(/^(\d{3})(\d{3})$/, '$1 $2');

/** 09:42 · 1시간 넘게 남으면 23:59:12 */
function remaining(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return h ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

const validity = (minutes: number) =>
  minutes >= 60 ? `${Math.round(minutes / 60)}시간` : `${minutes}분`;

/**
 * 남은 시간. 목업은 "지금"이 고정돼 있어 화면을 연 뒤 흐른 시간만큼 줄인다.
 * 1초마다 다시 그린다.
 */
function useRemaining(invite: Invite | null) {
  const [opened] = useState(() => ({ source: now().getTime(), real: Date.now() }));
  const [tick, setTick] = useState(opened.real);
  useEffect(() => {
    if (!invite) return;
    const timer = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [invite]);
  if (!invite) return null;
  return invite.expiresAt.getTime() - (opened.source + (tick - opened.real));
}

/** 06-A 보호자 초대 (Figma 986:5868). 열면 코드를 만들고, 다시 발급하면 이전 코드는 만료된다 */
export default function InviteScreen() {
  const profile = useProfile().data;
  const [invite, setInvite] = useState<Invite | null>(() => cachedInvite());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const left = useRemaining(invite);
  const expired = left !== null && left <= 0;

  const issue = async () => {
    setBusy(true);
    setMessage(null);
    try {
      setInvite(await issueInvite());
    } catch (reason) {
      setMessage({ text: errorText(reason), error: true });
    } finally {
      setBusy(false);
    }
  };

  // 처음 열면 바로 코드를 만든다 (이미 만든 코드가 살아 있으면 그대로 보여준다)
  useEffect(() => {
    if (cachedInvite()) return;
    let alive = true;
    issueInvite().then(
      (created) => alive && setInvite(created),
      (reason) => alive && setMessage({ text: errorText(reason), error: true }),
    );
    return () => {
      alive = false;
    };
  }, []);

  const copy = async () => {
    if (!invite) return;
    try {
      const done = await shareText(invite.code, '복사했어요. 함께 돌볼 보호자에게 알려주세요.');
      if (done) setMessage({ text: done, error: false });
    } catch (reason) {
      setMessage({ text: errorText(reason), error: true });
    }
  };

  return (
    <TabScreen
      title="보호자 초대"
      subtitle={
        profile
          ? `${profile.subjectLabel} · ${profile.canManage ? '주 보호자' : '보호자'}`
          : undefined
      }
    >
      <View className="mt-4 gap-[18px] px-6">
        <View className="gap-[10px] rounded-lg bg-white px-4 py-8">
          <Text
            accessibilityLabel={invite ? `초대 코드 ${invite.code}` : '초대 코드 만드는 중'}
            className="text-[44px] font-bold leading-[64px] tracking-normal text-primary"
          >
            {invite ? spaced(invite.code) : '··· ···'}
          </Text>
          <Text className="text-[16px] font-semibold leading-[23px] tracking-normal">
            {expired
              ? '코드가 만료됐어요'
              : left !== null
                ? `남은 시간 ${remaining(left)}`
                : '코드를 만드는 중이에요'}
          </Text>
          <Text className="text-[13px] leading-[19px] tracking-normal text-muted">
            코드는 발급 후 {validity(invite?.validMinutes ?? 10)} 동안 유효해요.
          </Text>
        </View>
        <Button
          label="코드 복사"
          disabled={!invite || expired}
          onPress={copy}
          className={!invite || expired ? 'opacity-50' : undefined}
        />
        <Button
          label={busy ? '발급하는 중…' : '초대 코드 재발급'}
          variant="outline"
          disabled={busy}
          onPress={issue}
        />
        <FormMessage text={message?.text ?? null} error={message?.error} />
        <Note
          title="다시 발급하면 이전 코드는 만료돼요"
          body="함께 돌볼 보호자에게 새 코드를 알려주세요."
        />
      </View>
    </TabScreen>
  );
}
