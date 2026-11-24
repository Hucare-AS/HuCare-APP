import { router, useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Note } from '@/components/care-form';
import { HomeBoard } from '@/components/home-board';
import { LoadState } from '@/components/load-state';
import { Screen } from '@/components/screen';
import { SubjectCard, subjectMeta } from '@/components/subject-card';
import { TabScreen, useTabBarSpace } from '@/components/tab-screen';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { inviteInput, selectSubject, useSubjects, type SubjectSummary } from '@/lib/care';

/**
 * 홈. 대상 수에 따라 갈린다 (Figma 956:1161 화면 이동 흐름)
 * 0명 → 첫 대상 등록(02-D) · 1명 → 그 대상 대시보드 · 2명 이상 → 대상 목록(02-A)
 */
export default function HomeScreen() {
  const resource = useSubjects();
  const subjects = resource.data;

  if (!subjects) {
    return (
      <Screen>
        <LoadState resource={resource} className="flex-1 justify-center" />
      </Screen>
    );
  }
  if (subjects.length === 0) return <FirstSubject />;
  if (subjects.length === 1) return <HomeBoard />;
  return <SubjectOverview subjects={subjects} />;
}

/** 02-D 첫 대상을 등록해요 (Figma 976:4671) */
function FirstSubject() {
  return (
    <TabScreen title="첫 대상을 등록해요" subtitle="아직 연결된 대상이 없어요">
      <View className="mt-4 gap-[18px] px-6">
        <View className="gap-[10px] rounded-lg bg-white px-4 py-10">
          <Text className="text-[20px] font-semibold leading-[29px] tracking-normal">
            돌봄을 시작할 준비가 됐어요
          </Text>
          <Text className="font-semibold leading-[20px] tracking-normal text-[#777777]">
            대상을 등록하고 기기를 연결하면{'\n'}상태와 기록을 확인할 수 있어요.
          </Text>
        </View>
        <Button label="대상 등록하기" onPress={() => router.push('/home/register')} />
        <Button
          label="초대 코드로 참여"
          variant="outline"
          onPress={() => router.push('/home/join')}
        />
        <Note
          title="초대받은 보호자라면"
          body={`${inviteInput.label}를 입력해 기존 대상에 참여하세요.`}
        />
      </View>
    </TabScreen>
  );
}

/** 02-A 함께 돌보는 일상: 대상 카드 목록 (Figma 976:4495) */
function SubjectOverview({ subjects }: { subjects: SubjectSummary[] }) {
  const insets = useScreenInsets();
  const bottomSpace = useTabBarSpace();
  const unacked = subjects.reduce((sum, subject) => sum + subject.unackedCount, 0);

  // 주황 헤더가 상태바까지 덮으므로 상태바 글자를 흰색으로 둔다
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, []),
  );

  const open = (id: string) => {
    selectSubject(id);
    router.push('/home/board');
  };

  return (
    <Screen top={false}>
      <ScrollView contentContainerStyle={{ paddingBottom: bottomSpace }}>
        <View
          className="gap-3 rounded-b-2xl bg-primary px-6 pb-6"
          style={{ paddingTop: insets.top + 4 }}
        >
          <View className="h-9 flex-row items-center justify-between">
            <Text className="text-[24px] font-bold leading-[31px] tracking-[-0.6px] text-white">
              HuCare
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="알림"
              onPress={() => router.navigate('/alerts')}
              className="size-9 items-center justify-center rounded-full bg-white/80 active:opacity-60"
            >
              <Icon name="tabAlerts" />
            </Pressable>
          </View>
          <Text className="text-[24px] font-bold leading-[35px] tracking-normal text-white">
            오늘의 돌봄
          </Text>
          <Pressable
            accessibilityRole="link"
            onPress={() => router.navigate('/alerts')}
            className="self-start active:opacity-60"
          >
            <Text className="leading-[20px] tracking-normal text-white">
              {unacked ? `미확인 알림 ${unacked}건 보기   ›` : '미확인 알림이 없어요   ›'}
            </Text>
          </Pressable>
        </View>

        <View className="mt-4 gap-[18px] px-6">
          <View className="h-[30px] flex-row items-center justify-between">
            <Text className="text-[18px] font-semibold leading-[22px] tracking-normal">
              돌봄 대상 {subjects.length}명
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="대상 수정"
              onPress={() => router.push('/home/subjects')}
              className="active:opacity-60"
            >
              <Text className="font-semibold leading-[17px] tracking-normal">대상 수정 ›</Text>
            </Pressable>
          </View>
          {subjects.map((subject) => (
            <SubjectCard
              key={subject.id}
              subject={subject}
              meta={subjectMeta(subject, ['place', 'device'])}
              onPress={() => open(subject.id)}
            />
          ))}
          <Button
            label="대상 추가"
            variant="outline"
            onPress={() => router.push('/home/register')}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
