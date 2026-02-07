/**
 * CalendarSyncHistory - Displays synced calendar events for a trainee
 */

import { useState, useEffect, useMemo } from 'react';
import { Calendar, Clock, ChevronDown, ChevronUp, RefreshCw, CalendarDays } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { logger } from '../../../utils/logger';

interface SyncedEvent {
  id: string;
  google_event_id: string;
  event_summary: string | null;
  event_start_time: string;
  event_end_time: string | null;
  sync_status: string;
  last_synced_at: string | null;
}

interface CalendarSyncHistoryProps {
  traineeId: string;
  trainerId: string;
}

export default function CalendarSyncHistory({ traineeId, trainerId }: CalendarSyncHistoryProps) {
  const [events, setEvents] = useState<SyncedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  useEffect(() => {
    loadSyncedEvents();
  }, [traineeId, trainerId]);

  const loadSyncedEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('google_calendar_sync')
        .select('id, google_event_id, event_summary, event_start_time, event_end_time, sync_status, last_synced_at')
        .eq('trainer_id', trainerId)
        .eq('trainee_id', traineeId)
        .order('event_start_time', { ascending: false });

      if (error) {
        logger.error('Error loading synced events', error, 'CalendarSyncHistory');
        return;
      }

      setEvents(data || []);
    } catch (err) {
      logger.error('Error in loadSyncedEvents', err, 'CalendarSyncHistory');
    } finally {
      setLoading(false);
    }
  };

  // Group events by month
  const eventsByMonth = useMemo(() => {
    const groups = new Map<string, SyncedEvent[]>();
    
    events.forEach(event => {
      const date = new Date(event.event_start_time);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!groups.has(monthKey)) {
        groups.set(monthKey, []);
      }
      groups.get(monthKey)!.push(event);
    });
    
    return groups;
  }, [events]);

  // Available months for filter
  const availableMonths = useMemo(() => {
    return Array.from(eventsByMonth.keys()).sort((a, b) => b.localeCompare(a));
  }, [eventsByMonth]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    if (selectedMonth === 'all') {
      return events;
    }
    return eventsByMonth.get(selectedMonth) || [];
  }, [events, selectedMonth, eventsByMonth]);

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const thisMonthEvents = eventsByMonth.get(currentMonth) || [];
    
    const upcomingEvents = events.filter(e => new Date(e.event_start_time) > now);
    const pastEvents = events.filter(e => new Date(e.event_start_time) <= now);
    
    return {
      total: events.length,
      thisMonth: thisMonthEvents.length,
      upcoming: upcomingEvents.length,
      past: pastEvents.length
    };
  }, [events, eventsByMonth]);

  // Format date for display
  const formatEventDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      date: date.toLocaleDateString('he-IL', { 
        weekday: 'short', 
        day: 'numeric', 
        month: 'short' 
      }),
      time: date.toLocaleTimeString('he-IL', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      isPast: date < new Date()
    };
  };

  // Format month for display
  const formatMonth = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="premium-card-static p-6 mt-6">
        <div className="flex items-center gap-3 mb-4">
          <CalendarDays className="h-5 w-5 text-amber-400" />
          <h3 className="text-lg font-semibold text-foreground">סנכרון אימונים (היסטוריית אימונים)</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 text-amber-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="premium-card-static mt-6 overflow-hidden border border-amber-500/20">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-6 hover:bg-surface800/30 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 rounded-lg">
            <CalendarDays className="h-5 w-5 text-amber-400" />
          </div>
          <div className="text-right">
            <h3 className="text-lg font-semibold text-foreground">סנכרון אימונים (היסטוריית אימונים)</h3>
            <p className="text-sm text-muted400">
              {stats.total} פגישות מסונכרנות • {stats.upcoming} קרובות
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-muted400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted400" />
        )}
      </button>

      {expanded && (
        <div className="px-6 pb-6">
          {events.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-xl bg-surface800/50 flex items-center justify-center mx-auto mb-4">
                <CalendarDays className="h-8 w-8 text-muted600" />
              </div>
              <p className="text-muted500 mb-2">אין אירועים מסונכרנים</p>
              <p className="text-xs text-muted600">סנכרן אירועים מהיומן בדף היומן</p>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-amber-400">{stats.total}</div>
                  <div className="text-xs text-amber-300">סה״כ</div>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-emerald-400">{stats.upcoming}</div>
                  <div className="text-xs text-emerald-300">קרובות</div>
                </div>
                <div className="bg-surface500/10 border border-border500/30 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-muted400">{stats.past}</div>
                  <div className="text-xs text-muted300">עבר</div>
                </div>
              </div>

              {/* Month Filter */}
              <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
                <button
                  onClick={() => setSelectedMonth('all')}
                  className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-all ${
                    selectedMonth === 'all'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-surface800/50 text-muted400 hover:bg-surface800 border border-border700/30'
                  }`}
                >
                  הכל ({stats.total})
                </button>
                {availableMonths.slice(0, 6).map(month => (
                  <button
                    key={month}
                    onClick={() => setSelectedMonth(month)}
                    className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-all ${
                      selectedMonth === month
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-surface800/50 text-muted400 hover:bg-surface800 border border-border700/30'
                    }`}
                  >
                    {formatMonth(month)} ({eventsByMonth.get(month)?.length || 0})
                  </button>
                ))}
              </div>

              {/* Events List */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {filteredEvents.map((event, index) => {
                  const { date, time, isPast } = formatEventDate(event.event_start_time);
                  
                  return (
                    <div
                      key={event.id}
                      className={`flex items-center justify-between p-3 rounded-xl transition-all animate-fade-in ${
                        isPast
                          ? 'bg-surface800/30 border border-border700/30'
                          : 'bg-amber-500/10 border border-amber-500/20'
                      }`}
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          isPast ? 'bg-surface700/50' : 'bg-amber-500/20'
                        }`}>
                          <Calendar className={`h-4 w-4 ${
                            isPast ? 'text-muted500' : 'text-amber-400'
                          }`} />
                        </div>
                        <div>
                          <p className={`font-medium ${isPast ? 'text-muted400' : 'text-foreground'}`}>
                            {event.event_summary || 'אימון'}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted500">
                            <span>{date}</span>
                            <Clock className="h-3 w-3" />
                            <span>{time}</span>
                          </div>
                        </div>
                      </div>
                      <div className={`text-xs px-2 py-1 rounded ${
                        isPast
                          ? 'bg-surface700/50 text-muted500'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {isPast ? 'הסתיים' : 'קרוב'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
