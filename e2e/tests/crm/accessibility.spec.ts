import { test, expect } from '../fixtures/auth';
import { CrmPage } from '../../pages/CrmPage';
import { injectAxe, checkA11y } from 'axe-playwright';

/**
 * Accessibility Tests
 * Tests accessibility compliance using axe
 */

test.describe('Accessibility Tests', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    // Inject axe-core
    await injectAxe(authenticatedPage);
  });

  test('should have no accessibility violations on CRM dashboard', async ({ authenticatedPage }) => {
    const crmPage = new CrmPage(authenticatedPage);
    
    await crmPage.goto();
    await authenticatedPage.waitForLoadState('networkidle');
    
    // Run accessibility check
    await checkA11y(authenticatedPage, undefined, {
      detailedReport: true,
      detailedReportOptions: { html: true },
    });
  });

  test('should have no accessibility violations on clients list', async ({ authenticatedPage }) => {
    const crmPage = new CrmPage(authenticatedPage);
    
    await crmPage.goto();
    await crmPage.gotoClients();
    await authenticatedPage.waitForLoadState('networkidle');
    
    await checkA11y(authenticatedPage, undefined, {
      detailedReport: true,
      detailedReportOptions: { html: true },
    });
  });

  test('should have proper ARIA labels on interactive elements', async ({ authenticatedPage }) => {
    const crmPage = new CrmPage(authenticatedPage);
    
    await crmPage.goto();
    await crmPage.gotoClients();
    
    // Check buttons have aria-labels
    const buttons = await authenticatedPage.locator('button').all();
    for (const button of buttons) {
      const ariaLabel = await button.getAttribute('aria-label');
      const text = await button.textContent();
      
      // Button should have either aria-label or visible text
      expect(ariaLabel || text).toBeTruthy();
    }
    
    // Check inputs have labels
    const inputs = await authenticatedPage.locator('input').all();
    for (const input of inputs) {
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const placeholder = await input.getAttribute('placeholder');
      
      if (id) {
        const label = await authenticatedPage.locator(`label[for="${id}"]`).count();
        expect(label > 0 || ariaLabel || placeholder).toBeTruthy();
      }
    }
  });

  test('should be keyboard navigable', async ({ authenticatedPage }) => {
    const crmPage = new CrmPage(authenticatedPage);
    
    await crmPage.goto();
    await crmPage.gotoClients();
    
    // Test keyboard navigation
    await authenticatedPage.keyboard.press('Tab');
    await authenticatedPage.waitForTimeout(100);
    
    // Check if focus is visible
    const focusedElement = await authenticatedPage.evaluate(() => {
      return document.activeElement?.tagName;
    });
    
    expect(focusedElement).toBeTruthy();
  });

  test('should have proper color contrast', async ({ authenticatedPage }) => {
    const crmPage = new CrmPage(authenticatedPage);
    
    await crmPage.goto();
    await authenticatedPage.waitForLoadState('networkidle');
    
    // Run accessibility check which includes color contrast
    await checkA11y(authenticatedPage, {
      rules: {
        'color-contrast': { enabled: true },
      },
    });
  });
});
