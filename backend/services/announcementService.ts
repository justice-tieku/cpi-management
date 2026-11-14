import { supabase } from '../client';
import { Database, PriorityLevel, AnnouncementTarget } from '../types';

type AnnouncementRow = Database['public']['Tables']['announcements']['Row'];

export const announcementService = {
  /**
   * Fetch all announcements.
   */
  async fetchAnnouncements(): Promise<AnnouncementRow[]> {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[announcementService.fetchAnnouncements] Error:', error.message);
      throw error;
    }
    return data || [];
  },

  /**
   * Pastor creates a new church announcement (broadcast to all shepherds or church-wide).
   */
  async createAnnouncement(params: {
    title: string;
    content: string;
    authorId: string;
    authorName: string;
    priority?: PriorityLevel;
    target?: AnnouncementTarget;
  }): Promise<AnnouncementRow> {
    const { data, error } = await supabase
      .from('announcements')
      .insert({
        id: `ANN-${Date.now()}`,
        title: params.title,
        content: params.content,
        author_id: params.authorId,
        author_name: params.authorName,
        priority: params.priority || 'Normal',
        target: params.target || 'all_shepherds'
      })
      .select()
      .single();

    if (error) {
      console.error('[announcementService.createAnnouncement] Error:', error.message);
      throw error;
    }
    return data;
  },

  /**
   * Realtime Subscription: Listen for new announcements broadcast by the pastor.
   */
  subscribeToAnnouncements(onNewAnnouncement: (announcement: AnnouncementRow) => void) {
    const channel = supabase
      .channel('announcements_channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'announcements' },
        (payload) => {
          onNewAnnouncement(payload.new as AnnouncementRow);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
};
