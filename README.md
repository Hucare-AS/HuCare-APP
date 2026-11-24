# HuCare WebApp

어르신 돌봄 앱. 카메라가 확인한 건강 지표와 낙상·비활동·기기 꺼짐 알림을 보호자에게 보여준다.
Expo(React Native) 기반 웹앱이며, 웹을 1차 타깃으로 하되 iOS/Android 빌드도 가능한 구조다. 구조와 규칙은 Utest 를 따른다.

## 시작하기

요구 사항: Node 20.19.4 이상 (`.nvmrc` 참고), npm

```bash
npm install
cp .env.example .env.local   # 백엔드 연결. 목업으로 보려면 EXPO_PUBLIC_API_URL 을 비운다
npm run web          # 웹 개발 서버 (http://localhost:8081)
```

## 스크립트

| 명령                                      | 설명                         |
| ----------------------------------------- | ---------------------------- |
| `npm run web`                             | 웹 개발 서버 실행            |
| `npm run android` / `npm run ios`         | 네이티브 개발 서버 실행      |
| `npm run build:web`                       | 정적 웹 빌드 → `dist/`       |
| `npm run build:pages` / `deploy:pages`    | Cloudflare Pages 빌드 / 배포 |
| `npm run typecheck`                       | TypeScript 타입 검사         |
| `npm run lint` / `npm run lint:fix`       | ESLint 검사 / 자동 수정      |
| `npm run format` / `npm run format:check` | Prettier 포매팅 / 검사       |
| `npm run e2e` / `npm run e2e:ui`          | Playwright E2E / UI 모드     |

Windows 에서 Metro 가 파일 변경을 놓치면 `npx expo start --web --clear` 로 다시 띄운다.

## 화면

| 라우트           | 화면                                                            | Figma                       |
| ---------------- | --------------------------------------------------------------- | --------------------------- |
| `/`              | 스플래시                                                        | 786:264                     |
| `/login`         | 로그인 (API 모드)                                               | 946:1159                    |
| `/signup`        | 회원가입 (API 모드)                                             | 946:1250                    |
| `/home`          | 대상 0명: 첫 대상 등록 · 1명: 대시보드 · 2명+: 대상 목록        | 976:4671 · 976:4495         |
| `/home/board`    | 고른 대상 대시보드. 미확인 알림이 있으면 주황, 없으면 파랑 보드 | 818:552 · 818:1030          |
| `/home/subjects` | 대상 수정 · 대상 바꾸기                                         | 976:4641                    |
| `/home/register` | 대상 등록 1단계 (기기 연결 2~7단계는 미구현)                    | 976:4791                    |
| `/home/join`     | 초대 코드 입력 (API 모드는 초대 링크)                           | 976:4828                    |
| `/home/photos`   | 사진 · 이벤트 영상 (카메라형만, API 모드는 준비 중)             | 976:4855                    |
| `/records`       | 오늘 기록                                                       | 786:455                     |
| `/records/month` | 이번 달 기록                                                    | 793:919                     |
| `/records/day`   | 날짜별 기록 (`?date=2026-10-14`)                                | 799:1159                    |
| `/records/trend` | 추세 그래프 (일·주·월, 연간은 미지원)                           | 975:4275                    |
| `/alerts`        | 고른 대상의 알림 목록 + 하단 팝업                               | 786:497 · 803:88 · 818:1160 |
| `/settings`      | 설정                                                            | 786:539                     |

## 데이터

화면은 `src/lib/care.ts` 의 훅만 쓰고, 데이터 원천은 `EXPO_PUBLIC_API_URL` 로 정한다.

- **API 모드** (`EXPO_PUBLIC_API_URL=https://hulab-hucare-api.p-e.kr/api/v1`): 로그인 후 고른 대상(처음엔 첫 번째 대상) 데이터를 `/api/v1/guardian/*` 에서 읽는다 (`src/lib/care-api.ts`). 세션은 웹에서 "로그인 유지하기"를 켜면 `localStorage`, 끄면 `sessionStorage`, 네이티브는 메모리에 둔다. 고른 대상은 `localStorage` 에 남긴다.
- **목업 모드** (비워 둠): `src/lib/care-mock.ts`. 기준 시각은 Figma 시안에 맞춰 2026-10-26 22:30 고정. 대상은 어머니(카메라형) · 지우(카메라형) · 보리(레이더형, 연결 끊김) 셋이고, 초대 코드는 6자리 숫자면 받는다. E2E 가 이 모드로 돈다.

백엔드에 아직 없어 화면만 있는 것: Google 로그인(클라이언트 ID 없음), 회원가입 생년월일 · 대상 연령대 · 설치 장소 저장, 반려동물 대상, 6자리 초대 코드(백엔드는 초대 링크), 사진 · 영상, 연간 추세, 개인 기준선.

백엔드 CORS 허용 목록에 웹앱 주소가 있어야 한다 (백엔드 `CORS_ALLOWED_ORIGINS`). 웹 개발 서버는 Metro 프록시(`/__api`, `metro.config.js`)를 거쳐 CORS 와 무관하다.

## 배포 (Cloudflare Pages)

`npm run build:pages` = `expo export --platform web` + Pages 용 후처리(`scripts/postbuild-pages.js`).
`.github/workflows/deploy-pages.yml` 은 시크릿(`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`)이 없으면 배포 단계를 건너뛴다.
