import { supabase } from '../client';
import { Database } from '../types';

type FinanceRow = Database['public']['Tables']['finance_records']['Row'];
type FinanceInsert = Database['public']['Tables']['finance_records']['Insert'];

export const financeService = {
  /**
   * Fetch finance ledger records.
   * RLS ensures Shepherds only see their cell fellowship offerings.
   * Pastor sees tithes, Sunday collections, building funds, and all cells.
   */
  async fetchFinanceRecords(): Promise<FinanceRow[]> {
    const { data, error } = await supabase
      .from('finance_records')
      .select('*')
      .order('transaction_date', { ascending: false });

    if (error) {
      console.error('[financeService.fetchFinanceRecords] Error:', error.message);
      throw error;
    }
    return data || [];
  },

  /**
   * Record a financial transaction.
   */
  async recordTransaction(record: FinanceInsert): Promise<FinanceRow> {
    const { data, error } = await supabase
      .from('finance_records')
      .insert(record)
      .select()
      .single();

    if (error) {
      console.error('[financeService.recordTransaction] Error:', error.message);
      throw error;
    }
    return data;
  }
};
