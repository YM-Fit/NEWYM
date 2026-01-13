# דוגמאות קוד לשיפורים - NEWYM

## 📋 דוגמאות קונקרטיות לשיפורים מומלצים

---

## 1. ניקוי Console Logs

### לפני:
```typescript
// WorkoutSession.tsx
console.log('Loading exercise:', exercise);
console.error('Error loading exercise:', error);
console.warn('Cache miss for exercise:', exerciseId);
```

### אחרי:
```typescript
// utils/logger.ts
const isDev = import.meta.env.DEV;
const isProd = import.meta.env.PROD;

type LogLevel = 'log' | 'error' | 'warn' | 'info' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: string;
  context?: string;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 100;

  private formatMessage(level: LogLevel, message: string, data?: any, context?: string): LogEntry {
    return {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      context,
    };
  }

  log(message: string, data?: any, context?: string) {
    if (isDev) {
      const entry = this.formatMessage('log', message, data, context);
      this.logs.push(entry);
      console.log(`[${entry.context || 'APP'}]`, message, data || '');
      this.trimLogs();
    }
  }

  error(message: string, error?: any, context?: string) {
    const entry = this.formatMessage('error', message, error, context);
    this.logs.push(entry);
    console.error(`[${entry.context || 'APP'}]`, message, error || '');
    this.trimLogs();
    
    // In production, send to error tracking service
    if (isProd && error) {
      // Send to Sentry/LogRocket/etc
      this.reportError(error, context);
    }
  }

  warn(message: string, data?: any, context?: string) {
    if (isDev) {
      const entry = this.formatMessage('warn', message, data, context);
      this.logs.push(entry);
      console.warn(`[${entry.context || 'APP'}]`, message, data || '');
      this.trimLogs();
    }
  }

  info(message: string, data?: any, context?: string) {
    if (isDev) {
      const entry = this.formatMessage('info', message, data, context);
      this.logs.push(entry);
      console.info(`[${entry.context || 'APP'}]`, message, data || '');
      this.trimLogs();
    }
  }

  debug(message: string, data?: any, context?: string) {
    if (isDev && import.meta.env.VITE_DEBUG === 'true') {
      const entry = this.formatMessage('debug', message, data, context);
      this.logs.push(entry);
      console.debug(`[${entry.context || 'APP'}]`, message, data || '');
      this.trimLogs();
    }
  }

  private trimLogs() {
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  private reportError(error: any, context?: string) {
    // Integration with error tracking service
    // Example: Sentry.captureException(error, { tags: { context } });
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }
}

export const logger = new Logger();

// שימוש:
// logger.log('Loading exercise:', exercise, 'WorkoutSession');
// logger.error('Error loading exercise:', error, 'WorkoutSession');
```

---

## 2. פיצול WorkoutSession לקומפוננטות קטנות

### לפני:
```typescript
// WorkoutSession.tsx - 1075 שורות!
export default function WorkoutSession({ ... }) {
  // כל הלוגיקה כאן...
  const [numericPad, setNumericPad] = useState<...>(null);
  const [equipmentSelector, setEquipmentSelector] = useState<...>(null);
  // ... 50+ state variables
}
```

### אחרי:

#### hooks/useNumericPad.ts
```typescript
import { useState, useCallback } from 'react';

interface NumericPadState {
  exerciseIndex: number;
  setIndex: number;
  field: 'weight' | 'reps' | 'rpe';
  value: number;
  label: string;
}

export function useNumericPad() {
  const [numericPad, setNumericPad] = useState<NumericPadState | null>(null);

  const open = useCallback((
    exerciseIndex: number,
    setIndex: number,
    field: 'weight' | 'reps' | 'rpe',
    label: string,
    currentValue: number
  ) => {
    setNumericPad({
      exerciseIndex,
      setIndex,
      field,
      value: currentValue,
      label,
    });
  }, []);

  const close = useCallback(() => {
    setNumericPad(null);
  }, []);

  const confirm = useCallback((value: number, onConfirm: (value: number) => void) => {
    if (numericPad) {
      onConfirm(value);
      close();
    }
  }, [numericPad, close]);

  return {
    numericPad,
    open,
    close,
    confirm,
  };
}
```

