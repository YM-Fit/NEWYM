import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signInTrainer, signUpTrainer, signInTrainee, signOut } from './authApi';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
    },
    from: vi.fn(),
  },
}));

vi.mock('../utils/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

vi.mock('./config', () => ({
  API_CONFIG: {
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-key',
  },
}));

describe('authApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('signInTrainer', () => {
    it('should sign in trainer successfully', async () => {
      const mockUser = { id: '1', email: 'test@example.com' };
      const mockSession = { access_token: 'token' };
      
      (supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const result = await signInTrainer('test@example.com', 'password');

      expect(result.success).toBe(true);
      expect(result.data?.user).toEqual(mockUser);
      expect(result.data?.session).toEqual(mockSession);
    });

    it('should handle sign in error', async () => {
      (supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: null,
        error: { message: 'Invalid credentials' },
      });

      const result = await signInTrainer('test@example.com', 'wrong');

      expect(result.error).toBe('Invalid credentials');
      expect(result.success).toBeUndefined();
    });

    it('should handle exceptions', async () => {
      (supabase.auth.signInWithPassword as any).mockRejectedValue(
        new Error('Network error')
      );

      const result = await signInTrainer('test@example.com', 'password');

      expect(result.error).toBe('Network error');
    });
  });

  describe('signUpTrainer', () => {
    it('should sign up trainer successfully', async () => {
      const mockUser = { id: '1', email: 'test@example.com' };
      
      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      (supabase.from as any).mockReturnValue({
        insert: mockInsert,
      });

      const result = await signUpTrainer('test@example.com', 'password', 'Test User');

      expect(result.success).toBe(true);
      expect(result.data?.user).toEqual(mockUser);
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should handle sign up error', async () => {
      (supabase.auth.signUp as any).mockResolvedValue({
        data: null,
        error: { message: 'Email already exists' },
      });

      const result = await signUpTrainer('test@example.com', 'password', 'Test User');

      expect(result.error).toBe('Email already exists');
    });

    it('should handle profile creation error', async () => {
      const mockUser = { id: '1', email: 'test@example.com' };
      
      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockInsert = vi.fn().mockResolvedValue({
        error: { message: 'Profile creation failed' },
      });
      (supabase.from as any).mockReturnValue({
        insert: mockInsert,
      });

      const result = await signUpTrainer('test@example.com', 'password', 'Test User');

      expect(result.error).toBe('Profile creation failed');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('signInTrainee', () => {
    it('should sign in trainee successfully', async () => {
      const mockResponse = {
        session: { access_token: 'token' },
        trainee: { id: '1', name: 'Test' },
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await signInTrainee('0521234567', 'password');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
    });

    it('should handle trainee login error', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Invalid credentials' }),
      });

      const result = await signInTrainee('0521234567', 'wrong');

      expect(result.error).toBe('Invalid credentials');
    });
  });

  describe('signOut', () => {
    it('should sign out successfully', async () => {
      (supabase.auth.signOut as any).mockResolvedValue({ error: null });

      const result = await signOut();

      expect(result.success).toBe(true);
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it('should handle sign out error', async () => {
      (supabase.auth.signOut as any).mockResolvedValue({
        error: { message: 'Sign out failed' },
      });

      const result = await signOut();

      expect(result.error).toBe('Sign out failed');
    });
  });

  describe('getCurrentSession', () => {
    it('should get current session successfully', async () => {
      const mockUser = { id: '1', email: 'test@example.com' };
      const mockSession = { access_token: 'token', user: mockUser };
      
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const { getCurrentSession } = await import('./authApi');
      const result = await getCurrentSession();

      expect(result.success).toBe(true);
      expect(result.data?.session).toEqual(mockSession);
    });
  });
});
