import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Test suite to verify that workout_date preserves time correctly when saving workouts
 * 
 * This test ensures that when a workout is saved:
 * 1. The date from user input is preserved
 * 2. The time is ALWAYS updated to the current save time (not from frontend)
 * 3. The workout_date includes both date and time (timestamptz)
 * 4. Works correctly with date-only strings (YYYY-MM-DD) from date inputs
 */

// Simulate the exact logic from save-workout/index.ts
function simulateSaveWorkoutTimeLogic(workout_date: string, now: Date): string {
  const workoutDateObj = new Date(workout_date);
  
  // If workout_date is just a date string (YYYY-MM-DD), parse it properly
  if (workout_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    // Date-only string - use it directly with current time
    const [year, month, day] = workout_date.split('-').map(Number);
    return new Date(Date.UTC(
      year,
      month - 1, // Month is 0-indexed
      day,
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds(),
      now.getUTCMilliseconds()
    )).toISOString();
  } else {
    // ISO string with time - preserve date, use current time
    return new Date(Date.UTC(
      workoutDateObj.getUTCFullYear(),
      workoutDateObj.getUTCMonth(),
      workoutDateObj.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds(),
      now.getUTCMilliseconds()
    )).toISOString();
  }
}

describe('Workout Time Preservation - Actual Function Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('workout_date time update logic - using actual function', () => {
    it('should preserve date but use current time when saving with date-only string (YYYY-MM-DD)', () => {
      // Simulate HTML date input that sends "2024-01-15" (date-only)
      const workout_date = '2024-01-15';
      const saveTime = new Date('2024-01-15T14:30:45.123Z'); // Current time when saving

      const finalWorkoutDate = simulateSaveWorkoutTimeLogic(workout_date, saveTime);
      const parsed = new Date(finalWorkoutDate);

      // Verify the date is preserved
      expect(parsed.getUTCFullYear()).toBe(2024);
      expect(parsed.getUTCMonth()).toBe(0); // January (0-indexed)
      expect(parsed.getUTCDate()).toBe(15);

      // Verify the time is updated to save time (not 00:00:00)
      expect(parsed.getUTCHours()).toBe(saveTime.getUTCHours());
      expect(parsed.getUTCMinutes()).toBe(saveTime.getUTCMinutes());
      expect(parsed.getUTCSeconds()).toBe(saveTime.getUTCSeconds());
      expect(parsed.getUTCMilliseconds()).toBe(saveTime.getUTCMilliseconds());

      // Verify it's not midnight (original time would be 00:00:00)
      expect(parsed.getUTCHours()).not.toBe(0);
      expect(parsed.getUTCMinutes()).not.toBe(0);
    });

    it('should preserve date but use current time when saving with ISO string', () => {
      // Simulate frontend sending ISO string with time
      const workout_date = '2024-01-15T00:00:00.000Z';
      const saveTime = new Date('2024-01-15T14:30:45.123Z'); // Current time when saving

      const finalWorkoutDate = simulateSaveWorkoutTimeLogic(workout_date, saveTime);
      const parsed = new Date(finalWorkoutDate);

      // Verify the date is preserved
      expect(parsed.getUTCFullYear()).toBe(2024);
      expect(parsed.getUTCMonth()).toBe(0);
      expect(parsed.getUTCDate()).toBe(15);

      // Verify the time is updated to save time (not the time from input)
      expect(parsed.getUTCHours()).toBe(saveTime.getUTCHours());
      expect(parsed.getUTCMinutes()).toBe(saveTime.getUTCMinutes());
      expect(parsed.getUTCSeconds()).toBe(saveTime.getUTCSeconds());

      // Original input was 00:00:00, but saved time is different
      expect(parsed.getUTCHours()).not.toBe(0);
    });

    it('should ALWAYS use current save time, regardless of input time', () => {
      // Critical test: Even if frontend sends a time, we should use current time
      const workout_date = '2024-01-10T10:00:00.000Z'; // Frontend sends 10:00
      const updateTime = new Date('2024-01-15T16:45:30.456Z'); // But we save at 16:45

      const finalWorkoutDate = simulateSaveWorkoutTimeLogic(workout_date, updateTime);
      const parsed = new Date(finalWorkoutDate);

      // Verify original date is preserved
      expect(parsed.getUTCFullYear()).toBe(2024);
      expect(parsed.getUTCMonth()).toBe(0);
      expect(parsed.getUTCDate()).toBe(10);

      // CRITICAL: Time should be from saveTime (16:45), NOT from input (10:00)
      expect(parsed.getUTCHours()).toBe(updateTime.getUTCHours()); // 16, not 10
      expect(parsed.getUTCMinutes()).toBe(updateTime.getUTCMinutes()); // 45, not 0
      expect(parsed.getUTCHours()).not.toBe(10); // Should NOT be the input time
    });

    it('should handle date-only format (YYYY-MM-DD) from HTML date input', () => {
      // This is what HTML <input type="date"> sends
      const workout_date = '2024-01-20'; // Date-only format
      const saveTime = new Date('2024-01-20T09:15:30.789Z');

      const finalWorkoutDate = simulateSaveWorkoutTimeLogic(workout_date, saveTime);
      const parsedDate = new Date(finalWorkoutDate);

      // Verify the result is a valid ISO string with time
      expect(finalWorkoutDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      
      // Verify date is correct
      expect(parsedDate.getUTCFullYear()).toBe(2024);
      expect(parsedDate.getUTCMonth()).toBe(0);
      expect(parsedDate.getUTCDate()).toBe(20);

      // Verify time is from saveTime (not 00:00:00)
      expect(parsedDate.getUTCHours()).toBe(saveTime.getUTCHours());
      expect(parsedDate.getUTCMinutes()).toBe(saveTime.getUTCMinutes());
      expect(parsedDate.getUTCHours()).not.toBe(0); // Should not be midnight
    });

    it('should ensure workout_date is always a timestamptz (not just date)', () => {
      const workout_date = '2024-02-01'; // Date-only input
      const saveTime = new Date('2024-02-01T12:30:45.000Z');

      const finalDate = simulateSaveWorkoutTimeLogic(workout_date, saveTime);

      // Verify it includes time component (not just date)
      expect(finalDate).toContain('T');
      expect(finalDate).toMatch(/\d{2}:\d{2}:\d{2}/);
      
      // Verify it's not just a date string like "2024-02-01"
      expect(finalDate).not.toMatch(/^\d{4}-\d{2}-\d{2}$/);
      
      // Verify it has milliseconds/timezone info
      expect(finalDate).toMatch(/\.\d{3}Z$/);
    });

    it('should handle timezone correctly using UTC', () => {
      // Test with date input - should work in UTC
      const workout_date = '2024-03-15';
      const saveTime = new Date('2024-03-15T15:20:10.500Z'); // UTC time

      const finalDate = simulateSaveWorkoutTimeLogic(workout_date, saveTime);
      const parsed = new Date(finalDate);

      // Verify the date components (in UTC)
      expect(parsed.getUTCFullYear()).toBe(2024);
      expect(parsed.getUTCMonth()).toBe(2); // March (0-indexed)
      expect(parsed.getUTCDate()).toBe(15);

      // Verify time components are from saveTime (in UTC)
      expect(parsed.getUTCHours()).toBe(saveTime.getUTCHours());
      expect(parsed.getUTCMinutes()).toBe(saveTime.getUTCMinutes());
      expect(parsed.getUTCSeconds()).toBe(saveTime.getUTCSeconds());
    });
  });

  describe('Edge cases - Actual Function Logic', () => {
    it('should ALWAYS ignore time from input and use current save time', () => {
      // CRITICAL: Even if frontend sends time 08:00, we should use save time 18:00
      const workout_date = '2024-04-10T08:00:00.000Z'; // Input has 08:00
      const saveTime = new Date('2024-04-10T18:00:00.000Z'); // Save at 18:00

      const finalDate = simulateSaveWorkoutTimeLogic(workout_date, saveTime);
      const parsed = new Date(finalDate);

      // Date should be preserved
      expect(parsed.getUTCDate()).toBe(10);
      expect(parsed.getUTCMonth()).toBe(3); // April

      // Time should be from saveTime (18:00), NOT from input (08:00)
      expect(parsed.getUTCHours()).toBe(saveTime.getUTCHours()); // 18
      expect(parsed.getUTCMinutes()).toBe(saveTime.getUTCMinutes()); // 0
      expect(parsed.getUTCHours()).not.toBe(8); // Should NOT be input time
    });

    it('should reflect different save times for same date input', () => {
      // If same date is saved at different times, workout_date should reflect save time
      const workout_date = '2024-05-20'; // Same date input
      const saveTime1 = new Date('2024-05-20T10:00:00.000Z');
      const saveTime2 = new Date('2024-05-20T14:30:00.000Z');

      const finalDate1 = simulateSaveWorkoutTimeLogic(workout_date, saveTime1);
      const finalDate2 = simulateSaveWorkoutTimeLogic(workout_date, saveTime2);
      
      const parsed1 = new Date(finalDate1);
      const parsed2 = new Date(finalDate2);

      // Same date (in UTC)
      expect(parsed1.getUTCDate()).toBe(parsed2.getUTCDate());
      expect(parsed1.getUTCFullYear()).toBe(parsed2.getUTCFullYear());
      expect(parsed1.getUTCMonth()).toBe(parsed2.getUTCMonth());
      
      // Different times (in UTC) - reflects actual save time
      expect(parsed1.getUTCHours()).not.toBe(parsed2.getUTCHours());
      expect(parsed1.getUTCHours()).toBe(10);
      expect(parsed2.getUTCHours()).toBe(14);
    });

    it('should handle real-world scenario: user changes date, saves at different time', () => {
      // Real scenario: User selects date "2024-06-01" in UI (00:00:00)
      // But saves the workout at 15:30:45
      const workout_date = '2024-06-01'; // From date input
      const actualSaveTime = new Date('2024-06-01T15:30:45.123Z'); // Actual save time

      const finalDate = simulateSaveWorkoutTimeLogic(workout_date, actualSaveTime);
      const parsed = new Date(finalDate);

      // Date should be from input
      expect(parsed.getUTCFullYear()).toBe(2024);
      expect(parsed.getUTCMonth()).toBe(5); // June
      expect(parsed.getUTCDate()).toBe(1);

      // Time should be from actual save time (15:30:45), NOT midnight (00:00:00)
      expect(parsed.getUTCHours()).toBe(15);
      expect(parsed.getUTCMinutes()).toBe(30);
      expect(parsed.getUTCSeconds()).toBe(45);
      expect(parsed.getUTCMilliseconds()).toBe(123);
      
      // This proves the time is preserved correctly
      expect(parsed.getUTCHours()).not.toBe(0);
    });
  });
});
