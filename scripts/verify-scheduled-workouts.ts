/**
 * Comprehensive verification of scheduled workouts
 * בודק תקינות נתונים, סינכרון Google Calendar, ועקביות המידע
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://vqvczpxmvrwfkecpwovc.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxdmN6cHhtdnJ3ZmtlY3B3b3ZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM0MzI2NCwiZXhwIjoyMDc3OTE5MjY0fQ.1kVQrCDf5WlMT9s4iFtWdiGWQx2RGttZ3X51VFtQG54';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface Issue {
  type: 'error' | 'warning';
  category: string;
  message: string;
  workoutId?: string;
  traineeId?: string;
  details?: any;
}

interface Statistics {
  totalScheduled: number;
  todayCount: number;
  tomorrowCount: number;
  googleSynced: number;
  withIssues: number;
  errors: number;
  warnings: number;
}

async function verifyScheduledWorkouts() {
  console.log('🔍 סריקה מקיפה של האימונים המתזמנים\n');
  console.log('='.repeat(80));
  
  const issues: Issue[] = [];
  const stats: Statistics = {
    totalScheduled: 0,
    todayCount: 0,
    tomorrowCount: 0,
    googleSynced: 0,
    withIssues: 0,
    errors: 0,
    warnings: 0,
  };

  try {
    // Calculate date ranges for today and tomorrow
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    const todayStr = today.toISOString();
    const tomorrowStr = tomorrow.toISOString();
    const dayAfterTomorrowStr = dayAfterTomorrow.toISOString();

    console.log('\n📅 טווח תאריכים:');
    console.log(`   היום: ${today.toLocaleDateString('he-IL')}`);
    console.log(`   מחר: ${tomorrow.toLocaleDateString('he-IL')}`);

    // 1. Get all scheduled workouts (is_completed=false) for today and tomorrow
    console.log('\n📊 שלב 1: טעינת אימונים מתזמנים...\n');
    
    const { data: workoutsData, error: workoutsError } = await supabase
      .from('workouts')
      .select(`
        id,
        workout_date,
        workout_type,
        is_completed,
        notes,
        trainer_id,
        created_at
      `)
      .gte('workout_date', todayStr)
      .lt('workout_date', dayAfterTomorrowStr)
      .order('workout_date', { ascending: true });

    if (workoutsError) {
      console.error('❌ שגיאה בטעינת אימונים:', workoutsError.message);
      return;
    }

    if (!workoutsData || workoutsData.length === 0) {
      console.log('✅ אין אימונים מתזמנים להיום ומחר');
      return;
    }

    stats.totalScheduled = workoutsData.length;
    console.log(`   נמצאו ${stats.totalScheduled} אימונים`);

    // Separate today and tomorrow
    workoutsData.forEach(w => {
      const workoutDate = new Date(w.workout_date);
      workoutDate.setHours(0, 0, 0, 0);
      if (workoutDate.getTime() === today.getTime()) {
        stats.todayCount++;
      } else if (workoutDate.getTime() === tomorrow.getTime()) {
        stats.tomorrowCount++;
      }
    });

    console.log(`   היום: ${stats.todayCount}`);
    console.log(`   מחר: ${stats.tomorrowCount}`);

    // 2. Check workout_trainees relationships
    console.log('\n🔗 שלב 2: בדיקת קשרי workout_trainees...\n');

    const workoutIds = workoutsData.map(w => w.id);
    const { data: workoutTraineesData, error: wtError } = await supabase
      .from('workout_trainees')
      .select('workout_id, trainee_id')
      .in('workout_id', workoutIds);

    if (wtError) {
      issues.push({
        type: 'error',
        category: 'workout_trainees',
        message: `שגיאה בטעינת workout_trainees: ${wtError.message}`,
      });
    } else {
      // Check for workouts without trainees
      const workoutsWithTrainees = new Set(workoutTraineesData?.map(wt => wt.workout_id) || []);
      workoutsData.forEach(w => {
        if (!workoutsWithTrainees.has(w.id)) {
          issues.push({
            type: 'error',
            category: 'data_integrity',
            message: 'אימון ללא מתאמן',
            workoutId: w.id,
            details: { workout_date: w.workout_date },
          });
        }
      });

      // Check for orphaned workout_trainees
      const validWorkoutIds = new Set(workoutIds);
      workoutTraineesData?.forEach(wt => {
        if (!validWorkoutIds.has(wt.workout_id)) {
          issues.push({
            type: 'warning',
            category: 'data_integrity',
            message: 'workout_trainees ללא workout תקין',
            workoutId: wt.workout_id,
            traineeId: wt.trainee_id,
          });
        }
      });

      console.log(`   ✅ נמצאו ${workoutTraineesData?.length || 0} קשרים`);
    }

    // 3. Check trainees exist
    console.log('\n👥 שלב 3: בדיקת מתאמנים...\n');

    const traineeIds = [...new Set(workoutTraineesData?.map(wt => wt.trainee_id) || [])];
    if (traineeIds.length > 0) {
      const { data: traineesData, error: traineesError } = await supabase
        .from('trainees')
        .select('id, full_name, trainer_id')
        .in('id', traineeIds);

      if (traineesError) {
        issues.push({
          type: 'error',
          category: 'trainees',
          message: `שגיאה בטעינת מתאמנים: ${traineesError.message}`,
        });
      } else {
        const validTraineeIds = new Set(traineesData?.map(t => t.id) || []);
        traineeIds.forEach(tId => {
          if (!validTraineeIds.has(tId)) {
            issues.push({
              type: 'error',
              category: 'data_integrity',
              message: 'workout_trainees עם trainee_id שלא קיים',
              traineeId: tId,
            });
          }
        });

        // Check trainer_id consistency
        const traineesMap = new Map(traineesData?.map(t => [t.id, t]) || []);
        workoutsData.forEach(w => {
          workoutTraineesData?.forEach(wt => {
            if (wt.workout_id === w.id) {
              const trainee = traineesMap.get(wt.trainee_id);
              if (trainee && trainee.trainer_id !== w.trainer_id) {
                issues.push({
                  type: 'error',
                  category: 'consistency',
                  message: 'trainer_id לא תואם בין workout ל-trainee',
                  workoutId: w.id,
                  traineeId: wt.trainee_id,
                  details: {
                    workout_trainer_id: w.trainer_id,
                    trainee_trainer_id: trainee.trainer_id,
                  },
                });
              }
            }
          });
        });

        console.log(`   ✅ נמצאו ${traineesData?.length || 0} מתאמנים תקינים`);
      }
    }

    // 4. Check Google Calendar sync
    console.log('\n📅 שלב 4: בדיקת סינכרון Google Calendar...\n');

    const { data: googleSyncData, error: googleSyncError } = await supabase
      .from('google_calendar_sync')
      .select('workout_id, sync_status, event_start_time, event_end_time, sync_direction')
      .in('workout_id', workoutIds);

    if (googleSyncError) {
      issues.push({
        type: 'warning',
        category: 'google_sync',
        message: `שגיאה בטעינת google_calendar_sync: ${googleSyncError.message}`,
      });
    } else {
      const syncedWorkoutIds = new Set(
        googleSyncData?.filter(g => g.sync_status === 'synced').map(g => g.workout_id) || []
      );
      stats.googleSynced = syncedWorkoutIds.size;

      // Check for workouts with sync_status='synced' but no event_start_time
      googleSyncData?.forEach(g => {
        if (g.sync_status === 'synced' && !g.event_start_time) {
          issues.push({
            type: 'error',
            category: 'google_sync',
            message: 'sync_status=synced ללא event_start_time',
            workoutId: g.workout_id,
          });
        }

        // Check event times are valid
        if (g.event_start_time) {
          const eventStart = new Date(g.event_start_time);
          if (isNaN(eventStart.getTime())) {
            issues.push({
              type: 'error',
              category: 'google_sync',
              message: 'event_start_time לא תקין',
              workoutId: g.workout_id,
              details: { event_start_time: g.event_start_time },
            });
          }
        }

        if (g.event_end_time) {
          const eventEnd = new Date(g.event_end_time);
          if (isNaN(eventEnd.getTime())) {
            issues.push({
              type: 'warning',
              category: 'google_sync',
              message: 'event_end_time לא תקין',
              workoutId: g.workout_id,
              details: { event_end_time: g.event_end_time },
            });
          }
        }

        // Check event_start_time matches workout_date (within 24 hours)
        if (g.event_start_time && validWorkoutIds.has(g.workout_id)) {
          const workout = workoutsData.find(w => w.id === g.workout_id);
          if (workout) {
            const eventStart = new Date(g.event_start_time);
            const workoutDate = new Date(workout.workout_date);
            const diffHours = Math.abs(eventStart.getTime() - workoutDate.getTime()) / (1000 * 60 * 60);
            if (diffHours > 24) {
              issues.push({
                type: 'warning',
                category: 'google_sync',
                message: 'event_start_time לא תואם ל-workout_date (יותר מ-24 שעות הפרש)',
                workoutId: g.workout_id,
                details: {
                  workout_date: workout.workout_date,
                  event_start_time: g.event_start_time,
                  diff_hours: diffHours.toFixed(2),
                },
              });
            }
          }
        }
      });

      console.log(`   ✅ נמצאו ${stats.googleSynced} אימונים מסונכרנים`);
    }

    // 5. Check for duplicates
    console.log('\n🔄 שלב 5: בדיקת כפילויות...\n');

    const workoutTraineePairs = new Map<string, number>();
    workoutTraineesData?.forEach(wt => {
      const key = `${wt.workout_id}:${wt.trainee_id}`;
      workoutTraineePairs.set(key, (workoutTraineePairs.get(key) || 0) + 1);
    });

    workoutTraineePairs.forEach((count, key) => {
      if (count > 1) {
        const [workoutId, traineeId] = key.split(':');
        issues.push({
          type: 'error',
          category: 'consistency',
          message: `כפילות: אותו אימון עם אותו מתאמן (${count} פעמים)`,
          workoutId,
          traineeId,
        });
      }
    });

    console.log(`   ✅ לא נמצאו כפילויות`);

    // 6. Check statuses and dates
    console.log('\n✅ שלב 6: בדיקת סטטוסים ותאריכים...\n');

    workoutsData.forEach(w => {
      // Check is_completed
      if (w.is_completed) {
        issues.push({
          type: 'warning',
          category: 'status',
          message: 'אימון מתזמן עם is_completed=true (צריך להיות false)',
          workoutId: w.id,
        });
      }

      // Check workout_date is not null
      if (!w.workout_date) {
        issues.push({
          type: 'error',
          category: 'status',
          message: 'workout_date הוא null',
          workoutId: w.id,
        });
      } else {
        const workoutDate = new Date(w.workout_date);
        if (isNaN(workoutDate.getTime())) {
          issues.push({
            type: 'error',
            category: 'status',
            message: 'workout_date לא תקין',
            workoutId: w.id,
            details: { workout_date: w.workout_date },
          });
        } else {
          // Check date is in reasonable range
          const daysDiff = (workoutDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
          if (daysDiff < -30) {
            issues.push({
              type: 'warning',
              category: 'status',
              message: 'תאריך אימון בעבר רחוק (יותר מ-30 יום)',
              workoutId: w.id,
              details: { days_ago: Math.abs(daysDiff).toFixed(1) },
            });
          } else if (daysDiff > 90) {
            issues.push({
              type: 'warning',
              category: 'status',
              message: 'תאריך אימון בעתיד רחוק מדי (יותר מ-90 יום)',
              workoutId: w.id,
              details: { days_ahead: daysDiff.toFixed(1) },
            });
          }
        }
      }

      // Check trainer_id
      if (!w.trainer_id) {
        issues.push({
          type: 'error',
          category: 'status',
          message: 'אימון ללא trainer_id',
          workoutId: w.id,
        });
      }
    });

    console.log(`   ✅ בדיקות סטטוסים הושלמו`);

    // Calculate statistics
    stats.withIssues = new Set(issues.map(i => i.workoutId || i.traineeId)).size;
    stats.errors = issues.filter(i => i.type === 'error').length;
    stats.warnings = issues.filter(i => i.type === 'warning').length;

    // Print report
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 סיכום סטטיסטיקות:\n');
    console.log(`   סה"כ אימונים מתזמנים: ${stats.totalScheduled}`);
    console.log(`   היום: ${stats.todayCount}`);
    console.log(`   מחר: ${stats.tomorrowCount}`);
    console.log(`   מסונכרנים עם Google Calendar: ${stats.googleSynced}`);
    console.log(`   עם בעיות: ${stats.withIssues}`);
    console.log(`   שגיאות: ${stats.errors}`);
    console.log(`   אזהרות: ${stats.warnings}`);

    if (issues.length > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('\n⚠️  בעיות שנמצאו:\n');

      const errors = issues.filter(i => i.type === 'error');
      const warnings = issues.filter(i => i.type === 'warning');

      if (errors.length > 0) {
        console.log('❌ שגיאות:\n');
        errors.forEach((issue, index) => {
          console.log(`   ${index + 1}. [${issue.category}] ${issue.message}`);
          if (issue.workoutId) console.log(`      Workout ID: ${issue.workoutId}`);
          if (issue.traineeId) console.log(`      Trainee ID: ${issue.traineeId}`);
          if (issue.details) console.log(`      פרטים: ${JSON.stringify(issue.details, null, 2)}`);
          console.log('');
        });
      }

      if (warnings.length > 0) {
        console.log('⚠️  אזהרות:\n');
        warnings.forEach((issue, index) => {
          console.log(`   ${index + 1}. [${issue.category}] ${issue.message}`);
          if (issue.workoutId) console.log(`      Workout ID: ${issue.workoutId}`);
          if (issue.traineeId) console.log(`      Trainee ID: ${issue.traineeId}`);
          if (issue.details) console.log(`      פרטים: ${JSON.stringify(issue.details, null, 2)}`);
          console.log('');
        });
      }

      // Recommendations
      console.log('\n' + '='.repeat(80));
      console.log('\n💡 המלצות לתיקון:\n');

      const orphanedWorkouts = issues.filter(i => i.message.includes('אימון ללא מתאמן'));
      if (orphanedWorkouts.length > 0) {
        console.log('1. אימונים ללא מתאמן:');
        console.log('   אפשר למחוק אותם או להוסיף מתאמן:');
        orphanedWorkouts.slice(0, 5).forEach(issue => {
          if (issue.workoutId) {
            console.log(`   DELETE FROM workouts WHERE id = '${issue.workoutId}';`);
          }
        });
        console.log('');
      }

      const duplicateIssues = issues.filter(i => i.message.includes('כפילות'));
      if (duplicateIssues.length > 0) {
        console.log('2. כפילויות:');
        console.log('   צריך למחוק רשומות כפולות ב-workout_trainees');
        console.log('   (שמור רק את הראשונה, מחק את השאר)');
        console.log('');
      }

      const syncIssues = issues.filter(i => i.category === 'google_sync' && i.type === 'error');
      if (syncIssues.length > 0) {
        console.log('3. בעיות סינכרון Google Calendar:');
        console.log('   בדוק את רשומות google_calendar_sync ותקן את sync_status או event_start_time');
        console.log('');
      }
    } else {
      console.log('\n✅ לא נמצאו בעיות! כל האימונים המתזמנים תקינים.');
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ הסריקה הושלמה\n');

  } catch (error: any) {
    console.error('\n❌ שגיאה כללית:', error.message);
    console.error(error.stack);
  }
}

// Run the verification
verifyScheduledWorkouts().catch(console.error);
