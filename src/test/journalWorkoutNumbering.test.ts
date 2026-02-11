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
});
