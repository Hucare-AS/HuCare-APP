import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

export type SubjectInfo = { phone: string; careCenterPhone: string };
export type SubjectField = keyof SubjectInfo;

/** 단일 값 항목: 라벨 · 입력 placeholder · 버튼 문구 */
const TEXT_FIELDS = {
  phone: {
    label: '전화번호',
    placeholder: '전화번호를 입력해주세요',
    edit: '전화번호 수정',
    save: '전화번호 저장',
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
  name: string;
  onSave: (patch: Partial<SubjectInfo>) => void;
  onClose: () => void;
};

/** 대상자 정보 수정 하단 팝업 (AlertSheet와 같은 껍데기) */
export function SubjectSheet({ field, info, name, onSave, onClose }: SubjectSheetProps) {
  return (
    <BottomSheet visible={!!field} onClose={onClose}>
      {field ? (
        <>
          <Text className="text-[24px] font-semibold leading-[34px] tracking-[-0.6px] text-black">
            {name}
          </Text>
          {/* key: 항목이 바뀌면 입력 상태 초기화 */}
          <TextBody
            key={field}
            {...TEXT_FIELDS[field]}
            value={info[field]}
            onSave={(value) => onSave({ [field]: value })}
          />
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
