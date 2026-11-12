import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { subject } from '@/lib/care';

export type SubjectInfo = {
  phone: string;
  place: string;
  family: string[];
  careCenterPhone: string;
};
export type SubjectField = keyof SubjectInfo;

/** 단일 값 항목: 라벨 · 입력 placeholder · 버튼 문구 */
const TEXT_FIELDS = {
  phone: {
    label: '전화번호',
    placeholder: '전화번호를 입력해주세요',
    edit: '전화번호 수정',
    save: '전화번호 저장',
  },
  place: {
    label: '기기 설치 장소',
    placeholder: '기기가 설치된 장소를 입력해주세요',
    edit: '설치 장소 수정',
    save: '설치 장소 저장',
  },
  careCenterPhone: {
    label: '돌봄센터 연락처',
    placeholder: '돌봄센터 연락처를 입력해주세요',
    edit: '연락처 수정',
    save: '연락처 저장',
  },
} as const;

const PLACEHOLDER = '#767676';

type SubjectSheetProps = {
  field: SubjectField | null;
  info: SubjectInfo;
  onSave: (patch: Partial<SubjectInfo>) => void;
  onClose: () => void;
};

/** 대상자 정보 수정 하단 팝업 (AlertSheet와 같은 껍데기) */
export function SubjectSheet({ field, info, onSave, onClose }: SubjectSheetProps) {
  return (
    <BottomSheet visible={!!field} onClose={onClose}>
      {field ? (
        <>
          <Text className="text-[24px] font-semibold leading-[34px] tracking-[-0.6px] text-black">
            {subject.relation}
          </Text>
          {/* key: 항목이 바뀌면 입력 상태 초기화 */}
          {field === 'family' ? (
            <FamilyBody key={field} names={info.family} onSave={(family) => onSave({ family })} />
          ) : (
            <TextBody
              key={field}
              {...TEXT_FIELDS[field]}
              value={info[field]}
              onSave={(value) => onSave({ [field]: value })}
            />
          )}
        </>
      ) : null}
    </BottomSheet>
  );
}

type TextBodyProps = (typeof TEXT_FIELDS)[keyof typeof TEXT_FIELDS] & {
  value: string;
  onSave: (value: string) => void;
};

function TextBody({ label, placeholder, edit, save, value, onSave }: TextBodyProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  return (
    <>
      <Text className="mt-[9px] font-medium text-black">{label}</Text>
      <View className="mt-[5px]">
        {editing ? (
          <TextInput
            autoFocus
            value={draft}
            onChangeText={setDraft}
            placeholder={placeholder}
            placeholderTextColor={PLACEHOLDER}
            className="border-b border-black py-0 font-sans text-[14px] font-light leading-[20px] text-black outline-none"
          />
        ) : (
          <Text className="font-light text-black">{value}</Text>
        )}
      </View>
      <Button
        className="mt-[35px]"
        label={editing ? save : edit}
        onPress={() => {
          if (!editing) return setEditing(true);
          const next = draft.trim();
          if (next) onSave(next); // 빈 값은 저장하지 않는다
          setEditing(false);
        }}
      />
    </>
  );
}

function FamilyBody({ names, onSave }: { names: string[]; onSave: (names: string[]) => void }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  const add = () => {
    const name = draft.trim();
    if (!name) return;
    onSave([...names, name]);
    setDraft('');
    setAdding(false);
  };

  return (
    <>
      <Text className="mt-[9px] font-medium text-black">함께 보는 가족</Text>
      {/* 2명씩 가로 배치, 홀수 마지막(1명 포함)은 남는 폭을 채운다 */}
      <View className="mt-[5px] flex-row flex-wrap gap-[10px]">
        {names.map((name, i) => (
          <View
            key={`${name}-${i}`}
            className="grow basis-[40%] items-center rounded-lg border border-primary py-[10px]"
          >
            <Text className="font-semibold text-primary">{name}</Text>
          </View>
        ))}
      </View>
      {adding ? (
        <View className="mt-[14px] flex-row items-center gap-[3px]">
          <TextInput
            autoFocus
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={add}
            placeholder="함께 돌보는 가족을 입력해주세요"
            placeholderTextColor={PLACEHOLDER}
            className="flex-1 rounded-lg border border-[#D8D8D8] py-[10px] pl-[11px] font-sans text-[14px] leading-[20px] text-black outline-none"
          />
          <Pressable
            accessibilityRole="button"
            onPress={add}
            className="rounded-lg bg-primary px-[17px] py-[10px] active:opacity-70"
          >
            <Text className="font-semibold text-white">추가</Text>
          </Pressable>
        </View>
      ) : null}
      <Button className="mt-[35px]" label="추가하기" onPress={() => setAdding(true)} />
    </>
  );
}
