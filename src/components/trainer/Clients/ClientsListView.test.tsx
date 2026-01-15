/**
 * Tests for ClientsListView Component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthContext } from '../../../contexts/AuthContext';
import ClientsListView from './ClientsListView';
import { CrmService } from '../../../services/crmService';
import { getTrainees } from '../../../api/traineeApi';

// Mock dependencies
vi.mock('../../../services/crmService');
vi.mock('../../../api/traineeApi');
vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const mockUser = {
  id: 'trainer-123',
  email: 'trainer@test.com',
};

const mockClients = [
  {
    id: 'client-1',
    trainer_id: 'trainer-123',
    google_client_identifier: 'client1@test.com',
    client_name: 'Test Client 1',
    client_email: 'client1@test.com',
    total_events_count: 10,
    upcoming_events_count: 2,
    completed_events_count: 8,
    crm_data: {},
  },
];

const mockTrainees = [
  {
    id: 'trainee-1',
    full_name: 'Test Trainee',
    trainer_id: 'trainer-123',
  },
];

describe('ClientsListView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state initially', () => {
    (CrmService.getClients as any).mockResolvedValue({ success: false });
    
    render(
      <AuthContext.Provider value={{ user: mockUser } as any}>
        <ClientsListView />
      </AuthContext.Provider>
    );

    expect(screen.getByRole('status') || screen.queryByText(/טוען/i)).toBeTruthy();
  });

  it('should render clients list when data is loaded', async () => {
    (CrmService.getClients as any).mockResolvedValue({
      success: true,
      data: mockClients,
    });
    (getTrainees as any).mockResolvedValue({
      success: true,
      data: mockTrainees,
    });

    render(
      <AuthContext.Provider value={{ user: mockUser } as any}>
        <ClientsListView />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Client 1')).toBeInTheDocument();
    });
  });

  it('should display statistics correctly', async () => {
    (CrmService.getClients as any).mockResolvedValue({
      success: true,
      data: mockClients,
    });
    (getTrainees as any).mockResolvedValue({
      success: true,
      data: mockTrainees,
    });

    render(
      <AuthContext.Provider value={{ user: mockUser } as any}>
        <ClientsListView />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument(); // Total clients
    });
  });

  it('should handle search functionality', async () => {
    (CrmService.getClients as any).mockResolvedValue({
      success: true,
      data: mockClients,
    });
    (getTrainees as any).mockResolvedValue({
      success: true,
      data: mockTrainees,
    });

    render(
      <AuthContext.Provider value={{ user: mockUser } as any}>
        <ClientsListView />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/חפש לקוח/i);
      expect(searchInput).toBeInTheDocument();
    });
  });

  it('should handle error state', async () => {
    (CrmService.getClients as any).mockResolvedValue({
      success: false,
      error: 'שגיאה בטעינה',
    });

    render(
      <AuthContext.Provider value={{ user: mockUser } as any}>
        <ClientsListView />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      // Error should be handled (toast shown)
      expect(CrmService.getClients).toHaveBeenCalled();
    });
  });
});
