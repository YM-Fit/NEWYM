import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Plus, ExternalLink, RefreshCw } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { getGoogleCalendarEvents } from '../../../api/googleCalendarApi';
import { getGoogleCalendarStatus } from '../../../api/googleCalendarApi';
import GoogleCalendarSettings from '../Settings/GoogleCalendarSettings';
import toast from 'react-hot-toast';
import { logger } from '../../../utils/logger';

interface CalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  description?: string;
  location?: string;
}

interface CalendarViewProps {
  onEventClick?: (event: CalendarEvent) => void;
  onCreateWorkout?: () => void;
}

// Optimized refresh interval - longer to reduce API calls
const REFRESH_INTERVAL_MS = 120000; // 2 minutes instead of 30 seconds
const CACHE_DURATION_MS = 60000; // Cache events for 1 minute

export default function CalendarView({ onEventClick, onCreateWorkout }: CalendarViewProps) {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshRef = useRef<Date | null>(null);
  const eventsCacheRef = useRef<{ events: CalendarEvent[]; timestamp: number; dateKey: string } | null>(null);

  const checkConnection = useCallback(async () => {
    if (!user) return;
    try {
      const result = await getGoogleCalendarStatus(user.id);
      if (result.success && result.data) {
        setConnected(result.data.connected);
      }
    } catch (error) {
      logger.error('Error checking Google Calendar connection', error, 'CalendarView');
    }
  }, [user]);

  // Memoize date range calculation
  const dateRange = useMemo(() => {
    const start = new Date(currentDate);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const end = new Date(currentDate);
    end.setMonth(end.getMonth() + 1);
    end.setDate(0);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }, [currentDate]);

  // Generate cache key for current month
  const cacheKey = useMemo(() => {
    return `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
  }, [currentDate]);

  const loadEvents = useCallback(async (silent: boolean = false, forceRefresh: boolean = false) => {
    if (!user || !connected) {
      setLoading(false);
      return;
    }

    // Check cache first (unless forcing refresh)
    if (!forceRefresh && eventsCacheRef.current) {
      const { events: cachedEvents, timestamp, dateKey } = eventsCacheRef.current;
      const cacheAge = Date.now() - timestamp;
      
      if (dateKey === cacheKey && cacheAge < CACHE_DURATION_MS) {
        setEvents(cachedEvents);
        setLoading(false);
        setIsRefreshing(false);
        return;
      }
    }

    try {
      if (!silent) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }

      // Use cached data from sync table first, only fallback to Google API if needed
      const result = await getGoogleCalendarEvents(
        user.id, 
        dateRange,
        { useCache: true, forceRefresh }
      );
      
      if (result.success && result.data) {
        setEvents(result.data);
        // Update cache
        eventsCacheRef.current = {
          events: result.data,
          timestamp: Date.now(),
          dateKey: cacheKey,
        };
        lastRefreshRef.current = new Date();
        if (silent) {
          logger.info('Calendar events refreshed automatically', { eventCount: result.data.length }, 'CalendarView');
        }
      } else if (result.error && !silent) {
        toast.error(result.error);
      }
    } catch (error) {
      logger.error('Error loading calendar events', error, 'CalendarView');
      if (!silent) {
        toast.error('שגיאה בטעינת אירועים מה-Calendar');
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [user, connected, dateRange, cacheKey]);

  const handleManualRefresh = useCallback(async () => {
    await loadEvents(false, true); // Force refresh on manual
    toast.success('יומן עודכן');
  }, [loadEvents]);

  // Check connection when user changes
  useEffect(() => {
    if (user) {
      checkConnection();
    }
  }, [user, checkConnection]);

  // Load events when connection is established or date changes
  useEffect(() => {
    if (user && connected) {
      loadEvents();
    }
  }, [user, connected, currentDate, loadEvents]);

  // Set up automatic refresh interval
  useEffect(() => {
    if (connected && user) {
      // Clear existing interval if any
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }

      // Set up new interval
      refreshIntervalRef.current = setInterval(() => {
        if (!loading && !isRefreshing) {
          loadEvents(true); // Silent refresh
        }
      }, REFRESH_INTERVAL_MS);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
          refreshIntervalRef.current = null;
        }
      };
    }
  }, [connected, user, loading, isRefreshing, loadEvents]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  // Memoize days calculation
  const days = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const daysArray = [];
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      daysArray.push(null);
    }
    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
      daysArray.push(day);
    }
    return daysArray;
  }, [currentDate]);

  // Memoize events by day for better performance
  const eventsByDay = useMemo(() => {
    const eventsMap = new Map<string, CalendarEvent[]>();
    
    events.forEach(event => {
      const eventDate = new Date(event.start.dateTime || event.start.date || '');
      if (isNaN(eventDate.getTime())) return;
      
      const dateKey = eventDate.toDateString();
      if (!eventsMap.has(dateKey)) {
        eventsMap.set(dateKey, []);
      }
      eventsMap.get(dateKey)!.push(event);
    });
    
    return eventsMap;
  }, [events]);

  const getEventsForDay = useCallback((day: number) => {
    if (!day) return [];
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return eventsByDay.get(date.toDateString()) || [];
  }, [currentDate, eventsByDay]);

  const formatMonthYear = useMemo(() => {
    return currentDate.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
  }, [currentDate]);

  if (showSettings) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setShowSettings(false)}
          className="text-emerald-400 hover:text-emerald-300 flex items-center gap-2"
        >
          <ChevronRight className="h-4 w-4" />
          חזרה ליומן
        </button>
        <GoogleCalendarSettings onClose={() => setShowSettings(false)} />
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="premium-card p-8 text-center space-y-6">
        <div className="mx-auto w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center">
          <Calendar className="h-10 w-10 text-zinc-500" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white mb-2">
            Google Calendar לא מחובר
          </h3>
          <p className="text-zinc-400 mb-6">
            חבר את Google Calendar כדי לראות את האירועים שלך
          </p>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="btn-primary mx-auto"
        >
          הגדר Google Calendar
        </button>
      </div>
    );
  }

  const weekDays = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="premium-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-all"
            >
              <ChevronRight className="h-5 w-5 text-zinc-400" />
            </button>
            <h2 className="text-xl font-bold text-white">
              {formatMonthYear}
            </h2>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-all"
            >
              <ChevronLeft className="h-5 w-5 text-zinc-400" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleManualRefresh}
              disabled={loading || isRefreshing}
              className="px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title="רענון יומן"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              רענון
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-all"
            >
              הגדרות
            </button>
            {onCreateWorkout && (
              <button
                onClick={onCreateWorkout}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                אימון חדש
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="premium-card p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-400"></div>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {/* Week days header */}
            {weekDays.map((day, index) => (
              <div
                key={index}
                className="text-center text-sm font-semibold text-zinc-400 py-2"
              >
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {days.map((day, index) => {
              const dayEvents = day ? getEventsForDay(day) : [];
              const isToday =
                day &&
                new Date().toDateString() ===
                  new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth(),
                    day
                  ).toDateString();

              return (
                <div
                  key={`day-${currentDate.getFullYear()}-${currentDate.getMonth()}-${day !== null ? day : `empty-${index}`}`}
                  className={`min-h-[100px] p-2 border border-zinc-800 rounded-lg ${
                    day
                      ? isToday
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : 'bg-zinc-800/30'
                      : 'bg-transparent border-transparent'
                  }`}
                >
                  {day && (
                    <>
                      <div
                        className={`text-sm font-semibold mb-2 ${
                          isToday ? 'text-emerald-400' : 'text-zinc-300'
                        }`}
                      >
                        {day}
                      </div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map((event) => (
                          <div
                            key={event.id}
                            onClick={() => onEventClick?.(event)}
                            className="text-xs bg-emerald-500/20 text-emerald-300 p-1.5 rounded cursor-pointer hover:bg-emerald-500/30 transition-all truncate"
                            title={`${event.summary}${event.start.dateTime ? ` - ${new Date(event.start.dateTime).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}` : ''}`}
                          >
                            {event.summary}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-400" title={`${dayEvents.length - 3} אירועים נוספים`}>
                            +{dayEvents.length - 3} נוספים
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
