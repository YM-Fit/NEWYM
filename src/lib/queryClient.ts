import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

export const queryKeys = {
  trainees: {
    all: (trainerId: string) => ['trainees', trainerId] as const,
    detail: (traineeId: string) => ['trainees', 'detail', traineeId] as const,
    profile: (traineeId: string) => ['trainees', 'profile', traineeId] as const,
  },
  trainer: {
    profile: (trainerId: string) => ['trainer', 'profile', trainerId] as const,
  },
  workouts: {
    byTrainee: (traineeId: string) => ['workouts', 'byTrainee', traineeId] as const,
    detail: (workoutId: string) => ['workouts', 'detail', workoutId] as const,
    exercises: (workoutId: string) => ['workouts', 'exercises', workoutId] as const,
    today: (trainerId: string) => ['workouts', 'today', trainerId] as const,
    recent: (trainerId: string) => ['workouts', 'recent', trainerId] as const,
  },
  measurements: {
    byTrainee: (traineeId: string) => ['measurements', 'byTrainee', traineeId] as const,
    latest: (traineeId: string) => ['measurements', 'latest', traineeId] as const,
  },
  selfWeights: {
    byTrainee: (traineeId: string) => ['selfWeights', 'byTrainee', traineeId] as const,
    unseenCounts: (trainerId: string) => ['selfWeights', 'unseenCounts', trainerId] as const,
  },
  muscleGroups: {
    all: (trainerId: string) => ['muscleGroups', trainerId] as const,
  },
  exercises: {
    all: (trainerId: string) => ['exercises', trainerId] as const,
    byMuscleGroup: (muscleGroupId: string) => ['exercises', 'byMuscleGroup', muscleGroupId] as const,
  },
  equipment: {
    all: (trainerId: string) => ['equipment', trainerId] as const,
  },
  mealPlans: {
    byTrainee: (traineeId: string) => ['mealPlans', 'byTrainee', traineeId] as const,
    active: (traineeId: string) => ['mealPlans', 'active', traineeId] as const,
    templates: (trainerId: string) => ['mealPlans', 'templates', trainerId] as const,
  },
  workoutPlans: {
    byTrainee: (traineeId: string) => ['workoutPlans', 'byTrainee', traineeId] as const,
    detail: (planId: string) => ['workoutPlans', 'detail', planId] as const,
    templates: (trainerId: string) => ['workoutPlans', 'templates', trainerId] as const,
    weeklyExecutions: (traineeId: string) => ['workoutPlans', 'weeklyExecutions', traineeId] as const,
  },
  goals: {
    byTrainee: (traineeId: string) => ['goals', 'byTrainee', traineeId] as const,
  },
  habits: {
    byTrainee: (traineeId: string) => ['habits', 'byTrainee', traineeId] as const,
    logs: (habitId: string) => ['habits', 'logs', habitId] as const,
  },
  cardio: {
    byTrainee: (traineeId: string) => ['cardio', 'byTrainee', traineeId] as const,
    types: (trainerId: string) => ['cardio', 'types', trainerId] as const,
    stats: (traineeId: string) => ['cardio', 'stats', traineeId] as const,
  },
  mentalTools: {
    byTrainee: (traineeId: string) => ['mentalTools', 'byTrainee', traineeId] as const,
  },
  notifications: {
    byTrainer: (trainerId: string) => ['notifications', 'byTrainer', trainerId] as const,
    unreadCount: (trainerId: string) => ['notifications', 'unreadCount', trainerId] as const,
  },
  messages: {
    byConversation: (traineeId: string, trainerId: string) => ['messages', traineeId, trainerId] as const,
    unreadCount: (userId: string) => ['messages', 'unreadCount', userId] as const,
  },
  notes: {
    byTrainee: (traineeId: string) => ['notes', 'byTrainee', traineeId] as const,
  },
  foodDiary: {
    byTraineeDate: (traineeId: string, date: string) => ['foodDiary', traineeId, date] as const,
    weekData: (traineeId: string, startDate: string) => ['foodDiary', 'week', traineeId, startDate] as const,
  },
  analytics: {
    adherence: (trainerId: string) => ['analytics', 'adherence', trainerId] as const,
    traineeAnalytics: (traineeId: string) => ['analytics', 'trainee', traineeId] as const,
  },
  personalRecords: {
    byTrainee: (traineeId: string) => ['personalRecords', 'byTrainee', traineeId] as const,
    byExercise: (traineeId: string, exerciseId: string) => ['personalRecords', traineeId, exerciseId] as const,
  },
  calendar: {
    events: (trainerId: string) => ['calendar', 'events', trainerId] as const,
    syncHistory: (trainerId: string) => ['calendar', 'syncHistory', trainerId] as const,
  },
  templates: {
    workout: (trainerId: string) => ['templates', 'workout', trainerId] as const,
    workoutPlan: (trainerId: string) => ['templates', 'workoutPlan', trainerId] as const,
    mealPlan: (trainerId: string) => ['templates', 'mealPlan', trainerId] as const,
  },
  recentActivity: {
    byTrainer: (trainerId: string) => ['recentActivity', trainerId] as const,
  },
  scaleReadings: {
    recent: (trainerId: string) => ['scaleReadings', 'recent', trainerId] as const,
  },
} as const;