#### hooks/useEquipmentSelector.ts
```typescript
import { useState, useCallback } from 'react';

interface EquipmentSelectorState {
  exerciseIndex: number;
  setIndex: number;
}

export function useEquipmentSelector() {
  const [equipmentSelector, setEquipmentSelector] = useState<EquipmentSelectorState | null>(null);

  const open = useCallback((exerciseIndex: number, setIndex: number) => {
    setEquipmentSelector({ exerciseIndex, setIndex });
  }, []);

  const close = useCallback(() => {
    setEquipmentSelector(null);
  }, []);

  return {
    equipmentSelector,
    open,
    close,
  };
}
```

#### components/trainer/Workouts/WorkoutSession.tsx (מקוצר)
```typescript
import { useNumericPad } from '../../../hooks/useNumericPad';
import { useEquipmentSelector } from '../../../hooks/useEquipmentSelector';
import { NumericPadManager } from './NumericPadManager';
import { EquipmentManager } from './EquipmentManager';

export default function WorkoutSession({ ... }) {
  const { exercises, addExercise, updateSet, ... } = useWorkoutSession();
  
  const numericPad = useNumericPad();
  const equipmentSelector = useEquipmentSelector();

  const handleNumericPadConfirm = (value: number) => {
    if (numericPad.numericPad) {
      updateSet(
        numericPad.numericPad.exerciseIndex,
        numericPad.numericPad.setIndex,
        numericPad.numericPad.field,
        value
      );
      numericPad.close();
    }
  };

  return (
    <div>
      {/* Main workout UI */}
      
      {numericPad.numericPad && (
        <NumericPadManager
          state={numericPad.numericPad}
          onConfirm={handleNumericPadConfirm}
          onClose={numericPad.close}
        />
      )}
      
      {equipmentSelector.equipmentSelector && (
        <EquipmentManager
          state={equipmentSelector.equipmentSelector}
          onSelect={handleEquipmentSelect}
          onClose={equipmentSelector.close}
        />
      )}
    </div>
  );
}
```

---

## 3. שיפור Error Handling

### לפני:
```typescript
const handleSave = async () => {
  const { error } = await saveWorkout(workoutData);
  if (error) {
    toast.error('שגיאה בשמירת האימון');
  }
};
```

### אחרי:

#### hooks/useErrorHandler.ts
```typescript
import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { logger } from '../utils/logger';

interface ErrorHandlerOptions {
  showToast?: boolean;
  logError?: boolean;
  retry?: () => Promise<any>;
  maxRetries?: number;
}

export function useErrorHandler() {
  const handleError = useCallback((
    error: unknown,
    context: string,
    options: ErrorHandlerOptions = {}
  ) => {
    const {
      showToast = true,
      logError = true,
      retry,
      maxRetries = 3,
    } = options;

    // Extract error message
    let errorMessage = 'שגיאה לא ידועה';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    // Log error
    if (logError) {
      logger.error(`Error in ${context}:`, error, context);
    }

    // Show toast
    if (showToast) {
      const userMessage = getUserFriendlyMessage(errorMessage);
      toast.error(userMessage);
    }

    // Retry logic
    if (retry && maxRetries > 0) {
      return retryWithBackoff(retry, maxRetries);
    }

    return Promise.reject(error);
  }, []);

  return { handleError };
}

function getUserFriendlyMessage(errorMessage: string): string {
  const errorMessages: Record<string, string> = {
    'network': 'שגיאת רשת. בדוק את החיבור לאינטרנט',
    'unauthorized': 'נדרשת התחברות מחדש',
    'not_found': 'הפריט המבוקש לא נמצא',
    'validation': 'נתונים לא תקינים',
    'timeout': 'הבקשה ארכה זמן רב מדי',
  };

  for (const [key, message] of Object.entries(errorMessages)) {
    if (errorMessage.toLowerCase().includes(key)) {
      return message;
    }
  }

  return 'אירעה שגיאה. נסה שוב מאוחר יותר';
}

async function retryWithBackoff(
  fn: () => Promise<any>,
  maxRetries: number,
  delay = 1000
): Promise<any> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
}
```

