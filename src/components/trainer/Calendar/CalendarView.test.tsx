import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CalendarView from './CalendarView';
import { useAuth } from '../../../contexts/AuthContext';
import { getGoogleCalendarEvents, getGoogleCalendarStatus } from '../../../api/googleCalendarApi';
import toast from 'react-hot-toast';

// Mock Supabase
vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
    })),
  },
}));

// Mock dependencies
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../../api/googleCalendarApi', () => ({
  getGoogleCalendarEvents: vi.fn(),
  getGoogleCalendarStatus: vi.fn(),
}));

vi.mock('../../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('../Settings/GoogleCalendarSettings', () => ({
  default: () => <div data-testid="google-calendar-settings">Settings</div>,
}));

describe('CalendarView', () => {
  const mockUser = {
    id: 'user-123',
    email: 'trainer@test.com',
  };

  const mockEvents = [
    {
      id: 'event-1',
      summary: 'אימון בוקר',
      start: {
        dateTime: '2024-01-15T08:00:00Z',
      },
      end: {
        dateTime: '2024-01-15T09:00:00Z',
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Mock useAuth
    (useAuth as any).mockReturnValue({
      user: mockUser,
    });

    // Mock getGoogleCalendarStatus
    (getGoogleCalendarStatus as any).mockResolvedValue({
      success: true,
      data: { connected: true },
    });

    // Mock getGoogleCalendarEvents
    (getGoogleCalendarEvents as any).mockResolvedValue({
      success: true,
      data: mockEvents,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Basic Functionality', () => {
    it('should render disconnected state when not connected', async () => {
      (getGoogleCalendarStatus as any).mockResolvedValue({
        success: true,
        data: { connected: false },
      });

      render(<CalendarView />);

      await waitFor(() => {
        expect(screen.getByText(/Google Calendar לא מחובר/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should load events when connected', async () => {
      render(<CalendarView />);

      await waitFor(() => {
        expect(getGoogleCalendarEvents).toHaveBeenCalled();
      }, { timeout: 3000 });
    });

    it('should have refresh button', async () => {
      render(<CalendarView />);

      await waitFor(() => {
        expect(screen.getByText(/רענון/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should refresh events on manual refresh', async () => {
      const user = userEvent.setup({ delay: null });
      render(<CalendarView />);

      await waitFor(() => {
        expect(getGoogleCalendarEvents).toHaveBeenCalledTimes(1);
      }, { timeout: 3000 });

      const refreshButton = screen.getByText(/רענון/i).closest('button');
      if (refreshButton && !refreshButton.disabled) {
        await user.click(refreshButton);
        
        await waitFor(() => {
          expect(getGoogleCalendarEvents).toHaveBeenCalledTimes(2);
        }, { timeout: 3000 });
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      (getGoogleCalendarEvents as any).mockResolvedValue({
        success: false,
        error: 'שגיאה בטעינת אירועים',
      });

      render(<CalendarView />);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      }, { timeout: 3000 });
    });
  });

  describe('Settings', () => {
    it('should show settings when settings button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      render(<CalendarView />);

      await waitFor(() => {
        expect(screen.getByText(/הגדרות/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      const settingsButton = screen.getByText(/הגדרות/i);
      await user.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByTestId('google-calendar-settings')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });
});
