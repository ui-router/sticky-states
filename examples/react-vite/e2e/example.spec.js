const { test, expect } = require('@playwright/test');

test.describe('example app', () => {
  test('loads', async ({ page }) => {
    await page.goto('/');
  });

  test('renders links', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('a', { hasText: 'home' })).toBeVisible();
    await expect(page.locator('a', { hasText: 'about' })).toBeVisible();
  });

  test('renders home by default', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('home state loaded')).toBeVisible();
  });

  test('home state has a textarea', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#home textarea')).toBeVisible();
  });

  test('retains text entered into the textarea in home', async ({ page }) => {
    await page.goto('/');
    await page.locator('#home textarea').fill('Text entered here is not lost The quick brown fox');

    await page.locator('a', { hasText: 'about' }).click();
    await expect(page.getByText('about state loaded')).toBeVisible();

    await page.locator('a', { hasText: 'home' }).click();
    await expect(page.getByText('home state loaded')).toBeVisible();

    await expect(page.locator('#home textarea')).toHaveValue('Text entered here is not lost The quick brown fox');
  });

  test('retains text entered into the textarea in about', async ({ page }) => {
    await page.goto('/');

    await page.locator('a', { hasText: 'about' }).click();
    await expect(page.getByText('about state loaded')).toBeVisible();

    await page.locator('#about textarea').fill('Text entered here is not lost The quack white duck');

    await page.locator('a', { hasText: 'home' }).click();
    await expect(page.getByText('home state loaded')).toBeVisible();

    await page.locator('a', { hasText: 'about' }).click();
    await expect(page.getByText('about state loaded')).toBeVisible();

    await expect(page.locator('#about textarea')).toHaveValue('Text entered here is not lost The quack white duck');
  });
});
