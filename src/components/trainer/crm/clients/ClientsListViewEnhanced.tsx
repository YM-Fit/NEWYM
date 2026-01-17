/**
 * Enhanced Clients List View with Real-time updates, Virtual Scrolling, and Export
 */

import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { Users, RefreshCw, Search, Keyboard, Download, FileText, Wifi, WifiOff, TrendingUp, BarChart3, CheckSquare, Square } from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';
import { useCrm } from '../../../../contexts/CrmContext';
import { CrmService } from '../../../../services/crmService';
import { linkTraineeToCalendarClient, type CalendarClient } from '../../../../api/crmClientsApi';
import { getTrainees } from '../../../../api/traineeApi';
import { useCrmRealtime } from '../../../../hooks/useCrmRealtime';
import { useCrmEvents } from '../../../../hooks/useCrmEvents';
import { useKeyboardShortcut } from '../../../../hooks/useKeyboardShortcut';
import { usePagination } from '../../../../hooks/usePagination';
import { Pagination } from '../../../ui/Pagination';
import { exportClientsToCSV, exportClientsToPDF } from '../../../../utils/exportUtils';
import BulkActionsPanel from './BulkActionsPanel';
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
  const { clients: contextClients, loadClients, loading: contextLoading } = useCrm();
  const [clients, setClients] = useState<CalendarClient[]>([]);
  const [trainees, setTrainees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'linked' | 'unlinked'>('all');
  const [linkingClient, setLinkingClient] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [useVirtualScrolling, setUseVirtualScrolling] = useState(false);
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Sync with context clients
  useEffect(() => {
    if (contextClients.length > 0) {
      setClients(contextClients);
    }
  }, [contextClients]);

  // Use CRM events for automatic updates
  useCrmEvents({
    onClientsReloaded: (updatedClients) => {
      setClients(updatedClients);
    },
    onClientUpdated: (updatedClient) => {
      setClients((prev) =>
        prev.map((c) => (c.id === updatedClient.id ? updatedClient : c))
      );
    },
    onClientCreated: (newClient) => {
      setClients((prev) => [newClient, ...prev]);
    },
    onClientDeleted: (clientId) => {
      setClients((prev) => prev.filter((c) => c.id !== clientId));
    },
  });

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

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Use context loadClients for better state management
      await loadClients(true);
      
      const traineesResult = await getTrainees(user.id);

      if (traineesResult.success && traineesResult.data) {
        setTrainees(traineesResult.data);
      }
    } catch (error) {
      logger.error('Error loading clients', error, 'ClientsListViewEnhanced');
      toast.error('שגיאה בטעינת כרטיסיות לקוחות');
    } finally {
      setLoading(false);
    }
  }, [user, loadClients]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  // Keyboard shortcuts
  useKeyboardShortcut('r', () => {
    if (!loading) {
      loadData();
    }
  }, [loadData, loading]);

  // Focus search input with / or Ctrl+K / Cmd+K
  useKeyboardShortcut('/', (e) => {
    if (e) {
      e.preventDefault();
    }
    const searchInput = document.getElementById('client-search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
    }
  }, [], { preventDefault: true });

  useKeyboardShortcut('k', () => {
    const searchInput = document.getElementById('client-search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
    }
  }, [], { ctrlKey: true, preventDefault: true });

  // New client with Ctrl+N / Cmd+N
  useKeyboardShortcut('n', () => {
    // TODO: Open add client form
    // For now, just show a toast message
    toast('פתיחת טופס הוספת לקוח', { icon: '➕' });
  }, [], { ctrlKey: true, preventDefault: true });

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

  // Bulk selection handlers
  const handleToggleSelect = useCallback((clientId: string) => {
    setSelectedClients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clientId)) {
        newSet.delete(clientId);
      } else {
        newSet.add(clientId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedClients.size === filteredClients.length) {
      setSelectedClients(new Set());
    } else {
      setSelectedClients(new Set(filteredClients.map(c => c.id)));
    }
  }, [filteredClients, selectedClients]);

  const handleBulkActionsSuccess = useCallback(() => {
    setSelectedClients(new Set());
    setShowBulkActions(false);
    loadData();
  }, [loadData]);

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
      await loadData();
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

  const filteredClients = useMemo(() => {
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
  }, [clients, searchQuery, filterStatus]);

  // Pagination hook
  const pagination = usePagination(filteredClients, { 
    initialPage: 1, 
    initialPageSize: 20 
  });

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
                  className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-all text-sm flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
                  aria-label="עבור ל-Pipeline"
                >
                  <TrendingUp className="h-4 w-4" aria-hidden="true" />
                  Pipeline
                </button>
                <button
                  onClick={() => onViewChange('crm-dashboard')}
                  className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-all text-sm flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
                  aria-label="עבור ל-Dashboard"
                >
                  <BarChart3 className="h-4 w-4" aria-hidden="true" />
                  Dashboard
                </button>
                <button
                  onClick={() => onViewChange('crm-analytics')}
                  className="px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg transition-all text-sm flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
                  aria-label="עבור לאנליטיקה"
                >
                  <BarChart3 className="h-4 w-4" aria-hidden="true" />
                  אנליטיקה
                </button>
                <button
                  onClick={() => onViewChange('crm-reports')}
                  className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-all text-sm flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
                  aria-label="עבור לדוחות"
                >
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  דוחות
                </button>
              </>
            )}
            {/* Real-time status indicator */}
            <div 
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/50"
              role="status"
              aria-live="polite"
              aria-label={isConnected ? "מחובר לעדכונים בזמן אמת" : "מנותק מעדכונים בזמן אמת"}
            >
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
              className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
              aria-label="רענן רשימת לקוחות"
              disabled={loading}
              aria-busy={loading}
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Quick Navigation Tabs */}
        {onViewChange && (
          <nav className="flex gap-2 mb-6 border-b border-zinc-800" role="navigation" aria-label="ניווט מהיר CRM">
            <button
              onClick={() => onViewChange('crm-pipeline')}
              className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white border-b-2 border-transparent hover:border-blue-500 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
              aria-label="עבור ל-Pipeline"
            >
              Pipeline
            </button>
            <button
              onClick={() => onViewChange('crm-dashboard')}
              className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white border-b-2 border-transparent hover:border-purple-500 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
              aria-label="עבור ל-Dashboard"
            >
              Dashboard
            </button>
            <button
              onClick={() => onViewChange('crm-analytics')}
              className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white border-b-2 border-transparent hover:border-yellow-500 transition-all focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
              aria-label="עבור לאנליטיקה"
            >
              אנליטיקה
            </button>
            <button
              onClick={() => onViewChange('crm-reports')}
              className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white border-b-2 border-transparent hover:border-emerald-500 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
              aria-label="עבור לדוחות"
            >
              דוחות
            </button>
          </nav>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-zinc-800/50 rounded-lg p-4 transition-all hover:scale-105">
            <div className="text-sm text-zinc-400 mb-1">סה"כ לקוחות</div>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
          </div>
          <div className="bg-emerald-500/10 rounded-lg p-4 border border-emerald-500/20 transition-all hover:scale-105">
            <div className="text-sm text-zinc-400 mb-1">מקושרים</div>
            <div className="text-2xl font-bold text-emerald-400">{stats.linked}</div>
          </div>
          <div className="bg-yellow-500/10 rounded-lg p-4 border border-yellow-500/20 transition-all hover:scale-105">
            <div className="text-sm text-zinc-400 mb-1">לא מקושרים</div>
            <div className="text-2xl font-bold text-yellow-400">{stats.unlinked}</div>
          </div>
          <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20 transition-all hover:scale-105">
            <div className="text-sm text-zinc-400 mb-1">סה"כ אירועים</div>
            <div className="text-2xl font-bold text-blue-400">{stats.totalEvents}</div>
          </div>
          <div className="bg-purple-500/10 rounded-lg p-4 border border-purple-500/20 transition-all hover:scale-105">
            <div className="text-sm text-zinc-400 mb-1">אירועים קרובים</div>
            <div className="text-2xl font-bold text-purple-400">{stats.upcomingEvents}</div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Select All Checkbox */}
          {filteredClients.length > 0 && (
            <button
              onClick={handleSelectAll}
              className="px-3 py-2 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-all flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              aria-label={selectedClients.size === filteredClients.length ? 'בטל בחירה' : 'בחר הכל'}
            >
              {selectedClients.size === filteredClients.length ? (
                <CheckSquare className="h-5 w-5 text-emerald-400" />
              ) : (
                <Square className="h-5 w-5" />
              )}
              <span className="hidden sm:inline">בחר הכל</span>
            </button>
          )}
          {/* Bulk Actions Button */}
          {selectedClients.size > 0 && (
            <button
              onClick={() => setShowBulkActions(true)}
              className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-all flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <CheckSquare className="h-4 w-4" />
              פעולות מרובות ({selectedClients.size})
            </button>
          )}
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
            <label htmlFor="client-search-input" className="sr-only">
              חיפוש לקוח
            </label>
            <input
              id="client-search-input"
              type="search"
              placeholder="חפש לקוח לפי שם, אימייל או טלפון..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              aria-label="חיפוש לקוח לפי שם, אימייל או טלפון"
              aria-describedby="client-search-description"
            />
            <span id="client-search-description" className="sr-only">
              לחץ / לחיפוש מהיר או הקלד לחיפוש
            </span>
          </div>
          <div className="flex gap-2" role="group" aria-label="סינון לקוחות">
            <button
              onClick={() => setFilterStatus('all')}
              aria-pressed={filterStatus === 'all'}
              aria-label="הצג את כל הלקוחות"
              className={`px-4 py-2 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
                filterStatus === 'all'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-zinc-800/50 text-zinc-400 hover:text-white'
              }`}
            >
              הכל
            </button>
            <button
              onClick={() => setFilterStatus('linked')}
              aria-pressed={filterStatus === 'linked'}
              aria-label="הצג לקוחות מקושרים"
              className={`px-4 py-2 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
                filterStatus === 'linked'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-zinc-800/50 text-zinc-400 hover:text-white'
              }`}
            >
              מקושרים
            </button>
            <button
              onClick={() => setFilterStatus('unlinked')}
              aria-pressed={filterStatus === 'unlinked'}
              aria-label="הצג לקוחות לא מקושרים"
              className={`px-4 py-2 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
                filterStatus === 'unlinked'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-zinc-800/50 text-zinc-400 hover:text-white'
              }`}
            >
              לא מקושרים
            </button>
          </div>
          {/* Export buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleExportCSV}
              disabled={exporting || clients.length === 0}
              className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
              aria-label="ייצא רשימת לקוחות ל-CSV"
              aria-busy={exporting}
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">CSV</span>
            </button>
            <button
              onClick={handleExportPDF}
              disabled={exporting || clients.length === 0}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
              aria-label="ייצא רשימת לקוחות ל-PDF"
              aria-busy={exporting}
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="premium-card p-4 bg-zinc-800/30 border border-zinc-700/50">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Keyboard className="h-4 w-4" />
          <span>קיצורי מקלדת: R - רענון, / - חיפוש</span>
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
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Suspense fallback={
              <div className="premium-card p-6 animate-pulse">
                <div className="h-4 bg-zinc-700 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-zinc-700 rounded w-1/2"></div>
              </div>
            }>
              {pagination.paginatedData.map((client) => (
                <ClientCard
                  key={client.id}
                  client={client}
                  trainees={trainees}
                  onLinkTrainee={(traineeId) => handleLinkTrainee(client.id, traineeId)}
                  onClick={() => onClientClick?.(client)}
                  isLinking={linkingClient === client.id}
                  isSelected={selectedClients.has(client.id)}
                  onToggleSelect={() => handleToggleSelect(client.id)}
                />
              ))}
            </Suspense>
          </div>
          
          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="premium-card p-4">
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                totalItems={pagination.totalItems}
                startIndex={pagination.startIndex}
                endIndex={pagination.endIndex}
                hasNextPage={pagination.hasNextPage}
                hasPrevPage={pagination.hasPrevPage}
                onNextPage={pagination.nextPage}
                onPrevPage={pagination.prevPage}
                onGoToPage={pagination.goToPage}
                showItemCount={true}
              />
            </div>
          )}
        </>
      )}

      {/* Bulk Actions Panel */}
      {showBulkActions && selectedClients.size > 0 && (
        <BulkActionsPanel
          selectedClients={Array.from(selectedClients)}
          clients={clients}
          onClose={() => setShowBulkActions(false)}
          onSuccess={handleBulkActionsSuccess}
        />
      )}
    </div>
  );
}
