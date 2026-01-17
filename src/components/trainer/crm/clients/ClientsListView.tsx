/**
 * Enhanced Clients List View with Real-time updates, Virtual Scrolling, and Export
 */

import { useState, useEffect, useCallback, useMemo, lazy, Suspense, useRef } from 'react';
import { Users, RefreshCw, Search, Keyboard, Download, FileText, Wifi, WifiOff, TrendingUp, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';
import { CrmService } from '../../../../services/crmService';
import { linkTraineeToCalendarClient, type CalendarClient, type PaginatedResponse } from '../../../../api/crmClientsApi';
import { getTrainees } from '../../../../api/traineeApi';
import { useCrmRealtime } from '../../../../hooks/useCrmRealtime';
import { useKeyboardShortcut } from '../../../../hooks/useKeyboardShortcut';
import { usePagination } from '../../../../hooks/usePagination';
import { exportClientsToCSV, exportClientsToPDF } from '../../../../utils/exportUtils';
import VirtualList from '../../../common/VirtualList';
import toast from 'react-hot-toast';
import { logger } from '../../../../utils/logger';

// Lazy load ClientCard for better performance
const ClientCard = lazy(() => import('./ClientCard'));

interface ClientsListViewEnhancedProps {
  onClientClick?: (client: CalendarClient) => void;
  onViewChange?: (view: string) => void;
}

export default function ClientsListViewEnhanced({ onClientClick, onViewChange }: ClientsListViewEnhancedProps) {
  const { user } = useAuth();
  const [clients, setClients] = useState<CalendarClient[]>([]);
  const [trainees, setTrainees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'linked' | 'unlinked'>('all');
  const [linkingClient, setLinkingClient] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [useVirtualScrolling, setUseVirtualScrolling] = useState(false);
  const [allClients, setAllClients] = useState<CalendarClient[]>([]);
  const [paginationInfo, setPaginationInfo] = useState<{
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);

  // Real-time updates
  const { isConnected, error: realtimeError, reconnect } = useCrmRealtime({
    trainerId: user?.id || '',
    enabled: !!user,
    onClientUpdate: (client) => {
      // Update state immediately
      setClients((prev) =>
        prev.map((c) => (c.id === client.id ? client : c))
      );
      // Cache is already invalidated by useCrmRealtime hook
      toast.success('לקוח עודכן', { duration: 2000 });
    },
    onClientInsert: (client) => {
      // Add new client to state immediately
      setClients((prev) => [client, ...prev]);
      // Cache is already invalidated by useCrmRealtime hook
      toast.success('לקוח חדש נוסף', { duration: 2000 });
    },
    onClientDelete: (clientId) => {
      // Remove client from state immediately
      setClients((prev) => prev.filter((c) => c.id !== clientId));
      // Cache is already invalidated by useCrmRealtime hook
      toast.success('לקוח נמחק', { duration: 2000 });
    },
  });

  const loadData = useCallback(async (reset = true, pageNum = 1) => {
    if (!user) return;

    try {
      if (reset) {
        setLoading(true);
        setPage(1);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }
      
      const [clientsResult, traineesResult] = await Promise.all([
        CrmService.getClients(user.id, true, { page: pageNum, pageSize }),
        getTrainees(user.id)
      ]);

      if (clientsResult.success && clientsResult.data) {
        // Handle paginated response
        if (paginationInfo && 'pagination' in clientsResult.data && clientsResult.data.pagination) {
          const paginatedData = clientsResult.data as PaginatedResponse<CalendarClient>;
          setAllClients(paginatedData.data);
          setPaginationInfo({
            page: paginatedData.pagination?.page || pageNum,
            pageSize: paginatedData.pagination?.pageSize || pageSize,
            total: paginatedData.pagination?.total || 0,
            totalPages: paginatedData.pagination?.totalPages || 0,
            hasNextPage: paginatedData.pagination?.hasNextPage || false,
            hasPrevPage: paginatedData.pagination?.hasPrevPage || false,
          });
        }
        // Handle plain array (backwards compatibility)
        else if (Array.isArray(clientsResult.data)) {
          setAllClients(clientsResult.data);
          setPaginationInfo(null);
        }
      } else if (clientsResult.error) {
        logger.error('Error loading clients', clientsResult.error, 'ClientsListViewEnhanced');
        toast.error(clientsResult.error);
      }

      if (traineesResult.success && traineesResult.data) {
        setTrainees(traineesResult.data);
      }
    } catch (error) {
      logger.error('Error loading clients', error, 'ClientsListViewEnhanced');
      toast.error('שגיאה בטעינת כרטיסיות לקוחות');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user, pageSize]);

  // Update clients when allClients changes
  useEffect(() => {
    setClients(allClients);
  }, [allClients]);

  // Load data when page changes
  useEffect(() => {
    if (user && currentPage) {
      loadData(false, currentPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentPage]);

  // Initial load
  useEffect(() => {
    if (user) {
      setCurrentPage(1);
      loadData(true, 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Keyboard shortcuts
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [selectedClientIndex, setSelectedClientIndex] = useState<number>(-1);

  // Refresh shortcut: R
  useKeyboardShortcut('r', () => {
    if (!loading) {
      loadData();
    }
  }, [loadData, loading]);

  // Search shortcuts: / or Ctrl/Cmd + K
  useKeyboardShortcut('/', (e) => {
    if (e) {
      e.preventDefault();
    }
    searchInputRef.current?.focus();
  }, [], { preventDefault: true });

  useKeyboardShortcut('k', () => {
    searchInputRef.current?.focus();
  }, [], { ctrlKey: true, preventDefault: true });

  // Navigation shortcuts: j/k for navigating clients
  useKeyboardShortcut('j', () => {
    if (filteredClients.length > 0) {
      setSelectedClientIndex((prev) => {
        const next = prev < filteredClients.length - 1 ? prev + 1 : prev;
        // Scroll to selected client
        const clientElement = document.querySelector(`[data-client-id="${filteredClients[next]?.id}"]`) as HTMLElement;
        clientElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return next;
      });
    }
  }, [filteredClients], { preventDefault: true });

  useKeyboardShortcut('k', () => {
    if (filteredClients.length > 0) {
      setSelectedClientIndex((prev) => {
        const next = prev > 0 ? prev - 1 : 0;
        // Scroll to selected client
        const clientElement = document.querySelector(`[data-client-id="${filteredClients[next]?.id}"]`) as HTMLElement;
        clientElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return next;
      });
    }
  }, [filteredClients], { preventDefault: true });

  // Enter to open selected client
  useKeyboardShortcut('Enter', () => {
    if (selectedClientIndex >= 0 && selectedClientIndex < filteredClients.length) {
      const client = filteredClients[selectedClientIndex];
      onClientClick?.(client);
    }
  }, [selectedClientIndex, filteredClients, onClientClick], { preventDefault: true });

  // Reset selected index when clients change
  useEffect(() => {
    setSelectedClientIndex(-1);
  }, [filteredClients.length, searchQuery, filterStatus]);

  // Export functions
  const handleExportCSV = useCallback(async () => {
    if (clients.length === 0) {
      toast.error('אין לקוחות לייצוא');
      return;
    }

    try {
      setExporting(true);
      exportClientsToCSV(clients, `clients-${new Date().toISOString().split('T')[0]}`);
      toast.success('הקובץ יוצא בהצלחה');
    } catch (error) {
      logger.error('Error exporting CSV', error, 'ClientsListViewEnhanced');
      toast.error('שגיאה בייצוא CSV');
    } finally {
      setExporting(false);
    }
  }, [clients]);

  const handleExportPDF = useCallback(async () => {
    if (clients.length === 0) {
      toast.error('אין לקוחות לייצוא');
      return;
    }

    try {
      setExporting(true);
      await exportClientsToPDF(clients, 'דוח לקוחות');
      toast.success('הקובץ יוצא בהצלחה');
    } catch (error) {
      logger.error('Error exporting PDF', error, 'ClientsListViewEnhanced');
      toast.error('שגיאה בייצוא PDF');
    } finally {
      setExporting(false);
    }
  }, [clients]);

  const handleLinkTrainee = async (clientId: string, traineeId: string) => {
    if (!user) return;

    try {
      setLinkingClient(clientId);
      
      // Optimistic update - עדכן UI מיד
      setClients(prev => prev.map(client => 
        client.id === clientId 
          ? { ...client, trainee_id: traineeId }
          : client
      ));

      // Use CrmService for proper cache invalidation
      const result = await CrmService.linkTraineeToClient(
        traineeId,
        clientId,
        user.id,
        () => {
          // Additional optimistic update if needed
        }
      );

      if (result.error) {
        // Rollback optimistic update on error
        setClients(prev => prev.map(client => 
          client.id === clientId 
            ? { ...client, trainee_id: undefined }
            : client
        ));
        toast.error(result.error);
        return;
      }

      toast.success('המתאמן קושר בהצלחה');
      
      // Reload data to ensure consistency (cache already invalidated by CrmService)
      await loadData(true, 1);
    } catch (error) {
      // Rollback on exception
      setClients(prev => prev.map(client => 
        client.id === clientId 
          ? { ...client, trainee_id: undefined }
          : client
      ));
      logger.error('Error linking trainee', error, 'ClientsListViewEnhanced');
      toast.error('שגיאה בקישור מתאמן');
    } finally {
      setLinkingClient(null);
    }
  };

  // Use pagination hook for client-side filtering (when no server-side pagination)
  const {
    paginatedData: filteredClients,
    currentPage: filteredPage,
    totalPages: filteredTotalPages,
    hasNextPage: filteredHasNext,
    hasPrevPage: filteredHasPrev,
    nextPage: filteredNextPage,
    prevPage: filteredPrevPage,
    goToPage: filteredGoToPage,
  } = usePagination(
    useMemo(() => {
      return clients.filter(client => {
        const normalizedQuery = searchQuery.toLowerCase().trim();
        const matchesSearch = 
          !normalizedQuery ||
          client.client_name.toLowerCase().includes(normalizedQuery) ||
          client.client_email?.toLowerCase().includes(normalizedQuery) ||
          client.client_phone?.includes(normalizedQuery);

        const matchesFilter =
          filterStatus === 'all' ||
          (filterStatus === 'linked' && client.trainee_id) ||
          (filterStatus === 'unlinked' && !client.trainee_id);

        return matchesSearch && matchesFilter;
      });
    }, [clients, searchQuery, filterStatus]),
    { initialPage: 1, initialPageSize: 50 }
  );

  const stats = useMemo(() => ({
    total: clients.length,
    linked: clients.filter(c => c.trainee_id).length,
    unlinked: clients.filter(c => !c.trainee_id).length,
    totalEvents: clients.reduce((sum, c) => sum + (c.total_events_count || 0), 0),
    upcomingEvents: clients.reduce((sum, c) => sum + (c.upcoming_events_count || 0), 0),
  }), [clients]);

  // Auto-enable virtual scrolling for large lists
  useEffect(() => {
    setUseVirtualScrolling(filteredClients.length > 50);
  }, [filteredClients.length]);


  if (loading) {
    return (
      <div className="premium-card p-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-emerald-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="premium-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Users className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">כרטיסיות לקוחות</h1>
              <p className="text-sm text-zinc-400">ניהול לקוחות מבוסס Google Calendar</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Navigation buttons */}
            {onViewChange && (
              <>
                <button
                  onClick={() => onViewChange('crm-pipeline')}
                  className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-all text-sm flex items-center gap-2"
                >
                  <TrendingUp className="h-4 w-4" />
                  Pipeline
                </button>
                <button
                  onClick={() => onViewChange('crm-dashboard')}
                  className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-all text-sm flex items-center gap-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  Dashboard
                </button>
                <button
                  onClick={() => onViewChange('crm-analytics')}
                  className="px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg transition-all text-sm flex items-center gap-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  אנליטיקה
                </button>
                <button
                  onClick={() => onViewChange('crm-reports')}
                  className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-all text-sm flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  דוחות
                </button>
              </>
            )}
            {/* Real-time status indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/50" role="status" aria-live="polite" aria-label={isConnected ? 'מחובר לעדכונים בזמן אמת' : 'מנותק מעדכונים בזמן אמת'}>
              {isConnected ? (
                <>
                  <Wifi className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                  <span className="text-xs text-emerald-400">מחובר</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-yellow-400" aria-hidden="true" />
                  <span className="text-xs text-yellow-400">מנותק</span>
                </>
              )}
            </div>
            <button
              onClick={loadData}
              className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
              aria-label="רענן"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Quick Navigation Tabs */}
        {onViewChange && (
          <nav className="flex gap-2 mb-6 border-b border-zinc-800" role="tablist" aria-label="ניווט CRM">
            <button
              onClick={() => onViewChange('crm-pipeline')}
              className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white border-b-2 border-transparent hover:border-blue-500 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
              role="tab"
              aria-label="עבור ל-Pipeline"
            >
              Pipeline
            </button>
            <button
              onClick={() => onViewChange('crm-dashboard')}
              className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white border-b-2 border-transparent hover:border-purple-500 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
              role="tab"
              aria-label="עבור ל-Dashboard"
            >
              Dashboard
            </button>
            <button
              onClick={() => onViewChange('crm-analytics')}
              className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white border-b-2 border-transparent hover:border-yellow-500 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
              role="tab"
              aria-label="עבור לאנליטיקה"
            >
              אנליטיקה
            </button>
            <button
              onClick={() => onViewChange('crm-reports')}
              className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white border-b-2 border-transparent hover:border-emerald-500 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
              role="tab"
              aria-label="עבור לדוחות"
            >
              דוחות
            </button>
          </nav>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6" role="region" aria-label="סטטיסטיקות לקוחות">
          <div className="bg-zinc-800/50 rounded-lg p-4 transition-all hover:scale-105" role="status" aria-label={`סה"כ לקוחות: ${stats.total}`}>
            <div className="text-sm text-zinc-400 mb-1">סה"כ לקוחות</div>
            <div className="text-2xl font-bold text-white" aria-live="polite">{stats.total}</div>
          </div>
          <div className="bg-emerald-500/10 rounded-lg p-4 border border-emerald-500/20 transition-all hover:scale-105" role="status" aria-label={`לקוחות מקושרים: ${stats.linked}`}>
            <div className="text-sm text-zinc-400 mb-1">מקושרים</div>
            <div className="text-2xl font-bold text-emerald-400" aria-live="polite">{stats.linked}</div>
          </div>
          <div className="bg-yellow-500/10 rounded-lg p-4 border border-yellow-500/20 transition-all hover:scale-105" role="status" aria-label={`לקוחות לא מקושרים: ${stats.unlinked}`}>
            <div className="text-sm text-zinc-400 mb-1">לא מקושרים</div>
            <div className="text-2xl font-bold text-yellow-400" aria-live="polite">{stats.unlinked}</div>
          </div>
          <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20 transition-all hover:scale-105" role="status" aria-label={`סה"כ אירועים: ${stats.totalEvents}`}>
            <div className="text-sm text-zinc-400 mb-1">סה"כ אירועים</div>
            <div className="text-2xl font-bold text-blue-400" aria-live="polite">{stats.totalEvents}</div>
          </div>
          <div className="bg-purple-500/10 rounded-lg p-4 border border-purple-500/20 transition-all hover:scale-105" role="status" aria-label={`אירועים קרובים: ${stats.upcomingEvents}`}>
            <div className="text-sm text-zinc-400 mb-1">אירועים קרובים</div>
            <div className="text-2xl font-bold text-purple-400" aria-live="polite">{stats.upcomingEvents}</div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <label htmlFor="client-search-input" className="sr-only">
              חיפוש לקוח
            </label>
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 pointer-events-none" aria-hidden="true" />
            <input
              id="client-search-input"
              ref={searchInputRef}
              type="search"
              placeholder="חפש לקוח לפי שם, אימייל או טלפון..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              aria-label="חיפוש לקוח לפי שם, אימייל או טלפון"
              aria-describedby="search-help"
            />
            <span id="search-help" className="sr-only">
              לחץ / או Ctrl+K לחיפוש מהיר. לחץ J/K לניווט בין לקוחות, Enter לפתיחה
            </span>
          </div>
          <div className="flex gap-2" role="group" aria-label="פילטר לקוחות">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
                filterStatus === 'all'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-zinc-800/50 text-zinc-400 hover:text-white'
              }`}
              aria-label="הצג את כל הלקוחות"
              aria-pressed={filterStatus === 'all'}
            >
              הכל
            </button>
            <button
              onClick={() => setFilterStatus('linked')}
              className={`px-4 py-2 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
                filterStatus === 'linked'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-zinc-800/50 text-zinc-400 hover:text-white'
              }`}
              aria-label="הצג לקוחות מקושרים"
              aria-pressed={filterStatus === 'linked'}
            >
              מקושרים
            </button>
            <button
              onClick={() => setFilterStatus('unlinked')}
              className={`px-4 py-2 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
                filterStatus === 'unlinked'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-zinc-800/50 text-zinc-400 hover:text-white'
              }`}
              aria-label="הצג לקוחות לא מקושרים"
              aria-pressed={filterStatus === 'unlinked'}
            >
              לא מקושרים
            </button>
          </div>
          {/* Export buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleExportCSV}
              disabled={exporting || clients.length === 0}
              className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              aria-label="ייצא CSV"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">CSV</span>
            </button>
            <button
              onClick={handleExportPDF}
              disabled={exporting || clients.length === 0}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              aria-label="ייצא PDF"
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="premium-card p-4 bg-zinc-800/30 border border-zinc-700/50">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Keyboard className="h-4 w-4" />
          <span>קיצורי מקלדת: R - רענון, / או Ctrl+K - חיפוש, J/K - ניווט, Enter - פתיחה</span>
        </div>
      </div>

      {/* Clients Grid/List */}
      {filteredClients.length === 0 ? (
        <div className="premium-card p-12 text-center">
          <Users className="h-16 w-16 mx-auto mb-4 text-zinc-500" aria-hidden="true" />
          <h3 className="text-lg font-semibold text-white mb-2">
            {clients.length === 0 ? 'אין כרטיסיות לקוחות' : 'לא נמצאו תוצאות'}
          </h3>
          <p className="text-zinc-400 mb-6">
            {clients.length === 0
              ? 'לאחר סנכרון עם Google Calendar, כרטיסיות הלקוחות יופיעו כאן'
              : 'נסה לשנות את החיפוש או הסינון'}
          </p>
          {clients.length === 0 && (
            <button
              onClick={loadData}
              className="btn-primary inline-flex items-center gap-2"
              aria-label="רענן רשימת לקוחות"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              רענן
            </button>
          )}
        </div>
      ) : useVirtualScrolling ? (
        <div className="premium-card p-6">
          <VirtualList
            items={filteredClients}
            itemHeight={200}
            containerHeight={600}
            renderItem={(client, index) => (
              <Suspense fallback={
                <div className="premium-card p-6 animate-pulse">
                  <div className="h-4 bg-zinc-700 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-zinc-700 rounded w-1/2"></div>
                </div>
              }>
                <ClientCard
                  key={client.id}
                  client={client}
                  trainees={trainees}
                  onLinkTrainee={(traineeId) => handleLinkTrainee(client.id, traineeId)}
                  onClick={() => onClientClick?.(client)}
                  isLinking={linkingClient === client.id}
                />
              </Suspense>
            )}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Suspense fallback={
            <div className="premium-card p-6 animate-pulse">
              <div className="h-4 bg-zinc-700 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-zinc-700 rounded w-1/2"></div>
            </div>
          }>
            {filteredClients.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                trainees={trainees}
                onLinkTrainee={(traineeId) => handleLinkTrainee(client.id, traineeId)}
                onClick={() => onClientClick?.(client)}
                isLinking={linkingClient === client.id}
              />
            ))}
          </Suspense>
        </div>
      )}

      {/* Pagination Controls */}
      {(paginationInfo || filteredTotalPages > 1) && (
        <div className="premium-card p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="text-sm text-zinc-400">
              {paginationInfo ? (
                <>
                  מציג {((paginationInfo.page - 1) * paginationInfo.pageSize) + 1}-
                  {Math.min(paginationInfo.page * paginationInfo.pageSize, paginationInfo.total)} מתוך {paginationInfo.total}
                </>
              ) : (
                <>
                  מציג {((filteredPage - 1) * 50) + 1}-{Math.min(filteredPage * 50, filteredClients.length)} מתוך {filteredClients.length}
                </>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {/* Server-side pagination (when paginationInfo exists) */}
              {paginationInfo ? (
                <>
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={!paginationInfo.hasPrevPage || loading}
                    className="px-3 py-2 bg-zinc-800/50 hover:bg-zinc-700 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    aria-label="עמוד קודם"
                  >
                    <ChevronRight className="h-4 w-4" />
                    <span className="hidden sm:inline">קודם</span>
                  </button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, paginationInfo.totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (paginationInfo.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (paginationInfo.page <= 3) {
                        pageNum = i + 1;
                      } else if (paginationInfo.page >= paginationInfo.totalPages - 2) {
                        pageNum = paginationInfo.totalPages - 4 + i;
                      } else {
                        pageNum = paginationInfo.page - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          disabled={loading}
                          className={`px-3 py-2 rounded-lg transition-all ${
                            paginationInfo.page === pageNum
                              ? 'bg-emerald-500 text-white'
                              : 'bg-zinc-800/50 hover:bg-zinc-700 text-zinc-400'
                          }`}
                          aria-label={`עמוד ${pageNum}`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(paginationInfo.totalPages, currentPage + 1))}
                    disabled={!paginationInfo.hasNextPage || loading}
                    className="px-3 py-2 bg-zinc-800/50 hover:bg-zinc-700 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    aria-label="עמוד הבא"
                  >
                    <span className="hidden sm:inline">הבא</span>
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                </>
              ) : (
                /* Client-side pagination (when filtering locally) */
                <>
                  <button
                    onClick={filteredPrevPage}
                    disabled={!filteredHasPrev}
                    className="px-3 py-2 bg-zinc-800/50 hover:bg-zinc-700 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    aria-label="עמוד קודם"
                  >
                    <ChevronRight className="h-4 w-4" />
                    <span className="hidden sm:inline">קודם</span>
                  </button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, filteredTotalPages) }, (_, i) => {
                      let pageNum: number;
                      if (filteredTotalPages <= 5) {
                        pageNum = i + 1;
                      } else if (filteredPage <= 3) {
                        pageNum = i + 1;
                      } else if (filteredPage >= filteredTotalPages - 2) {
                        pageNum = filteredTotalPages - 4 + i;
                      } else {
                        pageNum = filteredPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => filteredGoToPage(pageNum)}
                          className={`px-3 py-2 rounded-lg transition-all ${
                            filteredPage === pageNum
                              ? 'bg-emerald-500 text-white'
                              : 'bg-zinc-800/50 hover:bg-zinc-700 text-zinc-400'
                          }`}
                          aria-label={`עמוד ${pageNum}`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={filteredNextPage}
                    disabled={!filteredHasNext}
                    className="px-3 py-2 bg-zinc-800/50 hover:bg-zinc-700 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    aria-label="עמוד הבא"
                  >
                    <span className="hidden sm:inline">הבא</span>
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
