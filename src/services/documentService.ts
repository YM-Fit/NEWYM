/**
 * Document Service
 * שירות לניהול מסמכים
 */

import { supabase, logSupabaseError } from '../lib/supabase';
import { logger } from '../utils/logger';
import type { ApiResponse } from '../api/types';

/**
 * Document
 */
export interface Document {
  id: string;
  trainee_id: string;
  trainer_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  category: 'contract' | 'photo' | 'before_after' | 'other';
  description?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

/**
 * Document Service
 */
export class DocumentService {
  /**
   * Get documents for a trainee
   * @param traineeId - Trainee ID
   * @returns Promise with documents
   */
  static async getDocuments(
    traineeId: string
  ): Promise<ApiResponse<Document[]>> {
    try {
      const { data, error } = await supabase
        .from('crm_documents')
        .select('*')
        .eq('trainee_id', traineeId)
        .order('created_at', { ascending: false });

      if (error) {
        logSupabaseError(error, 'getDocuments', { table: 'crm_documents', traineeId });
        return { error: error.message };
      }

      return { data: data || [], success: true };
    } catch (error) {
      logger.error('Error getting documents', error, 'DocumentService');
      return { error: 'שגיאה בטעינת מסמכים' };
    }
  }

  /**
   * Upload document
   * @param traineeId - Trainee ID
   * @param trainerId - Trainer ID
   * @param file - File to upload
   * @param category - Document category
   * @param description - Optional description
   * @returns Promise with uploaded document
   */
  static async uploadDocument(
    traineeId: string,
    trainerId: string,
    file: File,
    category: Document['category'],
    description?: string
  ): Promise<ApiResponse<Document>> {
    try {
      // Generate unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${traineeId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `documents/${fileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('crm-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        logger.error('Error uploading file', uploadError, 'DocumentService');
        return { error: uploadError.message };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('crm-documents')
        .getPublicUrl(filePath);

      // Save document record
      const { data: document, error: documentError } = await supabase
        .from('crm_documents')
        .insert([{
          trainee_id: traineeId,
          trainer_id: trainerId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
          category,
          description,
          metadata: {
            public_url: urlData.publicUrl,
          },
        }])
        .select()
        .single();

      if (documentError) {
        // Try to delete uploaded file if database insert fails
        await supabase.storage.from('crm-documents').remove([filePath]);
        logSupabaseError(documentError, 'uploadDocument', { table: 'crm_documents' });
        return { error: documentError.message };
      }

      return { data: document, success: true };
    } catch (error) {
      logger.error('Error uploading document', error, 'DocumentService');
      return { error: 'שגיאה בהעלאת מסמך' };
    }
  }

  /**
   * Delete document
   * @param documentId - Document ID
   * @returns Promise with success status
   */
  static async deleteDocument(documentId: string): Promise<ApiResponse> {
    try {
      // Get document to get file path
      const { data: document, error: fetchError } = await supabase
        .from('crm_documents')
        .select('file_path')
        .eq('id', documentId)
        .single();

      if (fetchError || !document) {
        return { error: 'מסמך לא נמצא' };
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('crm-documents')
        .remove([document.file_path]);

      if (storageError) {
        logger.error('Error deleting file from storage', storageError, 'DocumentService');
        // Continue to delete database record even if storage delete fails
      }

      // Delete database record
      const { error: deleteError } = await supabase
        .from('crm_documents')
        .delete()
        .eq('id', documentId);

      if (deleteError) {
        logSupabaseError(deleteError, 'deleteDocument', { table: 'crm_documents', documentId });
        return { error: deleteError.message };
      }

      return { success: true };
    } catch (error) {
      logger.error('Error deleting document', error, 'DocumentService');
      return { error: 'שגיאה במחיקת מסמך' };
    }
  }

  /**
   * Get document download URL
   * @param documentId - Document ID
   * @returns Promise with download URL
   */
  static async getDocumentUrl(documentId: string): Promise<ApiResponse<string>> {
    try {
      const { data: document, error } = await supabase
        .from('crm_documents')
        .select('file_path, metadata')
        .eq('id', documentId)
        .single();

      if (error || !document) {
        return { error: 'מסמך לא נמצא' };
      }

      // Get signed URL for download (valid for 1 hour)
      const { data: urlData, error: urlError } = await supabase.storage
        .from('crm-documents')
        .createSignedUrl(document.file_path, 3600);

      if (urlError || !urlData) {
        return { error: 'שגיאה ביצירת קישור הורדה' };
      }

      return { data: urlData.signedUrl, success: true };
    } catch (error) {
      logger.error('Error getting document URL', error, 'DocumentService');
      return { error: 'שגיאה ביצירת קישור הורדה' };
    }
  }

  /**
   * Update document metadata
   * @param documentId - Document ID
   * @param updates - Updates to apply
   * @returns Promise with updated document
   */
  static async updateDocument(
    documentId: string,
    updates: Partial<Document>
  ): Promise<ApiResponse<Document>> {
    try {
      const { data, error } = await supabase
        .from('crm_documents')
        .update(updates)
        .eq('id', documentId)
        .select()
        .single();

      if (error) {
        logSupabaseError(error, 'updateDocument', { table: 'crm_documents', documentId });
        return { error: error.message };
      }

      return { data, success: true };
    } catch (error) {
      logger.error('Error updating document', error, 'DocumentService');
      return { error: 'שגיאה בעדכון מסמך' };
    }
  }
}
