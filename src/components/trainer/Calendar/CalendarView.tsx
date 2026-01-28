import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Plus, RefreshCw, Trash2, GripVertical, Users, CalendarDays, CalendarRange, Repeat } from 'lucide-react';
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
import QuickAddWorkoutModal from './QuickAddWorkoutModal';
import TraineeWorkoutHistoryModal from './TraineeWorkoutHistoryModal';
import RecurringWorkoutModal from './RecurringWorkoutModal';
import toast from 'react-hot-toast';
import { logger } from '../../../utils/logger';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { 
  getTraineesSessionInfo, 
  TraineeSessionInfo, 
  formatTraineeNameWithPosition,
  calculateMonthlyPositionsFromDb,
  EventPositionInfo,
  sessionInfoCache 
} from '../../../utils/traineeSessionUtils';

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
  onQuickCreateTrainee?: (name: string) => Promise<string | null>;
}

interface EventItemProps {
  event: CalendarEvent;
  onEventClick?: (event: CalendarEvent) => void;
  onDelete?: (eventId: string) => void;
  isDragging?: boolean;
  sessionInfo?: TraineeSessionInfo | null;
  positionInfo?: EventPositionInfo | null;
  onTraineeNameClick?: (traineeName: string, traineeId: string | null) => void;
}

interface DraggableEventItemProps extends EventItemProps {
  day: number;
  sessionInfo?: TraineeSessionInfo | null;
  positionInfo?: EventPositionInfo | null;
  onTraineeNameClick?: (traineeName: string, traineeId: string | null) => void;
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
  sessionInfoMap?: Map<string, TraineeSessionInfo>;
  eventPositionMap?: Map<string, EventPositionInfo>;
  onTraineeNameClick?: (traineeName: string, traineeId: string | null) => void;
}

interface DroppableWeekHourCellProps {
  day: Date;
  hour: number;
  hourEvents: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onDelete?: (eventId: string) => void;
  onCellClick: (day: Date, hour: number) => void;
  activeEventId: string | null;
  sessionInfoMap?: Map<string, TraineeSessionInfo>;
  eventPositionMap?: Map<string, EventPositionInfo>;
  onTraineeNameClick?: (traineeName: string, traineeId: string | null) => void;
}

interface DraggableWeekEventItemProps {
  event: CalendarEvent;
  onEventClick?: (event: CalendarEvent) => void;
  onDelete?: (eventId: string) => void;
  sourceDate: Date;
  sourceHour: number;
  sessionInfo?: TraineeSessionInfo | null;
  positionInfo?: EventPositionInfo | null;
  onTraineeNameClick?: (traineeName: string, traineeId: string | null) => void;
}

// Real-time refresh interval - shorter for better sync with Google Calendar
const REFRESH_INTERVAL_MS = 10000; // 10 seconds for real-time updates
const CACHE_DURATION_MS = 60000; // Cache events for 1 minute

// Calendar view modes
type ViewMode = 'month' | 'week' | 'day';

// Hour range for week and day views
const HOUR_START = 6;
const HOUR_END = 22;
const HOURS_PER_DAY = HOUR_END - HOUR_START + 1;

// Helper function to strip existing session numbers from trainee name
// Matches patterns like "3/8", "3/10", "7", etc. at the end of the name
function stripSessionNumber(name: string): string {
  // Remove patterns like "3/8", "10/12" at the end
  let stripped = name.replace(/\s+\d+\/\d+\s*$/, '').trim();
  // Remove single numbers at the end (like "עדי 3")
  stripped = stripped.replace(/\s+\d+\s*$/, '').trim();
  return stripped;
}

// Helper function to extract trainee name from event
function extractTraineeName(event: CalendarEvent): string {
  let name = '';
  
  // First try to get from attendees
  if (event.attendees && event.attendees.length > 0) {
    const attendee = event.attendees[0];
    if (attendee.displayName) {
      name = attendee.displayName;
    }
  }
  
  // Then try from summary pattern "אימון - שם"
  if (!name) {
    const match = event.summary.match(/אימון\s*-\s*(.+)/);
    if (match && match[1]) {
      name = match[1].trim();
    }
  }
  
  // If it contains a dash, use the part after it
  if (!name && event.summary.includes(' - ')) {
    name = event.summary.split(' - ').pop() || event.summary;
  }
  
  if (!name) {
    name = event.summary;
  }
  
  // Strip any existing session numbers from the name to prevent double numbering
  return stripSessionNumber(name);
}

