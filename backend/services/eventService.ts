import { supabase } from '../client';
import { Database, EventCategory } from '../types';

type ChurchEventRow = Database['public']['Tables']['church_events']['Row'];

export const eventService = {
  /**
   * Fetch upcoming church events & programs.
   */
  async fetchEvents(): Promise<ChurchEventRow[]> {
    const { data, error } = await supabase
      .from('church_events')
      .select('*')
      .order('event_date', { ascending: true });

    if (error) {
      console.error('[eventService.fetchEvents] Error:', error.message);
      throw error;
    }
    return data || [];
  },

  /**
   * Pastor creates a new church event with flyer URL, date, time, and category.
   */
  async createEvent(params: {
    title: string;
    eventDate: string;
    eventTime: string;
    location: string;
    description: string;
    flyerUrl?: string;
    category?: EventCategory;
    createdBy: string;
  }): Promise<ChurchEventRow> {
    const { data, error } = await supabase
      .from('church_events')
      .insert({
        id: `EVT-${Date.now()}`,
        title: params.title,
        event_date: params.eventDate,
        event_time: params.eventTime,
        location: params.location,
        description: params.description,
        flyer_url: params.flyerUrl || null,
        category: params.category || 'Conference',
        created_by: params.createdBy
      })
      .select()
      .single();

    if (error) {
      console.error('[eventService.createEvent] Error:', error.message);
      throw error;
    }
    return data;
  }
};
