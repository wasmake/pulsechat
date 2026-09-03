import { defineConfig, devices } from '@playwright/test';

const port = 3217;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `yarn dev --hostname 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}/sign-in`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      DATABASE_URL: 'mysql://pulsechat:test@127.0.0.1:3306/pulsechat',
      BETTER_AUTH_SECRET: 'playwright-secret-at-least-32-characters',
      BETTER_AUTH_URL: `http://127.0.0.1:${port}`,
      AUTHY_ISSUER: 'http://127.0.0.1:3218',
      AUTHY_CLIENT_ID: 'pulsechat-playwright',
      AUTHY_CLIENT_SECRET: 'playwright-client-secret-at-least-32-characters',
      NEXT_PUBLIC_STREAM_API_KEY: 'playwright-stream-key',
      STREAM_API_SECRET: 'playwright-stream-secret',
    },
  },
});