#### שימוש:
```typescript
const { handleError } = useErrorHandler();

const handleSave = async () => {
  try {
    const { error } = await saveWorkout(workoutData);
    if (error) throw error;
    toast.success('האימון נשמר בהצלחה');
  } catch (error) {
    await handleError(error, 'WorkoutSession.save', {
      showToast: true,
      retry: () => saveWorkout(workoutData),
      maxRetries: 3,
    });
  }
};
```

---

## 4. אופטימיזציה של Queries

### לפני:
```typescript
// טעינה סדרתית
const loadTraineeData = async (traineeId: string) => {
  const { data: measurements } = await supabase
    .from('measurements')
    .select('*')
    .eq('trainee_id', traineeId);
  
  const { data: workouts } = await supabase
    .from('workouts')
    .select('*')
    .eq('trainee_id', traineeId);
  
  const { data: selfWeights } = await supabase
    .from('trainee_self_weights')
    .select('*')
    .eq('trainee_id', traineeId);
};
```

### אחרי:

#### hooks/useTraineeData.ts
```typescript
import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

interface TraineeData {
  measurements: any[];
  workouts: any[];
  selfWeights: any[];
}

export function useTraineeData() {
  const loadTraineeData = useCallback(async (traineeId: string): Promise<TraineeData> => {
    try {
      // טעינה מקבילית עם select רק שדות נדרשים
      const [measurementsResult, workoutsResult, selfWeightsResult] = await Promise.all([
        supabase
          .from('measurements')
          .select('id, measurement_date, weight, body_fat_percentage, muscle_mass')
          .eq('trainee_id', traineeId)
          .order('measurement_date', { ascending: false })
          .limit(50),
        
        supabase
          .from('workouts')
          .select('id, workout_date, is_completed, total_volume')
          .eq('trainee_id', traineeId)
          .order('workout_date', { ascending: false })
          .limit(50),
        
        supabase
          .from('trainee_self_weights')
          .select('id, weight_date, weight, is_seen_by_trainer')
          .eq('trainee_id', traineeId)
          .order('weight_date', { ascending: false })
          .limit(50),
      ]);

      // בדיקת שגיאות
      const errors = [
        measurementsResult.error,
        workoutsResult.error,
        selfWeightsResult.error,
      ].filter(Boolean);

      if (errors.length > 0) {
        throw new Error(`Failed to load trainee data: ${errors.map(e => e?.message).join(', ')}`);
      }

      return {
        measurements: measurementsResult.data || [],
        workouts: workoutsResult.data || [],
        selfWeights: selfWeightsResult.data || [],
      };
    } catch (error) {
      logger.error('Error loading trainee data:', error, 'useTraineeData');
      throw error;
    }
  }, []);

  return { loadTraineeData };
}
```

---

## 5. שיפור Type Safety

### לפני:
```typescript
const handleSet = (set: any) => {
  const weight = set.weight || 0;
  const reps = set.reps || 0;
  // ...
};
```

### אחרי:

