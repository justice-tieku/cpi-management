import { supabase } from '../client';
import { Database, AttendanceStatus } from '../types';

type AttendanceRow = Database['public']['Tables']['attendance_records']['Row'];
type AttendanceInsert = Database['public']['Tables']['attendance_records']['Insert'];

export const attendanceService = {
  /**
   * Fetch attendance records (supports Sunday communion, Wednesday Midweek, Vigils).
   */
  async fetchAttendance(filters?: {
    serviceDate?: string;
    serviceCategory?: string;
    cellGroup?: string;
  }): Promise<AttendanceRow[]> {
    let query = supabase.from('attendance_records').select('*');

    if (filters?.serviceDate) {
      query = query.eq('service_date', filters.serviceDate);
    }
    if (filters?.serviceCategory) {
      query = query.eq('service_category', filters.serviceCategory);
    }
    if (filters?.cellGroup && filters.cellGroup !== 'all') {
      query = query.eq('cell_group', filters.cellGroup);
    }

    const { data, error } = await query.order('recorded_at', { ascending: false });

    if (error) {
      console.error('[attendanceService.fetchAttendance] Error:', error.message);
      throw error;
    }
    return data || [];
  },

  /**
   * Update attendance status for a member.
   */
  async updateStatus(
    id: string,
    status: AttendanceStatus,
    recordedBy: string
  ): Promise<AttendanceRow> {
    const { data, error } = await supabase
      .from('attendance_records')
      .update({
        status,
        recorded_by: recordedBy,
        recorded_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[attendanceService.updateStatus] Error:', error.message);
      throw error;
    }
    return data;
  },

  /**
   * Bulk insert attendance check-in session for a cell or church-wide.
   */
  async recordBulkAttendance(records: AttendanceInsert[]): Promise<void> {
    const { error } = await supabase
      .from('attendance_records')
      .upsert(records, { onConflict: 'id' });

    if (error) {
      console.error('[attendanceService.recordBulkAttendance] Error:', error.message);
      throw error;
    }
  }
};
