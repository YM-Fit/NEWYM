/**
 * useCrmEvents Hook
 * Hook להאזנה לאירועי CRM ולעדכון אוטומטי של components
 */

import { useEffect, useCallback } from 'react';
import { useCrm, CrmEventType } from '../contexts/CrmContext';
import { logger } from '../utils/logger';

interface UseCrmEventsOptions {
  onClientUpdated?: (client: any) => void;
  onClientCreated?: (client: any) => void;
  onClientDeleted?: (clientId: string) => void;
  onClientsReloaded?: (clients: any[]) => void;
  onCacheInvalidated?: (data?: any) => void;
  onFilterChanged?: (filters: any) => void;
}

/**
 * Hook להאזנה לאירועי CRM
 * @param options - Callbacks לאירועים שונים
 * @returns Object עם פונקציות לשליחת אירועים
 */
export function useCrmEvents(options: UseCrmEventsOptions = {}) {
  const { subscribe, emit } = useCrm();

  useEffect(() => {
    const unsubscribe = subscribe((event) => {
      try {
        switch (event.type) {
          case 'client:updated':
            if (options.onClientUpdated && event.data) {
              options.onClientUpdated(event.data);
            }
            break;
          
          case 'client:created':
            if (options.onClientCreated && event.data) {
              options.onClientCreated(event.data);
            }
            break;
          
          case 'client:deleted':
            if (options.onClientDeleted && event.data) {
              options.onClientDeleted(event.data);
            }
            break;
          
          case 'clients:reloaded':
            if (options.onClientsReloaded && event.data) {
              options.onClientsReloaded(event.data);
            }
            break;
          
          case 'cache:invalidated':
            if (options.onCacheInvalidated) {
              options.onCacheInvalidated(event.data);
            }
            break;
          
          case 'filter:changed':
            if (options.onFilterChanged && event.data) {
              options.onFilterChanged(event.data);
            }
            break;
        }
      } catch (error) {
        logger.error('Error handling CRM event', error, 'useCrmEvents');
      }
    });

    return unsubscribe;
  }, [subscribe, options]);

  const emitEvent = useCallback((type: CrmEventType, data?: any) => {
    emit({ type, data });
  }, [emit]);

  return {
    emitEvent,
  };
}
