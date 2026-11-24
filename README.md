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

| 라우트                                                                      | 화면                                                                                    | Figma                          |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------ |
| `/`                                                                         | 스플래시                                                                                | 786:264                        |
| `/login`                                                                    | 로그인 (API 모드)                                                                       | 946:1159                       |
| `/signup`                                                                   | 회원가입 (API 모드)                                                                     | 946:1250                       |
| `/home`                                                                     | 대상 0명: 첫 대상 등록 · 1명: 대시보드 · 2명+: 대상 목록                                | 976:4671 · 986:5463            |
| `/home/board`                                                               | 고른 대상 대시보드 (지금 상태 · 기준선 대비 · 오늘 이벤트 · 최근 기록)                  | 986:5501                       |
| `/home/subjects`                                                            | 대상 수정 · 대상 바꾸기                                                                 | 976:4641                       |
| `/home/register`                                                            | 대상 등록 1단계                                                                         | 976:4791                       |
| `/home/connect`                                                             | 대상 등록 2~7단계 (기기 찾기 · Wi-Fi · 서버 · 설치 가이드 · 동의 · 첫 측정)와 연결 예외 | 986:5462 · 986:5442            |
| `/home/join`                                                                | 초대 코드 입력 → 수락 확인, 만료된 코드                                                 | 986:5900 · 986:5955 · 986:5927 |
| `/invitations/[id]`                                                         | 백엔드 초대 링크(`?token=`)로 들어오면 초대 확인으로 넘긴다                             | 시안 없음                      |
| `/reset-password`                                                           | 비밀번호 재설정 메일 링크(`?token_hash=`)로 새 비밀번호 설정                            | 시안 없음                      |
| `/home/photos`                                                              | 사진 · 이벤트 영상 (카메라형만, 영상은 API 미연결)                                      | 976:4855                       |
| `/records`                                                                  | 오늘 기록                                                                               | 786:455                        |
| `/records/month`                                                            | 이번 달 기록                                                                            | 793:919                        |
| `/records/day`                                                              | 날짜별 기록 (`?date=2026-10-14`)                                                        | 799:1159                       |
| `/records/trend`                                                            | 추세 그래프 (일·주·월·연, 개인 기준선)                                                  | 975:4275                       |
| `/alerts`                                                                   | 고른 대상의 알림 목록 + 하단 팝업                                                       | 786:497 · 803:88 · 818:1160    |
| `/settings`                                                                 | 설정 첫 화면 + 대상자 정보                                                              | 989:3790 · 786:539             |
| `/settings/invite`                                                          | 보호자 초대 (6자리 코드 · 남은 시간 · 재발급)                                           | 986:5868                       |
| `/settings/devices` · `device` · `firmware` · `wifi` · `restart` · `unlink` | 기기 관리                                                                               | 989:3857~989:4434              |
| `/settings/notifications` · `events` · `baseline` · `quiet` · `daily`       | 알림 설정                                                                               | 989:4488~989:4944              |
| `/settings/privacy` · `consents` · `withdraw` · `delete`                    | 개인정보와 동의                                                                         | 989:4998~989:5299              |
| `/settings/support` · `notices` · `article` · `faq` · `contact` · `cs`      | 앱 정보와 고객지원                                                                      | 989:5353~989:5883              |

## 데이터

화면은 `src/lib/care.ts` 의 훅만 쓰고, 데이터 원천은 `EXPO_PUBLIC_API_URL` 로 정한다.

