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
} from '../api/crmClientsApi';
import { 
  getGoogleCalendarEvents,
  syncGoogleCalendar,
  type GoogleCalendarEvent,
} from '../api/googleCalendarApi';
import { logger } from '../utils/logger';
import { CRM_CACHE_TTL, CRM_ALERTS } from '../constants/crmConstants';
import type { ApiResponse } from '../api/types';

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

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
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
   * Get clients with caching
   * @param trainerId - Trainer ID
   * @param useCache - Whether to use cache (default: true)
   * @returns Promise with clients list
   */
  static async getClients(
    trainerId: string,
    useCache = true
  ): Promise<ApiResponse<CalendarClient[]>> {
    const cacheKey = `clients:${trainerId}`;
    
    if (useCache) {
      const cached = crmCache.get<CalendarClient[]>(cacheKey);
      if (cached) {
        logger.debug('Returning cached clients', { trainerId }, 'CrmService');
        return { data: cached, success: true };
      }
    }

    try {
      const result = await getClientsFromCalendar(trainerId);
      
      if (result.success && result.data) {
        crmCache.set(cacheKey, result.data, CRM_CACHE_TTL.CLIENTS_LIST);
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
