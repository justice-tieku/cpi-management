/**
 * Cross Passion International (CPI) — Backend Database Types
 * Generated & typed for Supabase PostgreSQL Backend
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'pastor' | 'shepherd' | 'finance_officer';

export type MemberStatus =
  | 'Pending Verification'
  | 'New Member'
  | 'Active'
  | 'Inactive'
  | 'Transferred'
  | 'Deceased';

export type SpiritualStage =
  | 'New Convert'
  | 'Water Baptized'
  | 'Foundation Class'
  | 'Commissioned Worker'
  | 'Deacon / Deaconess'
  | 'Minister / Elder';

export type AttendanceStatus = 'Present' | 'Absent' | 'Excused' | 'Not Recorded';

export type FollowUpStatus = 'Open' | 'In Progress' | 'Waiting' | 'Completed' | 'Cancelled';

export type FollowUpType =
  | 'Absence Follow-Up'
  | 'First-Timer Welcome'
  | 'Pastoral Visitation'
  | 'Prayer Request'
  | 'Welfare Check';

export type PriorityLevel = 'Low' | 'Normal' | 'Medium' | 'High' | 'Urgent';

export type VisitorStage =
  | 'First Visit'
  | 'Contact Attempted'
  | 'Contacted'
  | 'Invited Back'
  | 'Returned'
  | 'Joined/Registered'
  | 'Closed';

export type AnnouncementTarget = 'all_shepherds' | 'church_wide';

export type EventCategory =
  | 'Conference'
  | 'Revival'
  | 'Cell Outreach'
  | 'Vigil'
  | 'Communion'
  | 'Youth'
  | 'Special Service';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          name: string;
          role: UserRole;
          assigned_cell: string | null;
          branch: string;
          avatar_url: string | null;
          phone: string | null;
          is_ppit_shepherd: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          role?: UserRole;
          assigned_cell?: string | null;
          branch?: string;
          avatar_url?: string | null;
          phone?: string | null;
          is_ppit_shepherd?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          role?: UserRole;
          assigned_cell?: string | null;
          branch?: string;
          avatar_url?: string | null;
          phone?: string | null;
          is_ppit_shepherd?: boolean;
          updated_at?: string;
        };
      };
      care_cells: {
        Row: {
          id: string;
          name: string;
          zone: string | null;
          shepherd_id: string | null;
          max_capacity: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          zone?: string | null;
          shepherd_id?: string | null;
          max_capacity?: number;
          created_at?: string;
        };
        Update: {
          name?: string;
          zone?: string | null;
          shepherd_id?: string | null;
          max_capacity?: number;
        };
      };
      members: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          phone: string;
          email: string | null;
          city: string;
          date_of_birth: string | null;
          status: MemberStatus;
          spiritual_stage: SpiritualStage;
          department: string | null;
          cell_group: string;
          current_shepherd_id: string | null;
          current_shepherd_name: string | null;
          registered_at: string;
          registered_by: string;
          general_notes: string | null;
          confidential_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          first_name: string;
          last_name: string;
          phone: string;
          email?: string | null;
          city?: string;
          date_of_birth?: string | null;
          status?: MemberStatus;
          spiritual_stage?: SpiritualStage;
          department?: string | null;
          cell_group: string;
          current_shepherd_id?: string | null;
          current_shepherd_name?: string | null;
          registered_at?: string;
          registered_by: string;
          general_notes?: string | null;
          confidential_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          first_name?: string;
          last_name?: string;
          phone?: string;
          email?: string | null;
          city?: string;
          date_of_birth?: string | null;
          status?: MemberStatus;
          spiritual_stage?: SpiritualStage;
          department?: string | null;
          cell_group?: string;
          current_shepherd_id?: string | null;
          current_shepherd_name?: string | null;
          general_notes?: string | null;
          confidential_notes?: string | null;
          updated_at?: string;
        };
      };
      attendance_records: {
        Row: {
          id: string;
          service_name: string;
          service_date: string;
          service_category: string;
          member_id: string;
          member_name: string;
          cell_group: string;
          shepherd_id: string | null;
          status: AttendanceStatus;
          recorded_by: string;
          recorded_at: string;
          consecutive_absences: number;
        };
        Insert: {
          id: string;
          service_name: string;
          service_date: string;
          service_category?: string;
          member_id: string;
          member_name: string;
          cell_group: string;
          shepherd_id?: string | null;
          status?: AttendanceStatus;
          recorded_by: string;
          recorded_at?: string;
          consecutive_absences?: number;
        };
        Update: {
          service_name?: string;
          service_date?: string;
          service_category?: string;
          status?: AttendanceStatus;
          recorded_by?: string;
          recorded_at?: string;
          consecutive_absences?: number;
        };
      };
      cell_meetings: {
        Row: {
          id: string;
          cell_name: string;
          shepherd_id: string;
          shepherd_name: string;
          meeting_date: string;
          topic: string;
          attendees_count: number;
          offering_amount: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          cell_name: string;
          shepherd_id: string;
          shepherd_name: string;
          meeting_date: string;
          topic: string;
          attendees_count?: number;
          offering_amount?: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          cell_name?: string;
          meeting_date?: string;
          topic?: string;
          attendees_count?: number;
          offering_amount?: number;
          notes?: string | null;
        };
      };
      follow_up_tasks: {
        Row: {
          id: string;
          member_id: string;
          member_name: string;
          shepherd_id: string;
          shepherd_name: string;
          task_type: FollowUpType;
          due_date: string | null;
          priority: PriorityLevel;
          status: FollowUpStatus;
          next_action: string | null;
          notes: string | null;
          contact_attempts: number;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          member_id: string;
          member_name: string;
          shepherd_id: string;
          shepherd_name: string;
          task_type: FollowUpType;
          due_date?: string | null;
          priority?: PriorityLevel;
          status?: FollowUpStatus;
          next_action?: string | null;
          notes?: string | null;
          contact_attempts?: number;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          task_type?: FollowUpType;
          due_date?: string | null;
          priority?: PriorityLevel;
          status?: FollowUpStatus;
          next_action?: string | null;
          notes?: string | null;
          contact_attempts?: number;
          completed_at?: string | null;
        };
      };
      chat_messages: {
        Row: {
          id: string;
          sender_id: string;
          sender_name: string;
          sender_role: UserRole;
          recipient_id: string;
          recipient_name: string;
          content: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          sender_id: string;
          sender_name: string;
          sender_role: UserRole;
          recipient_id: string;
          recipient_name: string;
          content: string;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          is_read?: boolean;
        };
      };
      announcements: {
        Row: {
          id: string;
          title: string;
          content: string;
          author_id: string | null;
          author_name: string;
          priority: PriorityLevel;
          target: AnnouncementTarget;
          created_at: string;
        };
        Insert: {
          id: string;
          title: string;
          content: string;
          author_id?: string | null;
          author_name: string;
          priority?: PriorityLevel;
          target?: AnnouncementTarget;
          created_at?: string;
        };
        Update: {
          title?: string;
          content?: string;
          priority?: PriorityLevel;
          target?: AnnouncementTarget;
        };
      };
      church_events: {
        Row: {
          id: string;
          title: string;
          event_date: string;
          event_time: string;
          location: string;
          description: string;
          flyer_url: string | null;
          category: EventCategory;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id: string;
          title: string;
          event_date: string;
          event_time: string;
          location: string;
          description: string;
          flyer_url?: string | null;
          category?: EventCategory;
          created_by: string;
          created_at?: string;
        };
        Update: {
          title?: string;
          event_date?: string;
          event_time?: string;
          location?: string;
          description?: string;
          flyer_url?: string | null;
          category?: EventCategory;
        };
      };
      finance_records: {
        Row: {
          id: string;
          ref: string;
          transaction_date: string;
          giver: string;
          category: string;
          method: string;
          amount: number;
          cell_group: string | null;
          status: string;
          recorded_by: string;
          created_at: string;
        };
        Insert: {
          id: string;
          ref: string;
          transaction_date?: string;
          giver: string;
          category: string;
          method?: string;
          amount: number;
          cell_group?: string | null;
          status?: string;
          recorded_by: string;
          created_at?: string;
        };
        Update: {
          status?: string;
          amount?: number;
        };
      };
      visitors: {
        Row: {
          id: string;
          name: string;
          phone: string;
          email: string | null;
          visit_date: string;
          service_attended: string;
          invited_by: string | null;
          assigned_shepherd_id: string | null;
          assigned_shepherd_name: string | null;
          journey_stage: VisitorStage;
          contact_attempts: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          phone: string;
          email?: string | null;
          visit_date?: string;
          service_attended: string;
          invited_by?: string | null;
          assigned_shepherd_id?: string | null;
          assigned_shepherd_name?: string | null;
          journey_stage?: VisitorStage;
          contact_attempts?: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          journey_stage?: VisitorStage;
          contact_attempts?: number;
          notes?: string | null;
          assigned_shepherd_id?: string | null;
          assigned_shepherd_name?: string | null;
        };
      };
      notifications: {
        Row: {
          id: string;
          recipient_id: string;
          title: string;
          message: string;
          is_read: boolean;
          notification_type: string;
          member_id: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          recipient_id: string;
          title: string;
          message: string;
          is_read?: boolean;
          notification_type?: string;
          member_id?: string | null;
          created_at?: string;
        };
        Update: {
          is_read?: boolean;
        };
      };
    };
  };
}