- **API 모드** (`EXPO_PUBLIC_API_URL=https://hulab-hucare-api.p-e.kr/api/v1`): 로그인 후 고른 대상(처음엔 첫 번째 대상) 데이터를 `/api/v1/guardian/*` 에서 읽는다 (`src/lib/care-api.ts`). 세션은 웹에서 "로그인 유지하기"를 켜면 `localStorage`, 끄면 `sessionStorage`, 네이티브는 메모리에 둔다. 고른 대상은 `localStorage` 에 남긴다.
- **목업 모드** (비워 둠): `src/lib/care-mock.ts`. 기준 시각은 Figma 시안에 맞춰 2026-10-26 22:30 고정. 대상은 어머니(카메라형) · 지우(카메라형) · 보리(레이더형, 연결 끊김) 셋이고, 초대 코드는 6자리 숫자면 받는다. E2E 가 이 모드로 돈다.

설정의 설치 장소는 연결된 기기(`PATCH /guardian/devices/{id}`)에 저장하고, 전화번호·돌봄센터 연락처는 비워서 저장하면 지운다. 함께 보는 가족은 주 보호자가 6자리 초대 코드(24시간 유효)를 만들고, 가족을 내보내거나 내가 나갈 수 있다. 웹 API 모드에서는 `/stream`(SSE)을 받아 고른 대상의 화면을 바로 새로 고친다.

비밀번호 재설정 메일이 `/reset-password?token_hash=...` 로 오려면 백엔드 Supabase 복구 메일 템플릿 설정이 필요하다. 재설정 요청 id 는 요청한 브라우저에만 남으므로 같은 브라우저에서 이어서 해야 한다.

추세는 `/guardian/subjects/{id}/trends` 를 그대로 그린다. 값이 없는 칸은 0 이 아니라 빈 구간으로 두고, 모두 비면 이유(기기 미연결·연결 끊김·미지원·품질 부족)를 적는다. 사진은 `/photos/{date}` 의 그날 사진 1장을 보여주고, 홈 응답의 `capabilities` 로 카메라형·레이더형을, `available_features.photo` 로 볼 수 있는지를 정한다.

설정 플로우는 기기(`/guardian/devices`, 원격 명령 `restart`, `device-bindings/{id}/end`), 알림(`notification-preferences`의 기준선 이탈 · 방해금지 · 일일 요약), 동의(`consents`, `consent-decisions`), 삭제 요청(`deletion-requests` 의 `delete_photos`), 공지(`/documents`), 문의(`support-requests`)와 CS 모드(문의에 기기 진단 공유)를 쓴다. FAQ 는 API 가 없어 앱에 둔다.

대상 등록 2~7단계는 웹에서 Bluetooth · Wi-Fi 전달을 할 수 없어, 백엔드 모드에서는 기기 번호로 등록(`devices/register` → `device-bindings` → 설치 장소 PATCH)하고 기기가 연결될 때까지 확인한다. 목업은 시안 흐름 그대로이고, 기기 번호가 `0000` 으로 끝나면 기기 미발견, Wi-Fi 비밀번호 `wrong` 이면 Wi-Fi 실패, `9999` 로 끝나면 서버 지연 화면이 나온다. 목업 초대 코드 `000000` 은 만료된 코드다.

백엔드에 아직 없어 화면만 있는 것: Google 로그인(클라이언트 ID 없음), 회원가입 생년월일 · 대상 연령대 저장, 반려동물 대상, 펌웨어 새 버전 확인, 코드 초대 미리보기(06-D 는 코드만으로 채운다). 백엔드에는 있지만 앱이 아직 붙이지 않은 것: 이벤트 영상(문자 인증 · WebRTC), 푸시 토큰, 보호자별 사진 · 영상 권한, 동의 주체 확인 신청.

백엔드 CORS 허용 목록에 웹앱 주소가 있어야 한다 (백엔드 `CORS_ALLOWED_ORIGINS`). 웹 개발 서버는 Metro 프록시(`/__api`, `metro.config.js`)를 거쳐 CORS 와 무관하다.

## 배포 (Cloudflare Pages)

`npm run build:pages` = `expo export --platform web` + Pages 용 후처리(`scripts/postbuild-pages.js`).
`.github/workflows/deploy-pages.yml` 은 시크릿(`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`)이 없으면 배포 단계를 건너뛴다.
