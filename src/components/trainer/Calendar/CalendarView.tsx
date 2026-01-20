import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Plus, RefreshCw, Trash2, GripVertical, Users, CalendarDays, CalendarRange } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { 
  getGoogleCalendarEvents, 
  getGoogleCalendarStatus,
  deleteCalendarEventBidirectional,
  updateCalendarEventBidirectional
} from '../../../api/googleCalendarApi';
import { supabase } from '../../../lib/supabase';
import GoogleCalendarSettings from '../Settings/GoogleCalendarSettings';
import CalendarSyncModal from './CalendarSyncModal';
import toast from 'react-hot-toast';
import { logger } from '../../../utils/logger';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

// Calendar Event interface - CalendarView component
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
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
}

interface CalendarViewProps {
  onEventClick?: (event: CalendarEvent) => void;
  onCreateWorkout?: () => void;
  onCreateTrainee?: (name: string, eventId?: string) => void;
}

interface EventItemProps {
  event: CalendarEvent;
  onEventClick?: (event: CalendarEvent) => void;
  onDelete?: (eventId: string) => void;
  isDragging?: boolean;
}

interface DraggableEventItemProps extends EventItemProps {
  day: number;
}

interface DroppableDayCellProps {
  day: number | null;
  index: number;
  isToday: boolean;
  dayEvents: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onDelete?: (eventId: string) => void;
  onDayClick: (day: number) => void;
  currentDate: Date;
  activeEventId: string | null;
}

// Optimized refresh interval - longer to reduce API calls
const REFRESH_INTERVAL_MS = 120000; // 2 minutes instead of 30 seconds
const CACHE_DURATION_MS = 60000; // Cache events for 1 minute

// Calendar view modes
type ViewMode = 'month' | 'week' | 'day';

// Hour range for week and day views
const HOUR_START = 6;
const HOUR_END = 22;
const HOURS_PER_DAY = HOUR_END - HOUR_START + 1;

