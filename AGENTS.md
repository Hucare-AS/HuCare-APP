# HuCare WebApp — 작업 규칙

- Expo SDK 57 / React Native 0.86 / Expo Router. 코드 작성 전 반드시 버전별 문서를 확인: https://docs.expo.dev/versions/v57.0.0/
- 웹이 1차 타깃(`expo export --platform web`, static output). 네이티브(iOS/Android)도 깨지지 않게 유지한다.
- 스타일링은 NativeWind v4(Tailwind v3) `className` 사용. `StyleSheet`는 NativeWind로 표현 불가능한 경우에만.
- 경로 별칭: `@/*` → `src/*`. 라우트는 `src/app/` 아래 파일 기반.
- 데이터는 아직 백엔드가 없어 `src/lib/care.ts` 의 목업을 쓴다. 화면은 이 모듈의 함수만 통해 데이터를 읽는다.
- 커밋 전 `npm run typecheck && npm run lint && npm run format:check` 통과 확인.
