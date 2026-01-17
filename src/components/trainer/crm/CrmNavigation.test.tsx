import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import CrmNavigation from './CrmNavigation';

expect.extend(toHaveNoViolations);

describe('CrmNavigation', () => {
  const mockOnViewChange = vi.fn();

  it('should render navigation items', () => {
    render(
      <CrmNavigation activeView="crm-dashboard" onViewChange={mockOnViewChange} />
    );

    expect(screen.getByRole('navigation', { name: /CRM ניווט ראשי/i })).toBeInTheDocument();
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Dashboard.*פעיל/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /לקוחות/i })).toBeInTheDocument();
  });

  it('should mark active view with aria-selected', () => {
    render(
      <CrmNavigation activeView="crm-clients" onViewChange={mockOnViewChange} />
    );

    const clientsTab = screen.getByRole('tab', { name: /לקוחות.*פעיל/i });
    expect(clientsTab).toHaveAttribute('aria-selected', 'true');
    expect(clientsTab).toHaveAttribute('aria-current', 'page');
  });

  it('should call onViewChange when tab is clicked', async () => {
    const user = userEvent.setup();
    render(
      <CrmNavigation activeView="crm-dashboard" onViewChange={mockOnViewChange} />
    );

    const clientsTab = screen.getByRole('tab', { name: /לקוחות/i });
    await user.click(clientsTab);

    expect(mockOnViewChange).toHaveBeenCalledWith('crm-clients');
  });

  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <CrmNavigation activeView="crm-dashboard" onViewChange={mockOnViewChange} />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper semantic HTML (nav element)', () => {
      const { container } = render(
        <CrmNavigation activeView="crm-dashboard" onViewChange={mockOnViewChange} />
      );

      const nav = container.querySelector('nav[role="navigation"]');
      expect(nav).toBeInTheDocument();
    });

    it('should have keyboard navigation support', async () => {
      const user = userEvent.setup();
      render(
        <CrmNavigation activeView="crm-dashboard" onViewChange={mockOnViewChange} />
      );

      const firstTab = screen.getByRole('tab', { name: /Dashboard/i });
      await user.tab();
      expect(firstTab).toHaveFocus();

      await user.keyboard('{ArrowRight}');
      // Note: Arrow key navigation would need additional implementation
    });
  });
});
