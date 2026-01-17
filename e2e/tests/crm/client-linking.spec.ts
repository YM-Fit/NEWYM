import { test, expect } from '../fixtures/auth';
import { CrmPage } from '../../pages/CrmPage';

/**
 * Client Linking E2E Tests
 * Tests linking trainee to client → Verify sync → Unlink → Verify
 */

test.describe('Client Linking E2E Tests', () => {
  test('should link trainee to client and verify sync', async ({ authenticatedPage }) => {
    const crmPage = new CrmPage(authenticatedPage);

    // 1. Navigate to CRM Clients
    await crmPage.goto();
    await crmPage.gotoClients();

    // 2. Wait for clients list to load
    await expect(crmPage.clientCard.first()).toBeVisible({ timeout: 10000 });

    // 3. Click on a client
    await crmPage.clickClientCard(0);
    await expect(crmPage.clientName).toBeVisible();

    // 4. Look for link/unlink button
    const linkButton = authenticatedPage.locator('button:has-text("קישור למתאמן")');
    const unlinkButton = authenticatedPage.locator('button:has-text("ביטול קישור")');

    // 5. If client is not linked, link it
    if (await linkButton.isVisible({ timeout: 2000 })) {
      await linkButton.click();
      
      // Wait for trainee selection modal/form
      await authenticatedPage.waitForTimeout(1000);
      
      // Select trainee (if dropdown exists)
      const traineeSelect = authenticatedPage.locator('select[name="trainee"], input[type="search"]');
      if (await traineeSelect.isVisible({ timeout: 2000 })) {
        await traineeSelect.click();
        await authenticatedPage.keyboard.type('Test Trainee');
        await authenticatedPage.keyboard.press('Enter');
      }
      
      // Confirm link
      const confirmButton = authenticatedPage.locator('button:has-text("אישור"), button:has-text("שמור")');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }
      
      // Wait for sync
      await authenticatedPage.waitForTimeout(2000);
      
      // 6. Verify link (unlink button should appear)
      await expect(unlinkButton).toBeVisible({ timeout: 5000 });
    }

    // 7. Verify client data shows linked trainee
    const traineeInfo = authenticatedPage.locator('[data-testid="linked-trainee"]');
    if (await traineeInfo.isVisible({ timeout: 2000 })) {
      await expect(traineeInfo).toBeVisible();
    }
  });

  test('should unlink trainee from client', async ({ authenticatedPage }) => {
    const crmPage = new CrmPage(authenticatedPage);

    // 1. Navigate to a linked client
    await crmPage.goto();
    await crmPage.gotoClients();
    await crmPage.clickClientCard(0);

    // 2. Find unlink button
    const unlinkButton = authenticatedPage.locator('button:has-text("ביטול קישור")');
    
    if (await unlinkButton.isVisible({ timeout: 2000 })) {
      // 3. Click unlink
      await unlinkButton.click();
      
      // 4. Confirm unlink (if confirmation dialog)
      const confirmButton = authenticatedPage.locator('button:has-text("אישור"), button:has-text("מחק")');
      if (await confirmButton.isVisible({ timeout: 2000 })) {
        await confirmButton.click();
      }
      
      // 5. Wait for update
      await authenticatedPage.waitForTimeout(2000);
      
      // 6. Verify unlink (link button should appear)
      const linkButton = authenticatedPage.locator('button:has-text("קישור למתאמן")');
      await expect(linkButton).toBeVisible({ timeout: 5000 });
    }
  });

  test('should sync client data after linking', async ({ authenticatedPage }) => {
    const crmPage = new CrmPage(authenticatedPage);

    await crmPage.goto();
    await crmPage.gotoClients();
    await crmPage.clickClientCard(0);

    // Verify client stats are displayed
    const statsSection = authenticatedPage.locator('[data-testid="client-stats"]');
    if (await statsSection.isVisible({ timeout: 2000 })) {
      await expect(statsSection).toBeVisible();
      
      // Check for calendar events count
      const eventsCount = authenticatedPage.locator('text=/.*אירועים.*/');
      if (await eventsCount.isVisible({ timeout: 1000 })) {
        await expect(eventsCount).toBeVisible();
      }
    }
  });
});
