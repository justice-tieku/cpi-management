import { supabase } from '../client';
import { Database } from '../types';

type CellMeetingRow = Database['public']['Tables']['cell_meetings']['Row'];
type CellMeetingInsert = Database['public']['Tables']['cell_meetings']['Insert'];

export const cellMeetingService = {
  /**
   * Fetch cell fellowship meetings.
   * Shepherds only see their cell meetings. Pastor sees all meetings church-wide.
   */
  async fetchCellMeetings(): Promise<CellMeetingRow[]> {
    const { data, error } = await supabase
      .from('cell_meetings')
      .select('*')
      .order('meeting_date', { ascending: false });

    if (error) {
      console.error('[cellMeetingService.fetchCellMeetings] Error:', error.message);
      throw error;
    }
    return data || [];
  },

  /**
   * Record a weekly cell meeting and automatically sync cell offering to finance ledger.
   */
  async recordCellMeeting(
    meeting: CellMeetingInsert,
    recordedByName: string
  ): Promise<CellMeetingRow> {
    // 1. Save cell fellowship meeting
    const { data: savedMeeting, error: meetingError } = await supabase
      .from('cell_meetings')
      .insert(meeting)
      .select()
      .single();

    if (meetingError) {
      console.error('[cellMeetingService.recordCellMeeting] Error:', meetingError.message);
      throw meetingError;
    }

    // 2. If offering collected, automatically credit to Finance ledger
    if (meeting.offering_amount && meeting.offering_amount > 0) {
      await supabase.from('finance_records').insert({
        id: `FIN-${Date.now()}`,
        ref: `CELL-${Date.now().toString().slice(-4)}`,
        transaction_date: meeting.meeting_date,
        giver: `${meeting.cell_name} Fellowship Offering`,
        category: 'Cell Fellowship Offering',
        method: 'Cash / Envelope',
        amount: meeting.offering_amount,
        cell_group: meeting.cell_name,
        status: 'Submitted',
        recorded_by: recordedByName
      });
    }

    return savedMeeting;
  }
};
