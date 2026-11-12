/** 백엔드 호출. 주소와 토큰은 .env.local 의 EXPO_PUBLIC_API_URL / EXPO_PUBLIC_API_TOKEN. */
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://hulab-hucare-api.p-e.kr/api/v1';
// ponytail: 로그인 화면이 없어 임시로 env 토큰을 쓴다. 로그인 구현 시 저장된 세션 토큰으로 교체.
const TOKEN = process.env.EXPO_PUBLIC_API_TOKEN;

/** 토큰이 없으면 백엔드를 쓰지 않고 목업을 보여 준다. */
export const apiEnabled = !!TOKEN;

type Init = { method?: 'GET' | 'POST' | 'PATCH'; body?: unknown };

export async function api<T>(path: string, { method = 'GET', body }: Init = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      ...(body ? { 'Content-Type': 'application/json' } : null),
      // 생성(POST)은 서버가 중복 방지 키를 요구한다. 재시도 로직이 없어 호출마다 새 키를 쓴다.
      ...(method === 'POST'
        ? { 'Idempotency-Key': `${Date.now()}-${Math.random().toString(36).slice(2)}` }
        : null),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`API ${response.status} ${path}`);
  return (await response.json()) as T;
}

let subjectId: Promise<string | undefined> | null = null;

/** 돌봄 대상의 id. 알림·설정이 같이 쓴다. */
export function getSubjectId() {
  // ponytail: 응답 모양은 추측(items 배열). 첫 번째 대상만 사용, 여러 명이면 선택 UI 필요.
  subjectId ??= api<{ items?: { id: string }[] }>('/guardian/subjects')
    .then((res) => res.items?.[0]?.id)
    .catch((error) => {
      subjectId = null;
      throw error;
    });
  return subjectId;
}
