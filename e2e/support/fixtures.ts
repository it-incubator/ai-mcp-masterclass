import { test as base, expect } from '@playwright/test';
import { disableAnimations } from './ui';
import { resetData } from './api';

/** Test with animations disabled and console errors collected. */
export const test = base.extend<{ consoleErrors: string[] }>({
  page: async ({ page }, use) => {
    await disableAnimations(page);
    await use(page);
  },
  // Auto fixture: any uncaught page error or React/antd console error fails the test.
  // "Failed to load resource" lines are skipped (expected 4xx from error-path tests).
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      page.on('console', (m) => {
        if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) errors.push(m.text());
      });
      await use(errors);
      expect(errors, 'browser console errors').toEqual([]);
    },
    { auto: true },
  ],
});

/** Reset seed data before every test (mutating specs). */
export function resetBeforeEach() {
  test.beforeEach(async () => {
    await resetData();
  });
}
/** Reset seed data once (read-only specs). */
export function resetBeforeAll() {
  test.beforeAll(async () => {
    await resetData();
  });
}
export { expect };
