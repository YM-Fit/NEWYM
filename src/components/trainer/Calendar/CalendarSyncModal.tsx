/**
 * CalendarSyncModal - Modal for matching calendar events to trainees
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  X, 
  Users, 
  Check, 
  AlertCircle, 
  UserPlus, 
  Calendar, 
  ChevronDown, 
  ChevronUp,
  RefreshCw,
  Link2
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useTrainees } from '../../../hooks/useSupabaseQuery';
import { getGoogleCalendarEvents } from '../../../api/googleCalendarApi';
import { supabase } from '../../../lib/supabase';
import { 
  matchEventsToTrainees, 
  groupEventsByName,
  getAllTraineesForSelection,
  type MatchedEvent,
  type MatchResult
} from '../../../utils/nameMatching';
import toast from 'react-hot-toast';
import { logger } from '../../../utils/logger';

interface CalendarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTrainee?: (name: string, eventId?: string) => void;
  onQuickCreateTrainee?: (name: string) => Promise<string | null>; // Returns trainee ID on success
  currentDate: Date;
}

type SyncStep = 'loading' | 'review' | 'saving' | 'done';

interface EventMatch {
  eventId: string;
  traineeId: string | null;
  action: 'link' | 'create' | 'skip';
  displayName: string;
}

export default function CalendarSyncModal({
  isOpen,
  onClose,
  onCreateTrainee,
  onQuickCreateTrainee,
  currentDate
}: CalendarSyncModalProps) {
  const { user } = useAuth();
  const { data: trainees = [], loading: traineesLoading, refetch: refetchTrainees } = useTrainees(user?.id || null);
  
  const [step, setStep] = useState<SyncStep>('loading');
  const [matchedEvents, setMatchedEvents] = useState<MatchedEvent[]>([]);
  const [decisions, setDecisions] = useState<Map<string, EventMatch>>(new Map());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quickCreatingFor, setQuickCreatingFor] = useState<string | null>(null); // event group name being created

  // Load events and match them
  const loadAndMatchEvents = useCallback(async () => {
    if (!user) return;
    
    setStep('loading');
    setError(null);
    
    try {
      // Get date range for current month
      const start = new Date(currentDate);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(currentDate);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);

      // Fetch events DIRECTLY from Google Calendar (not from cache)
      // This ensures we see ALL events including ones not yet synced
      const result = await getGoogleCalendarEvents(user.id, { start, end });
      
      console.log('📅 CalendarSync - Events from Google:', result.data?.length || 0, result.data?.map(e => e.summary));
      
      if (!result.success || !result.data) {
        setError(result.error || 'שגיאה בטעינת אירועים');
        return;
      }

      // Get existing synced events - we only filter out events that ALREADY have a trainee linked
      const { data: existingSyncs } = await supabase
        .from('google_calendar_sync')
        .select('google_event_id, trainee_id')
        .eq('trainer_id', user.id)
        .in('google_event_id', result.data.map(e => e.id));

      console.log('📅 CalendarSync - Existing syncs with trainee:', existingSyncs?.filter(s => s.trainee_id).length || 0);

      // Only filter out events that already have a trainee_id assigned
      const linkedEventIds = new Set(
        (existingSyncs || [])
          .filter(s => s.trainee_id !== null)
          .map(s => s.google_event_id)
      );

      // Show events that don't have a trainee linked yet
      const unprocessedEvents = result.data.filter(e => !linkedEventIds.has(e.id));

      console.log('📅 CalendarSync - Unprocessed events:', unprocessedEvents.length, unprocessedEvents.map(e => e.summary));

      if (unprocessedEvents.length === 0) {
        setMatchedEvents([]);
        setStep('review');
        return;
      }

      // Match events to trainees
      const matched = matchEventsToTrainees(unprocessedEvents, trainees || []);
      setMatchedEvents(matched);

      // Initialize decisions based on auto-matches
      const initialDecisions = new Map<string, EventMatch>();
      matched.forEach(m => {
        if (m.status === 'matched' && m.selectedTraineeId) {
          initialDecisions.set(m.event.id, {
            eventId: m.event.id,
            traineeId: m.selectedTraineeId,
            action: 'link',
            displayName: m.event.extractedName || m.event.summary
          });
        }
      });
      setDecisions(initialDecisions);
      
      setStep('review');
    } catch (err) {
      logger.error('Error loading events for sync', err, 'CalendarSyncModal');
      setError('שגיאה בטעינת אירועים');
    }
  }, [user, currentDate, trainees]);

  useEffect(() => {
    if (isOpen && !traineesLoading) {
      loadAndMatchEvents();
    }
  }, [isOpen, traineesLoading, loadAndMatchEvents]);

  // Group events by extracted name
  const groupedEvents = useMemo(() => {
    return groupEventsByName(matchedEvents);
  }, [matchedEvents]);

  // Stats
  const stats = useMemo(() => {
    const matched = matchedEvents.filter(e => e.status === 'matched').length;
    const pending = matchedEvents.filter(e => e.status === 'pending').length;
    const newNames = matchedEvents.filter(e => e.status === 'new').length;
    const unmatched = matchedEvents.filter(e => e.status === 'unmatched').length;
    return { matched, pending, newNames, unmatched, total: matchedEvents.length };
  }, [matchedEvents]);

  // Handle trainee selection for an event
  const handleSelectTrainee = (eventId: string, traineeId: string | null, displayName: string) => {
    const newDecisions = new Map(decisions);
    if (traineeId) {
      newDecisions.set(eventId, { 
        eventId, 
        traineeId, 
        action: 'link',
        displayName 
      });
    } else {
      newDecisions.delete(eventId);
    }
    setDecisions(newDecisions);
  };

  // Handle create new trainee decision
  const handleCreateNew = (eventId: string, displayName: string) => {
    const newDecisions = new Map(decisions);
    newDecisions.set(eventId, { 
      eventId, 
      traineeId: null, 
      action: 'create',
      displayName 
    });
    setDecisions(newDecisions);
  };

  // Handle skip decision
  const handleSkip = (eventId: string, displayName: string) => {
    const newDecisions = new Map(decisions);
    newDecisions.set(eventId, { 
      eventId, 
      traineeId: null, 
      action: 'skip',
      displayName 
    });
    setDecisions(newDecisions);
  };

  // Handle quick create trainee - creates trainee with name only and links immediately
  const handleQuickCreate = async (displayName: string, events: MatchedEvent[]) => {
    if (!onQuickCreateTrainee) return;
    
    setQuickCreatingFor(displayName);
    try {
      const newTraineeId = await onQuickCreateTrainee(displayName);
      if (newTraineeId) {
        // Link all events in this group to the new trainee
        const newDecisions = new Map(decisions);
        events.forEach(e => {
          newDecisions.set(e.event.id, {
            eventId: e.event.id,
            traineeId: newTraineeId,
            action: 'link',
            displayName: e.event.extractedName || e.event.summary
          });
        });
        setDecisions(newDecisions);
        
        // Refresh trainees list
        await refetchTrainees();
        
        toast.success(`מתאמן "${displayName}" נוצר וקושר לאירועים`);
      }
    } catch (err) {
      logger.error('Error in quick create trainee', err, 'CalendarSyncModal');
      toast.error('שגיאה ביצירת מתאמן');
    } finally {
      setQuickCreatingFor(null);
    }
  };

  // Toggle group expansion
  const toggleGroup = (groupName: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName);
    } else {
      newExpanded.add(groupName);
    }
    setExpandedGroups(newExpanded);
  };

  // Save all links
  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    setStep('saving');
    
    try {
      const linksToSave: Array<{
        trainer_id: string;
        trainee_id: string;
        google_event_id: string;
        google_calendar_id: string;
        sync_status: 'synced';
        sync_direction: 'from_google';
        event_start_time: string;
        event_end_time: string | null;
        event_summary: string;
      }> = [];
      
      const traineesToCreate: Array<{ name: string; eventId: string }> = [];
      
      // Track name-to-trainee mappings for auto-sync
      const nameToTraineeMap = new Map<string, string>();

      for (const [eventId, decision] of decisions.entries()) {
        const matchedEvent = matchedEvents.find(e => e.event.id === eventId);
        if (!matchedEvent) continue;

        // Get the extracted name to find ALL events with the same name in the group
        const extractedName = matchedEvent.event.extractedName?.toLowerCase() || matchedEvent.event.summary.toLowerCase().replace(/^(אימון|פגישה|טיפול|מפגש)\s*[-–:]\s*/i, '').trim();
        
        // Find ALL events with the same extracted name
        const eventsInGroup = matchedEvents.filter(e => {
          const eName = e.event.extractedName?.toLowerCase() || e.event.summary.toLowerCase().replace(/^(אימון|פגישה|טיפול|מפגש)\s*[-–:]\s*/i, '').trim();
          return eName === extractedName;
        });

        if (decision.action === 'link' && decision.traineeId) {
          // Link ALL events in this group to the trainee
          for (const evt of eventsInGroup) {
            // Skip if already in linksToSave
            if (linksToSave.some(l => l.google_event_id === evt.event.id)) continue;
            
            linksToSave.push({
              trainer_id: user.id,
              trainee_id: decision.traineeId,
              google_event_id: evt.event.id,
              google_calendar_id: 'primary',
              sync_status: 'synced',
              sync_direction: 'from_google',
              event_start_time: evt.event.start.dateTime || evt.event.start.date || new Date().toISOString(),
              event_end_time: evt.event.end?.dateTime || evt.event.end?.date || null,
              event_summary: evt.event.summary
            });
          }
          
          // Track the name-to-trainee mapping for auto-sync
          nameToTraineeMap.set(extractedName, decision.traineeId);
        } else if (decision.action === 'create') {
          traineesToCreate.push({
            name: decision.displayName,
            eventId
          });
        }
      }

      // Save links to database AND create workouts
      if (linksToSave.length > 0) {
        // First, create workouts for each synced event
        for (const link of linksToSave) {
          // Determine if workout is in the past (should be marked as completed)
          const eventDate = new Date(link.event_start_time);
          const now = new Date();
          const isInPast = eventDate < now;
          
          // Create workout record
          const { data: workoutData, error: workoutError } = await supabase
            .from('workouts')
            .insert({
              trainer_id: user.id,
              workout_date: link.event_start_time,
              workout_type: 'personal',
              is_completed: isInPast, // Only mark as completed if it's in the past
              google_event_id: link.google_event_id,
              google_event_summary: link.event_summary,
              synced_from_google: true,
            })
            .select('id')
            .single();

          if (workoutError) {
            logger.error('Error creating workout for synced event', workoutError, 'CalendarSyncModal');
            continue; // Skip this one but continue with others
          }

          // Link workout to trainee
          if (workoutData) {
            const { error: linkError } = await supabase
              .from('workout_trainees')
              .insert({
                workout_id: workoutData.id,
                trainee_id: link.trainee_id,
              });

            if (linkError) {
              logger.error('Error linking workout to trainee', linkError, 'CalendarSyncModal');
            }

            // Update link with workout_id
            link.workout_id = workoutData.id;
          }
        }

        // Now save the sync records
        const { error: insertError } = await supabase
          .from('google_calendar_sync')
          .upsert(linksToSave.map(l => ({
            ...l,
            workout_id: (l as any).workout_id || null
          })), { 
            onConflict: 'google_event_id,google_calendar_id',
            ignoreDuplicates: false 
          });

        if (insertError) {
          throw new Error(insertError.message);
        }
      }

      // Auto-sync future events with the same names
      let autoSyncedCount = 0;
      if (nameToTraineeMap.size > 0) {
        try {
          // Fetch future events (next 6 months)
          const futureStart = new Date();
          const futureEnd = new Date();
          futureEnd.setMonth(futureEnd.getMonth() + 6);

          const futureEventsResult = await getGoogleCalendarEvents(user.id, { start: futureStart, end: futureEnd });

          if (futureEventsResult.success && futureEventsResult.data) {
            // Get existing synced event IDs
            const { data: existingSyncs } = await supabase
              .from('google_calendar_sync')
              .select('google_event_id')
              .eq('trainer_id', user.id)
              .in('google_event_id', futureEventsResult.data.map(e => e.id));

            const syncedEventIds = new Set((existingSyncs || []).map(s => s.google_event_id));

            // Filter to unsyced future events
            const unsyncedFutureEvents = futureEventsResult.data.filter(e => !syncedEventIds.has(e.id));

            // Check for name conflicts - look for similar but different names
            const allEventNames = new Set<string>();
            unsyncedFutureEvents.forEach(e => {
              const name = e.summary?.toLowerCase().replace(/^(אימון|פגישה|טיפול|מפגש)\s*[-–:]\s*/i, '').trim();
              if (name) allEventNames.add(name);
            });

            // Find potential conflicts (names that start the same but are different)
            const hasNameConflict = (baseName: string): boolean => {
              const firstName = baseName.split(' ')[0];
              let conflictFound = false;
              allEventNames.forEach(name => {
                if (name !== baseName && name.startsWith(firstName) && !nameToTraineeMap.has(name)) {
                  conflictFound = true;
                }
              });
              return conflictFound;
            };

            // Prepare auto-sync links and create workouts for each
            for (const event of unsyncedFutureEvents) {
              const extractedName = event.summary?.toLowerCase().replace(/^(אימון|פגישה|טיפול|מפגש)\s*[-–:]\s*/i, '').trim();
              if (!extractedName) continue;

              // Check if we have a mapping for this name
              const traineeId = nameToTraineeMap.get(extractedName);
              if (!traineeId) continue;

              // Check for name conflicts
              if (hasNameConflict(extractedName)) {
                logger.info(`Skipping auto-sync for "${extractedName}" due to name conflict`, {}, 'CalendarSyncModal');
                continue;
              }

              const eventStartTime = event.start?.dateTime || event.start?.date || new Date().toISOString();
              const eventEndTime = event.end?.dateTime || event.end?.date || null;

              // Create workout record for this future event
              // Determine if this future event is actually in the past
              const eventDate = new Date(eventStartTime);
              const now = new Date();
              const isInPast = eventDate < now;
              
              const { data: workoutData, error: workoutError } = await supabase
                .from('workouts')
                .insert({
                  trainer_id: user.id,
                  workout_date: eventStartTime,
                  workout_type: 'personal',
                  is_completed: isInPast, // Only mark completed if in the past
                  is_prepared: false, // Calendar sync workouts are always dynamic
                  google_event_id: event.id,
                  google_event_summary: event.summary || '',
                  synced_from_google: true,
                })
                .select('id')
                .single();

              if (workoutError) {
                logger.error('Error creating workout for auto-synced event', workoutError, 'CalendarSyncModal');
                continue;
              }

              // Link workout to trainee
              if (workoutData) {
                await supabase
                  .from('workout_trainees')
                  .insert({
                    workout_id: workoutData.id,
                    trainee_id: traineeId,
                  });
              }

              // Save sync record
              const { error: syncError } = await supabase
                .from('google_calendar_sync')
                .upsert({
                  trainer_id: user.id,
                  trainee_id: traineeId,
                  google_event_id: event.id,
                  google_calendar_id: 'primary',
                  sync_status: 'synced',
                  sync_direction: 'from_google',
                  event_start_time: eventStartTime,
                  event_end_time: eventEndTime,
                  event_summary: event.summary || '',
                  workout_id: workoutData?.id || null
                }, { 
                  onConflict: 'google_event_id,google_calendar_id',
                  ignoreDuplicates: true 
                });

              if (!syncError) {
                autoSyncedCount++;
              }
            }
          }
        } catch (autoSyncErr) {
          // Don't fail the main save, just log the error
          logger.error('Error in auto-sync future events', autoSyncErr, 'CalendarSyncModal');
        }
      }

      // Trigger trainee creation for each new person
      for (const trainee of traineesToCreate) {
        if (onCreateTrainee) {
          onCreateTrainee(trainee.name, trainee.eventId);
        }
      }

      const savedCount = linksToSave.length;
      const createCount = traineesToCreate.length;
      
      if (savedCount > 0 || createCount > 0 || autoSyncedCount > 0) {
        let message = '';
        if (savedCount > 0) message += `${savedCount} אירועים קושרו`;
        if (autoSyncedCount > 0) message += `${message ? ', ' : ''}${autoSyncedCount} אירועים עתידיים סונכרנו אוטומטית`;
        if (createCount > 0) message += `${message ? ', ' : ''}${createCount} מתאמנים חדשים להוספה`;
        toast.success(message);
      }

      setStep('done');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      logger.error('Error saving calendar sync', err, 'CalendarSyncModal');
      toast.error('שגיאה בשמירת הקישורים');
      setStep('review');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="premium-card-static bg-white bg-elevated rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col border border-border border-border30 shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border border-border30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 rounded-xl border border-emerald-500/30">
              <Users className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground text-foreground">סנכרון מתאמנים</h2>
              <p className="text-sm text-muted text-muted">
                {currentDate.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface rounded-xl transition-all duration-300"
          >
            <X className="h-5 w-5 text-muted text-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'loading' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg animate-pulse border-2 border-emerald-400/30">
                <RefreshCw className="h-8 w-8 text-white animate-spin" />
              </div>
              <p className="text-muted text-muted font-medium">טוען אירועים ומתאים שמות...</p>
            </div>
          )}

          {step === 'review' && error && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-100 to-rose-100 flex items-center justify-center shadow-lg border-2 border-red-300">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <p className="text-foreground text-foreground font-medium">{error}</p>
              <button
                onClick={loadAndMatchEvents}
                className="px-4 py-2 bg-surface bg-surface hover:bg-elevated text-foreground text-foreground rounded-xl transition-all duration-300 border border-border border-border30"
              >
                נסה שוב
              </button>
            </div>
          )}

          {step === 'review' && !error && matchedEvents.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-100 flex items-center justify-center shadow-lg border-2 border-emerald-300">
                <Check className="h-8 w-8 text-emerald-600" />
              </div>
              <p className="text-foreground text-foreground font-medium">כל האירועים כבר מסונכרנים!</p>
              <p className="text-muted text-muted text-sm">אין אירועים חדשים לקשר</p>
            </div>
          )}

          {step === 'review' && !error && matchedEvents.length > 0 && (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-50 border border-emerald-200 rounded-xl p-3 text-center transition-all duration-300 shadow-sm">
                  <div className="text-2xl font-bold text-emerald-600">{stats.matched}</div>
                  <div className="text-xs text-emerald-700 font-medium">התאמות מדויקות</div>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3 text-center transition-all duration-300 shadow-sm">
                  <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
                  <div className="text-xs text-amber-700 font-medium">ממתינים לאישור</div>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-50 border border-blue-200 rounded-xl p-3 text-center transition-all duration-300 shadow-sm">
                  <div className="text-2xl font-bold text-blue-600">{stats.newNames}</div>
                  <div className="text-xs text-blue-700 font-medium">שמות חדשים</div>
                </div>
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-border border-border30 rounded-xl p-3 text-center transition-all duration-300 shadow-sm">
                  <div className="text-2xl font-bold text-muted text-foreground">{stats.unmatched}</div>
                  <div className="text-xs text-foreground text-muted font-medium">לא זוהו</div>
                </div>
              </div>

              {/* Grouped Events */}
              <div className="space-y-3">
                {Array.from(groupedEvents.entries()).map(([groupName, events]) => {
                  const isExpanded = expandedGroups.has(groupName);
                  const firstEvent = events[0];
                  const decision = decisions.get(firstEvent.event.id);
                  const hasDecision = !!decision;
                  
                  return (
                    <div
                      key={groupName}
                      className="bg-surface50 bg-surface rounded-xl border border-border border-border30 overflow-hidden transition-all duration-300 shadow-sm"
                    >
                      {/* Group Header */}
                      <button
                        onClick={() => toggleGroup(groupName)}
                        className="w-full flex items-center justify-between p-4 hover:bg-surface transition-all duration-300"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            firstEvent.status === 'matched' ? 'bg-emerald-500/20' :
                            firstEvent.status === 'pending' ? 'bg-amber-500/20' :
                            firstEvent.status === 'new' ? 'bg-blue-500/20' :
                            'bg-elevated/50'
                          }`}>
                            {firstEvent.status === 'matched' ? (
                              <Check className="h-4 w-4 text-emerald-400" />
                            ) : firstEvent.status === 'new' ? (
                              <UserPlus className="h-4 w-4 text-blue-400" />
                            ) : (
                              <Calendar className="h-4 w-4 text-amber-400" />
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-foreground text-foreground">
                              {firstEvent.event.extractedName || firstEvent.event.summary}
                            </div>
                            <div className="text-xs text-muted text-muted">
                              {events.length} אירועים
                              {hasDecision && (
                                <span className="mr-2 text-emerald-600 font-semibold">
                                  • {decision.action === 'link' ? 'יקושר' : 
                                     decision.action === 'create' ? 'ייוצר מתאמן' : 'ידולג'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-muted text-muted" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted text-muted" />
                        )}
                      </button>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="px-4 pb-4 space-y-4">
                          {/* Events list */}
                          <div className="bg-white bg-elevated rounded-lg p-3 space-y-2 border border-border border-border30">
                            {events.slice(0, 5).map(event => (
                              <div key={event.event.id} className="flex items-center gap-2 text-sm">
                                <Calendar className="h-3 w-3 text-muted text-muted" />
                                <span className="text-foreground text-foreground">
                                  {new Date(event.event.start.dateTime || event.event.start.date || '').toLocaleDateString('he-IL', {
                                    weekday: 'short',
                                    day: 'numeric',
                                    month: 'short'
                                  })}
                                </span>
                                {event.event.start.dateTime && (
                                  <span className="text-muted text-muted">
                                    {new Date(event.event.start.dateTime).toLocaleTimeString('he-IL', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                )}
                              </div>
                            ))}
                            {events.length > 5 && (
                              <div className="text-xs text-muted text-muted">
                                +{events.length - 5} אירועים נוספים
                              </div>
                            )}
                          </div>

                          {/* Matches / Actions */}
                          {firstEvent.matches.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-xs text-muted text-muted font-medium">התאמות אפשריות:</div>
                              {firstEvent.matches.slice(0, 3).map(match => (
                                <button
                                  key={match.trainee.id}
                                  onClick={() => {
                                    events.forEach(e => {
                                      handleSelectTrainee(
                                        e.event.id, 
                                        match.trainee.id,
                                        e.event.extractedName || e.event.summary
                                      );
                                    });
                                  }}
                                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-300 ${
                                    decision?.traineeId === match.trainee.id
                                      ? 'bg-gradient-to-br from-emerald-50 to-emerald-50 border border-emerald-200'
                                      : 'bg-white bg-elevated hover:bg-surface border border-border border-border30'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                      match.matchType === 'exact' ? 'bg-emerald-500/30' :
                                      match.matchType === 'close' ? 'bg-amber-500/30' :
                                      'bg-elevated/50'
                                    }`}>
                                      {match.trainee.full_name[0]}
                                    </div>
                                    <div className="text-right">
                                      <div className="font-medium text-foreground text-foreground">{match.trainee.full_name}</div>
                                      <div className="text-xs text-muted text-muted">{match.trainee.phone || match.trainee.email}</div>
                                    </div>
                                  </div>
                                  <div className={`text-xs px-2 py-1 rounded-lg ${
                                    match.matchType === 'exact' ? 'bg-emerald-100 text-emerald-700' :
                                    match.matchType === 'close' ? 'bg-amber-100 text-amber-700' :
                                    'bg-surface bg-surface text-muted text-muted'
                                  }`}>
                                    {match.score}%
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Manual Selection - Always show for linking to any trainee */}
                          <div className="space-y-2">
                            <div className="text-xs text-muted text-muted font-medium">
                              {firstEvent.matches.length > 0 ? 'או בחר ידנית:' : 'בחר מתאמן לקישור:'}
                            </div>
                            <select
                              value={decision?.traineeId || ''}
                              onChange={(e) => {
                                const selectedId = e.target.value;
                                if (selectedId) {
                                  events.forEach(ev => {
                                    handleSelectTrainee(
                                      ev.event.id,
                                      selectedId,
                                      ev.event.extractedName || ev.event.summary
                                    );
                                  });
                                }
                              }}
                              className="w-full p-3 bg-white bg-elevated border border-border border-border30 rounded-xl text-foreground text-foreground focus:border-emerald-500/50 focus:outline-none transition-all duration-300"
                            >
                              <option value="">-- בחר מתאמן --</option>
                              {getAllTraineesForSelection(trainees || []).map(({ trainee }) => (
                                <option key={trainee.id} value={trainee.id}>
                                  {trainee.full_name} {trainee.phone ? `(${trainee.phone})` : ''}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Action buttons */}
                          <div className="flex flex-col gap-2 pt-2">
                            {/* Quick create - creates trainee with name only */}
                            {onQuickCreateTrainee && (
                              <button
                                onClick={() => handleQuickCreate(
                                  firstEvent.event.extractedName || firstEvent.event.summary,
                                  events
                                )}
                                disabled={quickCreatingFor === (firstEvent.event.extractedName || firstEvent.event.summary)}
                                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all duration-300 ${
                                  decision?.action === 'link' && decision.traineeId
                                    ? 'bg-gradient-to-br from-emerald-50 to-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-gradient-to-br from-emerald-500 to-emerald-700 hover:from-emerald-600 hover:to-emerald-800 text-white shadow-lg'
                                } disabled:opacity-50 disabled:cursor-wait`}
                              >
                                {quickCreatingFor === (firstEvent.event.extractedName || firstEvent.event.summary) ? (
                                  <>
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                    יוצר מתאמן...
                                  </>
                                ) : (
                                  <>
                                    <UserPlus className="h-4 w-4" />
                                    צור מתאמן מהיר וקשר
                                  </>
                                )}
                              </button>
                            )}
                            
                            <div className="flex gap-2">
                              {/* Full form create */}
                              {onCreateTrainee && (
                                <button
                                  onClick={() => {
                                    events.forEach(e => {
                                      handleCreateNew(
                                        e.event.id,
                                        e.event.extractedName || e.event.summary
                                      );
                                    });
                                  }}
                                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 text-sm ${
                                    decision?.action === 'create'
                                      ? 'bg-gradient-to-br from-blue-50 to-blue-50 text-blue-700 border border-blue-200'
                                      : 'bg-surface bg-surface hover:bg-elevated text-foreground text-foreground border border-border border-border30'
                                  }`}
                                >
                                  <UserPlus className="h-4 w-4" />
                                  טופס מלא
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  events.forEach(e => {
                                    handleSkip(
                                      e.event.id,
                                      e.event.extractedName || e.event.summary
                                    );
                                  });
                                }}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 text-sm ${
                                  decision?.action === 'skip'
                                    ? 'bg-elevated bg-elevated text-foreground text-foreground border border-border border-border50'
                                    : 'bg-surface bg-surface hover:bg-elevated text-muted text-muted border border-border border-border30'
                                }`}
                              >
                                דלג
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === 'saving' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg animate-pulse border-2 border-emerald-400/30">
                <RefreshCw className="h-8 w-8 text-white animate-spin" />
              </div>
              <p className="text-muted text-muted font-medium">שומר קישורים...</p>
            </div>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="p-4 bg-gradient-to-br from-emerald-100 to-emerald-100 rounded-full shadow-lg border-2 border-emerald-300">
                <Check className="h-10 w-10 text-emerald-600" />
              </div>
              <p className="text-xl font-bold text-foreground text-foreground">הסנכרון הושלם!</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'review' && !error && matchedEvents.length > 0 && (
          <div className="flex items-center justify-between p-6 border-t border-border border-border30">
            <div className="text-sm text-muted text-muted">
              {decisions.size} מתוך {matchedEvents.length} אירועים נבחרו
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-surface bg-surface hover:bg-elevated text-foreground text-foreground rounded-xl transition-all duration-300 border border-border border-border30"
              >
                ביטול
              </button>
              <button
                onClick={handleSave}
                disabled={decisions.size === 0 || saving}
                className="px-6 py-2 bg-gradient-to-br from-emerald-500 to-emerald-700 hover:from-emerald-600 hover:to-emerald-800 text-white rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
              >
                <Link2 className="h-4 w-4" />
                שמור קישורים
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