// Event Item Component (base display component)
function EventItem({ event, onEventClick, onDelete, isDragging }: EventItemProps) {
  const [showDelete, setShowDelete] = useState(false);

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

  const handleClickOutside = () => {
    setShowDelete(false);
  };

  const eventTime = event.start.dateTime 
    ? new Date(event.start.dateTime).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
    : null;

  // Extract trainee name from summary or attendees
  const extractTraineeName = (event: CalendarEvent): string => {
    // First try to get from attendees
    if (event.attendees && event.attendees.length > 0) {
      const attendee = event.attendees[0];
      if (attendee.displayName) {
        return attendee.displayName;
      }
    }
    
    // Then try from summary pattern "אימון - שם"
    const match = event.summary.match(/אימון\s*-\s*(.+)/);
    if (match && match[1]) {
      return match[1].trim();
    }
    
    // If it contains a dash, use the part after it
    if (event.summary.includes(' - ')) {
      return event.summary.split(' - ').pop() || event.summary;
    }
    
    return event.summary;
  };

  const traineeName = extractTraineeName(event);
  const hasTraineeName = traineeName !== event.summary || (event.attendees && event.attendees.length > 0);

  return (
    <div
      onClick={() => onEventClick?.(event)}
      onContextMenu={handleContextMenu}
      onBlur={handleClickOutside}
      className={`bg-emerald-500/25 border-2 border-emerald-400/60 text-emerald-50 p-2.5 rounded-lg cursor-pointer hover:bg-emerald-500/35 hover:border-emerald-400/80 transition-all relative group mb-2 shadow-lg ${
        isDragging ? 'opacity-50' : ''
      }`}
      title={`${event.summary}${eventTime ? ` - ${eventTime}` : ''} (גרור להעברה, לחץ ימני למחיקה)`}
    >
      {/* Time - Very prominent */}
      {eventTime && (
        <div className="text-base font-bold text-emerald-100 mb-1.5 pb-1.5 border-b-2 border-emerald-400/40">
          🕐 {eventTime}
        </div>
      )}
      
      {/* Trainee Name - Very prominent */}
      <div className="text-sm font-bold text-white leading-tight mb-1">
        👤 {traineeName}
      </div>
      
      {/* Additional info if summary is different from name */}
      {hasTraineeName && event.summary !== traineeName && (
        <div className="text-[10px] text-emerald-200/70 italic truncate">
          {event.summary}
        </div>
      )}
      {showDelete && (
        <div className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 rounded p-1 z-20 shadow-lg">
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

// Draggable Event Item Component
function DraggableEventItem({ event, onEventClick, onDelete, day }: DraggableEventItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `event-${event.id}`,
    data: {
      event,
      sourceDay: day,
    },
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 100 : undefined,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${isDragging ? 'z-50' : ''}`}
    >
      <div
        {...listeners}
        {...attributes}
        className="absolute right-0 top-0 bottom-0 w-6 flex items-center justify-center cursor-grab active:cursor-grabbing z-10 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
        title="גרור להעברה"
      >
        <GripVertical className="h-3 w-3 text-emerald-400" />
      </div>
      <EventItem
        event={event}
        onEventClick={onEventClick}
        onDelete={onDelete}
        isDragging={isDragging}
      />
    </div>
  );
}

// Droppable Day Cell Component
function DroppableDayCell({
  day,
  index,
  isToday,
  dayEvents,
  onEventClick,
  onDelete,
  onDayClick,
  currentDate,
  activeEventId,
}: DroppableDayCellProps) {
  const dayId = day
    ? `day-${currentDate.getFullYear()}-${currentDate.getMonth()}-${day}`
    : `empty-${index}`;

  const { setNodeRef, isOver } = useDroppable({
    id: dayId,
    data: {
      day,
      year: currentDate.getFullYear(),
      month: currentDate.getMonth(),
    },
    disabled: !day,
  });

  return (
    <div
      ref={setNodeRef}
      onClick={() => day && onDayClick(day)}
      className={`min-h-[120px] p-3 border-2 rounded-lg transition-all ${
        day
          ? isOver
            ? 'bg-emerald-500/20 border-emerald-500/60 ring-2 ring-emerald-500/40'
            : isToday
              ? 'bg-emerald-500/15 border-emerald-500/40 shadow-md'
              : 'bg-zinc-800/40 hover:bg-zinc-800/60 cursor-pointer border-zinc-700/50'
          : 'bg-transparent border-transparent'
      }`}
    >
      {day && (
        <>
          <div
            className={`text-base font-bold mb-3 pb-2 border-b ${
              isToday 
                ? 'text-emerald-400 border-emerald-500/30' 
                : 'text-zinc-200 border-zinc-700/50'
            }`}
          >
            {day}
          </div>
          <div className="space-y-1.5">
            {dayEvents.slice(0, 3).map((event) => (
              <div key={event.id} className="group">
                <DraggableEventItem
                  event={event}
                  day={day}
                  onEventClick={onEventClick}
                  onDelete={activeEventId === event.id ? undefined : onDelete}
                />
              </div>
            ))}
            {dayEvents.length > 3 && (
              <div
                className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-400"
                title={`${dayEvents.length - 3} אירועים נוספים`}
                onClick={(e) => {
                  e.stopPropagation();
                  const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                  toast.success(`${dayEvents.length} אירועים ב-${dayDate.toLocaleDateString('he-IL')}`);
                }}
              >
                +{dayEvents.length - 3} נוספים
              </div>
            )}
            {dayEvents.length === 0 && (
              <div className="text-xs text-zinc-500 opacity-60 mt-4 text-center italic border border-dashed border-zinc-700/30 rounded p-2">
                לחץ להוספת אירוע
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function CalendarView({ onEventClick, onCreateWorkout, onCreateTrainee }: CalendarViewProps) {
  const { user } = useAuth();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshRef = useRef<Date | null>(null);
  const eventsCacheRef = useRef<{ events: CalendarEvent[]; timestamp: number; dateKey: string } | null>(null);

  // Configure drag sensors with activation constraints to prevent accidental drags
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before starting drag
      },
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

  // Memoize date range calculation based on view mode
  const dateRange = useMemo(() => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);

    if (viewMode === 'month') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
    } else if (viewMode === 'week') {
      // Get start of week (Sunday)
      const dayOfWeek = start.getDay();
      start.setDate(start.getDate() - dayOfWeek);
      start.setHours(0, 0, 0, 0);
      // Get end of week (Saturday)
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (viewMode === 'day') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    }

    return { start, end };
  }, [currentDate, viewMode]);

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
        setAuthError(null); // Clear any previous auth error
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
      } else if (result.error) {
        // Check if it's an auth/permission error
        const isAuthError = result.error.includes('הרשאה') || 
                           result.error.includes('חיבור מחדש') || 
                           result.error.includes('פג') ||
                           result.error.includes('Token') ||
                           result.error.includes('OAuth');
        
        if (isAuthError) {
          setAuthError(result.error);
          // Don't show toast for silent refreshes on auth errors
          if (!silent) {
            toast.error('נדרש חיבור מחדש ל-Google Calendar');
          }
        } else if (!silent) {
          toast.error(result.error);
        }
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

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
    } else if (viewMode === 'week') {
      if (direction === 'prev') {
        newDate.setDate(newDate.getDate() - 7);
      } else {
        newDate.setDate(newDate.getDate() + 7);
      }
    } else if (viewMode === 'day') {
      if (direction === 'prev') {
        newDate.setDate(newDate.getDate() - 1);
      } else {
        newDate.setDate(newDate.getDate() + 1);
      }
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

  const formatDateHeader = useMemo(() => {
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
    } else if (viewMode === 'week') {
      const startOfWeek = new Date(currentDate);
      const dayOfWeek = startOfWeek.getDay();
      startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      
      if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
        return `${startOfWeek.getDate()}-${endOfWeek.getDate()} ${startOfWeek.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}`;
      } else {
        return `${startOfWeek.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })} - ${endOfWeek.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })}`;
      }
    } else {
      return currentDate.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
  }, [currentDate, viewMode]);

  // Get week days for week view
  const weekDays = useMemo(() => {
    if (viewMode !== 'week') return [];
    const startOfWeek = new Date(currentDate);
    const dayOfWeek = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(day.getDate() + i);
      days.push(day);
    }
    return days;
  }, [currentDate, viewMode]);

  // Get events for a specific hour slot
  const getEventsForHour = useCallback((date: Date, hour: number) => {
    const hourStart = new Date(date);
    hourStart.setHours(hour, 0, 0, 0);
    const hourEnd = new Date(date);
    hourEnd.setHours(hour, 59, 59, 999);

    return events.filter(event => {
      const eventStart = new Date(event.start.dateTime || event.start.date || '');
      if (isNaN(eventStart.getTime())) return false;
      
      // Check if event overlaps with this hour
      const eventEnd = new Date(event.end.dateTime || event.end.date || '');
      return eventStart <= hourEnd && eventEnd >= hourStart &&
             eventStart.toDateString() === date.toDateString();
    });
  }, [events]);

  // Get all-day events for a specific date
  const getAllDayEvents = useCallback((date: Date) => {
    return events.filter(event => {
      if (event.start.dateTime) return false; // Has time, not all-day
      const eventDate = new Date(event.start.date || '');
      return eventDate.toDateString() === date.toDateString();
    });
  }, [events]);

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
    toast.success('לצורך יצירת אירוע חדש, השתמש בכפתור "אימון חדש"');
  };

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const draggedEvent = active.data.current?.event as CalendarEvent | undefined;
    if (draggedEvent) {
      setActiveEvent(draggedEvent);
    }
  }, []);

  // Handle drag end - update event date
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveEvent(null);

    if (!over || !user) return;

    const draggedEvent = active.data.current?.event as CalendarEvent | undefined;
    const sourceDay = active.data.current?.sourceDay as number | undefined;
    const targetDay = over.data.current?.day as number | undefined;
    const targetYear = over.data.current?.year as number | undefined;
    const targetMonth = over.data.current?.month as number | undefined;

    if (!draggedEvent || !sourceDay || !targetDay || targetYear === undefined || targetMonth === undefined) {
      return;
    }

    // Don't do anything if dropped on the same day
    const sourceDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), sourceDay);
    const targetDate = new Date(targetYear, targetMonth, targetDay);
    
    if (sourceDate.toDateString() === targetDate.toDateString()) {
      return;
    }

    // Get the original event time
    const originalStartTime = draggedEvent.start.dateTime 
      ? new Date(draggedEvent.start.dateTime) 
      : new Date(draggedEvent.start.date || '');
    
    const originalEndTime = draggedEvent.end.dateTime 
      ? new Date(draggedEvent.end.dateTime) 
      : new Date(draggedEvent.end.date || '');

    // Calculate the duration
    const duration = originalEndTime.getTime() - originalStartTime.getTime();

    // Create new start time keeping the same time of day
    const newStartTime = new Date(targetDate);
    newStartTime.setHours(
      originalStartTime.getHours(),
      originalStartTime.getMinutes(),
      originalStartTime.getSeconds(),
      originalStartTime.getMilliseconds()
    );

    // Create new end time
    const newEndTime = new Date(newStartTime.getTime() + duration);

    setIsUpdating(true);
    try {
      // Get access token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('נדרשת הרשאה לעדכון');
        return;
      }

      // Update event in Google Calendar
      const updateResult = await updateCalendarEventBidirectional(
        user.id,
        draggedEvent.id,
        {
          startTime: newStartTime,
          endTime: newEndTime,
        },
        session.access_token
      );

      if (updateResult.error) {
        toast.error(updateResult.error);
        return;
      }

      // Optimistically update local state
      setEvents(prevEvents => 
        prevEvents.map(e => {
          if (e.id === draggedEvent.id) {
            return {
              ...e,
              start: {
                ...e.start,
                dateTime: newStartTime.toISOString(),
              },
              end: {
                ...e.end,
                dateTime: newEndTime.toISOString(),
              },
            };
          }
          return e;
        })
      );

      // Update cache
      if (eventsCacheRef.current) {
        eventsCacheRef.current = {
          ...eventsCacheRef.current,
          events: eventsCacheRef.current.events.map(e => {
            if (e.id === draggedEvent.id) {
              return {
                ...e,
                start: {
                  ...e.start,
                  dateTime: newStartTime.toISOString(),
                },
                end: {
                  ...e.end,
                  dateTime: newEndTime.toISOString(),
                },
              };
            }
            return e;
          }),
        };
      }

      toast.success(`האירוע הועבר ל-${targetDate.toLocaleDateString('he-IL')}`);
    } catch (error) {
      logger.error('Error moving event', error, 'CalendarView');
      toast.error('שגיאה בהעברת אירוע');
      // Refresh to sync with server state
      await loadEvents(false, true);
    } finally {
      setIsUpdating(false);
    }
  }, [user, currentDate, loadEvents]);

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

  // Show auth error with reconnect option
  if (authError) {
    return (
      <div className="premium-card p-8 text-center space-y-6">
        <div className="mx-auto w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center">
          <Calendar className="h-10 w-10 text-amber-400" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white mb-2">
            נדרש חיבור מחדש
          </h3>
          <p className="text-zinc-400 mb-2">
            ההרשאה ל-Google Calendar פגה
          </p>
          <p className="text-zinc-500 text-sm mb-6">
            {authError}
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => setShowSettings(true)}
            className="btn-primary"
          >
            חבר מחדש
          </button>
          <button
            onClick={() => {
              setAuthError(null);
              loadEvents(false, true);
            }}
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-all"
          >
            נסה שוב
          </button>
        </div>
      </div>
    );
  }

  const weekDayNames = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

  // Render week view
  const renderWeekView = () => {
    const hours = Array.from({ length: HOURS_PER_DAY }, (_, i) => HOUR_START + i);

    return (
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* All-day events row */}
          <div className="border-b-2 border-zinc-700/50 pb-3 mb-3">
            <div className="grid grid-cols-8 gap-3">
              <div className="text-sm text-zinc-300 font-bold py-3 bg-zinc-800/50 rounded-md flex items-center justify-center">כל היום</div>
              {weekDays.map((day, idx) => {
                const allDayEvents = getAllDayEvents(day);
                const isToday = day.toDateString() === new Date().toDateString();
                return (
                  <div
                    key={idx}
                    className={`min-h-[70px] p-2.5 border-2 rounded-lg ${
                      isToday ? 'bg-emerald-500/15 border-emerald-500/40 shadow-md' : 'bg-zinc-800/40 border-zinc-700/50'
                    }`}
                  >
                    <div className={`text-xs font-bold mb-2 pb-1 border-b ${isToday ? 'text-emerald-400 border-emerald-500/40' : 'text-zinc-300 border-zinc-700/50'}`}>
                      {day.toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric' })}
                    </div>
                    <div className="space-y-1.5">
                      {allDayEvents.map(event => (
                        <EventItem
                          key={event.id}
                          event={event}
                          onEventClick={onEventClick}
                          onDelete={handleDeleteEvent}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hour slots */}
          <div className="grid grid-cols-8 gap-2">
            {/* Hour labels column */}
            <div className="space-y-0">
              {hours.map(hour => (
                  <div
                    key={hour}
                    className="h-16 border-b-2 border-zinc-700/50 flex items-start justify-end pr-3 pt-1.5 bg-zinc-800/30"
                  >
                    <span className="text-sm text-zinc-400 font-semibold">{hour}:00</span>
                  </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map((day, dayIdx) => {
              const isToday = day.toDateString() === new Date().toDateString();
              return (
                <div key={dayIdx} className="space-y-0">
                  {hours.map(hour => {
                    const hourEvents = getEventsForHour(day, hour);
                    return (
                      <div
                        key={hour}
                        onClick={() => {
                          const clickedDate = new Date(day);
                          clickedDate.setHours(hour, 0, 0, 0);
                          setCurrentDate(clickedDate);
                          if (onCreateWorkout) {
                            onCreateWorkout();
                          }
                        }}
                        className={`h-16 border-b-2 border-zinc-700/50 p-1.5 cursor-pointer hover:bg-zinc-800/40 transition-colors relative ${
                          isToday ? 'bg-emerald-500/8' : ''
                        }`}
                      >
                        {hourEvents.map(event => {
                          const eventStart = new Date(event.start.dateTime || event.start.date || '');
                          const eventEnd = new Date(event.end.dateTime || event.end.date || '');
                          const startMinutes = eventStart.getMinutes();
                          const duration = (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60);
                          const heightPercent = Math.min((duration / 60) * 100, 100);
                          
                          return (
                            <div
                              key={event.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                onEventClick?.(event);
                              }}
                              className="absolute left-0 right-0 bg-emerald-500/40 text-white text-xs p-2.5 rounded-lg cursor-pointer hover:bg-emerald-500/50 z-10 border-2 border-emerald-400/70 shadow-lg"
                              style={{
                                top: `${(startMinutes / 60) * 100}%`,
                                height: `${heightPercent}%`,
                                minHeight: '50px',
                              }}
                              title={`${event.summary} - ${eventStart.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`}
                            >
                              {/* Time - Very prominent */}
                              <div className="text-sm font-bold text-emerald-100 mb-1.5 pb-1 border-b-2 border-emerald-400/50">
                                🕐 {eventStart.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                              
                              {/* Trainee Name - Extract and display prominently */}
                              <div className="text-xs font-bold text-white leading-tight">
                                👤 {(() => {
                                  const match = event.summary.match(/אימון\s*-\s*(.+)/);
                                  const name = match && match[1] ? match[1].trim() : (event.summary.includes(' - ') ? event.summary.split(' - ').pop() : event.summary);
                                  return name;
                                })()}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Render day view
  const renderDayView = () => {
    const hours = Array.from({ length: HOURS_PER_DAY }, (_, i) => HOUR_START + i);
    const isToday = currentDate.toDateString() === new Date().toDateString();
    const allDayEvents = getAllDayEvents(currentDate);

    return (
      <div className="overflow-x-auto">
        <div className="min-w-[400px]">
          {/* All-day events */}
          {allDayEvents.length > 0 && (
            <div className="border-b-2 border-zinc-700/50 pb-4 mb-4">
              <div className="text-sm text-zinc-300 font-bold mb-3 bg-zinc-800/50 p-2 rounded-md">כל היום</div>
              <div className="space-y-2">
                {allDayEvents.map(event => (
                  <EventItem
                    key={event.id}
                    event={event}
                    onEventClick={onEventClick}
                    onDelete={handleDeleteEvent}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Hour slots */}
          <div className="grid grid-cols-2 gap-4">
            {/* Hour labels */}
            <div className="space-y-0">
              {hours.map(hour => (
                  <div
                    key={hour}
                    className="h-16 border-b-2 border-zinc-700/50 flex items-start justify-end pr-5 pt-2 bg-zinc-800/30"
                  >
                    <span className="text-base text-zinc-300 font-bold">{hour}:00</span>
                  </div>
              ))}
            </div>

            {/* Events column */}
            <div className="space-y-0 relative">
              {hours.map(hour => {
                const hourEvents = getEventsForHour(currentDate, hour);
                return (
                  <div
                    key={hour}
                    onClick={() => {
                      const clickedDate = new Date(currentDate);
                      clickedDate.setHours(hour, 0, 0, 0);
                      setCurrentDate(clickedDate);
                      if (onCreateWorkout) {
                        onCreateWorkout();
                      }
                    }}
                    className={`h-16 border-b-2 border-zinc-700/50 p-2.5 cursor-pointer hover:bg-zinc-800/40 transition-colors relative ${
                      isToday ? 'bg-emerald-500/8' : ''
                    }`}
                  >
                    {hourEvents.map(event => {
                      const eventStart = new Date(event.start.dateTime || event.start.date || '');
                      const eventEnd = new Date(event.end.dateTime || event.end.date || '');
                      const startMinutes = eventStart.getMinutes();
                      const duration = (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60);
                      const heightPercent = Math.min((duration / 60) * 100, 100);
                      
                      return (
                        <div
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick?.(event);
                          }}
                          className="absolute left-2 right-2 bg-emerald-500/40 text-white text-sm p-3 rounded-lg cursor-pointer hover:bg-emerald-500/50 z-10 border-2 border-emerald-400/70 shadow-xl"
                          style={{
                            top: `${(startMinutes / 60) * 100}%`,
                            height: `${heightPercent}%`,
                            minHeight: '70px',
                          }}
                          title={`${event.summary} - ${eventStart.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`}
                        >
                          {/* Time Range - Very prominent */}
                          <div className="text-base font-bold text-emerald-100 mb-2 pb-2 border-b-2 border-emerald-400/50">
                            🕐 {eventStart.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })} - {eventEnd.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          
                          {/* Trainee Name - Extract and display prominently */}
                          <div className="text-sm font-bold text-white leading-tight mb-2">
                            👤 {(() => {
                              const match = event.summary.match(/אימון\s*-\s*(.+)/);
                              const name = match && match[1] ? match[1].trim() : (event.summary.includes(' - ') ? event.summary.split(' - ').pop() : event.summary);
                              return name;
                            })()}
                          </div>
                          
                          {/* Additional info */}
                          {event.summary.includes('אימון') && (
                            <div className="text-[10px] text-emerald-200/80 italic mb-1">
                              אימון
                            </div>
                          )}
                          
                          {event.location && (
                            <div className="text-xs opacity-90 mt-2 truncate text-emerald-100/90 border-t border-emerald-400/40 pt-2">
                              📍 {event.location}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="premium-card p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigateDate('prev')}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-all"
            >
              <ChevronRight className="h-5 w-5 text-zinc-400" />
            </button>
            <h2 className="text-xl font-bold text-white">
              {formatDateHeader}
            </h2>
            <button
              onClick={() => navigateDate('next')}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-all"
            >
              <ChevronLeft className="h-5 w-5 text-zinc-400" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-all"
            >
              היום
            </button>
          </div>
          <div className="flex items-center gap-2">
            {/* View mode buttons */}
            <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1.5 text-sm rounded transition-all flex items-center gap-2 ${
                  viewMode === 'month'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-zinc-400 hover:text-zinc-300'
                }`}
                title="תצוגת חודש"
              >
                <Calendar className="h-4 w-4" />
                חודש
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1.5 text-sm rounded transition-all flex items-center gap-2 ${
                  viewMode === 'week'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-zinc-400 hover:text-zinc-300'
                }`}
                title="תצוגת שבוע"
              >
                <CalendarRange className="h-4 w-4" />
                שבוע
              </button>
              <button
                onClick={() => setViewMode('day')}
                className={`px-3 py-1.5 text-sm rounded transition-all flex items-center gap-2 ${
                  viewMode === 'day'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-zinc-400 hover:text-zinc-300'
                }`}
                title="תצוגת יום"
              >
                <CalendarDays className="h-4 w-4" />
                יום
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSyncModal(true)}
                className="px-4 py-2 text-sm bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-all flex items-center gap-2 border border-emerald-500/30"
                title="סנכרון מתאמנים מהיומן"
              >
                <Users className="h-4 w-4" />
                סנכרון מתאמנים
              </button>
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
      </div>

      {/* Calendar Grid */}
      <div className="premium-card p-4 relative">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-400"></div>
          </div>
        ) : viewMode === 'month' ? (
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className={`grid grid-cols-7 gap-3 ${isUpdating ? 'opacity-50 pointer-events-none' : ''}`}>
              {/* Week days header */}
              {weekDayNames.map((day, index) => (
                <div
                  key={index}
                  className="text-center text-sm font-bold text-zinc-300 py-3 border-b-2 border-zinc-700/50 bg-zinc-800/50 rounded-t-lg"
                >
                  {day}
                </div>
              ))}

              {/* Calendar days */}
              {days.map((day, index) => {
                const dayEvents = day ? getEventsForDay(day) : [];
                const isToday =
                  day !== null &&
                  new Date().toDateString() ===
                    new Date(
                      currentDate.getFullYear(),
                      currentDate.getMonth(),
                      day
                    ).toDateString();

                return (
                  <DroppableDayCell
                    key={day ? `day-${currentDate.getFullYear()}-${currentDate.getMonth()}-${day}` : `empty-${index}`}
                    day={day}
                    index={index}
                    isToday={isToday}
                    dayEvents={dayEvents}
                    onEventClick={onEventClick}
                    onDelete={handleDeleteEvent}
                    onDayClick={handleDayClick}
                    currentDate={currentDate}
                    activeEventId={activeEvent?.id || null}
                  />
                );
              })}
            </div>

            {/* Drag Overlay - shows floating preview of dragged event */}
            <DragOverlay>
              {activeEvent ? (
                <div className="text-xs bg-emerald-500/40 text-emerald-200 p-1.5 rounded shadow-lg border border-emerald-500/50 truncate max-w-[120px]">
                  {activeEvent.summary}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        ) : viewMode === 'week' ? (
          <div className={isUpdating ? 'opacity-50 pointer-events-none' : ''}>
            {renderWeekView()}
          </div>
        ) : (
          <div className={isUpdating ? 'opacity-50 pointer-events-none' : ''}>
            {renderDayView()}
          </div>
        )}

        {/* Updating indicator */}
        {isUpdating && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/50 rounded-lg">
            <div className="flex items-center gap-2 bg-zinc-800 px-4 py-2 rounded-lg">
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-emerald-400"></div>
              <span className="text-sm text-zinc-300">מעביר אירוע...</span>
            </div>
          </div>
        )}
      </div>

      {/* Sync Modal */}
      <CalendarSyncModal
        isOpen={showSyncModal}
        onClose={() => {
          setShowSyncModal(false);
          // Refresh events after sync
          loadEvents(false, true);
        }}
        onCreateTrainee={onCreateTrainee}
        currentDate={currentDate}
      />
    </div>
  );
}
