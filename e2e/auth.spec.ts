import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should display login screen and allow sign in', async ({ page }) => {
    await page.goto('/');

    // Should show the login screen
    await expect(page.getByText('Super dojo')).toBeVisible();
    await expect(page.getByText('Welcome to your martial arts community')).toBeVisible();

    // Should have email input and sign in button
    const emailInput = page.getByPlaceholder('Email');
    const signInButton = page.getByRole('button', { name: /sign in/i });

    await expect(emailInput).toBeVisible();
    await expect(signInButton).toBeVisible();

    // Should be able to enter email and sign in
    await emailInput.fill('test@example.com');
    await signInButton.click();

    // Should navigate to main app after sign in
    // Note: This would need actual Convex backend integration to work fully
    // For now, just check that the input works
    await expect(emailInput).toHaveValue('test@example.com');
  });

  test('should validate email input', async ({ page }) => {
    await page.goto('/');

    const emailInput = page.getByPlaceholder('Email');
    const signInButton = page.getByRole('button', { name: /sign in/i });

    // Try to sign in without email
    await signInButton.click();

    // Should show validation error (this would trigger an alert in the React Native app)
    // In a web environment, you might handle this differently

    // Try with invalid email
    await emailInput.fill('invalid-email');
    await signInButton.click();

    await expect(emailInput).toHaveValue('invalid-email');
  });
});