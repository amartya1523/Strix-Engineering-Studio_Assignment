import { defineConfig, devices } from '@playwright/test';
if (!process.env.E2E_DATABASE_URL || !process.env.E2E_DATABASE_URL.split('?')[0].endsWith('_e2e')) {
  throw new Error('Set E2E_DATABASE_URL to a dedicated PostgreSQL database ending in _e2e.');
}
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  reporter: [['list'], ['html', { open: 'never' }]],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'cd .. && backend/.venv/bin/uvicorn scripts.ai_fixture:app --port 8123',
      url: 'http://127.0.0.1:8123/docs',
      reuseExistingServer: false,
    },
    {
      command:
        'cd ../backend && .venv/bin/alembic upgrade head && .venv/bin/uvicorn app.main:app --port 8001',
      url: 'http://127.0.0.1:8001/api/health',
      reuseExistingServer: false,
      env: {
        DATABASE_URL: process.env.E2E_DATABASE_URL,
        DEFAULT_AI_API_KEY: '',
        FRONTEND_ORIGIN: 'http://localhost:3100',
      },
    },
    {
      command: 'npm run dev -- --port 3100',
      url: 'http://localhost:3100/login',
      reuseExistingServer: false,
      env: { BACKEND_URL: 'http://127.0.0.1:8001', CODEATLAS_E2E: 'true' },
      timeout: 120000,
    },
  ],
});
