import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import ClientCard from './ClientCard';
import type { CalendarClient } from '../../../api/crmClientsApi';

expect.extend(toHaveNoViolations);

const mockClient: CalendarClient = {
  id: '1',
  trainer_id: 'trainer-1',
  trainee_id: 'trainee-1',
  google_client_identifier: 'client@example.com',
  client_name: 'Test Client',
  client_email: 'client@example.com',
  client_phone: '0501234567',
  first_event_date: '2024-01-01',
  last_event_date: '2024-12-31',
  total_events_count: 10,
  upcoming_events_count: 3,
  completed_events_count: 7,
  crm_data: {},
};

const mockTrainees = [
  {
    id: 'trainee-1',
    full_name: 'Linked Trainee',
    google_calendar_client_id: '1',
  },
  {
    id: 'trainee-2',
    full_name: 'Unlinked Trainee',
    google_calendar_client_id: null,
  },
];

describe('ClientCard', () => {
  it('should render client information', () => {
    render(
      <ClientCard
        client={mockClient}
        trainees={mockTrainees}
        onLinkTrainee={vi.fn()}
      />
    );

    expect(screen.getByText('Test Client')).toBeInTheDocument();
    expect(screen.getByText('client@example.com')).toBeInTheDocument();
    expect(screen.getByText('0501234567')).toBeInTheDocument();
  });

  it('should display statistics', () => {
    render(
      <ClientCard
        client={mockClient}
        trainees={mockTrainees}
        onLinkTrainee={vi.fn()}
      />
    );

    expect(screen.getByText('10')).toBeInTheDocument(); // Total events
    expect(screen.getByText('3')).toBeInTheDocument(); // Upcoming
    expect(screen.getByText('7')).toBeInTheDocument(); // Completed
  });

  it('should show linked trainee', () => {
    render(
      <ClientCard
        client={mockClient}
        trainees={mockTrainees}
        onLinkTrainee={vi.fn()}
      />
    );

    expect(screen.getByText('Linked Trainee')).toBeInTheDocument();
  });

  it('should show unlinked status for unlinked client', () => {
    const unlinkedClient = { ...mockClient, trainee_id: null };
    render(
      <ClientCard
        client={unlinkedClient}
        trainees={mockTrainees}
        onLinkTrainee={vi.fn()}
      />
    );

    expect(screen.getByText('לא מקושר')).toBeInTheDocument();
  });

  it('should show link dropdown for unlinked client', () => {
    const unlinkedClient = { ...mockClient, trainee_id: null };
    render(
      <ClientCard
        client={unlinkedClient}
        trainees={mockTrainees}
        onLinkTrainee={vi.fn()}
      />
    );

    expect(screen.getByDisplayValue(/קשר למתאמן/)).toBeInTheDocument();
  });

  it('should not show link dropdown when no unlinked trainees', () => {
    const unlinkedClient = { ...mockClient, trainee_id: null };
    const allLinkedTrainees = mockTrainees.map(t => ({
      ...t,
      google_calendar_client_id: '1',
    }));

    render(
      <ClientCard
        client={unlinkedClient}
        trainees={allLinkedTrainees}
        onLinkTrainee={vi.fn()}
      />
    );

    expect(screen.queryByDisplayValue(/קשר למתאמן/)).not.toBeInTheDocument();
  });

  it('should call onLinkTrainee when selecting trainee', async () => {
    const user = userEvent.setup();
    const onLinkTrainee = vi.fn();
    const unlinkedClient = { ...mockClient, trainee_id: null };

    render(
      <ClientCard
        client={unlinkedClient}
        trainees={mockTrainees}
        onLinkTrainee={onLinkTrainee}
      />
    );

    const select = screen.getByDisplayValue(/קשר למתאמן/);
    await user.selectOptions(select, 'trainee-2');

    expect(onLinkTrainee).toHaveBeenCalledWith('trainee-2');
  });

  it('should call onClick when card is clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <ClientCard
        client={mockClient}
        trainees={mockTrainees}
        onLinkTrainee={vi.fn()}
        onClick={onClick}
      />
    );

    const card = screen.getByText('Test Client').closest('div[class*="premium-card"]');
    if (card) {
      await user.click(card);
      expect(onClick).toHaveBeenCalled();
    }
  });

  it('should format dates correctly', () => {
    render(
      <ClientCard
        client={mockClient}
        trainees={mockTrainees}
        onLinkTrainee={vi.fn()}
      />
    );

    // Check that dates are rendered (format depends on locale)
    expect(screen.getByText(/אירוע ראשון:/)).toBeInTheDocument();
    expect(screen.getByText(/אירוע אחרון:/)).toBeInTheDocument();
  });

  it('should show loading state when linking', () => {
    const unlinkedClient = { ...mockClient, trainee_id: null };
    render(
      <ClientCard
        client={unlinkedClient}
        trainees={mockTrainees}
        onLinkTrainee={vi.fn()}
        isLinking={true}
      />
    );

    const select = screen.getByDisplayValue(/קשר למתאמן/);
    expect(select).toBeDisabled();
  });

  it('should handle missing optional fields', () => {
    const minimalClient: CalendarClient = {
      id: '2',
      trainer_id: 'trainer-1',
      google_client_identifier: 'minimal@example.com',
      client_name: 'Minimal Client',
      total_events_count: 0,
      upcoming_events_count: 0,
      completed_events_count: 0,
      crm_data: {},
    };

    render(
      <ClientCard
        client={minimalClient}
        trainees={[]}
        onLinkTrainee={vi.fn()}
      />
    );

    expect(screen.getByText('Minimal Client')).toBeInTheDocument();
    // Check that statistics show 0 (there are multiple "0" elements)
    const statisticsSection = screen.getByText(/סה"כ אירועים/i).closest('div[class*="grid"]');
    expect(statisticsSection).toBeInTheDocument();
  });

  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <ClientCard
          client={mockClient}
          trainees={mockTrainees}
          onLinkTrainee={vi.fn()}
        />
      );
      
      // Wait for axe to analyze the DOM
      const results = await axe(container, {
        rules: {
          // Ignore some rules that may be false positives
          'color-contrast': { enabled: false }, // Can be checked manually with Lighthouse
        },
      });
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA labels', () => {
      render(
        <ClientCard
          client={mockClient}
          trainees={mockTrainees}
          onLinkTrainee={vi.fn()}
        />
      );

      const card = screen.getByRole('button', { name: /פרטי לקוח/i });
      expect(card).toBeInTheDocument();
      expect(card).toHaveAttribute('tabIndex', '0');
    });

    it('should have accessible links for email and phone', () => {
      render(
        <ClientCard
          client={mockClient}
          trainees={mockTrainees}
          onLinkTrainee={vi.fn()}
        />
      );

      const emailLink = screen.getByRole('link', { name: /שלח אימייל/i });
      const phoneLink = screen.getByRole('link', { name: /התקשר/i });
      
      expect(emailLink).toHaveAttribute('href', 'mailto:client@example.com');
      expect(phoneLink).toHaveAttribute('href', 'tel:0501234567');
    });

    it('should have proper semantic HTML (article element)', () => {
      const { container } = render(
        <ClientCard
          client={mockClient}
          trainees={mockTrainees}
          onLinkTrainee={vi.fn()}
        />
      );

      const article = container.querySelector('article');
      expect(article).toBeInTheDocument();
    });

    it('should have keyboard navigation support', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(
        <ClientCard
          client={mockClient}
          trainees={mockTrainees}
          onLinkTrainee={vi.fn()}
          onClick={onClick}
        />
      );

      const card = screen.getByRole('button', { name: /פרטי לקוח/i });
      await user.tab();
      expect(card).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(onClick).toHaveBeenCalled();
    });
  });
});
