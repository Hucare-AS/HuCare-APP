import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { type FamilyMember } from '@/lib/care';
import { cn } from '@/lib/cn';

export type SubjectInfo = {
  phone: string;
  place: string;
  family: FamilyMember[];
  careCenterPhone: string;
};
export type SubjectField = keyof SubjectInfo;

/** 단일 값 항목: 라벨 · 입력 placeholder · 버튼 문구 · 비워서 저장하면 지울 수 있는지 */
const TEXT_FIELDS = {
  phone: {
    label: '전화번호',
    placeholder: '전화번호를 입력해주세요',
    edit: '전화번호 수정',
    save: '전화번호 저장',
    clearable: true,
  },
  place: {
    label: '기기 설치 장소',
    placeholder: '기기가 설치된 장소를 입력해주세요',
    edit: '설치 장소 수정',
    save: '설치 장소 저장',
    clearable: false,
  },
  careCenterPhone: {
    label: '돌봄센터 연락처',
    placeholder: '돌봄센터 연락처를 입력해주세요',
    edit: '연락처 수정',
    save: '연락처 저장',
    clearable: true,
  },
} as const;

type TextField = keyof typeof TEXT_FIELDS;

const PLACEHOLDER = '#767676';

type SubjectSheetProps = {
  title: string;
  field: SubjectField | null;
  info: SubjectInfo;
  /** 주 보호자만 가족을 초대하거나 내보낼 수 있다 */
  canManage: boolean;
  /** null 이면 그 항목을 지운다. 실패하면 오류 문장으로 거부한다 */
  onSave: (field: TextField, value: string | null) => Promise<void>;
  onRemove: (member: FamilyMember) => Promise<void>;
  /** 보호자 초대 화면으로 간다 */
  onInvite: () => void;
  onClose: () => void;
};

function errorText(error: unknown) {
  return error instanceof Error && error.message ? error.message : '잠시 후 다시 시도해 주세요.';
}

/** 대상자 정보 수정 하단 팝업 (AlertSheet와 같은 껍데기) */
export function SubjectSheet({
  title,
  field,
  info,
  canManage,
  onSave,
  onRemove,
  onInvite,
  onClose,
}: SubjectSheetProps) {
  return (
    <BottomSheet visible={!!field} onClose={onClose}>
      {field ? (
        <>
          <Text className="text-[24px] font-semibold leading-[34px] tracking-[-0.6px] text-black">
            {title}
          </Text>
          {/* key: 항목이 바뀌면 입력 상태 초기화 */}
          {field === 'family' ? (
            <FamilyBody
              key={field}
              members={info.family}
              canManage={canManage}
              onRemove={onRemove}
              onInvite={onInvite}
              onClose={onClose}
            />
          ) : (
            <TextBody
              key={field}
              {...TEXT_FIELDS[field]}
              value={info[field]}
              onSave={(value) => onSave(field, value)}
            />
          )}
        </>
      ) : null}
    </BottomSheet>
  );
}

type TextBodyProps = (typeof TEXT_FIELDS)[TextField] & {
  value: string;
  onSave: (value: string | null) => Promise<void>;
};

function TextBody({ label, placeholder, edit, save, clearable, value, onSave }: TextBodyProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!editing) return setEditing(true);
    const next = draft.trim();
    if (next === value) return setEditing(false);
    // 비워서 저장하면 지운다. 지울 수 없는 항목(설치 장소)은 빈 값을 저장하지 않는다
    if (!next && !clearable) return setEditing(false);
    setBusy(true);
    setError(null);
    try {
      await onSave(next || null);
      setEditing(false);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Text className="mt-[9px] font-medium text-black">{label}</Text>
      <View className="mt-[5px]">
        {editing ? (
          <TextInput
            autoFocus
            accessibilityLabel={label}
            value={draft}
            onChangeText={setDraft}
            placeholder={placeholder}
            placeholderTextColor={PLACEHOLDER}
            className="border-b border-black py-0 font-sans text-[14px] font-light leading-[20px] text-black outline-none"
          />
        ) : (
          <Text className="font-light text-black">{value || '등록되지 않음'}</Text>
        )}
      </View>
      {editing && clearable && value ? (
        <Text variant="note" className="mt-2">
          비워서 저장하면 {label}를 지워요.
        </Text>
      ) : null}
      {error ? <Text className="mt-2 text-status-alert">{error}</Text> : null}
      <Button
        className={cn('mt-[35px]', busy && 'opacity-50')}
        label={busy ? '저장하는 중…' : editing ? save : edit}
        disabled={busy}
        onPress={submit}
      />
    </>
  );
}