// Event Item Component (base display component)
function EventItem({ event, onEventClick, onDelete, isDragging, sessionInfo, positionInfo, onTraineeNameClick }: EventItemProps) {
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

  const handleNameClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const traineeName = extractTraineeName(event);
    const traineeId = sessionInfo?.traineeId || null;
    onTraineeNameClick?.(traineeName, traineeId);
  };

  const eventTime = event.start.dateTime 
    ? new Date(event.start.dateTime).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
    : null;

  const traineeName = extractTraineeName(event);
  
  // Format name with position info (sequential number 1, 2, 3...)
  const displayInfo = formatTraineeNameWithPosition(traineeName, positionInfo || null, sessionInfo || null);

  // Get end time for display
  const eventEndTime = event.end.dateTime 
    ? new Date(event.end.dateTime).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div
      onClick={() => onEventClick?.(event)}
      onContextMenu={handleContextMenu}
      onBlur={handleClickOutside}
      className={`bg-emerald-500 text-white px-2.5 py-1.5 rounded-md cursor-pointer hover:bg-emerald-600 transition-colors duration-200 relative group mb-1 border-r-4 border-emerald-700 ${
        isDragging ? 'opacity-60 cursor-grabbing ring-2 ring-emerald-400' : 'cursor-pointer'
      }`}
      title={`${event.summary}${eventTime ? ` - ${eventTime}` : ''} (גרור להעברה, לחץ ימני למחיקה, לחץ על השם לצפייה בהיסטוריה)`}
    >
      {/* Trainee Name with Session Info - Clickable */}
      <div 
        className="text-[12px] font-semibold text-white leading-tight truncate hover:underline cursor-pointer"
        onClick={handleNameClick}
        title="לחץ לצפייה בהיסטוריית האימונים"
      >
        {displayInfo.displayName}
      </div>
      
      {/* Time range - Below name */}
      {eventTime && eventEndTime && (
        <div className="text-[11px] text-white/85 mt-0.5 font-medium">
          {eventEndTime} עד {eventTime}
        </div>
      )}
      
      {showDelete && (
        <div className="absolute top-0.5 left-0.5 bg-red-500 hover:bg-red-600 rounded p-0.5 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleDelete}
            className="text-white"
            title="מחיקה"
          >
            <Trash2 className="h-2.5 w-2.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// Draggable Event Item Component
function DraggableEventItem({ event, onEventClick, onDelete, day, sessionInfo, positionInfo, onTraineeNameClick }: DraggableEventItemProps) {
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
        className="absolute right-0 top-0 bottom-0 w-6 flex items-center justify-center cursor-grab active:cursor-grabbing z-10 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity bg-emerald-600/30 rounded-l-md"
        title="גרור להעברה"
      >
        <GripVertical className="h-3 w-3 text-white/80" />
      </div>
      <EventItem
        event={event}
        onEventClick={onEventClick}
        onDelete={onDelete}
        isDragging={isDragging}
        sessionInfo={sessionInfo}
        positionInfo={positionInfo}
        onTraineeNameClick={onTraineeNameClick}
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
  sessionInfoMap,
  eventPositionMap,
  onTraineeNameClick,
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

  // Helper to get session info for an event
  const getSessionInfoForEvent = (event: CalendarEvent): TraineeSessionInfo | null => {
    if (!sessionInfoMap) return null;
    // Try to find trainee ID from the event
    const traineeName = extractTraineeName(event);
    // Look through the map to find matching trainee by name
    for (const [, info] of sessionInfoMap) {
      if (info.traineeName === traineeName) {
        return info;
      }
    }
    return null;
  };

  // Helper to get position info for an event
  const getPositionInfoForEvent = (event: CalendarEvent): EventPositionInfo | null => {
    if (!eventPositionMap) return null;
    return eventPositionMap.get(event.id) || null;
  };

  return (
    <div
      ref={setNodeRef}
      onClick={() => day && onDayClick(day)}
      className={`min-h-[100px] p-2 border-l border-b border-gray-200 dark:border-border transition-colors duration-200 group ${
        day
          ? isOver
            ? 'bg-emerald-50 dark:bg-emerald-500/20'
            : 'hover:bg-gray-50 dark:hover:bg-surface cursor-pointer bg-white dark:bg-elevated'
          : 'bg-gray-50 dark:bg-elevated/50'
      }`}
    >
      {day && (
        <>
          <div className="flex justify-end mb-1.5">
            <div
              className={`w-7 h-7 flex items-center justify-center rounded-full text-sm transition-colors duration-200 ${
                isToday 
                  ? 'bg-blue-500 text-white font-medium' 
                  : 'text-gray-700 dark:text-foreground hover:bg-gray-100 dark:hover:bg-surface'
              }`}
            >
              {day}
            </div>
          </div>
          <div className="space-y-1">
            {dayEvents.slice(0, 3).map((event, eventIndex) => (
              <div key={`${event.id}-${eventIndex}`} className="group">
                <DraggableEventItem
                  event={event}
                  day={day}
                  onEventClick={onEventClick}
                  onDelete={activeEventId === event.id ? undefined : onDelete}
                  sessionInfo={getSessionInfoForEvent(event)}
                  positionInfo={getPositionInfoForEvent(event)}
                  onTraineeNameClick={onTraineeNameClick}
                />
              </div>
            ))}
            {dayEvents.length > 3 && (
              <div
                className="text-xs text-gray-500 dark:text-muted cursor-pointer hover:bg-gray-100 dark:hover:bg-surface rounded-md px-2 py-1 mt-1 transition-colors duration-200 text-center font-medium"
                onClick={(e) => {
                  e.stopPropagation();
                  const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                  toast.success(`${dayEvents.length} אירועים ב-${dayDate.toLocaleDateString('he-IL')}`);
                }}
              >
                {dayEvents.length - 3}+ נוספים
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Draggable Event Item for Week View
function DraggableWeekEventItem({ 
  event, 
  onEventClick, 
  onDelete, 
  sourceDate, 
  sourceHour,
  sessionInfo,
  positionInfo,
  onTraineeNameClick 
}: DraggableWeekEventItemProps) {
  const [showDelete, setShowDelete] = useState(false);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `week-event-${event.id}`,
    data: {
      event,
      sourceDate,
      sourceHour,
      isWeekView: true,
    },
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 100 : undefined,
  } : undefined;

  const eventStart = new Date(event.start.dateTime || event.start.date || '');
  const eventEnd = new Date(event.end.dateTime || event.end.date || '');
  const startMinutes = eventStart.getMinutes();
  const duration = (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60);
  const heightPercent = Math.max((duration / 60) * 100, 100);
  const startTime = eventStart.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  const endTime = eventEnd.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

  const traineeName = extractTraineeName(event);
  const displayInfo = formatTraineeNameWithPosition(traineeName, positionInfo || null, sessionInfo || null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDelete(true);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(event.id);
    }
    setShowDelete(false);
  };

  const handleNameClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const traineeId = sessionInfo?.traineeId || null;
    onTraineeNameClick?.(traineeName, traineeId);
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        top: `${(startMinutes / 60) * 100}%`,
        height: `${heightPercent}%`,
        minHeight: '44px',
      }}
      className={`absolute left-1 right-1 bg-emerald-500 text-white text-xs rounded-md cursor-pointer hover:bg-emerald-600 z-10 overflow-hidden group border-r-4 border-emerald-700 transition-colors duration-200 ${
        isDragging ? 'opacity-60 ring-2 ring-emerald-400' : ''
      }`}
      onClick={(e) => {
        e.stopPropagation();
        if (showDelete) {
          setShowDelete(false);
          return;
        }
        onEventClick?.(event);
      }}
      onContextMenu={handleContextMenu}
      title={`${event.summary} - ${startTime} (גרור להעברה, לחץ ימני למחיקה)`}
    >
      {/* Delete button - shows on right-click */}
      {showDelete && (
        <div className="absolute inset-0 bg-red-500/90 flex items-center justify-center z-30">
          <button
            onClick={handleDelete}
            className="flex items-center gap-1 text-white text-[11px] font-semibold hover:text-red-100 transition-colors"
            title="מחק אימון"
          >
            <Trash2 className="h-3.5 w-3.5" />
            מחק
          </button>
        </div>
      )}
      {/* Drag handle */}
      <div
        {...listeners}
        {...attributes}
        className="absolute right-0 top-0 bottom-0 w-5 flex items-center justify-center cursor-grab active:cursor-grabbing z-20 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity bg-emerald-600/30"
        title="גרור להעברה"
      >
        <GripVertical className="h-3 w-3 text-white/80" />
      </div>
      <div className="px-2 py-1.5">
        {/* Trainee Name with Session Info - Clickable */}
        <div 
          className="text-[12px] font-semibold text-white truncate pr-4 hover:underline cursor-pointer"
          onClick={handleNameClick}
          title="לחץ לצפייה בהיסטוריית האימונים"
        >
          {displayInfo.displayName}
        </div>
        {/* Time range */}
        <div className="text-[11px] text-white/85 mt-0.5 font-medium">
          {endTime} עד {startTime}
        </div>
      </div>
    </div>
  );
}

// Current Time Indicator Component
function CurrentTimeIndicator({ hour }: { hour: number }) {
  const [currentMinute, setCurrentMinute] = useState(new Date().getMinutes());
  const now = new Date();
  const currentHour = now.getHours();
  
  // Update every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMinute(new Date().getMinutes());
    }, 60000);
    return () => clearInterval(interval);
  }, []);
  
  // Only show if this is the current hour
  if (currentHour !== hour) return null;
  
  const topPosition = (currentMinute / 60) * 100;
  
  return (
    <div 
      className="absolute left-0 right-0 z-30 pointer-events-none"
      style={{ top: `${topPosition}%` }}
    >
      <div className="flex items-center">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1.5 shadow-sm" />
        <div className="flex-1 h-0.5 bg-red-500 shadow-sm" />
      </div>
    </div>
  );
}

