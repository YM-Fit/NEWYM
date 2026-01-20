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
  currentDate
}: CalendarSyncModalProps) {
  const { user } = useAuth();
  const { data: trainees = [], loading: traineesLoading } = useTrainees(user?.id || null);
  
  const [step, setStep] = useState<SyncStep>('loading');
  const [matchedEvents, setMatchedEvents] = useState<MatchedEvent[]>([]);
  const [decisions, setDecisions] = useState<Map<string, EventMatch>>(new Map());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const result = await getGoogleCalendarEvents(user.id, { start, end }, { 
        useCache: false, 
        forceRefresh: true 
      });
      
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

        if (decision.action === 'link' && decision.traineeId) {
          linksToSave.push({
            trainer_id: user.id,
            trainee_id: decision.traineeId,
            google_event_id: eventId,
            google_calendar_id: 'primary',
            sync_status: 'synced',
            sync_direction: 'from_google',
            event_start_time: matchedEvent.event.start.dateTime || matchedEvent.event.start.date || new Date().toISOString(),
            event_end_time: matchedEvent.event.end?.dateTime || matchedEvent.event.end?.date || null,
            event_summary: matchedEvent.event.summary
          });
          
          // Track the name-to-trainee mapping for auto-sync
          const extractedName = matchedEvent.event.extractedName?.toLowerCase() || matchedEvent.event.summary.toLowerCase();
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

          const futureEventsResult = await getGoogleCalendarEvents(user.id, { start: futureStart, end: futureEnd }, { 
            useCache: false, 
            forceRefresh: true 
          });

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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col border border-zinc-800">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Users className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">סנכרון מתאמנים</h2>
              <p className="text-sm text-zinc-400">
                {currentDate.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-all"
          >
            <X className="h-5 w-5 text-zinc-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'loading' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <RefreshCw className="h-8 w-8 text-emerald-400 animate-spin" />
              <p className="text-zinc-400">טוען אירועים ומתאים שמות...</p>
            </div>
          )}

          {step === 'review' && error && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <AlertCircle className="h-12 w-12 text-red-400" />
              <p className="text-zinc-300">{error}</p>
              <button
                onClick={loadAndMatchEvents}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-all"
              >
                נסה שוב
              </button>
            </div>
          )}

          {step === 'review' && !error && matchedEvents.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Check className="h-12 w-12 text-emerald-400" />
              <p className="text-zinc-300">כל האירועים כבר מסונכרנים!</p>
              <p className="text-zinc-500 text-sm">אין אירועים חדשים לקשר</p>
            </div>
          )}

          {step === 'review' && !error && matchedEvents.length > 0 && (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-emerald-400">{stats.matched}</div>
                  <div className="text-xs text-emerald-300">התאמות מדויקות</div>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-amber-400">{stats.pending}</div>
                  <div className="text-xs text-amber-300">ממתינים לאישור</div>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-400">{stats.newNames}</div>
                  <div className="text-xs text-blue-300">שמות חדשים</div>
                </div>
                <div className="bg-zinc-500/10 border border-zinc-500/30 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-zinc-400">{stats.unmatched}</div>
                  <div className="text-xs text-zinc-300">לא זוהו</div>
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
                      className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 overflow-hidden"
                    >
                      {/* Group Header */}
                      <button
                        onClick={() => toggleGroup(groupName)}
                        className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/70 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            firstEvent.status === 'matched' ? 'bg-emerald-500/20' :
                            firstEvent.status === 'pending' ? 'bg-amber-500/20' :
                            firstEvent.status === 'new' ? 'bg-blue-500/20' :
                            'bg-zinc-700/50'
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
                            <div className="font-medium text-white">
                              {firstEvent.event.extractedName || firstEvent.event.summary}
                            </div>
                            <div className="text-xs text-zinc-400">
                              {events.length} אירועים
                              {hasDecision && (
                                <span className="mr-2 text-emerald-400">
                                  • {decision.action === 'link' ? 'יקושר' : 
                                     decision.action === 'create' ? 'ייוצר מתאמן' : 'ידולג'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-zinc-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-zinc-400" />
                        )}
                      </button>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="px-4 pb-4 space-y-4">
                          {/* Events list */}
                          <div className="bg-zinc-900/50 rounded-lg p-3 space-y-2">
                            {events.slice(0, 5).map(event => (
                              <div key={event.event.id} className="flex items-center gap-2 text-sm">
                                <Calendar className="h-3 w-3 text-zinc-500" />
                                <span className="text-zinc-400">
                                  {new Date(event.event.start.dateTime || event.event.start.date || '').toLocaleDateString('he-IL', {
                                    weekday: 'short',
                                    day: 'numeric',
                                    month: 'short'
                                  })}
                                </span>
                                {event.event.start.dateTime && (
                                  <span className="text-zinc-500">
                                    {new Date(event.event.start.dateTime).toLocaleTimeString('he-IL', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                )}
                              </div>
                            ))}
                            {events.length > 5 && (
                              <div className="text-xs text-zinc-500">
                                +{events.length - 5} אירועים נוספים
                              </div>
                            )}
                          </div>

                          {/* Matches / Actions */}
                          {firstEvent.matches.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-xs text-zinc-400 font-medium">התאמות אפשריות:</div>
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
                                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                                    decision?.traineeId === match.trainee.id
                                      ? 'bg-emerald-500/20 border border-emerald-500/50'
                                      : 'bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                      match.matchType === 'exact' ? 'bg-emerald-500/30' :
                                      match.matchType === 'close' ? 'bg-amber-500/30' :
                                      'bg-zinc-700/50'
                                    }`}>
                                      {match.trainee.full_name[0]}
                                    </div>
                                    <div className="text-right">
                                      <div className="font-medium text-white">{match.trainee.full_name}</div>
                                      <div className="text-xs text-zinc-500">{match.trainee.phone || match.trainee.email}</div>
                                    </div>
                                  </div>
                                  <div className={`text-xs px-2 py-1 rounded ${
                                    match.matchType === 'exact' ? 'bg-emerald-500/20 text-emerald-400' :
                                    match.matchType === 'close' ? 'bg-amber-500/20 text-amber-400' :
                                    'bg-zinc-700 text-zinc-400'
                                  }`}>
                                    {match.score}%
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Manual Selection - Always show for linking to any trainee */}
                          <div className="space-y-2">
                            <div className="text-xs text-zinc-400 font-medium">
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
                              className="w-full p-3 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-white focus:border-emerald-500/50 focus:outline-none"
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
                          <div className="flex gap-2 pt-2">
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
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all ${
                                  decision?.action === 'create'
                                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                                }`}
                              >
                                <UserPlus className="h-4 w-4" />
                                צור מתאמן חדש
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
                              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all ${
                                decision?.action === 'skip'
                                  ? 'bg-zinc-600/50 text-zinc-300 border border-zinc-500/50'
                                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'
                              }`}
                            >
                              דלג
                            </button>
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
              <RefreshCw className="h-8 w-8 text-emerald-400 animate-spin" />
              <p className="text-zinc-400">שומר קישורים...</p>
            </div>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="p-4 bg-emerald-500/20 rounded-full">
                <Check className="h-10 w-10 text-emerald-400" />
              </div>
              <p className="text-xl font-bold text-white">הסנכרון הושלם!</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'review' && !error && matchedEvents.length > 0 && (
          <div className="flex items-center justify-between p-6 border-t border-zinc-800">
            <div className="text-sm text-zinc-400">
              {decisions.size} מתוך {matchedEvents.length} אירועים נבחרו
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-all"
              >
                ביטול
              </button>
              <button
                onClick={handleSave}
                disabled={decisions.size === 0 || saving}
                className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
