/**
 * CRM Realtime Hook
 * Hook for real-time updates of CRM data using Supabase Realtime
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';
import { CrmService } from '../services/crmService';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { CalendarClient, ClientInteraction } from '../api/crmClientsApi';

interface UseCrmRealtimeOptions {
  trainerId: string;
  onClientUpdate?: (client: CalendarClient) => void;
  onClientInsert?: (client: CalendarClient) => void;
  onClientDelete?: (clientId: string) => void;
  onInteractionUpdate?: (interaction: ClientInteraction) => void;
  enabled?: boolean;
}

interface UseCrmRealtimeResult {
  isConnected: boolean;
  error: string | null;
  reconnect: () => void;
}

/**
 * Hook for real-time CRM updates
 * 
 * @param options - Configuration options
 * @returns Real-time connection status and controls
 * 
 * @example
 * ```typescript
 * const { isConnected, error, reconnect } = useCrmRealtime({
 *   trainerId: user.id,
 *   onClientUpdate: (client) => {
 *     console.log('Client updated:', client);
 *     // Update UI
 *   },
 * });
 * ```
 */
export function useCrmRealtime(options: UseCrmRealtimeOptions): UseCrmRealtimeResult {
  const {
    trainerId,
    onClientUpdate,
    onClientInsert,
    onClientDelete,
    onInteractionUpdate,
    enabled = true,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const cleanup = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const setupRealtime = useCallback(() => {
    if (!enabled || !trainerId) {
      return;
    }

    cleanup();

    try {
      // Channel for google_calendar_clients
      const clientsChannel = supabase
        .channel(`crm-clients-${trainerId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'google_calendar_clients',
            filter: `trainer_id=eq.${trainerId}`,
          },
          (payload) => {
            logger.debug('Client updated via realtime', payload.new, 'useCrmRealtime');
            // Invalidate cache when real-time update occurs
            CrmService.invalidateCache(`clients:`);
            CrmService.invalidateCache(`client-stats:${payload.new.id}`);
            onClientUpdate?.(payload.new as CalendarClient);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'google_calendar_clients',
            filter: `trainer_id=eq.${trainerId}`,
          },
          (payload) => {
            logger.debug('Client inserted via realtime', payload.new, 'useCrmRealtime');
            // Invalidate cache when new client is inserted
            CrmService.invalidateCache(`clients:`);
            onClientInsert?.(payload.new as CalendarClient);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'google_calendar_clients',
            filter: `trainer_id=eq.${trainerId}`,
          },
          (payload) => {
            logger.debug('Client deleted via realtime', payload.old, 'useCrmRealtime');
            // Invalidate cache when client is deleted
            CrmService.invalidateCache(`clients:`);
            CrmService.invalidateCache(`client-stats:${payload.old.id}`);
            onClientDelete?.(payload.old.id);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            setError(null);
            logger.info('CRM realtime connected', undefined, 'useCrmRealtime');
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setIsConnected(false);
            setError(`Connection ${status === 'CHANNEL_ERROR' ? 'error' : 'timed out'}`);
            logger.error('CRM realtime connection failed', status, 'useCrmRealtime');
            
            // Auto-reconnect after 5 seconds
            reconnectTimeoutRef.current = setTimeout(() => {
              setupRealtime();
            }, 5000);
          }
        });

      // Channel for client_interactions
      if (onInteractionUpdate) {
        const interactionsChannel = supabase
          .channel(`crm-interactions-${trainerId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'client_interactions',
            },
            (payload) => {
              // Check if interaction belongs to trainer's trainees
              logger.debug('Interaction updated via realtime', payload.new, 'useCrmRealtime');
              // Invalidate cache when interaction changes
              CrmService.invalidateCache(`interactions:${payload.new.trainee_id}`);
              CrmService.invalidateCache(`clients:`);
              onInteractionUpdate?.(payload.new as ClientInteraction);
            }
          )
          .subscribe();
      }

      channelRef.current = clientsChannel;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      logger.error('Failed to setup CRM realtime', err, 'useCrmRealtime');
    }
  }, [
    enabled,
    trainerId,
    onClientUpdate,
    onClientInsert,
    onClientDelete,
    onInteractionUpdate,
    cleanup,
  ]);

  const reconnect = useCallback(() => {
    cleanup();
    setError(null);
    setupRealtime();
  }, [cleanup, setupRealtime]);

  useEffect(() => {
    setupRealtime();

    return () => {
      cleanup();
    };
  }, [setupRealtime, cleanup]);

  return {
    isConnected,
    error,
    reconnect,
  };
}
