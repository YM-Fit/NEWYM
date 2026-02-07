import { supabase } from '../lib/supabase';
import { rateLimiter } from '../utils/rateLimiter';
import { handleApiError } from '../utils/apiErrorHandler';

export interface TrainerNote {
  id: string;
  trainee_id: string;
  trainer_id: string;
  note_text: string;
  is_pinned: boolean;
  category: 'general' | 'health' | 'nutrition' | 'training' | 'personal';
  created_at: string;
  updated_at: string;
}

export interface CreateNoteInput {
  trainee_id: string;
  trainer_id: string;
  note_text: string;
  category?: TrainerNote['category'];
  is_pinned?: boolean;
}

export interface UpdateNoteInput {
  note_text?: string;
  category?: TrainerNote['category'];
  is_pinned?: boolean;
}

export const notesApi = {
  async getByTrainee(traineeId: string): Promise<TrainerNote[]> {
    rateLimiter.check('getNotes', 100);
    const { data, error } = await supabase
      .from('trainer_notes')
      .select('*')
      .eq('trainee_id', traineeId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw handleApiError(error, 'שגיאה בטעינת הערות', 'notesApi.getByTrainee');
    return data as TrainerNote[];
  },

  async create(input: CreateNoteInput): Promise<TrainerNote> {
    rateLimiter.check('createNote', 50);
    const { data, error } = await supabase
      .from('trainer_notes')
      .insert(input as never)
      .select()
      .single();
    if (error) throw handleApiError(error, 'שגיאה ביצירת הערה', 'notesApi.create');
    return data as TrainerNote;
  },

  async update(noteId: string, updates: UpdateNoteInput): Promise<TrainerNote> {
    rateLimiter.check('updateNote', 50);
    const { data, error } = await supabase
      .from('trainer_notes')
      .update({ ...updates, updated_at: new Date().toISOString() } as never)
      .eq('id', noteId)
      .select()
      .single();
    if (error) throw handleApiError(error, 'שגיאה בעדכון הערה', 'notesApi.update');
    return data as TrainerNote;
  },

  async delete(noteId: string): Promise<void> {
    rateLimiter.check('deleteNote', 20);
    const { error } = await supabase
      .from('trainer_notes')
      .delete()
      .eq('id', noteId);
    if (error) throw handleApiError(error, 'שגיאה במחיקת הערה', 'notesApi.delete');
  },
};
