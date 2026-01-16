/**
 * Payment Service
 * שירות לניהול תשלומים וחוזים
 */

import { supabase, logSupabaseError } from '../lib/supabase';
import { logger } from '../utils/logger';
import type { ApiResponse } from '../api/types';

/**
 * Contract
 */
export interface Contract {
  id: string;
  trainee_id: string;
  trainer_id: string;
  contract_type: 'monthly' | 'package' | 'session' | 'trial';
  start_date: string;
  end_date?: string;
  value: number;
  terms: string;
  status: 'active' | 'expired' | 'cancelled';
  created_at: string;
  updated_at: string;
}

/**
 * Payment
 */
export interface Payment {
  id: string;
  contract_id?: string;
  trainee_id: string;
  trainer_id: string;
  amount: number;
  due_date: string;
  paid_date?: string;
  payment_method?: 'cash' | 'credit_card' | 'bank_transfer' | 'other';
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  notes?: string;
  invoice_number?: string;
  created_at: string;
}

/**
 * Payment Service
 */
export class PaymentService {
  /**
   * Get contracts for a trainer
   * @param trainerId - Trainer ID
   * @returns Promise with contracts
   */
  static async getContracts(
    trainerId: string
  ): Promise<ApiResponse<Contract[]>> {
    try {
      const { data, error } = await supabase
        .from('crm_contracts')
        .select('*')
        .eq('trainer_id', trainerId)
        .order('created_at', { ascending: false });

      if (error) {
        logSupabaseError(error, 'getContracts', { table: 'crm_contracts', trainerId });
        return { error: error.message };
      }

      return { data: data || [], success: true };
    } catch (error) {
      logger.error('Error getting contracts', error, 'PaymentService');
      return { error: 'שגיאה בטעינת חוזים' };
    }
  }

