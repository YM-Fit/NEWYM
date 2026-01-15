import { describe, it, expect, beforeEach, vi } from 'vitest';
import { messagesApi } from './messagesApi';
import { supabase } from '../lib/supabase';
import { handleApiError } from './config';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('./config', () => ({
  handleApiError: vi.fn((error, message) => new Error(message)),
}));

describe('messagesApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMessages', () => {
    it('should get messages successfully', async () => {
      const mockMessages = [
        { id: '1', trainee_id: '1', trainer_id: '1', message_text: 'Hello' },
        { id: '2', trainee_id: '1', trainer_id: '1', message_text: 'Hi' },
      ];
      
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockMessages,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await messagesApi.getMessages('trainee-1', 'trainer-1');

      expect(result).toEqual(mockMessages);
    });
  });

  describe('sendMessage', () => {
    it('should send message successfully', async () => {
      const mockMessage = {
        id: '1',
        trainee_id: '1',
        trainer_id: '1',
        sender_type: 'trainer' as const,
        message_text: 'Hello',
      };
      const input = {
        trainee_id: '1',
        trainer_id: '1',
        sender_type: 'trainer' as const,
        message_text: 'Hello',
      };
      
      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockMessage,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await messagesApi.sendMessage(input);

      expect(result).toEqual(mockMessage);
    });
  });

  describe('markAsRead', () => {
    it('should mark message as read successfully', async () => {
      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockChain);

      await expect(messagesApi.markAsRead('message-1')).resolves.not.toThrow();
    });
  });

  describe('getUnreadCount', () => {
    it('should get unread count successfully', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      
      // Mock the chain for multiple eq calls
      mockChain.eq = vi.fn()
        .mockReturnValueOnce(mockChain)
        .mockReturnValueOnce(mockChain)
        .mockReturnValueOnce(mockChain)
        .mockResolvedValueOnce({
          count: 5,
          error: null,
        });

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await messagesApi.getUnreadCount('trainee-1', 'trainer-1', 'trainer');

      expect(result).toBe(5);
    });

    it('should return 0 when count is null', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      
      mockChain.eq = vi.fn()
        .mockReturnValueOnce(mockChain)
        .mockReturnValueOnce(mockChain)
        .mockReturnValueOnce(mockChain)
        .mockResolvedValueOnce({
          count: null,
          error: null,
        });

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await messagesApi.getUnreadCount('trainee-1', 'trainer-1', 'trainer');

      expect(result).toBe(0);
    });
  });
});
