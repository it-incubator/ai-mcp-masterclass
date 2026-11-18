import { Page, expect } from '@playwright/test';

// NB: animation-duration must stay > 0 (0s never fires animationend and antd modals/drawers get stuck in their leave state);
// transitions are simply turned off (transition-duration > 0 breaks rc-trigger popup positioning).
export const NO_ANIMATION_CSS = `*,*::before,*::after{animation-duration:0.001s!important;animation-delay:0s!important;transition:none!important;scroll-behavior:auto!important}`;

/** Inject CSS disabling animations on every document load. */
export async function disableAnimations(page: Page) {
  await page.addInitScript((css) => {
    const add = () => {
      const s = document.createElement('style');
      s.textContent = css;
      (document.head || document.documentElement).appendChild(s);
    };
    if (document.head) add();
    else document.addEventListener('DOMContentLoaded', add);
  }, NO_ANIMATION_CSS);
}

/** Pick an option in an antd Select whose wrapper carries the data-testid. */
export async function selectOption(page: Page, testId: string, optionText: string | RegExp, search?: string) {
  await page.getByTestId(testId).click();
  if (search !== undefined) await page.keyboard.type(search);
  const dropdown = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
  const opt = dropdown.locator('.ant-select-item-option').filter({ hasText: optionText }).first();
  await opt.click();
  await expect(page.getByTestId(testId)).not.toHaveClass(/ant-select-open/);
}

export const confirmOk = (page: Page) => page.getByTestId('confirm-ok').click();