  /**
   * Get contract for a trainee
   * @param traineeId - Trainee ID
   * @returns Promise with contract
   */
  static async getTraineeContract(
    traineeId: string
  ): Promise<ApiResponse<Contract | null>> {
    try {
      const { data, error } = await supabase
        .from('crm_contracts')
        .select('*')
        .eq('trainee_id', traineeId)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') {
        logSupabaseError(error, 'getTraineeContract', { table: 'crm_contracts', traineeId });
        return { error: error.message };
      }

      return { data: data || null, success: true };
    } catch (error) {
      logger.error('Error getting trainee contract', error, 'PaymentService');
      return { error: 'שגיאה בטעינת חוזה' };
    }
  }

  /**
   * Create contract
   * @param contract - Contract data
   * @returns Promise with created contract
   */
  static async createContract(
    contract: Omit<Contract, 'id' | 'created_at' | 'updated_at'>
  ): Promise<ApiResponse<Contract>> {
    try {
      const { data, error } = await supabase
        .from('crm_contracts')
        .insert([{
          trainee_id: contract.trainee_id,
          trainer_id: contract.trainer_id,
          contract_type: contract.contract_type,
          start_date: contract.start_date,
          end_date: contract.end_date,
          value: contract.value,
          terms: contract.terms,
          status: contract.status || 'active',
        }])
        .select()
        .single();

      if (error) {
        logSupabaseError(error, 'createContract', { table: 'crm_contracts' });
        return { error: error.message };
      }

      // Update trainee contract fields
      await supabase
        .from('trainees')
        .update({
          contract_type: contract.contract_type,
          contract_value: contract.value,
        })
        .eq('id', contract.trainee_id);

      return { data, success: true };
    } catch (error) {
      logger.error('Error creating contract', error, 'PaymentService');
      return { error: 'שגיאה ביצירת חוזה' };
    }
  }

  /**
   * Update contract
   * @param contractId - Contract ID
   * @param updates - Updates to apply
   * @returns Promise with updated contract
   */
  static async updateContract(
    contractId: string,
    updates: Partial<Contract>
  ): Promise<ApiResponse<Contract>> {
    try {
      const { data, error } = await supabase
        .from('crm_contracts')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', contractId)
        .select()
        .single();

      if (error) {
        logSupabaseError(error, 'updateContract', { table: 'crm_contracts', contractId });
        return { error: error.message };
      }

      return { data, success: true };
    } catch (error) {
      logger.error('Error updating contract', error, 'PaymentService');
      return { error: 'שגיאה בעדכון חוזה' };
    }
  }

  /**
   * Get payments for a trainer
   * @param trainerId - Trainer ID
   * @param filters - Optional filters
   * @returns Promise with payments
   */
  static async getPayments(
    trainerId: string,
    filters?: { status?: string; traineeId?: string }
  ): Promise<ApiResponse<Payment[]>> {
    try {
      let query = supabase
        .from('crm_payments')
        .select('*')
        .eq('trainer_id', trainerId)
        .order('due_date', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.traineeId) {
        query = query.eq('trainee_id', filters.traineeId);
      }

      const { data, error } = await query;

      if (error) {
        logSupabaseError(error, 'getPayments', { table: 'crm_payments', trainerId });
        return { error: error.message };
      }

      return { data: data || [], success: true };
    } catch (error) {
      logger.error('Error getting payments', error, 'PaymentService');
      return { error: 'שגיאה בטעינת תשלומים' };
    }
  }

  /**
   * Create payment
   * @param payment - Payment data
   * @returns Promise with created payment
   */
  static async createPayment(
    payment: Omit<Payment, 'id' | 'created_at'>
  ): Promise<ApiResponse<Payment>> {
    try {
      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber(payment.trainer_id);

      const { data, error } = await supabase
        .from('crm_payments')
        .insert([{
          ...payment,
          invoice_number: invoiceNumber,
          status: payment.status || 'pending',
        }])
        .select()
        .single();

      if (error) {
        logSupabaseError(error, 'createPayment', { table: 'crm_payments' });
        return { error: error.message };
      }

      // Update trainee payment status if needed
      if (payment.status === 'paid') {
        await supabase
          .from('trainees')
          .update({ payment_status: 'paid' })
          .eq('id', payment.trainee_id);
      }

      return { data, success: true };
    } catch (error) {
      logger.error('Error creating payment', error, 'PaymentService');
      return { error: 'שגיאה ביצירת תשלום' };
    }
  }

  /**
   * Update payment
   * @param paymentId - Payment ID
   * @param updates - Updates to apply
   * @returns Promise with updated payment
   */
  static async updatePayment(
    paymentId: string,
    updates: Partial<Payment>
  ): Promise<ApiResponse<Payment>> {
    try {
      const { data, error } = await supabase
        .from('crm_payments')
        .update(updates)
        .eq('id', paymentId)
        .select()
        .single();

      if (error) {
        logSupabaseError(error, 'updatePayment', { table: 'crm_payments', paymentId });
        return { error: error.message };
      }

      // Update trainee payment status if payment was marked as paid
      if (updates.status === 'paid' && data) {
        await supabase
          .from('trainees')
          .update({ payment_status: 'paid' })
          .eq('id', data.trainee_id);
      }

      return { data, success: true };
    } catch (error) {
      logger.error('Error updating payment', error, 'PaymentService');
      return { error: 'שגיאה בעדכון תשלום' };
    }
  }

  /**
   * Mark payment as paid
   * @param paymentId - Payment ID
   * @param paymentMethod - Payment method
   * @returns Promise with updated payment
   */
  static async markPaymentAsPaid(
    paymentId: string,
    paymentMethod: Payment['payment_method']
  ): Promise<ApiResponse<Payment>> {
    return this.updatePayment(paymentId, {
      status: 'paid',
      paid_date: new Date().toISOString(),
      payment_method: paymentMethod,
    });
  }

  /**
   * Generate invoice number
   * @param trainerId - Trainer ID
   * @returns Invoice number
   */
  private static async generateInvoiceNumber(trainerId: string): Promise<string> {
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from('crm_payments')
      .select('*', { count: 'exact', head: true })
      .eq('trainer_id', trainerId)
      .gte('created_at', `${year}-01-01`)
      .lt('created_at', `${year + 1}-01-01`);

    const invoiceNumber = `INV-${year}-${String((count || 0) + 1).padStart(4, '0')}`;
    return invoiceNumber;
  }

  /**
   * Get payment statistics
   * @param trainerId - Trainer ID
   * @returns Promise with statistics
   */
  static async getPaymentStats(
    trainerId: string
  ): Promise<ApiResponse<{
    totalRevenue: number;
    monthlyRevenue: number;
    pendingPayments: number;
    overduePayments: number;
    paidPayments: number;
  }>> {
    try {
      const { data: payments, error } = await supabase
        .from('crm_payments')
        .select('amount, status, paid_date, due_date')
        .eq('trainer_id', trainerId);

      if (error) {
        logSupabaseError(error, 'getPaymentStats', { table: 'crm_payments', trainerId });
        return { error: error.message };
      }

      const stats = {
        totalRevenue: 0,
        monthlyRevenue: 0,
        pendingPayments: 0,
        overduePayments: 0,
        paidPayments: 0,
      };

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      payments?.forEach((payment) => {
        const amount = Number(payment.amount) || 0;

        if (payment.status === 'paid') {
          stats.totalRevenue += amount;
          stats.paidPayments++;

          // Check if paid this month
          if (payment.paid_date) {
            const paidDate = new Date(payment.paid_date);
            if (paidDate.getMonth() === currentMonth && paidDate.getFullYear() === currentYear) {
              stats.monthlyRevenue += amount;
            }
          }
        } else if (payment.status === 'pending') {
          stats.pendingPayments++;
        } else if (payment.status === 'overdue') {
          stats.overduePayments++;
        }
      });

      return { data: stats, success: true };
    } catch (error) {
      logger.error('Error getting payment stats', error, 'PaymentService');
      return { error: 'שגיאה בטעינת סטטיסטיקות תשלום' };
    }
  }

  /**
   * Generate invoice PDF (placeholder - would use PDF library)
   * @param payment - Payment data
   * @returns Promise with PDF data
   */
  static async generateInvoicePDF(payment: Payment): Promise<ApiResponse<Blob>> {
    try {
      // TODO: Integrate with PDF generation library (jsPDF, PDFKit, etc.)
      // For now, return placeholder
      logger.info('Generating invoice PDF', { paymentId: payment.id }, 'PaymentService');
      
      // This would generate actual PDF
      const pdfBlob = new Blob(['Invoice PDF placeholder'], { type: 'application/pdf' });
      
      return { data: pdfBlob, success: true };
    } catch (error) {
      logger.error('Error generating invoice PDF', error, 'PaymentService');
      return { error: 'שגיאה ביצירת חשבונית' };
    }
  }
}
