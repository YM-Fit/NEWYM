import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import CrmLayout from './CrmLayout';

expect.extend(toHaveNoViolations);

// Mock CrmContext
vi.mock('../../../contexts/CrmContext', () => ({
  useCrm: () => ({
    selectedClient: null,
    navigateToView: vi.fn(),
  }),
}));

describe('CrmLayout', () => {
  const mockOnViewChange = vi.fn();

  it('should render children', () => {
    render(
      <CrmLayout activeView="crm-dashboard" onViewChange={mockOnViewChange}>
        <div>Test Content</div>
      </CrmLayout>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should render navigation', () => {
    render(
      <CrmLayout activeView="crm-dashboard" onViewChange={mockOnViewChange}>
        <div>Content</div>
      </CrmLayout>
    );

    expect(screen.getByRole('navigation', { name: /CRM ניווט ראשי/i })).toBeInTheDocument();
  });

  it('should render breadcrumbs when provided', () => {
    const breadcrumbs = [
      { label: 'Home', onClick: () => {} },
      { label: 'Current Page' },
    ];

    render(
      <CrmLayout
        activeView="crm-dashboard"
        onViewChange={mockOnViewChange}
        breadcrumbs={breadcrumbs}
      >
        <div>Content</div>
      </CrmLayout>
    );

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Current Page')).toBeInTheDocument();
  });

  it('should render main content with proper semantic HTML', () => {
    const { container } = render(
      <CrmLayout activeView="crm-dashboard" onViewChange={mockOnViewChange}>
        <div>Content</div>
      </CrmLayout>
    );

    const main = container.querySelector('main[role="main"]');
    expect(main).toBeInTheDocument();
    expect(main).toHaveAttribute('aria-label', 'תוכן CRM');
  });

  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <CrmLayout activeView="crm-dashboard" onViewChange={mockOnViewChange}>
          <div>Content</div>
        </CrmLayout>
      );

      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: false }, // Checked manually with Lighthouse
        },
      });
      expect(results).toHaveNoViolations();
    });

    it('should have proper semantic HTML structure', () => {
      const { container } = render(
        <CrmLayout activeView="crm-dashboard" onViewChange={mockOnViewChange}>
          <div>Content</div>
        </CrmLayout>
      );

      // Check for nav element
      const nav = container.querySelector('nav[aria-label="CRM ניווט ראשי"]');
      expect(nav).toBeInTheDocument();

      // Check for main element
      const main = container.querySelector('main[role="main"]');
      expect(main).toBeInTheDocument();
    });

    it('should have accessible breadcrumbs navigation', () => {
      const breadcrumbs = [
        { label: 'Home', onClick: () => {} },
        { label: 'Current' },
      ];

      render(
        <CrmLayout
          activeView="crm-dashboard"
          onViewChange={mockOnViewChange}
          breadcrumbs={breadcrumbs}
        >
          <div>Content</div>
        </CrmLayout>
      );

      const breadcrumbNav = screen.getByRole('navigation', { name: /ניווט דרך/i });
      expect(breadcrumbNav).toBeInTheDocument();

      const homeButton = screen.getByRole('button', { name: /עבור ל-Home/i });
      expect(homeButton).toBeInTheDocument();
    });
  });
});
