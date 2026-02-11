import { describe, it, expect } from 'vitest';

/**
 * Mirrors the stable workout numbering logic used in TraineeWorkoutHistoryModal,
 * SmartReportView and traineeSessionUtils: sort by (date, workout_id) then assign index + 1.
 */
function workoutNumbersFromSorted(
  items: { date: string; workout_id: string }[]
): Map<string, number> {
  const sorted = [...items].sort((a, b) => {
    const cmp = a.date.localeCompare(b.date);
    return cmp !== 0 ? cmp : a.workout_id.localeCompare(b.workout_id);
  });
  const result = new Map<string, number>();
  sorted.forEach((item, idx) => result.set(item.workout_id, idx + 1));
  return result;
}

/**
 * Mirrors the deduplication logic in getScheduledWorkoutsForTodayAndTomorrow:
 * keep only one entry per (trainee_id, workout_id).
 */
function deduplicateByTraineeAndWorkout<T extends { trainee: { id: string }; workout: { id: string } }>(
  items: T[]
): T[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = `${item.trainee.id}:${item.workout.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Mirrors the deduplication logic in getScheduledWorkoutsForTodayAndTomorrow:
 * keep only one workout per (trainee_id, date). Prefer: from Google, not completed, smaller id.
 */
function deduplicateByTraineeAndDate<T extends {
  trainee: { id: string };
  workout: { id: string; isFromGoogle?: boolean; is_completed?: boolean };
  workoutDate: Date;
}>(items: T[]): T[] {
  const shouldKeep = (newItem: T, existing: T): boolean => {
    if ((newItem.workout as any).isFromGoogle && !(existing.workout as any).isFromGoogle) return true;
    if (!(newItem.workout as any).isFromGoogle && (existing.workout as any).isFromGoogle) return false;
    if (!(newItem.workout as any).is_completed && (existing.workout as any).is_completed) return true;
    if ((newItem.workout as any).is_completed && !(existing.workout as any).is_completed) return false;
    return (newItem.workout as any).id < (existing.workout as any).id;
  };
  const seen = new Map<string, T>();
  items.forEach(item => {
    const dateStr = `${item.workoutDate.getFullYear()}-${String(item.workoutDate.getMonth() + 1).padStart(2, '0')}-${String(item.workoutDate.getDate()).padStart(2, '0')}`;
    const key = `${item.trainee.id}:${dateStr}`;
    const existing = seen.get(key);
    if (!existing || shouldKeep(item, existing)) seen.set(key, item);
  });
  return Array.from(seen.values());
}

/**
 * Mirrors numbering logic when deduplicating by date: same date = one session.
 * Returns position map for all workout_ids; duplicates on same date share the same position.
 */
function workoutNumbersDedupedByDate(
  items: { date: string; workout_id: string }[]
): Map<string, number> {
  const uniqueByDate = new Map<string, typeof items[0]>();
  items.forEach(w => {
    const d = w.date.slice(0, 10);
    if (!uniqueByDate.has(d) || w.workout_id < uniqueByDate.get(d)!.workout_id) {
      uniqueByDate.set(d, w);
    }
  });
  const deduped = [...uniqueByDate.values()].sort((a, b) => {
    const cmp = a.date.localeCompare(b.date);
    return cmp !== 0 ? cmp : a.workout_id.localeCompare(b.workout_id);
  });
  const dateToPosition = new Map<string, number>();
  deduped.forEach((item, idx) => dateToPosition.set(item.date.slice(0, 10), idx + 1));
  const result = new Map<string, number>();
  items.forEach(w => result.set(w.workout_id, dateToPosition.get(w.date.slice(0, 10))!));
  return result;
}

describe('Journal / scheduled workouts', () => {
  describe('workout numbering (stable by date then id)', () => {
    it('assigns distinct numbers 1, 2, 3 when two workouts share the same date', () => {
      const items = [
        { date: '2025-02-10T10:00:00.000Z', workout_id: 'w1' },
        { date: '2025-02-10T10:00:00.000Z', workout_id: 'w2' },
        { date: '2025-02-11T09:00:00.000Z', workout_id: 'w3' },
      ];
      const numbers = workoutNumbersFromSorted(items);
      expect(numbers.get('w1')).toBe(1);
      expect(numbers.get('w2')).toBe(2);
      expect(numbers.get('w3')).toBe(3);
    });

    it('assigns numbers in date order when dates differ', () => {
      const items = [
        { date: '2025-02-09T10:00:00.000Z', workout_id: 'w1' },
        { date: '2025-02-10T10:00:00.000Z', workout_id: 'w2' },
        { date: '2025-02-11T10:00:00.000Z', workout_id: 'w3' },
      ];
      const numbers = workoutNumbersFromSorted(items);
      expect(numbers.get('w1')).toBe(1);
      expect(numbers.get('w2')).toBe(2);
      expect(numbers.get('w3')).toBe(3);
    });

    it('uses workout_id as tiebreaker when dates are equal', () => {
      const items = [
        { date: '2025-02-10T10:00:00.000Z', workout_id: 'w-b' },
        { date: '2025-02-10T10:00:00.000Z', workout_id: 'w-a' },
      ];
      const numbers = workoutNumbersFromSorted(items);
      expect(numbers.get('w-a')).toBe(1);
      expect(numbers.get('w-b')).toBe(2);
    });
  });

  describe('scheduled workouts deduplication', () => {
    it('removes duplicate (trainee_id, workout_id) pairs', () => {
      const trainee = { id: 't1', name: 'T1' };
      const workout = { id: 'w1', date: '2025-02-10' };
      const items = [
        { trainee, workout },
        { trainee, workout },
      ];
      const deduped = deduplicateByTraineeAndWorkout(items);
      expect(deduped).toHaveLength(1);
      expect(deduped[0].trainee.id).toBe('t1');
      expect(deduped[0].workout.id).toBe('w1');
    });

    it('keeps distinct pairs', () => {
      const items = [
        { trainee: { id: 't1' }, workout: { id: 'w1' } },
        { trainee: { id: 't1' }, workout: { id: 'w2' } },
        { trainee: { id: 't2' }, workout: { id: 'w1' } },
      ];
      const deduped = deduplicateByTraineeAndWorkout(items);
      expect(deduped).toHaveLength(3);
    });

    it('removes only duplicates and keeps one of each pair', () => {
      const items = [
        { trainee: { id: 't1' }, workout: { id: 'w1' } },
        { trainee: { id: 't1' }, workout: { id: 'w1' } },
        { trainee: { id: 't2' }, workout: { id: 'w2' } },
      ];
      const deduped = deduplicateByTraineeAndWorkout(items);
      expect(deduped).toHaveLength(2);
      const keys = new Set(deduped.map(i => `${i.trainee.id}:${i.workout.id}`));
      expect(keys.has('t1:w1')).toBe(true);
      expect(keys.has('t2:w2')).toBe(true);
    });
  });

  describe('scheduled workouts deduplication by (trainee_id, date)', () => {
    it('keeps only one workout per trainee per day when duplicates exist', () => {
      const trainee = { id: 't1' };
      const date = new Date('2025-02-10T10:00:00.000Z');
      const items = [
        { trainee, workout: { id: 'w1', isFromGoogle: false, is_completed: false }, workoutDate: date },
        { trainee, workout: { id: 'w2', isFromGoogle: false, is_completed: false }, workoutDate: date },
      ];
      const deduped = deduplicateByTraineeAndDate(items);
      expect(deduped).toHaveLength(1);
      expect(deduped[0].workout.id).toBe('w1'); // smaller id kept
    });

    it('prefers workout from Google when both exist same day', () => {
      const trainee = { id: 't1' };
      const date = new Date('2025-02-10T10:00:00.000Z');
      const items = [
        { trainee, workout: { id: 'w1', isFromGoogle: false, is_completed: false }, workoutDate: date },
        { trainee, workout: { id: 'w2', isFromGoogle: true, is_completed: false }, workoutDate: date },
      ];
      const deduped = deduplicateByTraineeAndDate(items);
      expect(deduped).toHaveLength(1);
      expect(deduped[0].workout.id).toBe('w2');
    });

    it('keeps distinct days for same trainee', () => {
      const trainee = { id: 't1' };
      const items = [
        { trainee, workout: { id: 'w1', isFromGoogle: false, is_completed: false }, workoutDate: new Date('2025-02-10T10:00:00.000Z') },
        { trainee, workout: { id: 'w2', isFromGoogle: false, is_completed: false }, workoutDate: new Date('2025-02-11T10:00:00.000Z') },
      ];
      const deduped = deduplicateByTraineeAndDate(items);
      expect(deduped).toHaveLength(2);
    });
  });

  describe('numbering with duplicate workouts on same day', () => {
    it('counts duplicate workouts on same date as one session for position', () => {
      const items = [
        { date: '2025-02-10T10:00:00.000Z', workout_id: 'w1' },
        { date: '2025-02-11T09:00:00.000Z', workout_id: 'w2a' },
        { date: '2025-02-11T09:00:00.000Z', workout_id: 'w2b' },
      ];
      const numbers = workoutNumbersDedupedByDate(items);
      expect(numbers.get('w1')).toBe(1);
      expect(numbers.get('w2a')).toBe(2); // w2a has smaller id, kept for that date
      expect(numbers.get('w2b')).toBe(2); // w2b shares date with w2a - same position
      expect(new Set(numbers.values()).size).toBe(2); // only 2 unique positions
    });

    it('total unique sessions is correct when duplicates exist', () => {
      const items = [
        { date: '2025-02-09T10:00:00.000Z', workout_id: 'w1' },
        { date: '2025-02-10T10:00:00.000Z', workout_id: 'w2' },
        { date: '2025-02-10T14:00:00.000Z', workout_id: 'w3' },
      ];
      const numbers = workoutNumbersDedupedByDate(items);
      expect(new Set(numbers.values()).size).toBe(2); // 2 unique positions
      expect(numbers.get('w2')).toBe(2);
      expect(numbers.get('w3')).toBe(2); // same date = same position
    });
  });
});
