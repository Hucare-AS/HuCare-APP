import { Platform } from 'react-native';

/**
 * HuCare 백엔드 HTTP 클라이언트.
 * EXPO_PUBLIC_API_URL 이 비어 있으면 목업 모드로 동작하고 이 모듈은 호출되지 않는다.
 */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '');

export const isApiMode = API_URL !== '';

/**
 * 웹 개발 서버에서는 백엔드 CORS 허용 목록에 localhost 가 없어 Metro 프록시(/__api, metro.config.js)를 거친다.
 * 배포된 웹과 네이티브는 백엔드로 바로 요청한다.
 */
const BASE_URL =
  __DEV__ && Platform.OS === 'web' ? `/__api${API_URL.replace(/^https?:\/\/[^/]+/, '')}` : API_URL;

/** 백엔드 오류 응답 `{ error: { code, message, fields, request_id } }` */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Query = Record<string, string | number | boolean | null | undefined>;

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  query?: Query;
  body?: unknown;
  /** Authorization 헤더에 넣을 액세스 토큰 */
  token?: string | null;
  headers?: Record<string, string>;
};

function buildUrl(path: string, query?: Query) {
  const params = Object.entries(query ?? {})
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  return `${BASE_URL}${path}${params.length ? `?${params.join('&')}` : ''}`;
}

/** 본문이 없을 때 상태 코드별 기본 문구 */
const FALLBACK_MESSAGE: Record<number, string> = {
  401: '이메일 또는 비밀번호를 다시 확인해 주세요.',
  403: '볼 수 있는 권한이 없어요.',
  404: '요청한 정보를 찾을 수 없어요.',
  429: '요청이 많아요. 잠시 후 다시 시도해 주세요.',
};

/**
 * 백엔드 오류 본문은 두 가지다.
 * 보호자 API: `{ error: { code, message, fields } }` · 인증 등 나머지: ProblemDetail `{ detail, code, errors }`
 */
async function readError(response: Response) {
  try {
    const body = await response.json();
    const error = body?.error;
    if (error?.message) {
      return new ApiError(response.status, error.code ?? 'ERROR', error.message, error.fields);
    }
    if (body?.detail) {
      const fields: Record<string, string> = Object.fromEntries(
        (body.errors ?? []).map((item: { field: string; message: string }) => [
          item.field,
          item.message,
        ]),
      );
      const code = body.code ?? (Object.keys(fields).length ? 'VALIDATION_ERROR' : 'ERROR');
      return new ApiError(response.status, code, body.detail, fields);
    }
  } catch {
    // 본문이 없거나 JSON 이 아니면 아래 기본 문구를 쓴다
  }
  return new ApiError(
    response.status,
    'HTTP_ERROR',
    FALLBACK_MESSAGE[response.status] ?? '서버와 연결이 원활하지 않아요.',
  );
}

/** 인증 없이 보내는 기본 요청. 인증이 필요한 요청은 auth.ts 의 authedRequest 를 쓴다. */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', query, body, token, headers } = options;
  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : null),
        ...(token ? { Authorization: `Bearer ${token}` } : null),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', '인터넷 연결을 확인해 주세요.');
  }
  if (!response.ok) throw await readError(response);
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** 생성 요청의 Idempotency-Key */
export function idempotencyKey() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
