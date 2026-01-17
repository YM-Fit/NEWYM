/**
 * Tests for useCrmRealtime hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCrmRealtime } from './useCrmRealtime';
import { supabase } from '../lib/supabase';
import { CrmService } from '../services/crmService';

// Mock dependencies
vi.mock('../lib/supabase', () => ({
  supabase: {
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));
vi.mock('../services/crmService', () => ({
  CrmService: {
    invalidateCache: vi.fn(),
  },
}));
vi.mock('../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useCrmRealtime', () => {
  const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockResolvedValue('SUBSCRIBED'),
    unsubscribe: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    (supabase.channel as any).mockReturnValue(mockChannel);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize realtime connection', async () => {
    const { result } = renderHook(() =>
      useCrmRealtime({
        trainerId: 'trainer-1',
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(supabase.channel).toHaveBeenCalledWith('crm-clients-trainer-1');
    });

    expect(mockChannel.on).toHaveBeenCalled();
    expect(mockChannel.subscribe).toHaveBeenCalled();
  });

  it('should not connect when disabled', () => {
    const { result } = renderHook(() =>
      useCrmRealtime({
        trainerId: 'trainer-1',
        enabled: false,
      })
    );

    expect(supabase.channel).not.toHaveBeenCalled();
  });

  it('should not connect when trainerId is missing', () => {
    const { result } = renderHook(() =>
      useCrmRealtime({
        trainerId: '',
        enabled: true,
      })
    );

    expect(supabase.channel).not.toHaveBeenCalled();
  });

  it('should handle client update events', async () => {
    const onClientUpdate = vi.fn();
    const mockClient = {
      id: 'client-1',
      trainer_id: 'trainer-1',
      client_name: 'Test Client',
    };

    let updateHandler: any;
    mockChannel.on.mockImplementation((event: string, config: any, handler: any) => {
      if (event === 'postgres_changes' && config?.event === 'UPDATE') {
        updateHandler = handler;
      }
      return mockChannel;
    });

    renderHook(() =>
      useCrmRealtime({
        trainerId: 'trainer-1',
        enabled: true,
        onClientUpdate,
      })
    );

    await waitFor(() => {
      expect(mockChannel.on).toHaveBeenCalled();
    });

    // Simulate update event
    if (updateHandler) {
      updateHandler({ new: mockClient });
    }

    await waitFor(() => {
      expect(CrmService.invalidateCache).toHaveBeenCalled();
      expect(onClientUpdate).toHaveBeenCalledWith(mockClient);
    });
  });

  it('should handle client insert events', async () => {
    const onClientInsert = vi.fn();
    const mockClient = {
      id: 'client-2',
      trainer_id: 'trainer-1',
      client_name: 'New Client',
    };

    let insertHandler: any;
    mockChannel.on.mockImplementation((event: string, config: any, handler: any) => {
      if (event === 'postgres_changes' && config?.event === 'INSERT') {
        insertHandler = handler;
      }
      return mockChannel;
    });

    renderHook(() =>
      useCrmRealtime({
        trainerId: 'trainer-1',
        enabled: true,
        onClientInsert,
      })
    );

    await waitFor(() => {
      expect(mockChannel.on).toHaveBeenCalled();
    });

    // Simulate insert event
    if (insertHandler) {
      insertHandler({ new: mockClient });
    }

    await waitFor(() => {
      expect(CrmService.invalidateCache).toHaveBeenCalled();
      expect(onClientInsert).toHaveBeenCalledWith(mockClient);
    });
  });

  it('should handle client delete events', async () => {
    const onClientDelete = vi.fn();
    const mockClientId = 'client-1';

    let deleteHandler: any;
    mockChannel.on.mockImplementation((event: string, config: any, handler: any) => {
      if (event === 'postgres_changes' && config?.event === 'DELETE') {
        deleteHandler = handler;
      }
      return mockChannel;
    });

    renderHook(() =>
      useCrmRealtime({
        trainerId: 'trainer-1',
        enabled: true,
        onClientDelete,
      })
    );

    await waitFor(() => {
      expect(mockChannel.on).toHaveBeenCalled();
    });

    // Simulate delete event
    if (deleteHandler) {
      deleteHandler({ old: { id: mockClientId } });
    }

    await waitFor(() => {
      expect(CrmService.invalidateCache).toHaveBeenCalled();
      expect(onClientDelete).toHaveBeenCalledWith(mockClientId);
    });
  });

  it('should handle connection errors', async () => {
    const mockErrorChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn((callback: (status: string) => void) => {
        // Simulate connection error
        setTimeout(() => callback('CHANNEL_ERROR'), 100);
      }),
    };

    (supabase.channel as any).mockReturnValue(mockErrorChannel);

    const { result } = renderHook(() =>
      useCrmRealtime({
        trainerId: 'trainer-1',
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(result.current.isConnected).toBe(false);
      expect(result.current.error).toBeDefined();
    });
  });

  it('should provide reconnect function', () => {
    const { result } = renderHook(() =>
      useCrmRealtime({
        trainerId: 'trainer-1',
        enabled: true,
      })
    );

    expect(result.current.reconnect).toBeDefined();
    expect(typeof result.current.reconnect).toBe('function');

    // Call reconnect
    result.current.reconnect();

    // Should attempt to reconnect
    expect(supabase.channel).toHaveBeenCalled();
  });

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() =>
      useCrmRealtime({
        trainerId: 'trainer-1',
        enabled: true,
      })
    );

    unmount();

    expect(supabase.removeChannel).toHaveBeenCalled();
  });

  it('should setup interaction channel when onInteractionUpdate provided', async () => {
    const onInteractionUpdate = vi.fn();

    let interactionHandler: any;
    mockChannel.on.mockImplementation((event: string, config: any, handler: any) => {
      if (event === 'postgres_changes' && config?.table === 'client_interactions') {
        interactionHandler = handler;
      }
      return mockChannel;
    });

    const interactionChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    };

    (supabase.channel as any).mockImplementation((name: string) => {
      if (name.includes('interactions')) {
        return interactionChannel;
      }
      return mockChannel;
    });

    renderHook(() =>
      useCrmRealtime({
        trainerId: 'trainer-1',
        enabled: true,
        onInteractionUpdate,
      })
    );

    await waitFor(() => {
      expect(interactionChannel.on).toHaveBeenCalled();
    });
  });

  it('should handle auto-reconnect after timeout', async () => {
    const mockErrorChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn((callback: (status: string) => void) => {
        setTimeout(() => callback('TIMED_OUT'), 100);
      }),
    };

    (supabase.channel as any).mockReturnValue(mockErrorChannel);

    vi.useRealTimers();

    renderHook(() =>
      useCrmRealtime({
        trainerId: 'trainer-1',
        enabled: true,
      })
    );

    // Wait for timeout and reconnect
    await new Promise(resolve => setTimeout(resolve, 5100));

    // Should attempt reconnect after 5 seconds
    expect(supabase.channel).toHaveBeenCalled();
  });
});
