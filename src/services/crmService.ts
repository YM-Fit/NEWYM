/**
 * CRM Service Layer
 * שכבת שירותים מרכזית לניהול לוגיקת CRM
 */

import { 
  getClientsFromCalendar, 
  getClientCalendarStats,
  getClientInteractions,
  createClientInteraction,
  linkTraineeToCalendarClient,
  type CalendarClient,
  type ClientInteraction,
  type ClientCalendarStats,
  type PaginationOptions,
  type PaginatedResponse,
} from '../api/crmClientsApi';
import { 
  getGoogleCalendarEvents,
  syncGoogleCalendar,
  type GoogleCalendarEvent,
} from '../api/googleCalendarApi';
import { logger } from '../utils/logger';
import { CRM_CACHE_TTL, CRM_ALERTS } from '../constants/crmConstants';
import type { ApiResponse } from '../api/types';
import { 
  storeClients as storeClientsIndexedDB, 
  getClients as getClientsIndexedDB,
  storeInteractions as storeInteractionsIndexedDB,
  getInteractions as getInteractionsIndexedDB,
} from '../utils/indexedDb';
import { AuditService } from './auditService';

/**
 * Cache for CRM data
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class CrmCache {
  private cache = new Map<string, CacheEntry<any>>();
  private staleThreshold = 0.8; // Consider stale at 80% of TTL

  set<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    const isExpired = age > entry.ttl;
    
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Check if cache entry is stale (but still valid)
   * Used for stale-while-revalidate pattern
   */
  isStale(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const age = Date.now() - entry.timestamp;
    const staleThreshold = entry.ttl * this.staleThreshold;
    
    return age > staleThreshold && age <= entry.ttl;
  }

  clear(): void {
    this.cache.clear();
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.clear();
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

const crmCache = new CrmCache();

/**
 * CRM Service Class
 */
export class CrmService {
  /**
   * Get clients with caching and pagination support
   * @param trainerId - Trainer ID
   * @param useCache - Whether to use cache (default: true)
   * @param pagination - Pagination options (page/pageSize or cursor)
   * @returns Promise with clients list (paginated or plain array)
   */
  static async getClients(
    trainerId: string,
    useCache = true,
    pagination?: PaginationOptions
  ): Promise<ApiResponse<CalendarClient[] | PaginatedResponse<CalendarClient>>> {
    const cacheKey = `clients:${trainerId}`;
    
    // Stale-while-revalidate pattern: return stale cache immediately, refresh in background
    if (useCache && !pagination) {
      const cached = crmCache.get<CalendarClient[]>(cacheKey);
      const isStale = crmCache.isStale(cacheKey);
      
      if (cached) {
        // If stale, trigger background refresh but return cached data immediately
        if (isStale) {
          logger.debug('Returning stale cache, refreshing in background', { trainerId }, 'CrmService');
          // Fire and forget - refresh in background
          getClientsFromCalendar(trainerId).then((result) => {
            if (result.success && result.data && Array.isArray(result.data)) {
              crmCache.set(cacheKey, result.data, CRM_CACHE_TTL.CLIENTS_LIST);
              storeClientsIndexedDB(trainerId, result.data).catch(() => {});
            }
          }).catch(() => {});
        }
        return { data: cached, success: true };
      }
    }

    try {
      const result = await getClientsFromCalendar(trainerId, pagination);
      
      // Cache only non-paginated results
      if (result.success && result.data) {
        if (!pagination && Array.isArray(result.data)) {
          crmCache.set(cacheKey, result.data, CRM_CACHE_TTL.CLIENTS_LIST);
          // Store in IndexedDB for offline access
          storeClientsIndexedDB(trainerId, result.data).catch((error) => {
            logger.debug('Failed to store clients in IndexedDB', error, 'CrmService');
          });
        }
      } else {
        // Try IndexedDB as fallback
        const cachedClients = await getClientsIndexedDB(trainerId);
        if (cachedClients) {
          logger.debug('Returning clients from IndexedDB', { trainerId }, 'CrmService');
          return { data: cachedClients, success: true };
        }
      }
      
      return result;
    } catch (error) {
      logger.error('Error getting clients', error, 'CrmService');
      return { error: 'שגיאה בטעינת לקוחות' };
    }
  }

  /**
   * Get client statistics with caching
   * @param clientId - Client ID
   * @param useCache - Whether to use cache (default: true)
   * @returns Promise with client statistics
   */
  static async getClientStats(
    clientId: string,
    useCache = true
  ): Promise<ApiResponse<ClientCalendarStats>> {
    const cacheKey = `client-stats:${clientId}`;
    
    if (useCache) {
      const cached = crmCache.get<ClientCalendarStats>(cacheKey);
      if (cached) {
        logger.debug('Returning cached client stats', { clientId }, 'CrmService');
        return { data: cached, success: true };
      }
    }

    try {
      const result = await getClientCalendarStats(clientId);
      
      if (result.success && result.data) {
        crmCache.set(cacheKey, result.data, CRM_CACHE_TTL.CLIENT_STATS);
      }
      
      return result;
    } catch (error) {
      logger.error('Error getting client stats', error, 'CrmService');
      return { error: 'שגיאה בטעינת סטטיסטיקות לקוח' };
    }
  }

  /**
   * Get client interactions with caching
   * @param traineeId - Trainee ID
   * @param useCache - Whether to use cache (default: true)
   * @returns Promise with interactions list
   */
  static async getInteractions(
    traineeId: string,
    useCache = true
  ): Promise<ApiResponse<ClientInteraction[]>> {
    const cacheKey = `interactions:${traineeId}`;
    
    if (useCache) {
      const cached = crmCache.get<ClientInteraction[]>(cacheKey);
      if (cached) {
        logger.debug('Returning cached interactions', { traineeId }, 'CrmService');
        return { data: cached, success: true };
      }
    }

    try {
      const result = await getClientInteractions(traineeId);
      
      if (result.success && result.data) {
        crmCache.set(cacheKey, result.data, CRM_CACHE_TTL.INTERACTIONS);
        // Store in IndexedDB for offline access
        storeInteractionsIndexedDB(traineeId, result.data).catch((error) => {
          logger.debug('Failed to store interactions in IndexedDB', error, 'CrmService');
        });
      } else {
        // Try IndexedDB as fallback
        const cachedInteractions = await getInteractionsIndexedDB(traineeId);
        if (cachedInteractions) {
          logger.debug('Returning interactions from IndexedDB', { traineeId }, 'CrmService');
          return { data: cachedInteractions, success: true };
        }
      }
      
      return result;
    } catch (error) {
      logger.error('Error getting interactions', error, 'CrmService');
      return { error: 'שגיאה בטעינת אינטראקציות' };
    }
  }

  /**
   * Create interaction with optimistic update
   * @param interaction - Interaction data
   * @param optimisticUpdate - Callback for optimistic UI update
   * @returns Promise with created interaction
   */
  static async createInteraction(
    interaction: Omit<ClientInteraction, 'id' | 'created_at'>,
    optimisticUpdate?: (tempId: string) => void
  ): Promise<ApiResponse<ClientInteraction>> {
    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    if (optimisticUpdate) {
      optimisticUpdate(tempId);
    }

    try {
      const result = await createClientInteraction(interaction);
      
      if (result.success && result.data) {
        // Log audit event
        await AuditService.logCreate(
          interaction.trainer_id,
          'client_interactions',
          result.data.id,
          result.data
        ).catch(err => logger.error('Failed to log audit event', err, 'CrmService'));
        
        // Invalidate all related cache
        crmCache.invalidate(`interactions:${interaction.trainee_id}`);
        crmCache.invalidate(`clients:`);
        crmCache.invalidate(`client-stats:`);
        // Also update cache with new data if available
        if (result.data) {
          const interactionsKey = `interactions:${interaction.trainee_id}`;
          // Get existing interactions from cache and add new one
          const existing = crmCache.get<ClientInteraction[]>(interactionsKey);
          if (existing) {
            crmCache.set(interactionsKey, [...existing, result.data], CRM_CACHE_TTL.INTERACTIONS);
          }
        }
        return result;
      } else {
        // Rollback optimistic update on error
        throw new Error(result.error || 'Failed to create interaction');
      }
    } catch (error) {
      logger.error('Error creating interaction', error, 'CrmService');
      return { error: 'שגיאה ביצירת אינטראקציה' };
    }
  }

  /**
   * Link trainee to calendar client with optimistic update
   * @param traineeId - Trainee ID
   * @param clientId - Client ID
   * @param trainerId - Trainer ID
   * @param optimisticUpdate - Callback for optimistic UI update
   * @returns Promise with success status
   */
  static async linkTraineeToClient(
    traineeId: string,
    clientId: string,
    trainerId: string,
    optimisticUpdate?: () => void
  ): Promise<ApiResponse> {
    // Optimistic update
    if (optimisticUpdate) {
      optimisticUpdate();
    }

    try {
      const result = await linkTraineeToCalendarClient(traineeId, clientId, trainerId);
      
      if (result.success) {
        // Log audit event
        await AuditService.logUpdate(
          trainerId,
          'google_calendar_clients',
          clientId,
          {},
          { trainee_id: traineeId }
        ).catch(err => logger.error('Failed to log audit event', err, 'CrmService'));
        
        // Invalidate all related cache
        crmCache.invalidate(`clients:${trainerId}`);
        crmCache.invalidate(`clients:`); // Invalidate all clients cache
        crmCache.invalidate(`client-stats:${clientId}`);
        crmCache.invalidate(`client-stats:`); // Invalidate all stats cache
        
        // Update cache with new linked client data if we have it
        // This ensures next read gets updated data immediately
        const clientsKey = `clients:${trainerId}`;
        const cachedClients = crmCache.get<CalendarClient[]>(clientsKey);
        if (cachedClients) {
          const updatedClients = cachedClients.map(client =>
            client.id === clientId
              ? { ...client, trainee_id: traineeId }
              : client
          );
          crmCache.set(clientsKey, updatedClients, CRM_CACHE_TTL.CLIENTS_LIST);
        }
        
        return result;
      } else {
        // Rollback optimistic update on error
        throw new Error(result.error || 'Failed to link trainee');
      }
    } catch (error) {
      logger.error('Error linking trainee to client', error, 'CrmService');
      return { error: 'שגיאה בקישור מתאמן ללקוח' };
    }
  }

  /**
   * Get upcoming events for client
   * @param clientId - Client ID
   * @param trainerId - Trainer ID
   * @param dateRange - Date range for events
   * @returns Promise with events list
   */
  static async getClientUpcomingEvents(
    clientId: string,
    trainerId: string,
    dateRange: { start: Date; end: Date }
  ): Promise<ApiResponse<GoogleCalendarEvent[]>> {
    const cacheKey = `events:${clientId}:${dateRange.start.toISOString()}:${dateRange.end.toISOString()}`;
    
    const cached = crmCache.get<GoogleCalendarEvent[]>(cacheKey);
    if (cached) {
      logger.debug('Returning cached events', { clientId }, 'CrmService');
      return { data: cached, success: true };
    }

    try {
      const result = await getGoogleCalendarEvents(trainerId, dateRange, { useCache: true });
      
      if (result.success && result.data) {
        crmCache.set(cacheKey, result.data, CRM_CACHE_TTL.CALENDAR_EVENTS);
      }
      
      return result;
    } catch (error) {
      logger.error('Error getting client events', error, 'CrmService');
      return { error: 'שגיאה בטעינת אירועים' };
    }
  }

  /**
   * Sync calendar and invalidate cache
   * @param trainerId - Trainer ID
   * @param accessToken - Access token
   * @returns Promise with success status
   */
  static async syncCalendar(
    trainerId: string,
    accessToken: string
  ): Promise<ApiResponse> {
    try {
      const result = await syncGoogleCalendar(trainerId, accessToken);
      
      if (result.success) {
        // Log audit event for calendar sync
        await AuditService.logAuditEvent({
          user_id: trainerId,
          action: 'status_change',
          table_name: 'google_calendar_sync',
          new_data: {
            action: 'calendar_sync',
            timestamp: new Date().toISOString(),
          },
        }).catch(err => logger.error('Failed to log audit event', err, 'CrmService'));

        // Invalidate all CRM cache
        crmCache.invalidate();
      }
      
      return result;
    } catch (error) {
      logger.error('Error syncing calendar', error, 'CrmService');
      return { error: 'שגיאה בסנכרון יומן' };
    }
  }

  /**
   * Check if client needs follow-up
   * @param client - Client data
   * @returns Boolean indicating if follow-up is needed
   */
  static needsFollowUp(client: CalendarClient): boolean {
    if (!client.last_event_date) return true;
    
    const lastEventDate = new Date(client.last_event_date);
    const daysSinceLastEvent = Math.floor(
      (Date.now() - lastEventDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    return daysSinceLastEvent >= CRM_ALERTS.INACTIVE_CLIENT_DAYS;
  }

  /**
   * Clear all cache
   */
  static clearCache(): void {
    crmCache.clear();
  }

  /**
   * Invalidate cache for specific pattern
   * @param pattern - Pattern to match cache keys
   */
  static invalidateCache(pattern?: string): void {
    crmCache.invalidate(pattern);
  }
}
