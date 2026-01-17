import { test, expect } from '../fixtures/auth';
import { CrmPage } from '../../pages/CrmPage';

/**
 * Visual Regression Tests
 * Tests visual consistency of CRM pages
 */

test.describe('Visual Regression Tests', () => {
  test('should match CRM dashboard screenshot', async ({ authenticatedPage }) => {
    const crmPage = new CrmPage(authenticatedPage);
    
    await crmPage.goto();
    await authenticatedPage.waitForLoadState('networkidle');
    
    // Take screenshot and compare
    await expect(authenticatedPage).toHaveScreenshot('crm-dashboard.png', {
      fullPage: true,
    });
  });

  test('should match clients list screenshot', async ({ authenticatedPage }) => {
    const crmPage = new CrmPage(authenticatedPage);
    
    await crmPage.goto();
    await crmPage.gotoClients();
    await authenticatedPage.waitForLoadState('networkidle');
    
    await expect(authenticatedPage).toHaveScreenshot('clients-list.png', {
      fullPage: true,
    });
  });

  test('should match pipeline view screenshot', async ({ authenticatedPage }) => {
    const crmPage = new CrmPage(authenticatedPage);
    
    await crmPage.goto();
    await crmPage.gotoPipeline();
    await authenticatedPage.waitForLoadState('networkidle');
    
    await expect(authenticatedPage).toHaveScreenshot('pipeline-view.png', {
      fullPage: true,
    });
  });

  test('should match analytics dashboard screenshot', async ({ authenticatedPage }) => {
    const crmPage = new CrmPage(authenticatedPage);
    
    await crmPage.goto();
    await crmPage.gotoAnalytics();
    await authenticatedPage.waitForLoadState('networkidle');
    
    await expect(authenticatedPage).toHaveScreenshot('analytics-dashboard.png', {
      fullPage: true,
    });
  });
});
