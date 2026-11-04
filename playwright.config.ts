import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 8081);
const BASE_URL = `http://localhost:${PORT}`;

/**
 * 웹 E2E (Playwright).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  // 첫 요청에서 Metro 가 번들링하느라 수 초 걸린다.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: 'on',
    screenshot: 'only-on-failure',
    navigationTimeout: 60_000,
  },
  projects: [
    {
      // Figma 프레임(393×852)과 같은 모바일 뷰포트. iPhone 프리셋은 WebKit 을 요구해서 Chromium 으로 맞춘다.
      name: 'mobile-chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 393, height: 852 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: `npx expo start --web --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { CI: '1' },
  },
});
