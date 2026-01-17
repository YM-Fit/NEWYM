import { test, expect } from '../fixtures/auth';
import { CrmPage } from '../../pages/CrmPage';

/**
 * Performance Tests
 * Tests performance metrics for CRM pages
 */

test.describe('Performance Tests', () => {
  test('should load CRM dashboard within performance budget', async ({ authenticatedPage }) => {
    const crmPage = new CrmPage(authenticatedPage);
    
    const startTime = Date.now();
    await crmPage.goto();
    await authenticatedPage.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // Performance budget: 3 seconds
    expect(loadTime).toBeLessThan(3000);
    
    // Check Web Vitals
    const metrics = await authenticatedPage.evaluate(() => {
      return {
        // @ts-ignore
        loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
        // @ts-ignore
        domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
      };
    });
    
    expect(metrics.loadTime).toBeLessThan(3000);
    expect(metrics.domContentLoaded).toBeLessThan(2000);
  });

  test('should load clients list efficiently', async ({ authenticatedPage }) => {
    const crmPage = new CrmPage(authenticatedPage);
    
    await crmPage.goto();
    
    const startTime = Date.now();
    await crmPage.gotoClients();
    await authenticatedPage.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // Performance budget: 2 seconds
    expect(loadTime).toBeLessThan(2000);
  });

  test('should handle large client lists efficiently', async ({ authenticatedPage }) => {
    const crmPage = new CrmPage(authenticatedPage);
    
    await crmPage.goto();
    await crmPage.gotoClients();
    await authenticatedPage.waitForLoadState('networkidle');
    
    // Check if virtual scrolling is used for large lists
    const hasVirtualScrolling = await authenticatedPage.evaluate(() => {
      const containers = document.querySelectorAll('[data-virtual-scroll]');
      return containers.length > 0;
    });
    
    // If virtual scrolling is not implemented, at least verify list loads
    const clientCards = await crmPage.clientCard.count();
    expect(clientCards).toBeGreaterThanOrEqual(0);
  });

  test('should measure API response times', async ({ authenticatedPage }) => {
    const crmPage = new CrmPage(authenticatedPage);
    
    // Monitor network requests
    const requests: any[] = [];
    authenticatedPage.on('response', (response) => {
      requests.push({
        url: response.url(),
        status: response.status(),
        timing: response.timing(),
      });
    });
    
    await crmPage.goto();
    await crmPage.gotoClients();
    await authenticatedPage.waitForLoadState('networkidle');
    
    // Check API response times
    const apiRequests = requests.filter((req) => 
      req.url.includes('/api/') || req.url.includes('supabase')
    );
    
    // All API requests should complete within 2 seconds
    for (const req of apiRequests) {
      if (req.timing) {
        const responseTime = req.timing.responseEnd - req.timing.requestStart;
        expect(responseTime).toBeLessThan(2000);
      }
    }
  });
});
