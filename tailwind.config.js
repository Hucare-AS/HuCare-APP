const { platformSelect } = require('nativewind/theme');

// NativeWind 는 컴파일 대상 플랫폼을 NATIVEWIND_OS 로 넘긴다. (web 도 'web' 으로 설정됨)
const isNative = process.env.NATIVEWIND_OS !== undefined && process.env.NATIVEWIND_OS !== 'web';

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Figma HuCare 페이지 기준
        primary: {
          DEFAULT: '#EF7000',
          foreground: '#FFFFFF',
        },
        /** 화면 배경 */
        surface: '#F9F9F9',
        /** 요약 카드 · 알림 카드 배경 */
        sand: '#EFE8E5',
        ink: '#111111',
        muted: '#767676',
        line: '#D8D8D8',
        /** 상태 — 달력 점, 타임라인 막대, "괜찮아요" 칩 */
        status: {
          ok: '#34A853',
          alert: '#FF5521',
        },
        /** 건강 지표별 숫자 색 */
        metric: {
          heart: '#FF5521',
          breath: '#3A62F8',
          oxygen: '#6C00F1',
          rhythm: '#34A853',
          tension: '#FF9232',
          stamina: '#FBBC04',
        },
      },
      fontFamily: {
        // 웹: Pretendard(CDN, +html.tsx 참고). 네이티브: 시스템 폰트로 대체.
        sans: isNative
          ? platformSelect({ android: 'sans-serif' })
          : [
              'Pretendard',
              '-apple-system',
              'BlinkMacSystemFont',
              'system-ui',
              'Roboto',
              '"Apple SD Gothic Neo"',
              '"Noto Sans KR"',
              '"Malgun Gothic"',
              'sans-serif',
            ],
      },
      boxShadow: {
        card: '0 4px 10px rgba(0, 0, 0, 0.1)',
        badge: '0 4px 10px rgba(255, 146, 50, 0.1)',
        shortcut: '0 2px 4px rgba(0, 0, 0, 0.1)',
        tabbar: '0 0 40px rgba(0, 0, 0, 0.15)',
      },
      maxWidth: {
        screen: '430px',
      },
    },
  },
  plugins: [],
};
