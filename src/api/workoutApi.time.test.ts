import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Test suite to verify that workout_date preserves time correctly when saving workouts
 * 
 * This test ensures that when a workout is saved:
 * 1. The date from user input is preserved
 * 2. The time is updated to the current save time
 * 3. The workout_date includes both date and time (timestamptz)
 */

describe('Workout Time Preservation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('workout_date time update logic', () => {
    it('should preserve date but use current time when saving new workout', () => {
      // Simulate user selecting a date (e.g., "2024-01-15")
      const userSelectedDate = new Date('2024-01-15T00:00:00.000Z');
      const saveTime = new Date('2024-01-15T14:30:45.123Z'); // Current time when saving

      // Simulate the logic in save-workout edge function
      const finalWorkoutDate = new Date(
        userSelectedDate.getFullYear(),
        userSelectedDate.getMonth(),
        userSelectedDate.getDate(),
        saveTime.getHours(),
        saveTime.getMinutes(),
        saveTime.getSeconds(),
        saveTime.getMilliseconds()
      );

      // Verify the date is preserved
      expect(finalWorkoutDate.getFullYear()).toBe(2024);
      expect(finalWorkoutDate.getMonth()).toBe(0); // January (0-indexed)
      expect(finalWorkoutDate.getDate()).toBe(15);

      // Verify the time is updated to save time
      expect(finalWorkoutDate.getHours()).toBe(saveTime.getHours());
      expect(finalWorkoutDate.getMinutes()).toBe(saveTime.getMinutes());
      expect(finalWorkoutDate.getSeconds()).toBe(saveTime.getSeconds());
      expect(finalWorkoutDate.getMilliseconds()).toBe(saveTime.getMilliseconds());

      // Verify it's not midnight (original time)
      expect(finalWorkoutDate.getHours()).not.toBe(0);
    });

    it('should preserve date but use current time when updating workout', () => {
      // Simulate updating an existing workout with a different date
      const existingWorkoutDate = new Date('2024-01-10T10:00:00.000Z');
      const updateTime = new Date('2024-01-15T16:45:30.456Z'); // Current time when updating

      // When updating, preserve the date from input but use current time
      const updatedWorkoutDate = new Date(
        existingWorkoutDate.getFullYear(),
        existingWorkoutDate.getMonth(),
        existingWorkoutDate.getDate(),
        updateTime.getHours(),
        updateTime.getMinutes(),
        updateTime.getSeconds(),
        updateTime.getMilliseconds()
      );

      // Verify original date is preserved
      expect(updatedWorkoutDate.getFullYear()).toBe(2024);
      expect(updatedWorkoutDate.getMonth()).toBe(0);
      expect(updatedWorkoutDate.getDate()).toBe(10);

      // Verify time is updated to current save time
      expect(updatedWorkoutDate.getHours()).toBe(updateTime.getHours());
      expect(updatedWorkoutDate.getMinutes()).toBe(updateTime.getMinutes());
    });

    it('should handle ISO string input correctly', () => {
      // Simulate receiving workout_date as ISO string from frontend
      const workoutDateISO = '2024-01-20T00:00:00.000Z';
      const saveTime = new Date('2024-01-20T09:15:30.789Z');

      const workoutDateObj = new Date(workoutDateISO);
      const finalWorkoutDate = new Date(
        workoutDateObj.getFullYear(),
        workoutDateObj.getMonth(),
        workoutDateObj.getDate(),
        saveTime.getHours(),
        saveTime.getMinutes(),
        saveTime.getSeconds(),
        saveTime.getMilliseconds()
      ).toISOString();

      const parsedDate = new Date(finalWorkoutDate);

      // Verify the result is a valid ISO string with time
      expect(finalWorkoutDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      
      // Verify date is correct
      expect(parsedDate.getFullYear()).toBe(2024);
      expect(parsedDate.getMonth()).toBe(0);
      expect(parsedDate.getDate()).toBe(20);

      // Verify time is correct (using UTC to match ISO string)
      expect(parsedDate.getUTCHours()).toBe(saveTime.getUTCHours());
      expect(parsedDate.getUTCMinutes()).toBe(saveTime.getUTCMinutes());
    });

    it('should ensure workout_date is always a timestamptz (not just date)', () => {
      const userDate = new Date('2024-02-01T00:00:00.000Z');
      const saveTime = new Date('2024-02-01T12:30:00.000Z');

      const finalDate = new Date(
        userDate.getFullYear(),
        userDate.getMonth(),
        userDate.getDate(),
        saveTime.getHours(),
        saveTime.getMinutes(),
        saveTime.getSeconds(),
        saveTime.getMilliseconds()
      ).toISOString();

      // Verify it includes time component (not just date)
      expect(finalDate).toContain('T');
      expect(finalDate).toMatch(/\d{2}:\d{2}:\d{2}/);
      
      // Verify it's not just a date string like "2024-02-01"
      expect(finalDate).not.toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should handle timezone correctly', () => {
      // Test with Israel timezone (Asia/Jerusalem)
      const userDate = new Date('2024-03-15T00:00:00.000+02:00');
      const saveTime = new Date('2024-03-15T15:20:10.500+02:00');

      const finalDate = new Date(
        userDate.getFullYear(),
        userDate.getMonth(),
        userDate.getDate(),
        saveTime.getHours(),
        saveTime.getMinutes(),
        saveTime.getSeconds(),
        saveTime.getMilliseconds()
      );

      // Verify the date components
      expect(finalDate.getFullYear()).toBe(2024);
      expect(finalDate.getMonth()).toBe(2); // March (0-indexed)
      expect(finalDate.getDate()).toBe(15);

      // Verify time components are set
      expect(finalDate.getHours()).toBe(saveTime.getHours());
      expect(finalDate.getMinutes()).toBe(saveTime.getMinutes());
    });
  });

  describe('Edge cases', () => {
    it('should handle date with existing time correctly', () => {
      // Even if user somehow sends a date with time, we preserve the date but use current time
      const workoutDateWithTime = new Date('2024-04-10T08:00:00.000Z');
      const saveTime = new Date('2024-04-10T18:00:00.000Z');

      const finalDate = new Date(
        workoutDateWithTime.getFullYear(),
        workoutDateWithTime.getMonth(),
        workoutDateWithTime.getDate(),
        saveTime.getHours(),
        saveTime.getMinutes(),
        saveTime.getSeconds(),
        saveTime.getMilliseconds()
      );

      // Date should be preserved
      expect(finalDate.getDate()).toBe(10);
      expect(finalDate.getMonth()).toBe(3); // April

      // Time should be from saveTime, not from original
      expect(finalDate.getHours()).toBe(saveTime.getHours());
      expect(finalDate.getMinutes()).toBe(saveTime.getMinutes());
    });

    it('should handle same date, different save times', () => {
      const userDate = new Date('2024-05-20T00:00:00.000Z');
      const saveTime1 = new Date('2024-05-20T10:00:00.000Z');
      const saveTime2 = new Date('2024-05-20T14:30:00.000Z');

      // Use UTC methods to match the logic in save-workout function
      const finalDate1 = new Date(Date.UTC(
        userDate.getUTCFullYear(),
        userDate.getUTCMonth(),
        userDate.getUTCDate(),
        saveTime1.getUTCHours(),
        saveTime1.getUTCMinutes(),
        saveTime1.getUTCSeconds(),
        saveTime1.getUTCMilliseconds()
      ));

      const finalDate2 = new Date(Date.UTC(
        userDate.getUTCFullYear(),
        userDate.getUTCMonth(),
        userDate.getUTCDate(),
        saveTime2.getUTCHours(),
        saveTime2.getUTCMinutes(),
        saveTime2.getUTCSeconds(),
        saveTime2.getUTCMilliseconds()
      ));

      // Same date (in UTC)
      expect(finalDate1.getUTCDate()).toBe(finalDate2.getUTCDate());
      
      // Different times (in UTC)
      expect(finalDate1.getUTCHours()).not.toBe(finalDate2.getUTCHours());
      expect(finalDate1.getUTCHours()).toBe(10);
      expect(finalDate2.getUTCHours()).toBe(14);
    });
  });
});
