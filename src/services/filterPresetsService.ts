/**
 * Filter Presets Service
 * שירות לניהול filter presets
 */

import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';
import type { ApiResponse } from '../api/types';
import type { FilterCondition } from './segmentationService';

export interface FilterPreset {
  id: string;
  trainer_id: string;
  name: string;
  description?: string;
  is_system_preset: boolean;
  filter_criteria: FilterCondition[];
  usage_count: number;
  last_used_at?: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export class FilterPresetsService {
  /**
   * Get all presets for a trainer (including system presets)
   */
  static async getPresets(trainerId: string): Promise<ApiResponse<FilterPreset[]>> {
    try {
      const { data, error } = await supabase
        .from('filter_presets')
        .select('*')
        .or(`trainer_id.eq.${trainerId},is_system_preset.eq.true`)
        .order('display_order', { ascending: true })
        .order('usage_count', { ascending: false });

      if (error) {
        logger.error('Error fetching filter presets', error, 'FilterPresetsService');
        return { error: 'שגיאה בטעינת presets' };
      }

      return { data: data || [], success: true };
    } catch (error) {
      logger.error('Error fetching filter presets', error, 'FilterPresetsService');
      return { error: 'שגיאה בטעינת presets' };
    }
  }

  /**
   * Create a new preset
   */
  static async createPreset(
    trainerId: string,
    name: string,
    description: string,
    filterCriteria: FilterCondition[]
  ): Promise<ApiResponse<FilterPreset>> {
    try {
      const { data, error } = await supabase
        .from('filter_presets')
        .insert({
          trainer_id: trainerId,
          name,
          description,
          filter_criteria: filterCriteria,
          is_system_preset: false,
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating filter preset', error, 'FilterPresetsService');
        return { error: 'שגיאה ביצירת preset' };
      }

      return { data, success: true };
    } catch (error) {
      logger.error('Error creating filter preset', error, 'FilterPresetsService');
      return { error: 'שגיאה ביצירת preset' };
    }
  }

  /**
   * Update preset usage
   */
  static async recordUsage(presetId: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase.rpc('increment_preset_usage', {
        preset_id: presetId,
      });

      if (error) {
        // Fallback to manual update if RPC doesn't exist
        const { data: preset } = await supabase
          .from('filter_presets')
          .select('usage_count')
          .eq('id', presetId)
          .single();

        if (preset) {
          await supabase
            .from('filter_presets')
            .update({
              usage_count: (preset.usage_count || 0) + 1,
              last_used_at: new Date().toISOString(),
            })
            .eq('id', presetId);
        }
      }

      return { success: true };
    } catch (error) {
      logger.error('Error recording preset usage', error, 'FilterPresetsService');
      return { error: 'שגיאה ברישום שימוש' };
    }
  }

  /**
   * Delete a preset
   */
  static async deletePreset(presetId: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('filter_presets')
        .delete()
        .eq('id', presetId);

      if (error) {
        logger.error('Error deleting filter preset', error, 'FilterPresetsService');
        return { error: 'שגיאה במחיקת preset' };
      }

      return { success: true };
    } catch (error) {
      logger.error('Error deleting filter preset', error, 'FilterPresetsService');
      return { error: 'שגיאה במחיקת preset' };
    }
  }
}
