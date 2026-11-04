# HuCare WebApp

어르신 돌봄 앱. 카메라가 확인한 건강 지표와 낙상·비활동·기기 꺼짐 알림을 보호자에게 보여준다.
Expo(React Native) 기반 웹앱이며, 웹을 1차 타깃으로 하되 iOS/Android 빌드도 가능한 구조다. 구조와 규칙은 Utest 를 따른다.

## 시작하기

요구 사항: Node 20.19.4 이상 (`.nvmrc` 참고), npm

```bash
npm install
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

| 라우트            | 화면                                            | Figma                       |
| ----------------- | ----------------------------------------------- | --------------------------- |
| `/`               | 스플래시                                        | 786:264                     |
| `/home`           | 홈. 미확인 알림이 있으면 주황, 없으면 파랑 보드 | 818:552 · 818:1030          |
| `/records`        | 오늘 기록                                       | 786:455                     |
| `/records/month`  | 이번 달 기록                                    | 793:919                     |
| `/records/[date]` | 날짜별 기록 (`2026-10-14` 형식)                 | 799:1159                    |
| `/alerts`         | 알림 목록 + 하단 팝업                           | 786:497 · 803:88 · 818:1160 |
| `/settings`       | 설정                                            | 786:539                     |

## 데이터

아직 백엔드가 없어 `src/lib/care.ts` 의 목업으로 동작한다. 기준 시각은 Figma 시안에 맞춰 2026-10-26 22:30 으로 고정했다.
"확인했어요"는 메모리에만 남아 새로고침하면 처음 상태로 돌아가고, 설정값은 웹 `localStorage` 에 저장된다.
백엔드가 생기면 `care.ts` 의 내용만 API 호출로 바꾼다.

## 배포 (Cloudflare Pages)

`npm run build:pages` = `expo export --platform web` + Pages 용 후처리(`scripts/postbuild-pages.js`).
`.github/workflows/deploy-pages.yml` 은 시크릿(`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`)이 없으면 배포 단계를 건너뛴다.
