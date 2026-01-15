import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWorkoutSession } from './useWorkoutSession';

describe('useWorkoutSession', () => {
  const mockExercise = {
    id: '1',
    name: 'Bench Press',
    muscle_group_id: '1',
  };

  it('should initialize with empty exercises', () => {
    const { result } = renderHook(() => useWorkoutSession());

    expect(result.current.exercises).toEqual([]);
    expect(result.current.minimizedExercises).toEqual([]);
  });

  it('should initialize with initial exercises', () => {
    const initialExercises = [
      {
        tempId: 'temp-1',
        exercise: mockExercise,
        sets: [],
      },
    ];
    const { result } = renderHook(() =>
      useWorkoutSession({ initialExercises })
    );

    expect(result.current.exercises).toHaveLength(1);
    expect(result.current.exercises[0].exercise.name).toBe('Bench Press');
  });

  it('should add exercise', () => {
    const { result } = renderHook(() => useWorkoutSession());

    act(() => {
      result.current.addExercise(mockExercise);
    });

    expect(result.current.exercises).toHaveLength(1);
    expect(result.current.exercises[0].exercise).toEqual(mockExercise);
  });

  it('should remove exercise', () => {
    const initialExercises = [
      {
        tempId: 'temp-1',
        exercise: mockExercise,
        sets: [],
      },
    ];
    const { result } = renderHook(() =>
      useWorkoutSession({ initialExercises })
    );

    act(() => {
      result.current.removeExercise(0); // removeExercise takes index, not tempId
    });

    expect(result.current.exercises).toHaveLength(0);
  });

  it('should add set to exercise', () => {
    const initialExercises = [
      {
        tempId: 'temp-1',
        exercise: mockExercise,
        sets: [
          {
            id: 'set-1',
            set_number: 1,
            weight: 0,
            reps: 0,
            rpe: null,
            set_type: 'regular',
            equipment_id: null,
            equipment: null,
          },
        ],
      },
    ];
    const { result } = renderHook(() =>
      useWorkoutSession({ initialExercises })
    );

    act(() => {
      result.current.addSet(0); // addSet takes index, not tempId
    });

    expect(result.current.exercises[0].sets).toHaveLength(2);
  });

  it('should update set', () => {
    const initialExercises = [
      {
        tempId: 'temp-1',
        exercise: mockExercise,
        sets: [
          {
            id: 'set-1',
            set_number: 1,
            weight: 0,
            reps: 0,
            rpe: null,
            set_type: 'regular',
            equipment_id: null,
            equipment: null,
          },
        ],
      },
    ];
    const { result } = renderHook(() =>
      useWorkoutSession({ initialExercises })
    );

    act(() => {
      result.current.updateSet(0, 0, 'weight', 100); // updateSet takes (exerciseIndex, setIndex, field, value)
      result.current.updateSet(0, 0, 'reps', 10);
    });

    expect(result.current.exercises[0].sets[0].weight).toBe(100);
    expect(result.current.exercises[0].sets[0].reps).toBe(10);
  });

  it('should toggle exercise minimized state', () => {
    const initialExercises = [
      {
        tempId: 'temp-1',
        exercise: mockExercise,
        sets: [],
      },
    ];
    const { result } = renderHook(() =>
      useWorkoutSession({ initialExercises })
    );

    // Initially not minimized
    expect(result.current.minimizedExercises).not.toContain('temp-1');

    act(() => {
      result.current.toggleMinimizeExercise('temp-1'); // toggleMinimizeExercise takes tempId, not index
    });

    // After toggle, should be minimized
    expect(result.current.minimizedExercises).toContain('temp-1');

    act(() => {
      result.current.toggleMinimizeExercise('temp-1');
    });

    // After second toggle, should not be minimized
    expect(result.current.minimizedExercises).not.toContain('temp-1');
  });
});