#### types/workout.ts
```typescript
export interface SetData {
  id: string;
  set_number: number;
  weight: number;
  reps: number;
  rpe: number | null;
  set_type: 'regular' | 'superset' | 'dropset';
  failure: boolean;
  superset_exercise_id: string | null;
  superset_exercise_name: string | null;
  superset_weight: number | null;
  superset_reps: number | null;
  superset_rpe: number | null;
  superset_equipment_id: string | null;
  superset_equipment: Equipment | null;
  superset_dropset_weight: number | null;
  superset_dropset_reps: number | null;
  dropset_weight: number | null;
  dropset_reps: number | null;
  equipment_id: string | null;
  equipment: Equipment | null;
}

// Type guard
export function isSetData(value: unknown): value is SetData {
  if (!value || typeof value !== 'object') return false;
  const set = value as Record<string, unknown>;
  return (
    typeof set.id === 'string' &&
    typeof set.set_number === 'number' &&
    typeof set.weight === 'number' &&
    typeof set.reps === 'number' &&
    (set.rpe === null || (typeof set.rpe === 'number' && set.rpe >= 1 && set.rpe <= 10))
  );
}

// Validation function
export function validateSetData(set: unknown): SetData {
  if (!isSetData(set)) {
    throw new Error('Invalid set data');
  }
  
  // Additional validation
  if (set.weight < 0) {
    throw new Error('Weight cannot be negative');
  }
  if (set.reps < 0) {
    throw new Error('Reps cannot be negative');
  }
  if (set.rpe !== null && (set.rpe < 1 || set.rpe > 10)) {
    throw new Error('RPE must be between 1 and 10');
  }
  
  return set;
}
```

#### שימוש:
```typescript
import { SetData, validateSetData } from '../types/workout';

const handleSet = (set: unknown) => {
  try {
    const validatedSet = validateSetData(set);
    const weight = validatedSet.weight;
    const reps = validatedSet.reps;
    // TypeScript יודע את הטיפוסים!
  } catch (error) {
    logger.error('Invalid set data:', error);
    toast.error('נתוני הסט לא תקינים');
  }
};
```

---

## 6. Testing Example

### hooks/useWorkoutSession.test.ts
```typescript
import { renderHook, act } from '@testing-library/react';
import { useWorkoutSession } from './useWorkoutSession';

describe('useWorkoutSession', () => {
  it('should add exercise', () => {
    const { result } = renderHook(() => useWorkoutSession());
    
    const exercise = {
      id: '1',
      name: 'Bench Press',
      muscle_group_id: 'chest',
    };
    
    act(() => {
      result.current.addExercise(exercise);
    });
    
    expect(result.current.exercises).toHaveLength(1);
    expect(result.current.exercises[0].exercise.name).toBe('Bench Press');
  });
  
  it('should calculate total volume correctly', () => {
    const { result } = renderHook(() => useWorkoutSession({
      initialExercises: [{
        tempId: '1',
        exercise: { id: '1', name: 'Bench Press', muscle_group_id: 'chest' },
        sets: [
          { id: '1', set_number: 1, weight: 100, reps: 10, rpe: null, set_type: 'regular', failure: false },
          { id: '2', set_number: 2, weight: 100, reps: 10, rpe: null, set_type: 'regular', failure: false },
        ],
      }],
    }));
    
    const volume = result.current.calculateTotalVolume();
    expect(volume).toBe(2000); // 100 * 10 * 2
  });
});
```

---

## 7. State Management עם Zustand

### stores/workoutStore.ts
```typescript
import create from 'zustand';
import { devtools } from 'zustand/middleware';

interface WorkoutState {
  exercises: WorkoutExercise[];
  notes: string;
  workoutDate: Date;
  minimizedExercises: string[];
  collapsedSets: string[];
  
  // Actions
  addExercise: (exercise: Exercise) => void;
  removeExercise: (index: number) => void;
  addSet: (exerciseIndex: number) => void;
  removeSet: (exerciseIndex: number, setIndex: number) => void;
  updateSet: (exerciseIndex: number, setIndex: number, field: keyof SetData, value: any) => void;
  toggleMinimizeExercise: (exerciseId: string) => void;
  calculateTotalVolume: () => number;
  reset: () => void;
}

const initialState = {
  exercises: [],
  notes: '',
  workoutDate: new Date(),
  minimizedExercises: [],
  collapsedSets: [],
};

export const useWorkoutStore = create<WorkoutState>()(
  devtools(
    (set, get) => ({
      ...initialState,
      
      addExercise: (exercise) => set((state) => ({
        exercises: [...state.exercises, {
          tempId: Date.now().toString(),
          exercise,
          sets: [createEmptySet(1)],
        }],
      })),
      
      removeExercise: (index) => set((state) => ({
        exercises: state.exercises.filter((_, i) => i !== index),
      })),
      
      updateSet: (exerciseIndex, setIndex, field, value) => set((state) => {
        const updatedExercises = [...state.exercises];
        updatedExercises[exerciseIndex].sets[setIndex] = {
          ...updatedExercises[exerciseIndex].sets[setIndex],
          [field]: value,
        };
        return { exercises: updatedExercises };
      }),
      
      calculateTotalVolume: () => {
        const { exercises } = get();
        return exercises.reduce((total, ex) => {
          return total + ex.sets.reduce((sum, set) => {
            let setVolume = set.weight * set.reps;
            if (set.superset_weight && set.superset_reps) {
              setVolume += set.superset_weight * set.superset_reps;
            }
            if (set.dropset_weight && set.dropset_reps) {
              setVolume += set.dropset_weight * set.dropset_reps;
            }
            return sum + setVolume;
          }, 0);
        }, 0);
      },
      
      reset: () => set(initialState),
    }),
    { name: 'WorkoutStore' }
  )
);
```

