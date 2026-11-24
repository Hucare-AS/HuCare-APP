import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { LoadState } from '@/components/load-state';
import { lastSeen, statusLine, SubjectCard, subjectMeta } from '@/components/subject-card';
import { TabScreen } from '@/components/tab-screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { selectSubject, useSelectedSubjectId, useSubjects, type SubjectSummary } from '@/lib/care';

/** 다른 대상 한 줄: 어린이 · 카메라형 · 오늘 14:31 / 연결이 끊겼으면 마지막 시각 대신 "연결 끊김" */
function rowMeta(subject: SubjectSummary) {
  const tail = subject.status === 'offline' ? '연결 끊김' : lastSeen(subject.latest);
  return [subjectMeta(subject, ['device']), tail].join(' · ');
}

/** 02-C 대상 수정 · 대상 바꾸기 (Figma 976:4641) */
export default function SubjectsScreen() {
  const resource = useSubjects();
  const selectedId = useSelectedSubjectId();
  const subjects = resource.data;
  const current = subjects?.find((subject) => subject.id === selectedId) ?? subjects?.[0];

  return (
    <TabScreen title="대상 수정" subtitle={current ? `현재 대상: ${current.label}` : undefined}>
      <View className="mt-4 gap-[18px] px-6">
        {!subjects ? (
          <LoadState resource={resource} />
        ) : (
          <>
            {current ? (
              <SubjectCard
                subject={current}
                title={`${current.label} · 선택됨`}
                meta={subjectMeta(current, ['device'])}
                unackedLabel="미확인"
                onPress={() => router.push('/home/board')}
              />
            ) : null}
            {subjects
              .filter((subject) => subject !== current)
              .map((subject) => (
                <Pressable
                  key={subject.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${subject.label}, ${statusLine(subject).text}`}
                  onPress={() => {
                    selectSubject(subject.id);
                    router.push('/home/board');
                  }}
                  className="gap-[5px] py-[10px] active:opacity-60"
                >
                  <Text className="text-[15px] font-semibold leading-[22px] tracking-normal">
                    {subject.label}
                  </Text>
                  <Text className="text-[12px] leading-[17px] tracking-normal text-muted">
                    {rowMeta(subject)}
                  </Text>
                </Pressable>
              ))}
            <Button
              label="전체 대상 홈"
              variant="outline"
              onPress={() => router.dismissTo('/home')}
            />
            <Button label="대상 추가" onPress={() => router.push('/home/register')} />
          </>
        )}
      </View>
    </TabScreen>
  );
}
