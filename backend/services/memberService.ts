import { supabase } from '../client';
import { Database } from '../types';

type MemberRow = Database['public']['Tables']['members']['Row'];
type MemberInsert = Database['public']['Tables']['members']['Insert'];
type MemberUpdate = Database['public']['Tables']['members']['Update'];

export const memberService = {
  /**
   * Fetch all members visible to the authenticated user.
   * Supabase Row-Level Security automatically partitions records:
   * Pastor sees all church members; Shepherd sees only members in their assigned cell.
   */
  async fetchMembers(): Promise<MemberRow[]> {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('last_name', { ascending: true });

    if (error) {
      console.error('[memberService.fetchMembers] Error:', error.message);
      throw error;
    }
    return data || [];
  },

  /**
   * Register a new soul into the church and care cell registry.
   */
  async createMember(newMember: MemberInsert): Promise<MemberRow> {
    const { data, error } = await supabase
      .from('members')
      .insert(newMember)
      .select()
      .single();

    if (error) {
      console.error('[memberService.createMember] Error:', error.message);
      throw error;
    }
    return data;
  },

  /**
   * Update a member's contact, spiritual stage, or pastoral notes.
   */
  async updateMember(id: string, updates: MemberUpdate): Promise<MemberRow> {
    const { data, error } = await supabase
      .from('members')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[memberService.updateMember] Error:', error.message);
      throw error;
    }
    return data;
  },

  /**
   * Pastor-only: Reassign a member from one care cell/shepherd to another.
   */
  async reassignMember(
    memberId: string,
    newShepherdId: string,
    newShepherdName: string,
    newCellGroup: string,
    reason: string,
    assignedBy: string
  ): Promise<void> {
    if (!memberId || !newShepherdId || !newShepherdName?.trim() || !newCellGroup?.trim()) {
      throw new Error('Member, shepherd, and cell are required.');
    }
    if (!reason?.trim()) throw new Error('Transfer reason is required.');
    if (reason.trim().length > 500) throw new Error('Transfer reason must be 500 characters or fewer.');

    const { data: member, error: memberLookupErr } = await supabase
      .from('members')
      .select('first_name,last_name')
      .eq('id', memberId)
      .single();
    if (memberLookupErr) throw memberLookupErr;
    const memberName = `${member.first_name} ${member.last_name}`;

    // 1. Update member row
    const { data: updatedMember, error: updateErr } = await supabase
      .from('members')
      .update({
        current_shepherd_id: newShepherdId,
        current_shepherd_name: newShepherdName,
        cell_group: newCellGroup,
        updated_at: new Date().toISOString()
      })
      .eq('id', memberId)
      .select('id')
      .single();

    if (updateErr) throw updateErr;
    if (!updatedMember) throw new Error('Member reassignment was not permitted.');

    // 2. Insert assignment audit history
    await supabase.from('shepherd_assignments').insert({
      id: `ASN-${Date.now()}`,
      member_id: memberId,
      member_name: memberName,
      shepherd_id: newShepherdId,
      shepherd_name: newShepherdName,
      cell_group: newCellGroup,
      start_date: new Date().toISOString().split('T')[0],
      status: 'Active',
      assigned_by: assignedBy,
      reason
    });

    // 3. Send automated notification to recipient Shepherd
    await supabase.from('notifications').insert({
      id: `NOTIF-${Date.now()}`,
      recipient_id: newShepherdId,
      title: 'New Member Assigned to Your Cell',
      message: `A member has been assigned to your care cell (${newCellGroup}). Transfer reason: ${reason}.`,
      notification_type: 'assignment',
      member_id: memberId,
      is_read: false
    });
  },

  /**
   * Delete member record (Strictly Pastor privilege via RLS).
   */
  async deleteMember(id: string): Promise<void> {
    const { error } = await supabase.from('members').delete().eq('id', id);
    if (error) {
      console.error('[memberService.deleteMember] Error:', error.message);
      throw error;
    }
  }
};