// Droppable Week Hour Cell Component
function DroppableWeekHourCell({
  day,
  hour,
  hourEvents,
  onEventClick,
  onDelete,
  onCellClick,
  activeEventId,
  sessionInfoMap,
  eventPositionMap,
  onTraineeNameClick,
}: DroppableWeekHourCellProps) {
  const cellId = `week-cell-${day.getFullYear()}-${day.getMonth()}-${day.getDate()}-${hour}`;
  const isToday = day.toDateString() === new Date().toDateString();

  const { setNodeRef, isOver } = useDroppable({
    id: cellId,
    data: {
      day,
      hour,
      isWeekView: true,
    },
  });

  // Helper to get session info for an event
  const getSessionInfoForEvent = (event: CalendarEvent): TraineeSessionInfo | null => {
    if (!sessionInfoMap) return null;
    const traineeName = extractTraineeName(event);
    for (const [, info] of sessionInfoMap) {
      if (info.traineeName === traineeName) {
        return info;
      }
    }
    return null;
  };

  // Helper to get position info for an event
  const getPositionInfoForEvent = (event: CalendarEvent): EventPositionInfo | null => {
    if (!eventPositionMap) return null;
    return eventPositionMap.get(event.id) || null;
  };

  return (
    <div
      ref={setNodeRef}
      onClick={() => onCellClick(day, hour)}
      className={`h-14 border-b border-l border-gray-200 dark:border-border cursor-pointer transition-colors duration-200 relative bg-white dark:bg-elevated ${
        isOver 
          ? 'bg-emerald-50 dark:bg-emerald-500/20 ring-1 ring-emerald-400/50' 
          : 'hover:bg-gray-50 dark:hover:bg-surface'
      }`}
    >
      {/* Current time indicator - only on today's column */}
      {isToday && <CurrentTimeIndicator hour={hour} />}
      
      {hourEvents.map((event, eventIdx) => (
        <DraggableWeekEventItem
          key={`${event.id}-${hour}-${eventIdx}`}
          event={event}
          onEventClick={onEventClick}
          onDelete={activeEventId === event.id ? undefined : onDelete}
          sourceDate={day}
          sourceHour={hour}
          sessionInfo={getSessionInfoForEvent(event)}
          positionInfo={getPositionInfoForEvent(event)}
          onTraineeNameClick={onTraineeNameClick}
        />
      ))}
    </div>
  );
}

