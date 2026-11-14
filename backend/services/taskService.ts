import { supabase } from '../client';
import { Database, FollowUpStatus } from '../types';

type TaskRow = Database['public']['Tables']['follow_up_tasks']['Row'];

export const taskService = {
  /**
   * Fetch follow-up tasks. Shepherds see their own assigned tasks, Pastor sees all.
   */
  async fetchTasks(): Promise<TaskRow[]> {
    const { data, error } = await supabase
      .from('follow_up_tasks')
      .select('*')
      .order('due_date', { ascending: true });

    if (error) {
      console.error('[taskService.fetchTasks] Error:', error.message);
      throw error;
    }
    return data || [];
  },

  /**
   * Update task status (e.g. Open -> Completed).
   */
  async updateStatus(
    taskId: string,
    status: FollowUpStatus,
    notes?: string
  ): Promise<TaskRow> {
    const { data, error } = await supabase
      .from('follow_up_tasks')
      .update({
        status,
        notes: notes || undefined,
        completed_at: status === 'Completed' ? new Date().toISOString() : null
      })
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      console.error('[taskService.updateStatus] Error:', error.message);
      throw error;
    }
    return data;
  }
};
