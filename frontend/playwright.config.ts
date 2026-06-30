import {defineConfig, devices} from '@playwright/test';

/**
 * Phase-4 visual + accessibility harness.
 * Drives the build → screenshot → refine loop (DESIGN.md Skills Protocol).
 * Three viewports cover the responsive matrix; every UI slice is screenshotted
 * in EN + FR and scanned with axe-core for WCAG-AA.
 */
export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'off'
  },
  projects: [
    {
      name: 'mobile',
      use: {...devices['Desktop Chrome'], viewport: {width: 390, height: 844}}
    },
    {
      name: 'tablet',
      use: {...devices['Desktop Chrome'], viewport: {width: 768, height: 1024}}
    },
    {
      name: 'desktop',
      use: {...devices['Desktop Chrome'], viewport: {width: 1280, height: 800}}
    }
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000/en',
    reuseExistingServer: true,
    timeout: 120_000
  }
});