export default function CalendarView({ onEventClick, onCreateWorkout, onCreateTrainee, onQuickCreateTrainee }: CalendarViewProps) {
  const { user } = useAuth();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickAddDate, setQuickAddDate] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshRef = useRef<Date | null>(null);
  const eventsCacheRef = useRef<{ events: CalendarEvent[]; timestamp: number; dateKey: string } | null>(null);
  
  // Session info state for displaying card counts
  const [sessionInfoMap, setSessionInfoMap] = useState<Map<string, TraineeSessionInfo>>(new Map());
  
  // Event position info - maps eventId to position in month (1, 2, 3...)
  const [eventPositionMap, setEventPositionMap] = useState<Map<string, EventPositionInfo>>(new Map());
  
  // Trainee history modal state
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedTraineeForHistory, setSelectedTraineeForHistory] = useState<{ name: string; id: string | null } | null>(null);
  
  // Recurring workout modal state
  const [showRecurringModal, setShowRecurringModal] = useState(false);

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

  // Load session info for trainees in events and calculate positions
  const loadSessionInfo = useCallback(async () => {
    if (!user || events.length === 0) return;

    try {
      // Extract unique trainee names and prepare event data for position calculation
      const traineeNames = new Set<string>();
      const eventsForPositionCalc: Array<{ id: string; traineeName: string; startDate: Date }> = [];
      
      events.forEach(event => {
        const name = extractTraineeName(event);
        traineeNames.add(name);
        
        // Get event start date
        const startDateStr = event.start.dateTime || event.start.date;
        if (startDateStr) {
          eventsForPositionCalc.push({
            id: event.id,
            traineeName: name,
            startDate: new Date(startDateStr),
          });
        }
      });

      // Calculate positions for all events using database records for accuracy
      // This ensures correct numbering even when only viewing a week or day
      const positions = await calculateMonthlyPositionsFromDb(
        user.id,
        currentDate,
        eventsForPositionCalc
      );
      setEventPositionMap(positions);

      if (traineeNames.size === 0) return;

      // Fetch trainee IDs by names (including partial matches), excluding deleted trainees
      const { data: trainees, error: traineesError } = await supabase
        .from('trainees')
        .select('id, full_name')
        .eq('trainer_id', user.id)
        .neq('status', 'deleted');

      if (traineesError || !trainees || trainees.length === 0) {
        return;
      }

      // Find matching trainees (exact or partial match)
      const matchingTrainees = trainees.filter(trainee => {
        return Array.from(traineeNames).some(eventName => 
          trainee.full_name === eventName ||
          trainee.full_name.toLowerCase().includes(eventName.toLowerCase()) ||
          eventName.toLowerCase().includes(trainee.full_name.toLowerCase())
        );
      });

      if (matchingTrainees.length === 0) {
        return;
      }

      // Fetch session info for these trainees
      const traineeIds = matchingTrainees.map(t => t.id);
      const sessionInfos = await getTraineesSessionInfo(traineeIds, user.id);
      
      // Cache the results
      sessionInfoCache.setMultiple(sessionInfos);
      
      setSessionInfoMap(sessionInfos);
    } catch (err) {
      logger.error('Error loading session info', err, 'CalendarView');
    }
  }, [user, events, currentDate]);

  // Handle trainee name click - open history modal
  const handleTraineeNameClick = useCallback((traineeName: string, traineeId: string | null) => {
    setSelectedTraineeForHistory({ name: traineeName, id: traineeId });
    setShowHistoryModal(true);
  }, []);

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

  // Load session info when events change
  useEffect(() => {
    if (events.length > 0) {
      loadSessionInfo();
    }
  }, [events, loadSessionInfo]);

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

  // Memoize events by day for better performance (with deduplication)
  const eventsByDay = useMemo(() => {
    const eventsMap = new Map<string, CalendarEvent[]>();
    const seenEventIds = new Set<string>(); // Track seen event IDs to prevent duplicates
    
    events.forEach(event => {
      // Skip if we've already seen this event ID
      if (seenEventIds.has(event.id)) return;
      seenEventIds.add(event.id);
      
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

  // Get events for a specific hour slot - only events that START in this hour
  const getEventsForHour = useCallback((date: Date, hour: number) => {
    return events.filter(event => {
      const eventStart = new Date(event.start.dateTime || event.start.date || '');
      if (isNaN(eventStart.getTime())) return false;
      
      // Only return events that START in this specific hour
      return eventStart.getHours() === hour &&
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
  const handleDayClick = async (day: number) => {
    if (!user) return;

    // Set the date to the clicked day
    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setCurrentDate(clickedDate);
    
    // Open quick add modal
    setQuickAddDate(clickedDate);
    setShowQuickAddModal(true);
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

  // Handle week view cell click - open quick add modal
  const handleWeekCellClick = useCallback((day: Date, hour: number) => {
    const clickedDate = new Date(day);
    clickedDate.setHours(hour, 0, 0, 0);
    setQuickAddDate(clickedDate);
    setShowQuickAddModal(true);
  }, []);

  // Handle week view drag end
  const handleWeekDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveEvent(null);

    if (!over || !user) return;

    const draggedEvent = active.data.current?.event as CalendarEvent | undefined;
    const isWeekViewDrag = active.data.current?.isWeekView;
    const targetData = over.data.current;

    if (!draggedEvent || !isWeekViewDrag || !targetData?.isWeekView) {
      return;
    }

    const targetDay = targetData.day as Date;
    const targetHour = targetData.hour as number;

    if (!targetDay || targetHour === undefined) {
      return;
    }

    // Get original event times
    const originalStartTime = new Date(draggedEvent.start.dateTime || draggedEvent.start.date || '');
    const originalEndTime = new Date(draggedEvent.end.dateTime || draggedEvent.end.date || '');
    const duration = originalEndTime.getTime() - originalStartTime.getTime();

    // Create new start time at target day and hour
    const newStartTime = new Date(targetDay);
    newStartTime.setHours(targetHour, originalStartTime.getMinutes(), 0, 0);

    // Check if it's the same time (no change needed)
    if (originalStartTime.getTime() === newStartTime.getTime()) {
      return;
    }

    // Create new end time
    const newEndTime = new Date(newStartTime.getTime() + duration);

    setIsUpdating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('נדרשת הרשאה לעדכון');
        return;
      }

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
              start: { ...e.start, dateTime: newStartTime.toISOString() },
              end: { ...e.end, dateTime: newEndTime.toISOString() },
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
                start: { ...e.start, dateTime: newStartTime.toISOString() },
                end: { ...e.end, dateTime: newEndTime.toISOString() },
              };
            }
            return e;
          }),
        };
      }

      const formattedDate = newStartTime.toLocaleDateString('he-IL');
      const formattedTime = newStartTime.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
      toast.success(`האירוע הועבר ל-${formattedDate} בשעה ${formattedTime}`);
    } catch (error) {
      logger.error('Error moving event in week view', error, 'CalendarView');
      toast.error('שגיאה בהעברת אירוע');
      await loadEvents(false, true);
    } finally {
      setIsUpdating(false);
    }
  }, [user, loadEvents]);

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
      <div className="premium-card-static bg-elevated rounded-2xl shadow-xl p-8 text-center space-y-6 transition-all duration-300">
        <div className="mx-auto w-20 h-20 bg-gradient-to-br from-surface to-elevated rounded-2xl flex items-center justify-center shadow-lg border-2 border-border">
          <Calendar className="h-10 w-10 text-muted" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground mb-2">
            Google Calendar לא מחובר
          </h3>
          <p className="text-muted text-muted mb-6">
            חבר את Google Calendar כדי לראות את האירועים שלך
          </p>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="btn-primary mx-auto bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-foreground shadow-lg"
        >
          הגדר Google Calendar
        </button>
      </div>
    );
  }

  // Show auth error with reconnect option
  if (authError) {
    return (
      <div className="premium-card-static bg-elevated rounded-2xl shadow-xl p-8 text-center space-y-6 transition-all duration-300">
        <div className="mx-auto w-20 h-20 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-500/20 dark:to-orange-500/20 rounded-2xl flex items-center justify-center shadow-lg border-2 border-amber-300 dark:border-amber-500/30">
          <Calendar className="h-10 w-10 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground mb-2">
            נדרש חיבור מחדש
          </h3>
          <p className="text-muted text-muted mb-2">
            ההרשאה ל-Google Calendar פגה
          </p>
          <p className="text-muted text-muted text-sm mb-6">
            {authError}
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => setShowSettings(true)}
            className="btn-primary bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-foreground shadow-lg"
          >
            חבר מחדש
          </button>
          <button
            onClick={() => {
              setAuthError(null);
              loadEvents(false, true);
            }}
            className="px-4 py-2 bg-surface hover:bg-elevated text-foreground rounded-xl transition-all duration-300 border border-border"
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
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleWeekDragEnd}
      >
        <div className="overflow-x-auto bg-white dark:bg-elevated rounded-xl border border-gray-200 dark:border-border">
          <div className="min-w-[800px]">
            {/* Week header with day names and dates */}
            <div className="grid grid-cols-8 border-b border-gray-200 dark:border-border bg-white dark:bg-elevated">
              {/* Empty cell for time column */}
              <div className="py-3 px-2 text-center text-xs text-gray-500 dark:text-muted border-l border-gray-200 dark:border-border font-medium">GMT+02</div>
              {weekDays.map((day, idx) => {
                const isToday = day.toDateString() === new Date().toDateString();
                const dayNum = day.getDate();
                const dayName = day.toLocaleDateString('he-IL', { weekday: 'short' });
                return (
                  <div 
                    key={idx} 
                    className="py-3 px-1 text-center border-l border-gray-200 dark:border-border cursor-pointer hover:bg-gray-50 dark:hover:bg-surface transition-colors duration-200"
                    onClick={() => handleWeekCellClick(day, 9)} // Default to 9:00 AM when clicking header
                    title="לחץ ליצירת אימון מהיר"
                  >
                    <div className="text-xs text-gray-500 dark:text-muted mb-1.5 font-medium">{dayName}</div>
                    <div className={`text-lg font-medium mx-auto w-10 h-10 flex items-center justify-center rounded-full transition-colors duration-200 ${
                      isToday 
                        ? 'bg-blue-500 text-white' 
                        : 'text-gray-800 dark:text-foreground hover:bg-gray-100 dark:hover:bg-surface'
                    }`}>
                      {dayNum}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* All-day events row */}
            <div className="grid grid-cols-8 border-b border-gray-200 dark:border-border bg-gray-50 dark:bg-elevated">
              <div className="text-xs text-gray-500 dark:text-muted py-2 px-2 border-l border-gray-200 dark:border-border text-center font-medium">כל היום</div>
              {weekDays.map((day, idx) => {
                const allDayEvents = getAllDayEvents(day);
                return (
                  <div 
                    key={idx} 
                    className="min-h-[40px] p-1.5 border-l border-gray-200 dark:border-border cursor-pointer hover:bg-gray-100 dark:hover:bg-surface transition-colors duration-200"
                    onClick={() => handleWeekCellClick(day, 9)}
                    title="לחץ ליצירת אימון מהיר"
                  >
                    <div className="space-y-0.5">
                      {allDayEvents.map((event, eventIdx) => (
                        <div key={`${event.id}-${eventIdx}`} onClick={(e) => e.stopPropagation()}>
                          <EventItem
                            event={event}
                            onEventClick={onEventClick}
                            onDelete={handleDeleteEvent}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Hour slots */}
            <div className="grid grid-cols-8">
              {/* Hour labels column */}
              <div className="space-y-0 bg-white dark:bg-elevated">
                {hours.map(hour => (
                  <div
                    key={hour}
                    className="h-14 border-b border-l border-gray-200 dark:border-border flex items-start justify-end pr-2 pt-0"
                  >
                    <span className="text-xs text-gray-400 dark:text-muted -mt-2.5 bg-white dark:bg-elevated px-1 font-normal">{hour}:00</span>
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {weekDays.map((day, dayIdx) => (
                <div key={dayIdx} className="space-y-0 relative">
                  {hours.map(hour => {
                    const hourEvents = getEventsForHour(day, hour);
                    return (
                      <DroppableWeekHourCell
                        key={`${dayIdx}-${hour}`}
                        day={day}
                        hour={hour}
                        hourEvents={hourEvents}
                        onEventClick={onEventClick}
                        onDelete={handleDeleteEvent}
                        onCellClick={handleWeekCellClick}
                        activeEventId={activeEvent?.id || null}
                        sessionInfoMap={sessionInfoMap}
                        eventPositionMap={eventPositionMap}
                        onTraineeNameClick={handleTraineeNameClick}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Drag Overlay for week view */}
        <DragOverlay>
          {activeEvent ? (
            <div className="text-xs bg-emerald-500 text-white p-2 rounded-md border-r-4 border-emerald-700 truncate max-w-[150px]">
              <div className="font-semibold">{extractTraineeName(activeEvent)}</div>
              <div className="text-white/85 text-[11px] mt-0.5 font-medium">
                {activeEvent.start.dateTime && new Date(activeEvent.start.dateTime).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    );
  };

  // Render day view
  const renderDayView = () => {
    const hours = Array.from({ length: HOURS_PER_DAY }, (_, i) => HOUR_START + i);
    const isToday = currentDate.toDateString() === new Date().toDateString();
    const allDayEvents = getAllDayEvents(currentDate);

    return (
      <div className="overflow-x-auto bg-white dark:bg-elevated rounded-xl border border-gray-200 dark:border-border">
        <div className="min-w-[400px]">
          {/* Day header */}
          <div className="flex items-center justify-center py-5 border-b border-gray-200 dark:border-border bg-white dark:bg-elevated">
            <div className="text-center">
              <div className="text-xs text-gray-500 dark:text-muted mb-2 font-medium">
                {currentDate.toLocaleDateString('he-IL', { weekday: 'long' })}
              </div>
              <div className={`text-2xl font-medium mx-auto w-12 h-12 flex items-center justify-center rounded-full transition-colors duration-200 ${
                isToday ? 'bg-blue-500 text-white' : 'text-gray-800 dark:text-foreground hover:bg-gray-100 dark:hover:bg-surface'
              }`}>
                {currentDate.getDate()}
              </div>
            </div>
          </div>

          {/* All-day events */}
          {allDayEvents.length > 0 && (
            <div className="border-b border-gray-200 dark:border-border p-2.5 bg-gray-50 dark:bg-elevated">
              <div className="text-xs text-gray-500 dark:text-muted mb-1.5 font-medium">כל היום</div>
              <div className="space-y-1">
                {allDayEvents.map((event, eventIdx) => (
                  <EventItem
                    key={`${event.id}-allday-${eventIdx}`}
                    event={event}
                    onEventClick={onEventClick}
                    onDelete={handleDeleteEvent}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Hour slots */}
          <div className="grid grid-cols-[60px_1fr]">
            {/* Hour labels */}
            <div className="space-y-0 bg-white dark:bg-elevated">
              {hours.map(hour => (
                <div
                  key={hour}
                  className="h-14 border-b border-gray-200 dark:border-border flex items-start justify-end pr-2 pt-0"
                >
                  <span className="text-xs text-gray-400 dark:text-muted -mt-2.5 bg-white dark:bg-elevated px-1 font-normal">{hour}:00</span>
                </div>
              ))}
            </div>

            {/* Events column */}
            <div className="space-y-0 relative border-l border-gray-200 dark:border-border bg-white dark:bg-elevated">
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
                    className="h-14 border-b border-gray-200 dark:border-border cursor-pointer hover:bg-gray-50 dark:hover:bg-surface transition-colors duration-200 relative"
                  >
                    {/* Current time indicator - only on today */}
                    {isToday && <CurrentTimeIndicator hour={hour} />}
                    
                    {hourEvents.map((event, eventIdx) => {
                      const eventStart = new Date(event.start.dateTime || event.start.date || '');
                      const eventEnd = new Date(event.end.dateTime || event.end.date || '');
                      const startMinutes = eventStart.getMinutes();
                      const duration = (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60);
                      const heightPercent = Math.max((duration / 60) * 100, 100);
                      const startTime = eventStart.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
                      const endTime = eventEnd.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
                      const traineeName = extractTraineeName(event);
                      const positionInfo = eventPositionMap.get(event.id) || null;
                      const sessionInfo = (() => {
                        for (const [, info] of sessionInfoMap) {
                          if (info.traineeName === traineeName) return info;
                        }
                        return null;
                      })();
                      const displayInfo = formatTraineeNameWithPosition(traineeName, positionInfo, sessionInfo);
                      
                      return (
                        <div
                          key={`${event.id}-day-${hour}-${eventIdx}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick?.(event);
                          }}
                          className="absolute left-2 right-2 bg-emerald-500 text-white text-xs px-2.5 py-1.5 rounded-md cursor-pointer hover:bg-emerald-600 z-10 overflow-hidden border-r-4 border-emerald-700 transition-colors duration-200"
                          style={{
                            top: `${(startMinutes / 60) * 100}%`,
                            height: `${heightPercent}%`,
                            minHeight: '50px',
                          }}
                          title={`${event.summary} - ${startTime}`}
                        >
                          {/* Trainee Name with Position - Prominent */}
                          <div className="text-sm font-semibold text-white truncate">
                            {displayInfo.displayName}
                          </div>
                          {/* Time range */}
                          <div className="text-[11px] text-white/85 mt-0.5 font-medium">
                            {endTime} עד {startTime}
                          </div>
                          {event.location && (
                            <div className="text-[10px] text-white/70 mt-1 truncate">
                              {event.location}
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
      <div className="premium-card-static bg-elevated rounded-2xl shadow-xl p-3 sm:p-4 lg:p-6 transition-all duration-300">
        {/* Main header container - stacks on mobile/tablet portrait, row on landscape/desktop */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 md:gap-4">
          
          {/* Navigation Section */}
          <div className="flex items-center justify-between md:justify-start gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={() => navigateDate('prev')}
                className="p-1.5 sm:p-2 hover:bg-surface rounded-xl transition-all duration-300 border border-border"
              >
                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
              </button>
              <h2 className="text-base sm:text-lg md:text-xl font-bold text-foreground whitespace-nowrap">
                {formatDateHeader}
              </h2>
              <button
                onClick={() => navigateDate('next')}
                className="p-1.5 sm:p-2 hover:bg-surface rounded-xl transition-all duration-300 border border-border"
              >
                <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
              </button>
            </div>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-2.5 py-1 sm:px-3 text-xs sm:text-sm bg-surface hover:bg-elevated text-foreground rounded-xl transition-all duration-300 border border-border"
            >
              היום
            </button>
          </div>
          
          {/* Controls Section - View modes and action buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            {/* View mode buttons */}
            <div className="flex items-center justify-center gap-1 bg-surface rounded-xl p-1 border border-border">
              <button
                onClick={() => setViewMode('month')}
                className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 text-xs sm:text-sm rounded-lg transition-all duration-300 flex items-center justify-center gap-1 sm:gap-2 ${
                  viewMode === 'month'
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-foreground shadow-lg'
                    : 'text-foreground hover:bg-elevated'
                }`}
                title="תצוגת חודש"
              >
                <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">חודש</span>
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 text-xs sm:text-sm rounded-lg transition-all duration-300 flex items-center justify-center gap-1 sm:gap-2 ${
                  viewMode === 'week'
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-foreground shadow-lg'
                    : 'text-foreground hover:bg-elevated'
                }`}
                title="תצוגת שבוע"
              >
                <CalendarRange className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">שבוע</span>
              </button>
              <button
                onClick={() => setViewMode('day')}
                className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 text-xs sm:text-sm rounded-lg transition-all duration-300 flex items-center justify-center gap-1 sm:gap-2 ${
                  viewMode === 'day'
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-foreground shadow-lg'
                    : 'text-foreground hover:bg-elevated'
                }`}
                title="תצוגת יום"
              >
                <CalendarDays className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">יום</span>
              </button>
            </div>
            
            {/* Action buttons - wrap on tablet portrait, row on landscape */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap md:flex-nowrap items-center gap-2">
              <button
                onClick={() => setShowRecurringModal(true)}
                className="px-2.5 sm:px-3 md:px-4 py-2 text-xs sm:text-sm bg-gradient-to-br from-purple-500/20 to-purple-600/20 dark:from-purple-500/20 dark:to-purple-600/20 hover:from-purple-500/30 hover:to-purple-600/30 text-purple-700 dark:text-purple-400 rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 sm:gap-2 border border-purple-500/30 dark:border-purple-500/30 shadow-sm"
                title="קביעת אימונים חוזרים"
              >
                <Repeat className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden md:inline">קביעת אימונים</span>
                <span className="md:hidden">קביעה</span>
              </button>
              <button
                onClick={() => setShowSyncModal(true)}
                className="px-2.5 sm:px-3 md:px-4 py-2 text-xs sm:text-sm bg-gradient-to-br from-emerald-500/20 to-teal-500/20 dark:from-emerald-500/20 dark:to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 text-emerald-700 dark:text-emerald-400 rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 sm:gap-2 border border-emerald-500/30 dark:border-emerald-500/30 shadow-sm"
                title="סנכרון מתאמנים מהיומן"
              >
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden md:inline">סנכרון מתאמנים</span>
                <span className="md:hidden">סנכרון</span>
              </button>
              <button
                onClick={handleManualRefresh}
                disabled={loading || isRefreshing}
                className="px-2.5 sm:px-3 md:px-4 py-2 text-xs sm:text-sm bg-surface hover:bg-elevated text-foreground rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 sm:gap-2 border border-border"
                title="רענון יומן"
              >
                <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                רענון
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="px-2.5 sm:px-3 md:px-4 py-2 text-xs sm:text-sm bg-surface hover:bg-elevated text-foreground rounded-xl transition-all duration-300 border border-border flex items-center justify-center"
              >
                הגדרות
              </button>
              {onCreateWorkout && (
                <button
                  onClick={onCreateWorkout}
                  className="col-span-2 sm:col-span-1 btn-primary flex items-center justify-center gap-2 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-foreground shadow-lg text-xs sm:text-sm py-2.5 md:py-2"
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
      <div className="bg-white dark:bg-elevated rounded-xl border border-gray-200 dark:border-border overflow-hidden relative transition-colors duration-200">
        {loading ? (
          <div className="flex items-center justify-center py-12 min-h-[400px]">
            <div className="flex flex-col items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-emerald-500 flex items-center justify-center animate-pulse">
                <Calendar className="w-7 h-7 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-500 dark:text-muted">טוען יומן...</span>
            </div>
          </div>
        ) : viewMode === 'month' ? (
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className={`grid grid-cols-7 bg-white dark:bg-elevated ${isUpdating ? 'opacity-50 pointer-events-none' : ''}`}>
              {/* Week days header */}
              {weekDayNames.map((day, index) => (
                <div
                  key={index}
                  className="text-center text-xs text-gray-600 dark:text-foreground py-3 border-b border-l border-gray-200 dark:border-border font-medium bg-gray-50 dark:bg-elevated"
                >
                  {day === 'א' ? 'יום א׳' : day === 'ב' ? 'יום ב׳' : day === 'ג' ? 'יום ג׳' : day === 'ד' ? 'יום ד׳' : day === 'ה' ? 'יום ה׳' : day === 'ו' ? 'יום ו׳' : 'שבת'}
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
                    sessionInfoMap={sessionInfoMap}
                    eventPositionMap={eventPositionMap}
                    onTraineeNameClick={handleTraineeNameClick}
                  />
                );
              })}
            </div>

            {/* Drag Overlay - shows floating preview of dragged event */}
            <DragOverlay>
              {activeEvent ? (
                <div className="text-xs bg-emerald-500 text-white p-2 rounded-md border-r-4 border-emerald-700 truncate max-w-[120px]">
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
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-black/50 backdrop-blur-sm rounded-xl">
            <div className="flex items-center gap-2.5 bg-white dark:bg-elevated px-5 py-3 rounded-lg shadow-lg border border-gray-200 dark:border-border">
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-emerald-500"></div>
              <span className="text-sm text-gray-700 dark:text-foreground font-medium">מעביר אירוע...</span>
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
        onQuickCreateTrainee={onQuickCreateTrainee}
        currentDate={currentDate}
      />

      {/* Quick Add Workout Modal */}
      <QuickAddWorkoutModal
        isOpen={showQuickAddModal}
        onClose={() => setShowQuickAddModal(false)}
        selectedDate={quickAddDate}
        onWorkoutCreated={() => {
          // Refresh events after workout creation
          loadEvents(false, true);
        }}
      />

      {/* Trainee Workout History Modal */}
      {showHistoryModal && selectedTraineeForHistory && (
        <TraineeWorkoutHistoryModal
          isOpen={showHistoryModal}
          onClose={() => {
            setShowHistoryModal(false);
            setSelectedTraineeForHistory(null);
          }}
          traineeName={selectedTraineeForHistory.name}
          traineeId={selectedTraineeForHistory.id}
          currentDate={currentDate}
          onWorkoutUpdated={() => {
            // Refresh events after workout update
            loadEvents(false, true);
          }}
        />
      )}

      {/* Recurring Workout Modal */}
      <RecurringWorkoutModal
        isOpen={showRecurringModal}
        onClose={() => setShowRecurringModal(false)}
        onWorkoutsCreated={() => {
          // Refresh events after workouts creation
          loadEvents(false, true);
        }}
      />
    </div>
  );
}
