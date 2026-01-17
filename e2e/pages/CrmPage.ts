import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for CRM Pages
 */
export class CrmPage {
  readonly page: Page;

  // Navigation
  readonly clientsLink: Locator;
  readonly pipelineLink: Locator;
  readonly analyticsLink: Locator;
  readonly reportsLink: Locator;

  // Clients List View
  readonly clientsList: Locator;
  readonly clientCard: Locator;
  readonly createClientButton: Locator;
  readonly searchInput: Locator;
  readonly filterButton: Locator;

  // Client Detail View
  readonly clientName: Locator;
  readonly clientEmail: Locator;
  readonly clientPhone: Locator;
  readonly editButton: Locator;
  readonly deleteButton: Locator;
  readonly interactionsTab: Locator;
  readonly contractsTab: Locator;
  readonly paymentsTab: Locator;

  constructor(page: Page) {
    this.page = page;

    // Navigation
    this.clientsLink = page.locator('a[href*="/crm/clients"]');
    this.pipelineLink = page.locator('a[href*="/crm/pipeline"]');
    this.analyticsLink = page.locator('a[href*="/crm/analytics"]');
    this.reportsLink = page.locator('a[href*="/crm/reports"]');

    // Clients List
    this.clientsList = page.locator('[data-testid="clients-list"]');
    this.clientCard = page.locator('[data-testid="client-card"]');
    this.createClientButton = page.locator('button:has-text("יצירת לקוח")');
    this.searchInput = page.locator('input[placeholder*="חיפוש"]');
    this.filterButton = page.locator('button:has-text("פילטר")');

    // Client Detail
    this.clientName = page.locator('[data-testid="client-name"]');
    this.clientEmail = page.locator('[data-testid="client-email"]');
    this.clientPhone = page.locator('[data-testid="client-phone"]');
    this.editButton = page.locator('button:has-text("עריכה")');
    this.deleteButton = page.locator('button:has-text("מחיקה")');
    this.interactionsTab = page.locator('button[role="tab"]:has-text("אינטראקציות")');
    this.contractsTab = page.locator('button[role="tab"]:has-text("חוזים")');
    this.paymentsTab = page.locator('button[role="tab"]:has-text("תשלומים")');
  }

  async goto() {
    await this.page.goto('/trainer/crm');
    await this.page.waitForLoadState('networkidle');
  }

  async gotoClients() {
    await this.clientsLink.click();
    await this.page.waitForLoadState('networkidle');
  }

  async gotoPipeline() {
    await this.pipelineLink.click();
    await this.page.waitForLoadState('networkidle');
  }

  async gotoAnalytics() {
    await this.analyticsLink.click();
    await this.page.waitForLoadState('networkidle');
  }

  async searchClient(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500); // Wait for debounce
  }

  async clickClientCard(index: number = 0) {
    await this.clientCard.nth(index).click();
    await this.page.waitForLoadState('networkidle');
  }

  async createClient(clientData: {
    name: string;
    email?: string;
    phone?: string;
  }) {
    await this.createClientButton.click();
    await this.page.waitForSelector('input[name="name"]', { timeout: 5000 });
    
    await this.page.fill('input[name="name"]', clientData.name);
    if (clientData.email) {
      await this.page.fill('input[name="email"]', clientData.email);
    }
    if (clientData.phone) {
      await this.page.fill('input[name="phone"]', clientData.phone);
    }
    
    await this.page.click('button:has-text("שמור")');
    await this.page.waitForLoadState('networkidle');
  }
}
