/**
 * Enhanced Clients List View with Real-time updates, Virtual Scrolling, and Export
 */

import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { Users, RefreshCw, Search, Keyboard, Download, FileText, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { CrmService } from '../../../services/crmService';
import { linkTraineeToCalendarClient, type CalendarClient } from '../../../api/crmClientsApi';
import { getTrainees } from '../../../api/traineeApi';
import { useCrmRealtime } from '../../../hooks/useCrmRealtime';
import { useKeyboardShortcut } from '../../../hooks/useKeyboardShortcut';
import { exportClientsToCSV, exportClientsToPDF } from '../../../utils/exportUtils';
import VirtualList from '../../common/VirtualList';
import toast from 'react-hot-toast';
import { logger } from '../../../utils/logger';

// Lazy load ClientCard for better performance
const ClientCard = lazy(() => import('./ClientCard'));

interface ClientsListViewEnhancedProps {
  onClientClick?: (client: CalendarClient) => void;
}

export default function ClientsListViewEnhanced({ onClientClick }: ClientsListViewEnhancedProps) {
  const { user } = useAuth();
  const [clients, setClients] = useState<CalendarClient[]>([]);
  const [trainees, setTrainees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'linked' | 'unlinked'>('all');
  const [linkingClient, setLinkingClient] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [useVirtualScrolling, setUseVirtualScrolling] = useState(false);

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
      
      const [clientsResult, traineesResult] = await Promise.all([
        CrmService.getClients(user.id, true),
        getTrainees(user.id)
      ]);

      if (clientsResult.success && clientsResult.data) {
        setClients(clientsResult.data);
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
    }
  }, [user]);

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

  useKeyboardShortcut('/', (e) => {
    if (e) {
      e.preventDefault();
    }
    const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
    }
  }, [], { preventDefault: true });

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
            {/* Real-time status indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/50">
              {isConnected ? (
                <>
                  <Wifi className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs text-emerald-400">מחובר</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-yellow-400" />
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
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
            <input
              type="text"
              placeholder="חפש לקוח לפי שם, אימייל או טלפון..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              aria-label="חיפוש לקוח"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg transition-all ${
                filterStatus === 'all'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-zinc-800/50 text-zinc-400 hover:text-white'
              }`}
            >
              הכל
            </button>
            <button
              onClick={() => setFilterStatus('linked')}
              className={`px-4 py-2 rounded-lg transition-all ${
                filterStatus === 'linked'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-zinc-800/50 text-zinc-400 hover:text-white'
              }`}
            >
              מקושרים
            </button>
            <button
              onClick={() => setFilterStatus('unlinked')}
              className={`px-4 py-2 rounded-lg transition-all ${
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
    </div>
  );
}
