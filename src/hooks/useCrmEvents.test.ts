/**
 * Tests for useCrmEvents hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCrmEvents } from './useCrmEvents';
import { useCrm } from '../contexts/CrmContext';

// Mock CrmContext
const mockSubscribe = vi.fn((listener: any) => {
  // Return unsubscribe function
  return vi.fn();
});

const mockEmit = vi.fn();

vi.mock('../contexts/CrmContext', () => ({
  useCrm: vi.fn(() => ({
    subscribe: mockSubscribe,
    emit: mockEmit,
  })),
}));

vi.mock('../utils/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe('useCrmEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should subscribe to CRM events', () => {
    renderHook(() => useCrmEvents());

    expect(mockSubscribe).toHaveBeenCalled();
  });

  it('should call onClientUpdated when client:updated event is emitted', () => {
    const onClientUpdated = vi.fn();
    let eventListener: any;

    mockSubscribe.mockImplementation((listener: any) => {
      eventListener = listener;
      return vi.fn();
    });

    renderHook(() =>
      useCrmEvents({
        onClientUpdated,
      })
    );

    // Simulate event
    const mockClient = { id: 'client-1', client_name: 'Test Client' };
    eventListener({ type: 'client:updated', data: mockClient });

    expect(onClientUpdated).toHaveBeenCalledWith(mockClient);
  });

  it('should call onClientCreated when client:created event is emitted', () => {
    const onClientCreated = vi.fn();
    let eventListener: any;

    mockSubscribe.mockImplementation((listener: any) => {
      eventListener = listener;
      return vi.fn();
    });

    renderHook(() =>
      useCrmEvents({
        onClientCreated,
      })
    );

    // Simulate event
    const mockClient = { id: 'client-2', client_name: 'New Client' };
    eventListener({ type: 'client:created', data: mockClient });

    expect(onClientCreated).toHaveBeenCalledWith(mockClient);
  });

  it('should call onClientDeleted when client:deleted event is emitted', () => {
    const onClientDeleted = vi.fn();
    let eventListener: any;

    mockSubscribe.mockImplementation((listener: any) => {
      eventListener = listener;
      return vi.fn();
    });

    renderHook(() =>
      useCrmEvents({
        onClientDeleted,
      })
    );

    // Simulate event
    const mockClientId = 'client-1';
    eventListener({ type: 'client:deleted', data: { clientId: mockClientId } });

    expect(onClientDeleted).toHaveBeenCalledWith(mockClientId);
  });

  it('should call onClientsReloaded when clients:reloaded event is emitted', () => {
    const onClientsReloaded = vi.fn();
    let eventListener: any;

    mockSubscribe.mockImplementation((listener: any) => {
      eventListener = listener;
      return vi.fn();
    });

    renderHook(() =>
      useCrmEvents({
        onClientsReloaded,
      })
    );

    // Simulate event
    const mockClients = [
      { id: 'client-1', client_name: 'Client 1' },
      { id: 'client-2', client_name: 'Client 2' },
    ];
    eventListener({ type: 'clients:reloaded', data: mockClients });

    expect(onClientsReloaded).toHaveBeenCalledWith(mockClients);
  });

  it('should call onCacheInvalidated when cache:invalidated event is emitted', () => {
    const onCacheInvalidated = vi.fn();
    let eventListener: any;

    mockSubscribe.mockImplementation((listener: any) => {
      eventListener = listener;
      return vi.fn();
    });

    renderHook(() =>
      useCrmEvents({
        onCacheInvalidated,
      })
    );

    // Simulate event
    const mockData = { clientId: 'client-1' };
    eventListener({ type: 'cache:invalidated', data: mockData });

    expect(onCacheInvalidated).toHaveBeenCalledWith(mockData);
  });

  it('should call onFilterChanged when filter:changed event is emitted', () => {
    const onFilterChanged = vi.fn();
    let eventListener: any;

    mockSubscribe.mockImplementation((listener: any) => {
      eventListener = listener;
      return vi.fn();
    });

    renderHook(() =>
      useCrmEvents({
        onFilterChanged,
      })
    );

    // Simulate event
    const mockFilters = { status: 'active', searchQuery: 'test' };
    eventListener({ type: 'filter:changed', data: mockFilters });

    expect(onFilterChanged).toHaveBeenCalledWith(mockFilters);
  });

  it('should not call callbacks if not provided', () => {
    let eventListener: any;

    mockSubscribe.mockImplementation((listener: any) => {
      eventListener = listener;
      return vi.fn();
    });

    renderHook(() => useCrmEvents());

    // Simulate event without handlers
    const mockClient = { id: 'client-1' };
    eventListener({ type: 'client:updated', data: mockClient });

    // Should not throw
    expect(true).toBe(true);
  });

  it('should handle errors in event listeners gracefully', () => {
    const onClientUpdated = vi.fn(() => {
      throw new Error('Handler error');
    });
    let eventListener: any;

    mockSubscribe.mockImplementation((listener: any) => {
      eventListener = listener;
      return vi.fn();
    });

    renderHook(() =>
      useCrmEvents({
        onClientUpdated,
      })
    );

    // Simulate event that causes error
    const mockClient = { id: 'client-1' };
    eventListener({ type: 'client:updated', data: mockClient });

    // Should not crash, error should be logged
    expect(onClientUpdated).toHaveBeenCalled();
  });

  it('should return emitEvent function', () => {
    const { result } = renderHook(() => useCrmEvents());

    expect(result.current.emitEvent).toBeDefined();
    expect(typeof result.current.emitEvent).toBe('function');
  });

  it('should emit events using emitEvent', () => {
    const { result } = renderHook(() => useCrmEvents());

    const mockData = { id: 'client-1' };
    result.current.emitEvent('client:updated', mockData);

    expect(mockEmit).toHaveBeenCalledWith({
      type: 'client:updated',
      data: mockData,
    });
  });

  it('should unsubscribe on unmount', () => {
    const unsubscribe = vi.fn();
    mockSubscribe.mockReturnValue(unsubscribe);

    const { unmount } = renderHook(() => useCrmEvents());

    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });
});
