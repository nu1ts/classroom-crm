import { defineConfig, devices } from '@playwright/test';

/**
 * Стенд Playwright для проекта Classroom CRM
 * Запуск локального сервера через python -m http.server
 * baseURL указывает на директорию reference/
 * Ретраи отключены по требованию задачи
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 1 : 2,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }]
  ],
  use: {
    baseURL: 'http://127.0.0.1:8080/reference/',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 }
      },
    },
  ],
  webServer: {
    command: 'python -m http.server 8080',
    url: 'http://127.0.0.1:8080/reference/index.html',
    reuseExistingServer: !process.env.CI,
    timeout: 30 * 1000,
  },
});
