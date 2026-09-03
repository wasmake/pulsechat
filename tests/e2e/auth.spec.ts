import { expect, test } from '@playwright/test';

test('shows Authy as the only sign-in method', async ({ page }) => {
  await page.goto('/sign-in');

  await expect(
    page.getByRole('heading', { name: 'Sign in to PulseChat' })
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Continue with Authy' })
  ).toBeVisible();
  await expect(page.getByText("organization's Authy account")).toBeVisible();
});

test('redirects protected pages to sign-in with their return path', async ({
  page,
}) => {
  await page.goto('/get-started');

  await expect(page).toHaveURL(/\/sign-in\?callbackURL=%2Fget-started$/);
});

test('redirects sign-up to the SSO sign-in page', async ({ page }) => {
  await page.goto('/sign-up');
  await expect(page).toHaveURL(/\/sign-in$/);
});
