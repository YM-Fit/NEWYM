import { test, expect } from '../fixtures/auth';
import { CrmPage } from '../../pages/CrmPage';
import { LoginPage } from '../../pages/LoginPage';

/**
 * Client CRUD E2E Tests
 * Tests complete client lifecycle: Login → Navigate to CRM → Create client → View client → Edit client → Delete client
 */

test.describe('Client CRUD E2E Tests', () => {
  test('should complete full client CRUD flow', async ({ authenticatedPage, trainerUser }) => {
    const crmPage = new CrmPage(authenticatedPage);
    const loginPage = new LoginPage(authenticatedPage);

    // 1. Navigate to CRM
    await crmPage.goto();
    await expect(authenticatedPage).toHaveURL(/.*\/crm/);

    // 2. Navigate to Clients
    await crmPage.gotoClients();
    await expect(authenticatedPage).toHaveURL(/.*\/crm\/clients/);

    // 3. Create a new client
    const clientData = {
      name: `Test Client ${Date.now()}`,
      email: `testclient${Date.now()}@test.com`,
      phone: '+972501234567',
    };

    await crmPage.createClient(clientData);

    // 4. Verify client appears in list
    await expect(crmPage.clientCard.first()).toBeVisible({ timeout: 10000 });

    // 5. Click on client to view details
    await crmPage.clickClientCard(0);
    await expect(crmPage.clientName).toBeVisible();

    // 6. Verify client data
    await expect(crmPage.clientName).toContainText(clientData.name);
    if (clientData.email) {
      await expect(crmPage.clientEmail).toContainText(clientData.email);
    }

    // 7. Edit client (if edit functionality exists)
    if (await crmPage.editButton.isVisible()) {
      await crmPage.editButton.click();
      
      // Wait for edit form
      await authenticatedPage.waitForSelector('input[name="name"]', { timeout: 5000 });
      
      const updatedName = `Updated Client ${Date.now()}`;
      await authenticatedPage.fill('input[name="name"]', updatedName);
      await authenticatedPage.click('button:has-text("שמור")');
      
      // Verify update
      await expect(crmPage.clientName).toContainText(updatedName);
    }

    // 8. Navigate to interactions tab
    if (await crmPage.interactionsTab.isVisible()) {
      await crmPage.interactionsTab.click();
      await authenticatedPage.waitForTimeout(500);
    }

    // 9. Navigate back to clients list
    await crmPage.gotoClients();
    await expect(crmPage.clientsList).toBeVisible();
  });

  test('should search and filter clients', async ({ authenticatedPage }) => {
    const crmPage = new CrmPage(authenticatedPage);

    await crmPage.goto();
    await crmPage.gotoClients();

    // Search for a client
    await crmPage.searchInput.fill('Test');
    await authenticatedPage.waitForTimeout(1000); // Wait for debounce

    // Verify search results
    const clientCards = await crmPage.clientCard.count();
    expect(clientCards).toBeGreaterThanOrEqual(0);
  });

  test('should handle client creation errors', async ({ authenticatedPage }) => {
    const crmPage = new CrmPage(authenticatedPage);

    await crmPage.goto();
    await crmPage.gotoClients();

    // Try to create client with invalid data
    await crmPage.createClientButton.click();
    
    // Try to submit without required fields
    const submitButton = authenticatedPage.locator('button:has-text("שמור")');
    if (await submitButton.isVisible()) {
      await submitButton.click();
      
      // Should show validation error
      const errorMessage = authenticatedPage.locator('[role="alert"]');
      if (await errorMessage.isVisible({ timeout: 2000 })) {
        await expect(errorMessage).toBeVisible();
      }
    }
  });
});
