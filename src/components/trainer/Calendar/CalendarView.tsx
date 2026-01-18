import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { 
  getGoogleCalendarEvents, 
  getGoogleCalendarStatus,
  updateCalendarEventBidirectional,
  deleteCalendarEventBidirectional
} from '../../../api/googleCalendarApi';
import { supabase } from '../../../lib/supabase';
import GoogleCalendarSettings from '../Settings/GoogleCalendarSettings';
import toast from 'react-hot-toast';
import { logger } from '../../../utils/logger';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

interface DraggableEventProps {
  event: CalendarEvent;
  onEventClick?: (event: CalendarEvent) => void;
  onDelete?: (eventId: string) => void;
}

// Optimized refresh interval - longer to reduce API calls
const REFRESH_INTERVAL_MS = 120000; // 2 minutes instead of 30 seconds
const CACHE_DURATION_MS = 60000; // Cache events for 1 minute

// Draggable Event Component
function DraggableEvent({ event, onEventClick, onDelete }: DraggableEventProps) {
  const [showDelete, setShowDelete] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isDraggingThis,
  } = useSortable({ id: event.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDraggingThis ? 0.5 : 1,
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowDelete(true);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(event.id);
    }
    setShowDelete(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onEventClick?.(event)}
      onContextMenu={handleContextMenu}
      className={`text-xs bg-emerald-500/20 text-emerald-300 p-1.5 rounded cursor-move hover:bg-emerald-500/30 transition-all truncate relative group ${
        isDraggingThis ? 'z-50' : ''
      }`}
      title={`${event.summary}${event.start.dateTime ? ` - ${new Date(event.start.dateTime).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}` : ''} (לחץ וגרור להעברה, לחץ ימני למחיקה)`}
    >
      {event.summary}
      {showDelete && (
        <div className="absolute top-0 right-0 bg-red-600 hover:bg-red-700 rounded p-1 z-10">
          <button
            onClick={handleDelete}
            className="text-white"
            title="מחיקה"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function CalendarView({ onEventClick, onCreateWorkout }: CalendarViewProps) {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [targetDay, setTargetDay] = useState<number | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshRef = useRef<Date | null>(null);
  const eventsCacheRef = useRef<{ events: CalendarEvent[]; timestamp: number; dateKey: string } | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  // Handle drag end - move event to new date
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || !user) return;

    const draggedEventId = active.id as string;
    const targetDayStr = over.id as string;
    
    // Check if dropped on a day slot
    if (!targetDayStr.startsWith('day-')) return;
    
    const dayMatch = targetDayStr.match(/day-(\d+)-(\d+)-(\d+)/);
    if (!dayMatch) return;
    
    const [, year, month, day] = dayMatch;
    const targetDate = new Date(parseInt(year), parseInt(month), parseInt(day));
    
    // Find the event being dragged
    const eventToMove = events.find(e => e.id === draggedEventId);
    if (!eventToMove) return;

    setIsUpdating(true);
    try {
      const currentStart = new Date(eventToMove.start.dateTime || eventToMove.start.date || '');
      const currentEnd = new Date(eventToMove.end.dateTime || eventToMove.end.date || '');
      const duration = currentEnd.getTime() - currentStart.getTime();

      // Calculate new start time (keep same time of day)
      const newStart = new Date(targetDate);
      newStart.setHours(currentStart.getHours(), currentStart.getMinutes(), currentStart.getSeconds());
      
      // Calculate new end time (same duration)
      const newEnd = new Date(newStart.getTime() + duration);

      // Get access token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('נדרשת הרשאה לעדכון');
        return;
      }

      // Update event in Google Calendar and database
      const updateResult = await updateCalendarEventBidirectional(
        user.id,
        draggedEventId,
        {
          startTime: newStart,
          endTime: newEnd,
        },
        session.access_token
      );

      if (updateResult.error) {
        toast.error(updateResult.error);
        return;
      }

      toast.success('אירוע הועבר בהצלחה');
      
      // Refresh events
      await loadEvents(false, true);
    } catch (error) {
      logger.error('Error moving event', error, 'CalendarView');
      toast.error('שגיאה בהעברת אירוע');
    } finally {
      setIsUpdating(false);
      setTargetDay(null);
    }
  };

  // Handle delete event
  const handleDeleteEvent = async (eventId: string) => {
    if (!user) return;

    if (!confirm('האם אתה בטוח שברצונך למחוק את האירוע?')) {
      return;
    }

    setIsUpdating(true);
    try {
      // Get access token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('נדרשת הרשאה למחיקה');
        return;
      }

      // Delete event from Google Calendar and database
      const deleteResult = await deleteCalendarEventBidirectional(
        user.id,
        eventId,
        session.access_token
      );

      if (deleteResult.error) {
        toast.error(deleteResult.error);
        return;
      }

      toast.success('אירוע נמחק בהצלחה');
      
      // Refresh events
      await loadEvents(false, true);
    } catch (error) {
      logger.error('Error deleting event', error, 'CalendarView');
      toast.error('שגיאה במחיקת אירוע');
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle create event by clicking on day
  const handleDayClick = async (_day: number) => {
    if (!user) return;

    // If onCreateWorkout is provided, use it (create workout)
    if (onCreateWorkout) {
      onCreateWorkout();
      return;
    }

    // Otherwise, show a message to use the create workout button
    // In the future, we can add a modal to create calendar events directly
    toast.success('לצורך יצירת אירוע חדש, השתמש בכפתור "אימון חדש"');
  };

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
        {loading || isUpdating ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-400"></div>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
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

                const dayId = day
                  ? `day-${currentDate.getFullYear()}-${currentDate.getMonth()}-${day}`
                  : `empty-${index}`;

                const isDropTarget = targetDay === day;

                return (
                  <SortableContext
                    key={dayId}
                    id={dayId}
                    items={dayEvents.map(e => e.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div
                      id={dayId}
                      onClick={() => day && handleDayClick(day)}
                      className={`min-h-[100px] p-2 border border-zinc-800 rounded-lg transition-all ${
                        day
                          ? isToday
                            ? 'bg-emerald-500/10 border-emerald-500/30'
                            : isDropTarget
                            ? 'bg-emerald-500/20 border-emerald-500/50'
                            : 'bg-zinc-800/30 hover:bg-zinc-800/50 cursor-pointer'
                          : 'bg-transparent border-transparent'
                      }`}
                      onDragOver={(e) => {
                        if (day) {
                          e.preventDefault();
                          setTargetDay(day);
                        }
                      }}
                      onDragLeave={() => {
                        if (day === targetDay) {
                          setTargetDay(null);
                        }
                      }}
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
                              <DraggableEvent
                                key={event.id}
                                event={event}
                                onEventClick={onEventClick}
                                onDelete={handleDeleteEvent}
                              />
                            ))}
                            {dayEvents.length > 3 && (
                              <div 
                                className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-400" 
                                title={`${dayEvents.length - 3} אירועים נוספים`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Show all events for this day
                                  const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                                  toast.success(`${dayEvents.length} אירועים ב-${dayDate.toLocaleDateString('he-IL')}`);
                                }}
                              >
                                +{dayEvents.length - 3} נוספים
                              </div>
                            )}
                            {dayEvents.length === 0 && (
                              <div className="text-xs text-zinc-600 opacity-50 mt-4 text-center">
                                לחץ להוספת אירוע
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </SortableContext>
                );
              })}
            </div>
          </DndContext>
        )}
      </div>
    </div>
  );
}
