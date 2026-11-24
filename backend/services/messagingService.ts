import { supabase } from '../client';
import { Database, UserRole } from '../types';

type MessageRow = Database['public']['Tables']['chat_messages']['Row'];

export const messagingService = {
  /**
   * Fetch private conversation messages.
   * RLS guarantees shepherds only see their own messages with the pastor.
   */
  async fetchMessages(): Promise<MessageRow[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[messagingService.fetchMessages] Error:', error.message);
      throw error;
    }
    return data || [];
  },

  /**
   * Send a private message (Shepherd -> Pastor or Pastor -> Shepherd).
   */
  async sendMessage(params: {
    senderId: string;
    senderName: string;
    senderRole: UserRole;
    recipientId: string;
    recipientName: string;
    content: string;
  }): Promise<MessageRow> {
    const content = params.content?.trim();
    if (!content) throw new Error('Message is required.');
    if (content.length > 5000) throw new Error('Message must be 5000 characters or fewer.');

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        id: `MSG-${Date.now()}`,
        sender_id: params.senderId,
        sender_name: params.senderName,
        sender_role: params.senderRole,
        recipient_id: params.recipientId,
        recipient_name: params.recipientName,
        content,
        is_read: false
      })
      .select()
      .single();

    if (error) {
      console.error('[messagingService.sendMessage] Error:', error.message);
      throw error;
    }
    return data;
  },

  /**
   * Mark a message as read.
   */
  async markRead(messageId: string): Promise<void> {
    const { error } = await supabase
      .from('chat_messages')
      .update({ is_read: true })
      .eq('id', messageId);

    if (error) {
      console.error('[messagingService.markRead] Error:', error.message);
      throw error;
    }
  },

  /**
   * Realtime Subscription: Listen for incoming chat messages live.
   */
  subscribeToMessages(onNewMessage: (message: MessageRow) => void) {
    const channel = supabase
      .channel('chat_messages_channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          onNewMessage(payload.new as MessageRow);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
};