type FamilyBodyProps = {
  members: FamilyMember[];
  canManage: boolean;
  onRemove: (member: FamilyMember) => Promise<void>;
  onInvite: () => void;
  onClose: () => void;
};

/**
 * 함께 보는 가족 (Figma 882:125 · 974:4219).
 * 가족 추가는 보호자 초대 화면(06-A)에서 6자리 코드를 만들어 전한다.
 */
function FamilyBody({ members, canManage, onRemove, onInvite, onClose }: FamilyBodyProps) {
  const [picked, setPicked] = useState<FamilyMember | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setMessage(null);
    try {
      await task();
    } catch (reason) {
      setMessage({ text: errorText(reason), error: true });
    } finally {
      setBusy(false);
    }
  };

  const remove = (member: FamilyMember) =>
    run(async () => {
      await onRemove(member);
      setPicked(null);
      if (member.me) onClose();
    });

  return (
    <>
      <Text className="mt-[9px] font-medium text-black">함께 보는 가족</Text>
      {/* 2명씩 가로 배치, 홀수 마지막(1명 포함)은 남는 폭을 채운다. 누르면 내보내기(나는 나가기) */}
      <View className="mt-[5px] flex-row flex-wrap gap-[10px]">
        {members.map((member) => {
          const selectable = member.me || canManage;
          return (
            <Pressable
              key={member.id}
              accessibilityRole="button"
              accessibilityState={{ selected: picked?.id === member.id, disabled: !selectable }}
              disabled={!selectable || busy}
              onPress={() => setPicked(picked?.id === member.id ? null : member)}
              className={cn(
                'grow basis-[40%] items-center rounded-lg border border-primary py-[10px] active:opacity-70',
                picked?.id === member.id && 'bg-primary',
              )}
            >
              <Text
                className={cn(
                  'font-semibold',
                  picked?.id === member.id ? 'text-white' : 'text-primary',
                )}
              >
                {member.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {picked ? (
        <View className="mt-[14px] gap-2 rounded-lg bg-sand p-4">
          <Text className="font-semibold">
            {picked.me
              ? '이 대상의 돌봄에서 나갈까요?'
              : `${picked.name}님을 함께 보는 가족에서 내보낼까요?`}
          </Text>
          <Text className="text-[12px] leading-[17px]">
            {picked.me
              ? '나가면 이 대상의 기록과 알림을 더 볼 수 없어요.'
              : '다시 함께 보려면 새로 초대해야 해요.'}
          </Text>
          <Button
            label={picked.me ? '나가기' : '내보내기'}
            variant="outline"
            disabled={busy}
            onPress={() => remove(picked)}
            className="mt-1"
          />
        </View>
      ) : null}

      {message ? (
        <Text className={cn('mt-2', message.error ? 'text-status-alert' : 'text-care-green')}>
          {message.text}
        </Text>
      ) : null}

      {canManage ? (
        <Button
          className={cn('mt-[35px]', busy && 'opacity-50')}
          label="추가하기"
          disabled={busy}
          onPress={onInvite}
        />
      ) : (
        <Text variant="note" className="mt-[35px]">
          가족 초대는 주 보호자만 할 수 있어요.
        </Text>
      )}
    </>
  );
}
