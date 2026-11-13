# HuCare WebApp — 작업 규칙

- Expo SDK 57 / React Native 0.86 / Expo Router. 코드 작성 전 반드시 버전별 문서를 확인: https://docs.expo.dev/versions/v57.0.0/
- 웹이 1차 타깃(`expo export --platform web`, static output). 네이티브(iOS/Android)도 깨지지 않게 유지한다.
- 스타일링은 NativeWind v4(Tailwind v3) `className` 사용. `StyleSheet`는 NativeWind로 표현 불가능한 경우에만.
- 경로 별칭: `@/*` → `src/*`. 라우트는 `src/app/` 아래 파일 기반.
- 데이터: 화면은 `src/lib/care.ts` 의 훅·함수만 통해 읽는다. `EXPO_PUBLIC_API_URL` 이 있으면 백엔드(`care-api.ts`), 비어 있으면 목업(`care-mock.ts`). 백엔드 Swagger: https://hulab-hucare-api.p-e.kr/swagger-ui/index.html (guardian 응답은 스키마가 없어 `care-api.ts` 의 타입이 기준)
- E2E 는 목업 모드로 돈다 (`playwright.config.ts` 가 API 주소를 비움).
- 커밋 전 `npm run typecheck && npm run lint && npm run format:check` 통과 확인.
