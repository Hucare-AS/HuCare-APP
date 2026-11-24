import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { BoxInput, BoxPicker, FormMessage, Note } from '@/components/care-form';
import { TabScreen } from '@/components/tab-screen';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { Text } from '@/components/ui/text';
import { createSubject, type SubjectKind } from '@/lib/care';
import { cn } from '@/lib/cn';

const KINDS: { value: SubjectKind; label: string }[] = [
  { value: 'elder', label: '어르신' },
  { value: 'child', label: '어린이' },
  { value: 'pet', label: '반려동물' },
];

/** 대상에 따라 "대상 정보"에서 고를 항목이 바뀐다 */
const INFO_OPTIONS: Record<SubjectKind, { placeholder: string; options: string[] }> = {
  elder: { placeholder: '연령대 선택', options: ['60대', '70대', '80대', '90대 이상'] },
  child: { placeholder: '연령대 선택', options: ['0~2세', '3~6세', '7~12세'] },
  pet: { placeholder: '종·크기 선택', options: ['소형견', '중형견', '대형견', '고양이'] },
};

/** 05-A 누구를 돌볼까요? · 대상 등록 1단계 (Figma 976:4791) */
export default function RegisterSubjectScreen() {
  const [kind, setKind] = useState<SubjectKind>('elder');
  const [name, setName] = useState('');
  const [info, setInfo] = useState<string | null>(null);
  const [place, setPlace] = useState('');
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const infoField = INFO_OPTIONS[kind];

  const submit = async () => {
    if (busy) return;
    if (!name.trim()) return setError('이름을 입력해 주세요.');
    setBusy(true);
    setError(null);
    try {
      await createSubject({ kind, name: name.trim(), info, place: place.trim() || '거실' });
      // 기기 연결(2~7단계)은 아직 시안이 확정되지 않아, 등록한 대상의 대시보드로 바로 간다
      router.replace('/home/board');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <TabScreen title="누구를 돌볼까요?" subtitle="1 / 7 · 대상 등록">
      <View className="mt-4 gap-[18px] px-6">
        <Segmented
          label="대상 종류"
          options={KINDS}
          value={kind}
          onChange={(next) => {
            setKind(next);
            setInfo(null);
          }}
        />
        <BoxInput label="이름" value={name} onChangeText={setName} placeholder="어머니" />
        <BoxPicker
          label="대상 정보"
          value={info}
          placeholder={infoField.placeholder}
          onPress={() => setPicking(true)}
        />
        <BoxInput label="설치 장소" value={place} onChangeText={setPlace} placeholder="거실" />
        <Note
          title="대상에 맞는 기준을 사용해요"
          body="반려동물 선택 시 종·크기 정보로 항목이 바뀝니다."
        />
        <FormMessage text={error} error />
        <Button
          label={busy ? '잠시만요…' : '기기 연결하기'}
          disabled={busy}
          onPress={submit}
          className={cn(busy && 'opacity-50')}
        />
      </View>

      <BottomSheet visible={picking} onClose={() => setPicking(false)}>
        <Text className="text-[24px] font-semibold leading-[34px] tracking-[-0.6px] text-black">
          {infoField.placeholder}
        </Text>
        <View className="mt-3">
          {infoField.options.map((option) => (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected: option === info }}
              onPress={() => {
                setInfo(option);
                setPicking(false);
              }}
              className={cn(
                'rounded-lg px-3 py-[12px] active:bg-sand',
                option === info && 'bg-sand',
              )}
            >
              <Text className="text-[16px] leading-[23px]">{option}</Text>
            </Pressable>
          ))}
        </View>
      </BottomSheet>
    </TabScreen>
  );
}
