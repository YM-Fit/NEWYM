/**
 * CRM Context
 * ניהול state מרכזי לכל מערכת ה-CRM
 */

import { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { CrmService } from '../services/crmService';
import { useCrmRealtime } from '../hooks/useCrmRealtime';
import { logger } from '../utils/logger';
import type { CalendarClient } from '../api/crmClientsApi';

// Event types for CRM updates
export type CrmEventType = 
  | 'client:updated'
  | 'client:created'
  | 'client:deleted'
  | 'clients:reloaded'
  | 'cache:invalidated'
  | 'filter:changed';

export type CrmEventListener = (event: { type: CrmEventType; data?: any }) => void;

interface CrmContextType {
  // State
  clients: CalendarClient[];
  selectedClient: CalendarClient | null;
  filters: {
    status?: string;
    searchQuery?: string;
    dateRange?: { start: Date; end: Date };
  };
  loading: boolean;
  error: string | null;

  // Actions
  setSelectedClient: (client: CalendarClient | null) => void;
  setFilters: (filters: Partial<CrmContextType['filters']>) => void;
  loadClients: (forceRefresh?: boolean) => Promise<void>;
  refreshClient: (clientId: string) => Promise<void>;
  clearCache: () => void;
  
  // Navigation helpers
  navigateToClient: (clientId: string) => void;
  navigateToView: (view: string) => void;
  
  // Event system
  subscribe: (listener: CrmEventListener) => () => void;
  emit: (event: { type: CrmEventType; data?: any }) => void;
}

const CrmContext = createContext<CrmContextType | undefined>(undefined);

interface CrmProviderProps {
  children: ReactNode;
  onViewChange?: (view: string) => void;
}

export function CrmProvider({ children, onViewChange }: CrmProviderProps) {
  const { user } = useAuth();
  const [clients, setClients] = useState<CalendarClient[]>([]);
  const [selectedClient, setSelectedClient] = useState<CalendarClient | null>(null);
  const [filters, setFiltersState] = useState<CrmContextType['filters']>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Event system
  const listenersRef = useRef<Set<CrmEventListener>>(new Set());

  const emit = useCallback((event: { type: CrmEventType; data?: any }) => {
    listenersRef.current.forEach(listener => {
      try {
        listener(event);
      } catch (err) {
        logger.error('Error in event listener', err, 'CrmContext');
      }
    });
  }, []);

  const subscribe = useCallback((listener: CrmEventListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const loadClients = useCallback(async (forceRefresh = false) => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const result = await CrmService.getClients(user.id, !forceRefresh);

      if (result.success && result.data) {
        setClients(result.data);
        emit({ type: 'clients:reloaded', data: result.data });
      } else {
        setError(result.error || 'שגיאה בטעינת לקוחות');
        logger.error('Failed to load clients', { error: result.error }, 'CrmContext');
      }
    } catch (err) {
      const errorMessage = 'שגיאה בטעינת לקוחות';
      setError(errorMessage);
      logger.error('Error loading clients', err, 'CrmContext');
    } finally {
      setLoading(false);
    }
  }, [user, emit]);

  const refreshClient = useCallback(async (clientId: string) => {
    if (!user) return;

    try {
      // Invalidate cache for this client
      CrmService.invalidateCache(`client-stats:${clientId}`);
      CrmService.invalidateCache(`clients:${user.id}`);
      emit({ type: 'cache:invalidated', data: { clientId } });

      // Reload clients
      await loadClients(true);

      // Update selected client if it's the one we're refreshing
      if (selectedClient?.id === clientId) {
        const updatedClient = clients.find(c => c.id === clientId);
        if (updatedClient) {
          setSelectedClient(updatedClient);
          emit({ type: 'client:updated', data: updatedClient });
        }
      }
    } catch (err) {
      logger.error('Error refreshing client', err, 'CrmContext');
    }
  }, [user, selectedClient, clients, loadClients, emit]);

  const setFilters = useCallback((newFilters: Partial<CrmContextType['filters']>) => {
    setFiltersState(prev => {
      const updated = { ...prev, ...newFilters };
      emit({ type: 'filter:changed', data: updated });
      return updated;
    });
  }, [emit]);

  const clearCache = useCallback(() => {
    CrmService.clearCache();
    setClients([]);
    setSelectedClient(null);
    emit({ type: 'cache:invalidated' });
  }, [emit]);

  const navigateToClient = useCallback((clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setSelectedClient(client);
      if (onViewChange) {
        onViewChange('client-detail');
      }
    }
  }, [clients, onViewChange]);

  const navigateToView = useCallback((view: string) => {
    if (onViewChange) {
      onViewChange(view);
    }
  }, [onViewChange]);

  // Real-time updates integration
  useCrmRealtime({
    trainerId: user?.id || '',
    enabled: !!user,
    onClientUpdate: (client) => {
      setClients((prev) =>
        prev.map((c) => (c.id === client.id ? client : c))
      );
      if (selectedClient?.id === client.id) {
        setSelectedClient(client);
      }
      emit({ type: 'client:updated', data: client });
      // Invalidate cache is handled by useCrmRealtime hook
    },
    onClientInsert: (client) => {
      setClients((prev) => [client, ...prev]);
      emit({ type: 'client:created', data: client });
    },
    onClientDelete: (clientId) => {
      setClients((prev) => prev.filter((c) => c.id !== clientId));
      if (selectedClient?.id === clientId) {
        setSelectedClient(null);
      }
      emit({ type: 'client:deleted', data: { clientId } });
    },
  });

  // Load clients on mount
  useEffect(() => {
    if (user) {
      loadClients();
    }
  }, [user, loadClients]);

  const value: CrmContextType = {
    clients,
    selectedClient,
    filters,
    loading,
    error,
    setSelectedClient,
    setFilters,
    loadClients,
    refreshClient,
    clearCache,
    navigateToClient,
    navigateToView,
    subscribe,
    emit,
  };

  return (
    <CrmContext.Provider value={value}>
      {children}
    </CrmContext.Provider>
  );
}

export function useCrm() {
  const context = useContext(CrmContext);
  if (context === undefined) {
    throw new Error('useCrm must be used within a CrmProvider');
  }
  return context;
}
