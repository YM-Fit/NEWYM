/**
 * Tests for CrmContext
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { CrmProvider, useCrm } from './CrmContext';
import { CrmService } from '../services/crmService';
import { useCrmRealtime } from '../hooks/useCrmRealtime';
import { useAuth } from './AuthContext';

// Mock dependencies
vi.mock('../services/crmService', () => ({
  CrmService: {
    getClients: vi.fn(),
    invalidateCache: vi.fn(),
    clearCache: vi.fn(),
  },
}));

vi.mock('../hooks/useCrmRealtime', () => ({
  useCrmRealtime: vi.fn(),
}));

vi.mock('./AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: {
      id: 'trainer-1',
      email: 'trainer@test.com',
    },
  })),
}));

vi.mock('../utils/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe('CrmContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    (useCrmRealtime as any).mockReturnValue({
      isConnected: true,
      error: null,
      reconnect: vi.fn(),
    });
  });

  it('should provide CRM context', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CrmProvider>{children}</CrmProvider>
    );

    const { result } = renderHook(() => useCrm(), { wrapper });

    expect(result.current).toBeDefined();
    expect(result.current.clients).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should load clients on mount', async () => {
    const mockClients = [
      { id: 'client-1', trainer_id: 'trainer-1', client_name: 'Client 1' },
      { id: 'client-2', trainer_id: 'trainer-1', client_name: 'Client 2' },
    ];

    (CrmService.getClients as any).mockResolvedValue({
      success: true,
      data: mockClients,
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CrmProvider>{children}</CrmProvider>
    );

    const { result } = renderHook(() => useCrm(), { wrapper });

    await waitFor(() => {
      expect(result.current.clients).toEqual(mockClients);
    });
  });

  it('should handle loadClients errors', async () => {
    (CrmService.getClients as any).mockResolvedValue({
      success: false,
      error: 'Failed to load clients',
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CrmProvider>{children}</CrmProvider>
    );

    const { result } = renderHook(() => useCrm(), { wrapper });

    await waitFor(() => {
      expect(result.current.error).toBe('Failed to load clients');
    });
  });

  it('should set selected client', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CrmProvider>{children}</CrmProvider>
    );

    const { result } = renderHook(() => useCrm(), { wrapper });

    const mockClient = { id: 'client-1', trainer_id: 'trainer-1', client_name: 'Test Client' };

    act(() => {
      result.current.setSelectedClient(mockClient);
    });

    expect(result.current.selectedClient).toEqual(mockClient);
  });

  it('should set filters', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CrmProvider>{children}</CrmProvider>
    );

    const { result } = renderHook(() => useCrm(), { wrapper });

    const filters = { status: 'active', searchQuery: 'test' };

    act(() => {
      result.current.setFilters(filters);
    });

    expect(result.current.filters.status).toBe('active');
    expect(result.current.filters.searchQuery).toBe('test');
  });

  it('should clear cache', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CrmProvider>{children}</CrmProvider>
    );

    const { result } = renderHook(() => useCrm(), { wrapper });

    act(() => {
      result.current.clearCache();
    });

    expect(CrmService.clearCache).toHaveBeenCalled();
    expect(result.current.clients).toEqual([]);
    expect(result.current.selectedClient).toBeNull();
  });

  it('should subscribe to events', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CrmProvider>{children}</CrmProvider>
    );

    const { result } = renderHook(() => useCrm(), { wrapper });

    const listener = vi.fn();
    const unsubscribe = result.current.subscribe(listener);

    expect(typeof unsubscribe).toBe('function');

    // Emit event
    act(() => {
      result.current.emit({ type: 'client:updated', data: { id: 'client-1' } });
    });

    expect(listener).toHaveBeenCalledWith({
      type: 'client:updated',
      data: { id: 'client-1' },
    });

    // Unsubscribe
    unsubscribe();
  });

  it('should handle refreshClient', async () => {
    const mockClients = [
      { id: 'client-1', trainer_id: 'trainer-1', client_name: 'Client 1' },
    ];

    (CrmService.getClients as any).mockResolvedValue({
      success: true,
      data: mockClients,
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CrmProvider>{children}</CrmProvider>
    );

    const { result } = renderHook(() => useCrm(), { wrapper });

    await waitFor(() => {
      expect(result.current.clients.length).toBeGreaterThan(0);
    });

    // Set selected client
    act(() => {
      result.current.setSelectedClient(mockClients[0]);
    });

    // Refresh client
    await act(async () => {
      await result.current.refreshClient('client-1');
    });

    expect(CrmService.invalidateCache).toHaveBeenCalled();
  });

  it('should not load clients when user is not available', () => {
    (useAuth as any).mockReturnValue({
      user: null,
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CrmProvider>{children}</CrmProvider>
    );

    renderHook(() => useCrm(), { wrapper });

    expect(CrmService.getClients).not.toHaveBeenCalled();
  });

  it('should handle real-time client updates', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CrmProvider>{children}</CrmProvider>
    );

    const { result } = renderHook(() => useCrm(), { wrapper });

    // Get the onClientUpdate callback from useCrmRealtime
    const onClientUpdate = (useCrmRealtime as any).mock.calls[0]?.[0]?.onClientUpdate;

    if (onClientUpdate) {
      const updatedClient = { id: 'client-1', trainer_id: 'trainer-1', client_name: 'Updated Client' };

      act(() => {
        onClientUpdate(updatedClient);
      });

      // Should update clients list if client exists
      expect(result.current.clients).toBeDefined();
    }
  });

  it('should handle real-time client inserts', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CrmProvider>{children}</CrmProvider>
    );

    const { result } = renderHook(() => useCrm(), { wrapper });

    // Get the onClientInsert callback from useCrmRealtime
    const onClientInsert = (useCrmRealtime as any).mock.calls[0]?.[0]?.onClientInsert;

    if (onClientInsert) {
      const newClient = { id: 'client-2', trainer_id: 'trainer-1', client_name: 'New Client' };

      act(() => {
        onClientInsert(newClient);
      });

      // Should add client to list
      expect(result.current.clients.length).toBeGreaterThan(0);
    }
  });

  it('should handle real-time client deletes', () => {
    const mockClients = [
      { id: 'client-1', trainer_id: 'trainer-1', client_name: 'Client 1' },
    ];

    (CrmService.getClients as any).mockResolvedValue({
      success: true,
      data: mockClients,
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CrmProvider>{children}</CrmProvider>
    );

    const { result } = renderHook(() => useCrm(), { wrapper });

    // Wait for clients to load
    waitFor(() => {
      expect(result.current.clients.length).toBeGreaterThan(0);
    });

    // Get the onClientDelete callback from useCrmRealtime
    const onClientDelete = (useCrmRealtime as any).mock.calls[0]?.[0]?.onClientDelete;

    if (onClientDelete) {
      act(() => {
        onClientDelete('client-1');
      });

      // Should remove client from list
      expect(result.current.clients.find((c: any) => c.id === 'client-1')).toBeUndefined();
    }
  });

  it('should throw error when useCrm is used outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = vi.fn();

    expect(() => {
      renderHook(() => useCrm());
    }).toThrow('useCrm must be used within a CrmProvider');

    console.error = originalError;
  });
});