---

## 8. Performance Monitoring

### utils/performance.ts
```typescript
export class PerformanceMonitor {
  private static marks: Map<string, number> = new Map();
  
  static mark(name: string) {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(`${name}-start`);
      this.marks.set(name, performance.now());
    }
  }
  
  static measure(name: string): number | null {
    if (typeof performance !== 'undefined' && performance.measure) {
      try {
        performance.mark(`${name}-end`);
        performance.measure(name, `${name}-start`, `${name}-end`);
        const measure = performance.getEntriesByName(name)[0] as PerformanceMeasure;
        const duration = measure.duration;
        
        // Log in development
        if (import.meta.env.DEV) {
          console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
        }
        
        // Send to analytics in production
        if (import.meta.env.PROD && duration > 1000) {
          // Send slow operations to analytics
          // analytics.track('slow_operation', { name, duration });
        }
        
        return duration;
      } catch (error) {
        return null;
      }
    }
    return null;
  }
  
  static async measureAsync<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<T> {
    this.mark(name);
    try {
      const result = await fn();
      this.measure(name);
      return result;
    } catch (error) {
      this.measure(name);
      throw error;
    }
  }
}

// שימוש:
// const data = await PerformanceMonitor.measureAsync('loadTrainees', () => loadTrainees());
```

---

## 9. Accessibility Improvements

### לפני:
```tsx
<button onClick={handleClick}>
  <Plus />
</button>
```

### אחרי:
```tsx
<button
  onClick={handleClick}
  aria-label="הוסף תרגיל חדש"
  aria-describedby="add-exercise-help"
  className="focus:outline-none focus:ring-2 focus:ring-lime-500 focus:ring-offset-2"
>
  <Plus aria-hidden="true" />
  <span className="sr-only">הוסף תרגיל חדש</span>
</button>
<span id="add-exercise-help" className="sr-only">
  הוסף תרגיל חדש לאימון. לחץ Enter או Space לביצוע
</span>
```

---

## 10. Code Splitting

### לפני:
```typescript
import WorkoutSession from './Workouts/WorkoutSession';
import MeasurementForm from './Measurements/MeasurementForm';
```

### אחרי:
```typescript
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from './ui/LoadingSpinner';

const WorkoutSession = lazy(() => 
  import('./Workouts/WorkoutSession').then(module => ({
    default: module.default
  }))
);

const MeasurementForm = lazy(() => 
  import('./Measurements/MeasurementForm').then(module => ({
    default: module.default
  }))
);

// שימוש:
<Suspense fallback={<LoadingSpinner />}>
  <WorkoutSession {...props} />
</Suspense>
```

---

## סיכום

דוגמאות אלה מראות איך ליישם את השיפורים המומלצים. כל דוגמה כוללת:
- ✅ קוד לפני ואחרי
- ✅ הסבר קצר
- ✅ שימוש מעשי

מומלץ להתחיל עם השיפורים הקריטיים (logger, error handling) ואז להמשיך לפי סדר עדיפויות.
