import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  Member,
  ShepherdAssignment,
  AttendanceRecord,
  CellMeeting,
  FollowUpTask,
  VisitorRecord,
  ShepherdReport,
  FinanceRecord,
  AuditLog,
  AttendanceStatus,
  FollowUpStatus,
  ChatMessage,
  ChurchAnnouncement,
  ChurchEvent,
  SundayAbsenceReport,
  SundayAbsenceCategory
} from '../types/cms';
import { supabase, isSupabaseConfigured } from '../../backend/client';
import { formatGhanaianPhone } from '../utils/phone';
import { formatPhone } from '../utils/validation';
import { getStoredSession } from '../utils/session';
import { normalizeDate } from '../utils/date';
import { mapError } from '../utils/errors';

export interface CMSNotification {
  id: string;
  recipientId: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'assignment' | 'general' | 'report';
  memberId?: string;
}

interface CMSContextType {
  currentUser: User;
  setCurrentUser: (user: User) => void;
  isCloudConnected: boolean;
  members: Member[];
  visibleMembers: Member[];
  registerMember: (member: Omit<Member, 'id' | 'registeredAt' | 'registeredBy'>) => Promise<{ success: boolean; error?: string; member?: Member }>;
  updateMember: (memberId: string, updates: Partial<Member>) => Promise<{ success: boolean; error?: string }>;
  deleteMember: (memberId: string) => Promise<{ success: boolean; error?: string }>;
  reassignMember: (memberId: string, newShepherdId: string, reason: string) => Promise<{ success: boolean; error?: string }>;
  shepherds: { id: string; name: string; cell: string; assignedCount: number; maxCapacity: number }[];
  recordShepherdLogin: (name: string, cellName?: string) => { id: string; name: string; cell: string; email: string };
  assignmentsHistory: ShepherdAssignment[];
  attendanceRecords: AttendanceRecord[];
  visibleAttendance: AttendanceRecord[];
  updateAttendance: (recordId: string, status: AttendanceStatus) => void;
  recordSundayAttendance: (memberId: string, status: AttendanceStatus, date?: string, serviceName?: string, serviceCategory?: string) => Promise<{ success: boolean; error?: string }>;
  batchSaveAttendance: (records: { memberId: string; status: AttendanceStatus; date: string }[], serviceName?: string, serviceCategory?: string) => Promise<{ success: boolean; error?: string; count?: number }>;
  sundayAbsenceReports: SundayAbsenceReport[];
  visibleSundayAbsenceReports: SundayAbsenceReport[];
  redListMembers: SundayAbsenceReport[];
  criticalAbsenteeMembers: SundayAbsenceReport[];
  cellMeetings: CellMeeting[];
  visibleCellMeetings: CellMeeting[];
  recordCellMeeting: (meeting: Omit<CellMeeting, 'id' | 'shepherdId' | 'shepherdName' | 'cellName'>) => Promise<{ success: boolean; error?: string }>;
  updateCellMeeting: (meetingId: string, updates: Partial<CellMeeting>) => Promise<{ success: boolean; error?: string }>;
  deleteCellMeeting: (meetingId: string) => Promise<{ success: boolean; error?: string }>;
  followUpTasks: FollowUpTask[];
  visibleTasks: FollowUpTask[];
  updateTaskStatus: (taskId: string, status: FollowUpStatus, note?: string) => Promise<{ success: boolean; error?: string }>;
  visitors: VisitorRecord[];
  visibleVisitors: VisitorRecord[];
  registerVisitor: (data: Omit<VisitorRecord, 'id' | 'contactAttempts'>) => Promise<{ success: boolean; error?: string; visitor?: VisitorRecord }>;
  shepherdReports: ShepherdReport[];
  submitReport: (reportId: string, narrative: string) => Promise<{ success: boolean; error?: string }>;
  approveReport: (reportId: string) => void;
  financeRecords: FinanceRecord[];
  visibleFinance: FinanceRecord[];
  auditLogs: AuditLog[];
  notifications: CMSNotification[];
  visibleNotifications: CMSNotification[];
  markNotificationRead: (id: string) => void;
  messages: ChatMessage[];
  visibleMessages: ChatMessage[];
  sendMessage: (recipientId: string, content: string) => Promise<{ success: boolean; error?: string }>;
  markMessageRead: (messageId: string) => void;
  announcements: ChurchAnnouncement[];
  visibleAnnouncements: ChurchAnnouncement[];
  createAnnouncement: (data: Omit<ChurchAnnouncement, 'id' | 'authorName' | 'date'>) => Promise<{ success: boolean; error?: string }>;
  updateAnnouncement: (announcementId: string, updates: Partial<ChurchAnnouncement>) => Promise<{ success: boolean; error?: string }>;
  deleteAnnouncement: (announcementId: string) => Promise<{ success: boolean; error?: string }>;
  churchEvents: ChurchEvent[];
  visibleEvents: ChurchEvent[];
  createEvent: (data: Omit<ChurchEvent, 'id' | 'createdBy' | 'createdAt'>) => Promise<{ success: boolean; error?: string }>;
  updateEvent: (eventId: string, updates: Partial<ChurchEvent>) => Promise<{ success: boolean; error?: string }>;
  deleteEvent: (eventId: string) => Promise<{ success: boolean; error?: string }>;
}

const CMSContext = createContext<CMSContextType | undefined>(undefined);

export const CMSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Current active user
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const session = getStoredSession();
    if (session?.user) return session.user;
    return {
      id: 'USR-PASTOR-01',
      name: 'Pastor Adams',
      email: 'pastor.adams@crosspassion.org',
      role: 'pastor',
      branch: 'Main Sanctuary — Central Cathedral'
    };
  });

  // Cell Shepherds definition (live from backend only)
  const [shepherds, setShepherds] = useState<{ id: string; name: string; cell: string; assignedCount: number; maxCapacity: number }[]>([]);

  const recordShepherdLogin = (name: string, cellName?: string) => {
    const trimmed = name.trim();
    const existing = shepherds.find(
      (s) => s.name.toLowerCase() === trimmed.toLowerCase() ||
             s.name.toLowerCase().includes(trimmed.toLowerCase())
    );

    if (existing) {
      return {
        id: existing.id,
        name: existing.name,
        cell: existing.cell,
        email: `${existing.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@crosspassion.org`
      };
    }

    const newId = `SH-0${shepherds.length + 1}`;
    const cell = cellName?.trim() || `${trimmed}'s Shepherd Group`;
    const newShepherd = {
      id: newId,
      name: trimmed,
      cell,
      assignedCount: 0,
      maxCapacity: 30
    };

    setShepherds((prev) => [...prev, newShepherd]);

    return {
      id: newId,
      name: trimmed,
      cell,
      email: `${trimmed.toLowerCase().replace(/[^a-z0-9]/g, '.')}@crosspassion.org`
    };
  };

  // Canonical Members Store (Family management explicitly excluded)
  const [members, setMembers] = useState<Member[]>([]);

  // Assignments History
  const [assignmentsHistory, setAssignmentsHistory] = useState<ShepherdAssignment[]>([]);

  // Church Service Attendance Records Across Consecutive Sundays
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

  // Cell Meetings & Cell Fellowship Offerings
  const [cellMeetings, setCellMeetings] = useState<CellMeeting[]>([]);

  // Follow-Up Tasks
  const [followUpTasks, setFollowUpTasks] = useState<FollowUpTask[]>([]);

  // Visitors
  const [visitors, setVisitors] = useState<VisitorRecord[]>([]);

  // Reports
  const [shepherdReports, setShepherdReports] = useState<ShepherdReport[]>([]);

  // Finance Records
  const [financeRecords, setFinanceRecords] = useState<FinanceRecord[]>([]);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Notifications
  const [notifications, setNotifications] = useState<CMSNotification[]>([]);

  // Messages Store
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Announcements Store
  const [announcements, setAnnouncements] = useState<ChurchAnnouncement[]>([]);

  // Church Events Store (with flyer URLs)
  const [churchEvents, setChurchEvents] = useState<ChurchEvent[]>([]);

  // =========================================================================
  // LIVE SUPABASE CLOUD BACKEND SYNCHRONIZATION
  // =========================================================================
  const [isCloudConnected, setIsCloudConnected] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let isMounted = true;

    const syncFromCloud = async () => {
      try {
        // 1. Members
        const { data: dbMembers, error: mErr } = await supabase.from('members').select('*');
        if (!mErr && dbMembers && dbMembers.length > 0 && isMounted) {
          setMembers(
            dbMembers.map((m: any) => ({
              id: m.id,
              firstName: m.first_name,
              lastName: m.last_name,
              phone: formatGhanaianPhone(m.phone),
              email: m.email || '',
              city: m.city || 'Central District',
              dateOfBirth: m.date_of_birth || undefined,
              status: m.status,
              spiritualStage: m.spiritual_stage,
              department: m.department || undefined,
              cellGroup: m.cell_group,
              currentShepherdId: m.current_shepherd_id || undefined,
              currentShepherdName: m.current_shepherd_name || undefined,
              registeredAt: m.registered_at,
              registeredBy: m.registered_by,
              generalNotes: m.general_notes || undefined,
              confidentialNotes: m.confidential_notes || undefined
            }))
          );
        }

        // 2. Attendance
        const { data: dbAttendance } = await supabase.from('attendance_records').select('*');
        if (dbAttendance && dbAttendance.length > 0 && isMounted) {
          setAttendanceRecords(
            dbAttendance.map((a: any) => ({
              id: a.id,
              serviceId: a.service_id,
              serviceName: a.service_name,
              serviceDate: a.service_date,
              memberId: a.member_id,
              memberName: a.member_name,
              cellGroup: a.cell_group,
              shepherdId: a.shepherd_id || undefined,
              status: a.status,
              recordedBy: a.recorded_by,
              recordedAt: a.recorded_at,
              consecutiveAbsences: a.consecutive_absences || 0
            }))
          );
        }

        // 3. Cell Meetings
        const { data: dbMeetings } = await supabase.from('cell_meetings').select('*');
        if (dbMeetings && dbMeetings.length > 0 && isMounted) {
          setCellMeetings(
            dbMeetings.map((cm: any) => ({
              id: cm.id,
              cellName: cm.cell_name,
              shepherdId: cm.shepherd_id || '',
              shepherdName: cm.shepherd_name,
              date: cm.meeting_date,
              topic: cm.topic,
              attendeesCount: cm.attendees_count,
              offeringAmount: Number(cm.offering_amount) || 0,
              notes: cm.notes || undefined
            }))
          );
        }

        // 4. Announcements
        const { data: dbAnnouncements } = await supabase.from('announcements').select('*');
        if (dbAnnouncements && dbAnnouncements.length > 0 && isMounted) {
          setAnnouncements(
            dbAnnouncements.map((an: any) => ({
              id: an.id,
              title: an.title,
              content: an.content,
              authorName: an.author_name,
              date: an.created_at ? an.created_at.slice(0, 10) : new Date().toISOString().split('T')[0],
              priority: an.priority,
              target: an.target
            }))
          );
        }

        // 5. Events
        const { data: dbEvents } = await supabase.from('church_events').select('*');
        if (dbEvents && dbEvents.length > 0 && isMounted) {
          setChurchEvents(
            dbEvents.map((ev: any) => ({
              id: ev.id,
              title: ev.title,
              date: ev.event_date,
              time: ev.event_time,
              location: ev.location,
              description: ev.description,
              flyerUrl: ev.flyer_url || undefined,
              category: ev.category,
              createdBy: ev.created_by,
              createdAt: ev.created_at ? ev.created_at.slice(0, 10) : new Date().toISOString().split('T')[0]
            }))
          );
        }

        // 6. Finance
        const { data: dbFinance } = await supabase.from('finance_records').select('*');
        if (dbFinance && dbFinance.length > 0 && isMounted) {
          setFinanceRecords(
            dbFinance.map((f: any) => ({
              id: f.id,
              ref: f.ref,
              date: f.transaction_date,
              giver: f.giver,
              category: f.category,
              method: f.method,
              amount: Number(f.amount) || 0,
              cellGroup: f.cell_group || undefined,
              status: f.status,
              recordedBy: f.recorded_by
            }))
          );
        }

        // 7. Visitors (First-Timers / Guests)
        const { data: dbVisitors } = await supabase.from('visitors').select('*');
        if (dbVisitors && dbVisitors.length > 0 && isMounted) {
          setVisitors(
            dbVisitors.map((v: any) => ({
              id: v.id,
              name: v.name,
              phone: formatGhanaianPhone(v.phone),
              email: v.email || '',
              visitDate: v.visit_date,
              serviceAttended: v.service_attended,
              invitedBy: v.invited_by || undefined,
              assignedShepherdId: v.assigned_shepherd_id || undefined,
              assignedShepherdName: v.assigned_shepherd_name || undefined,
              journeyStage: v.journey_stage,
              contactAttempts: v.contact_attempts || 0,
              notes: v.notes || undefined
            }))
          );
        }

        // 8. Shepherds (from profiles)
        const { data: dbShepherds } = await supabase.from('profiles').select('*').eq('role', 'shepherd');
        if (dbShepherds && isMounted) {
          setShepherds(
            dbShepherds.map((s: any) => ({
              id: s.id,
              name: s.name || s.full_name || '',
              cell: s.assigned_cell || s.cell || '',
              assignedCount: 0,
              maxCapacity: 30
            }))
          );
        }

        if (isMounted) setIsCloudConnected(true);
      } catch (err) {
        console.warn('[CPI Cloud Sync] Running with cached data:', err);
      }
    };

    syncFromCloud();

    return () => {
      isMounted = false;
    };
  }, []);

  // =========================================================================
  // STRICT RECORD-LEVEL AUTHORIZATION PARTITIONS (Per User Instruction)
  // "a cell leader should only be entitle to view his or her cell recording
  // attendance, offerings, cell meetings and church attendance and some other
  // service and not other peoples cells"
  // =========================================================================

  const isPastor = currentUser.role === 'pastor';

  // 1. Members / Flock:
  const visibleMembers = isPastor
    ? members
    : members.filter(
        (m) =>
          m.currentShepherdId === currentUser.id ||
          m.cellGroup === currentUser.assignedCell
      );

  // 2. Service Attendance:
  const visibleAttendance = isPastor
    ? attendanceRecords
    : attendanceRecords.filter(
        (r) =>
          r.shepherdId === currentUser.id ||
          r.cellGroup === currentUser.assignedCell
      );

  // 3. Cell Meetings & Cell Offerings:
  const visibleCellMeetings = isPastor
    ? cellMeetings
    : cellMeetings.filter(
        (cm) =>
          cm.shepherdId === currentUser.id ||
          cm.cellName === currentUser.assignedCell
      );

  // 4. Follow-Up Tasks:
  const visibleTasks = isPastor
    ? followUpTasks
    : followUpTasks.filter((t) => t.shepherdId === currentUser.id);

  // 5. Visitors:
  const visibleVisitors = isPastor
    ? visitors
    : visitors.filter((v) => v.assignedShepherdId === currentUser.id);

  // 6. Cell Offerings / Finance:
  // Cell leader sees ONLY cell fellowship offerings for their cell. Pastor sees all!
  const visibleFinance = isPastor
    ? financeRecords
    : financeRecords.filter(
        (f) =>
          f.category === 'Cell Fellowship Offering' &&
          f.cellGroup === currentUser.assignedCell
      );

  // 7. Notifications
  const visibleNotifications = isPastor
    ? notifications
    : notifications.filter((n) => n.recipientId === currentUser.id || n.recipientId === 'all');

  const getProfileUUID = (userIdOrShepherdId?: string, fallback = false): string | null => {
    if (!userIdOrShepherdId) return fallback ? 'a0000000-0000-0000-0000-000000000001' : null;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userIdOrShepherdId);
    if (isUUID) return userIdOrShepherdId;
    const idMap: Record<string, string> = {
      'USR-PASTOR-01': 'a0000000-0000-0000-0000-000000000001',
      'SH-01': 'a0000000-0000-0000-0000-000000000002',
      'SH-02': 'a0000000-0000-0000-0000-000000000003',
      'SH-03': 'a0000000-0000-0000-0000-000000000004',
      'SH-04': 'a0000000-0000-0000-0000-000000000005',
      'SH-05': 'a0000000-0000-0000-0000-000000000006'
    };
    return idMap[userIdOrShepherdId] || (fallback ? 'a0000000-0000-0000-0000-000000000001' : null);
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );

    if (isSupabaseConfigured) {
      (supabase.from('notifications') as any)
        .update({ is_read: true })
        .eq('id', id)
        .then(({ error }: any) => {
          if (error) console.error('[Supabase markNotificationRead] Error:', error);
        });
    }
  };

  // 8. Messages — Shepherd sees only their own conversation with pastor
  const visibleMessages = isPastor
    ? messages
    : messages.filter(
        (m) => m.senderId === currentUser.id || m.recipientId === currentUser.id
      );

  const sendMessage = async (recipientId: string, content: string): Promise<{ success: boolean; error?: string }> => {
    if (!recipientId) {
      return { success: false, error: 'Select a recipient before sending.' };
    }
    if (!content || !content.trim()) {
      return { success: false, error: 'Message is empty. Type what you want to send.' };
    }

    const target = shepherds.find((s) => s.id === recipientId);
    const newMsg: ChatMessage = {
      id: `MSG-${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role as 'pastor' | 'shepherd',
      recipientId,
      recipientName: isPastor
        ? (target?.name || 'Shepherd')
        : 'Pastor Adams',
      content: content.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' — just now',
      read: false
    };

    if (isSupabaseConfigured) {
      try {
        const { error } = await (supabase.from('chat_messages') as any)
          .insert({
            id: newMsg.id,
            sender_id: (await supabase.auth.getUser()).data.user?.id || getProfileUUID(currentUser.id),
            sender_name: currentUser.name,
            recipient_id: getProfileUUID(recipientId),
            recipient_name: newMsg.recipientName,
            content: newMsg.content,
            is_read: false
          });

        if (error) {
          console.error('[Supabase sendMessage] Error:', error);
          return { success: false, error: mapError(error).message };
        }
      } catch (err: any) {
        console.error('[Supabase sendMessage] Catch:', err);
        return { success: false, error: mapError(err).message };
      }
    }

    setMessages((prev) => [...prev, newMsg]);
    return { success: true };
  };

  const markMessageRead = (messageId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, read: true } : m))
    );

    if (isSupabaseConfigured) {
      (supabase.from('chat_messages') as any)
        .update({ is_read: true })
        .eq('id', messageId)
        .then(({ error }: any) => {
          if (error) console.error('[Supabase markMessageRead] Error:', error);
        });
    }
  };

  // 9. Announcements — all roles see all announcements
  const visibleAnnouncements = announcements;

  const createAnnouncement = async (data: Omit<ChurchAnnouncement, 'id' | 'authorName' | 'date'>): Promise<{ success: boolean; error?: string }> => {
    if (!data || !data.title?.trim() || !data.content?.trim()) {
      return { success: false, error: 'Please enter the required information.' };
    }

    const newAnn: ChurchAnnouncement = {
      ...data,
      id: `ANN-${Date.now()}`,
      authorName: currentUser.name,
      date: new Date().toISOString().split('T')[0]
    };

    if (isSupabaseConfigured) {
      try {
        const { error } = await (supabase.from('announcements') as any)
          .insert({
            id: newAnn.id,
            title: newAnn.title,
            content: newAnn.content,
            author_id: (await supabase.auth.getUser()).data.user?.id || getProfileUUID(currentUser.id),
            author_name: currentUser.name,
            priority: newAnn.priority,
            target: newAnn.target
          });

        if (error) {
          console.error('[Supabase createAnnouncement] Error:', error);
          return { success: false, error: mapError(error).message };
        }
      } catch (err: any) {
        console.error('[Supabase createAnnouncement] Catch:', err);
        return { success: false, error: mapError(err).message };
      }
    }

    setAnnouncements((prev) => [newAnn, ...prev]);
    return { success: true };
  };

  const updateAnnouncement = async (announcementId: string, updates: Partial<ChurchAnnouncement>): Promise<{ success: boolean; error?: string }> => {
    if (!announcementId || !updates) return { success: false, error: 'There is no data to save.' };
    if (isSupabaseConfigured) {
      const dbPayload: any = {};
      if (updates.title !== undefined) dbPayload.title = updates.title.trim();
      if (updates.content !== undefined) dbPayload.content = updates.content.trim();
      if (updates.priority !== undefined) dbPayload.priority = updates.priority;
      if (updates.target !== undefined) dbPayload.target = updates.target;
      const { error } = await (supabase.from('announcements') as any).update(dbPayload).eq('id', announcementId);
      if (error) return { success: false, error: mapError(error).message };
    }
    setAnnouncements((prev) => prev.map((item) => item.id === announcementId ? { ...item, ...updates } : item));
    return { success: true };
  };

  const deleteAnnouncement = async (announcementId: string): Promise<{ success: boolean; error?: string }> => {
    if (!announcementId) return { success: false, error: 'Invalid announcement.' };
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('announcements').delete().eq('id', announcementId);
      if (error) return { success: false, error: mapError(error).message };
    }
    setAnnouncements((prev) => prev.filter((item) => item.id !== announcementId));
    return { success: true };
  };

  // 10. Church Events — all roles see all events
  const visibleEvents = churchEvents;

  const createEvent = async (data: Omit<ChurchEvent, 'id' | 'createdBy' | 'createdAt'>): Promise<{ success: boolean; error?: string }> => {
    if (!data || !data.title?.trim() || !data.date?.trim() || !data.location?.trim()) {
      return { success: false, error: 'Please enter the required information.' };
    }

    const newEvt: ChurchEvent = {
      ...data,
      id: `EVT-${Date.now()}`,
      createdBy: currentUser.name,
      createdAt: new Date().toISOString().split('T')[0]
    };

    if (isSupabaseConfigured) {
      try {
        const { error } = await (supabase.from('church_events') as any)
          .insert({
            id: newEvt.id,
            title: newEvt.title,
            event_date: newEvt.date,
            event_time: newEvt.time,
            location: newEvt.location,
            description: newEvt.description,
            flyer_url: newEvt.flyerUrl || null,
            category: newEvt.category,
            created_by: currentUser.name
          });

        if (error) {
          console.error('[Supabase createEvent] Error:', error);
          return { success: false, error: mapError(error).message };
        }
      } catch (err: any) {
        console.error('[Supabase createEvent] Catch:', err);
        return { success: false, error: mapError(err).message };
      }
    }

    setChurchEvents((prev) => [newEvt, ...prev]);
    return { success: true };
  };

  const updateEvent = async (eventId: string, updates: Partial<ChurchEvent>): Promise<{ success: boolean; error?: string }> => {
    if (!eventId || !updates) return { success: false, error: 'There is no data to save.' };
    if (isSupabaseConfigured) {
      const dbPayload: any = {};
      if (updates.title !== undefined) dbPayload.title = updates.title.trim();
      if (updates.date !== undefined) dbPayload.event_date = updates.date;
      if (updates.time !== undefined) dbPayload.event_time = updates.time;
      if (updates.location !== undefined) dbPayload.location = updates.location.trim();
      if (updates.description !== undefined) dbPayload.description = updates.description.trim();
      if (updates.flyerUrl !== undefined) dbPayload.flyer_url = updates.flyerUrl || null;
      if (updates.category !== undefined) dbPayload.category = updates.category;
      const { error } = await (supabase.from('church_events') as any).update(dbPayload).eq('id', eventId);
      if (error) return { success: false, error: mapError(error).message };
    }
    setChurchEvents((prev) => prev.map((item) => item.id === eventId ? { ...item, ...updates } : item));
    return { success: true };
  };

  const deleteEvent = async (eventId: string): Promise<{ success: boolean; error?: string }> => {
    if (!eventId) return { success: false, error: 'Invalid event.' };
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('church_events').delete().eq('id', eventId);
      if (error) return { success: false, error: mapError(error).message };
    }
    setChurchEvents((prev) => prev.filter((item) => item.id !== eventId));
    return { success: true };
  };

  // Actions
  const registerMember = async (newMemData: Omit<Member, 'id' | 'registeredAt' | 'registeredBy'>): Promise<{ success: boolean; error?: string; member?: Member }> => {
    if (!newMemData || !newMemData.firstName?.trim() || !newMemData.phone?.trim()) {
      return { success: false, error: 'Please enter the required information.' };
    }

    const formattedPhone = formatPhone(newMemData.phone.trim());
    const normalizedDob = normalizeDate(newMemData.dateOfBirth);

    // Duplicate detection on normalized phone / email, naming who already has it
    const normPhone = (p: string) => p.replace(/[\s\-()]/g, '').replace(/^233/, '0').replace(/^0/, '');
    const phoneDup = members.find((m) => normPhone(m.phone) === normPhone(newMemData.phone.trim()));
    if (phoneDup) {
      return {
        success: false,
        error: `This phone number is already registered to ${phoneDup.firstName} ${phoneDup.lastName}.`
      };
    }
    if (newMemData.email?.trim()) {
      const emailDup = members.find(
        (m) => m.email && m.email.toLowerCase() === newMemData.email!.trim().toLowerCase()
      );
      if (emailDup) {
        return {
          success: false,
          error: `This email address is already registered to ${emailDup.firstName} ${emailDup.lastName}.`
        };
      }
    }

    // Generate safe, collision-free member ID
    const maxNum = members.reduce((max, m) => {
      const match = m.id.match(/CPI-M-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 1032);
    let newId = `CPI-M-${maxNum + 1}`;
    while (members.some((m) => m.id === newId)) {
      newId = `CPI-M-${parseInt(newId.replace('CPI-M-', ''), 10) + 1}`;
    }

    const newMember: Member = {
      ...newMemData,
      firstName: newMemData.firstName.trim(),
      lastName: newMemData.lastName?.trim() || '—',
      phone: formattedPhone,
      email: newMemData.email?.trim() || '',
      dateOfBirth: normalizedDob || undefined,
      id: newId,
      registeredAt: new Date().toISOString().split('T')[0],
      registeredBy: currentUser.name || 'Pastor Adams'
    };

    if (isSupabaseConfigured) {
      try {
        // Resolve shepherd UUID — null is acceptable (column is nullable FK)
        const shepherdUuid = getProfileUUID(newMember.currentShepherdId) ?? null;

        const memberPayload: Record<string, any> = {
          id: newId,
          first_name: newMember.firstName,
          last_name: newMember.lastName,
          phone: newMember.phone,
          email: newMember.email || null,
          city: newMember.city || 'Central District',
          date_of_birth: normalizedDob,
          status: newMember.status || 'New Member',
          spiritual_stage: newMember.spiritualStage || 'New Convert',
          department: newMember.department || null,
          cell_group: newMember.cellGroup,
          current_shepherd_id: shepherdUuid,
          current_shepherd_name: newMember.currentShepherdName || null,
          registered_at: newMember.registeredAt,
          registered_by: newMember.registeredBy,
          general_notes: newMember.generalNotes || null
        };

        let { error } = await (supabase.from('members') as any).insert(memberPayload);

        // If the FK on current_shepherd_id fails (profile UUID doesn't exist in DB yet),
        // retry without the shepherd FK so the member is still saved
        if (error && (error.code === '23503' || error.message?.includes('foreign key'))) {
          console.warn('[Supabase registerMember] Shepherd FK failed, retrying without shepherd_id:', error.message);
          const retryPayload = { ...memberPayload, current_shepherd_id: null };
          const retryResult = await (supabase.from('members') as any).insert(retryPayload);
          error = retryResult.error;
        }

        if (error) {
          console.error('[Supabase registerMember] Error:', error);
          return { success: false, error: mapError(error).message };
        }
      } catch (err: any) {
        console.error('[Supabase registerMember] Catch:', err);
        return { success: false, error: mapError(err).message };
      }
    }

    setMembers((prev) => [newMember, ...prev]);

    setAuditLogs((prev) => [
      {
        id: `LOG-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actorName: currentUser.name,
        actorRole: currentUser.role,
        action: 'REGISTER_MEMBER',
        entityType: 'Member',
        entityId: newId,
        details: `Enrolled ${newMember.firstName} ${newMember.lastName} into ${newMember.cellGroup}`
      },
      ...prev
    ]);

    return { success: true, member: newMember };
  };

  const registerVisitor = async (
    data: Omit<VisitorRecord, 'id' | 'contactAttempts'>
  ): Promise<{ success: boolean; error?: string; visitor?: VisitorRecord }> => {
    if (!data || !data.name?.trim() || !data.phone?.trim()) {
      return { success: false, error: 'Please enter the required information.' };
    }

    const formattedPhone = formatPhone(data.phone.trim());
    const newId = `VIS-${Date.now().toString().slice(-6)}`;
    const visitDate = normalizeDate(data.visitDate) || new Date().toISOString().split('T')[0];

    const newVisitor: VisitorRecord = {
      ...data,
      id: newId,
      name: data.name.trim(),
      phone: formattedPhone,
      email: data.email?.trim() || '',
      visitDate,
      serviceAttended: data.serviceAttended || 'Sunday Service',
      journeyStage: data.journeyStage || 'First Visit',
      contactAttempts: 0,
      notes: data.notes || ''
    };

    if (isSupabaseConfigured) {
      try {
        // Resolve shepherd UUID — column is nullable so null is acceptable
        const shepherdUuid = getProfileUUID(newVisitor.assignedShepherdId) ?? null;

        const visitorPayload: Record<string, any> = {
          id: newId,
          name: newVisitor.name,
          phone: newVisitor.phone,
          email: newVisitor.email || null,
          visit_date: newVisitor.visitDate,
          service_attended: newVisitor.serviceAttended,
          invited_by: newVisitor.invitedBy || null,
          assigned_shepherd_id: shepherdUuid,
          assigned_shepherd_name: newVisitor.assignedShepherdName || null,
          journey_stage: newVisitor.journeyStage,
          contact_attempts: 0,
          notes: newVisitor.notes || null
        };

        let { error } = await (supabase.from('visitors') as any).insert(visitorPayload);

        // If shepherd FK fails (profile UUID not in DB), retry without shepherd FK
        if (error && (error.code === '23503' || error.message?.includes('foreign key'))) {
          console.warn('[Supabase registerVisitor] Shepherd FK failed, retrying without shepherd_id:', error.message);
          const retryPayload = { ...visitorPayload, assigned_shepherd_id: null };
          const retryResult = await (supabase.from('visitors') as any).insert(retryPayload);
          error = retryResult.error;
        }

        if (error) {
          console.error('[Supabase registerVisitor] Error:', error);
          return { success: false, error: mapError(error).message };
        }
      } catch (err: any) {
        console.error('[Supabase registerVisitor] Catch:', err);
        return { success: false, error: mapError(err).message };
      }
    }

    setVisitors((prev) => [newVisitor, ...prev]);

    // Also enroll guest in member roster under 'Pending Verification' so they exist across church records
    const nameParts = newVisitor.name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '—';
    const guestMemberId = `CPI-M-${Date.now().toString().slice(-4)}`;

    const guestMember: Member = {
      id: guestMemberId,
      firstName,
      lastName,
      phone: formattedPhone,
      email: newVisitor.email,
      city: 'Central District',
      status: 'Pending Verification',
      spiritualStage: 'New Convert',
      cellGroup: newVisitor.assignedShepherdName ? `${newVisitor.assignedShepherdName}'s Group` : 'First-Timers Care',
      currentShepherdId: newVisitor.assignedShepherdId,
      currentShepherdName: newVisitor.assignedShepherdName,
      registeredAt: newVisitor.visitDate,
      registeredBy: currentUser.name || 'Pastor Adams',
      generalNotes: `First-time guest. Invited by: ${newVisitor.invitedBy || 'Walk-in'}. ${newVisitor.notes || ''}`
    };

    setMembers((prev) => [guestMember, ...prev]);

    return { success: true, visitor: newVisitor };
  };

  const updateMember = async (memberId: string, updates: Partial<Member>): Promise<{ success: boolean; error?: string }> => {
    if (!memberId || !updates || Object.keys(updates).length === 0) {
      return { success: false, error: 'There is no data to save.' };
    }

    if (isSupabaseConfigured) {
      try {
        const dbPayload: any = {};
        if (updates.firstName !== undefined) dbPayload.first_name = updates.firstName.trim();
        if (updates.lastName !== undefined) dbPayload.last_name = updates.lastName.trim();
        if (updates.phone !== undefined) {
          const gPhone = formatPhone(updates.phone.trim());
          dbPayload.phone = gPhone;
          updates.phone = gPhone;
        }
        if (updates.email !== undefined) dbPayload.email = updates.email.trim() || null;
        if (updates.city !== undefined) dbPayload.city = updates.city;
        if (updates.dateOfBirth !== undefined) {
          const norm = normalizeDate(updates.dateOfBirth);
          dbPayload.date_of_birth = norm;
          updates.dateOfBirth = norm || undefined;
        }
        if (updates.status !== undefined) dbPayload.status = updates.status;
        if (updates.spiritualStage !== undefined) dbPayload.spiritual_stage = updates.spiritualStage;
        if (updates.department !== undefined) dbPayload.department = updates.department || null;
        if (updates.cellGroup !== undefined) dbPayload.cell_group = updates.cellGroup;
        if (updates.generalNotes !== undefined) dbPayload.general_notes = updates.generalNotes || null;
        if (updates.confidentialNotes !== undefined) dbPayload.confidential_notes = updates.confidentialNotes || null;

        const { error } = await (supabase.from('members') as any)
          .update(dbPayload)
          .eq('id', memberId);

        if (error) {
          console.error('[Supabase updateMember] Error:', error);
          return { success: false, error: mapError(error).message };
        }
      } catch (err: any) {
        console.error('[Supabase updateMember] Catch:', err);
        return { success: false, error: mapError(err).message };
      }
    }

    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, ...updates } : m))
    );
    return { success: true };
  };

  const deleteMember = async (memberId: string): Promise<{ success: boolean; error?: string }> => {
    if (!memberId) return { success: false, error: 'Invalid member.' };
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('members').delete().eq('id', memberId);
        if (error) return { success: false, error: mapError(error).message };
      } catch (err: any) {
        return { success: false, error: mapError(err).message };
      }
    }
    setMembers((prev) => prev.filter((member) => member.id !== memberId));
    return { success: true };
  };

  const reassignMember = async (memberId: string, newShepherdId: string, reason: string): Promise<{ success: boolean; error?: string }> => {
    if (currentUser.role !== 'pastor') {
      return { success: false, error: 'Only a pastor can assign or reassign members.' };
    }
    if (!memberId) {
      return { success: false, error: 'Please select at least one record before proceeding.' };
    }
    if (!newShepherdId) {
      return { success: false, error: 'Please select a target shepherd.' };
    }

    const targetShepherd = shepherds.find((s) => s.id === newShepherdId);
    if (!targetShepherd) {
      return { success: false, error: 'Target shepherd not found.' };
    }

    const targetMember = members.find((m) => m.id === memberId);
    if (!targetMember) {
      return { success: false, error: 'Member not found.' };
    }
    const oldShepherdId = targetMember.currentShepherdId;

    // Record assignment history
    const newAssignment: ShepherdAssignment = {
      id: `ASN-${Date.now()}`,
      memberId,
      memberName: `${targetMember.firstName} ${targetMember.lastName}`,
      shepherdId: targetShepherd.id,
      shepherdName: targetShepherd.name,
      cellGroup: targetShepherd.cell,
      startDate: new Date().toISOString().split('T')[0],
      status: 'Active',
      assignedBy: currentUser.name,
      reason: reason || 'Geographic relocation / Care balancing'
    };

    if (isSupabaseConfigured) {
      try {
        // Always resolve to a valid UUID — fall back to pastor UUID if the ID isn't mapped
        const shepherdUuid = getProfileUUID(targetShepherd.id, true) as string;

        // Step 1: Update the member's current shepherd assignment (critical)
        const { error: memErr } = await (supabase.from('members') as any)
          .update({
            current_shepherd_id: shepherdUuid,
            current_shepherd_name: targetShepherd.name,
            cell_group: targetShepherd.cell,
            phone: formatPhone(targetMember.phone)
          })
          .eq('id', memberId);

        if (memErr) {
          console.error('[Supabase reassignMember memErr] Error:', memErr);
          return { success: false, error: mapError(memErr).message };
        }

        // Step 2: Record assignment history — non-critical, log but don't fail user operation
        const { error: asnErr } = await (supabase.from('shepherd_assignments') as any)
          .insert({
            id: newAssignment.id,
            member_id: memberId,
            member_name: newAssignment.memberName,
            shepherd_id: shepherdUuid,
            shepherd_name: targetShepherd.name,
            cell_group: targetShepherd.cell,
            start_date: newAssignment.startDate,
            status: 'Active',
            assigned_by: currentUser.name,
            reason: newAssignment.reason
          });

        if (asnErr) {
          // Log the warning but do not block the user — the member record was already updated
          console.warn('[Supabase shepherd_assignments] Non-critical insert failed:', asnErr.message || asnErr);
        }
      } catch (err: any) {
        console.error('[Supabase reassignMember] Catch:', err);
        return { success: false, error: mapError(err).message };
      }
    }

    setMembers((prev) =>
      prev.map((m) =>
        m.id === memberId
          ? {
              ...m,
              currentShepherdId: targetShepherd.id,
              currentShepherdName: targetShepherd.name,
              cellGroup: targetShepherd.cell
            }
          : m
      )
    );
    setAssignmentsHistory((prev) => [newAssignment, ...prev]);

    // Send automatic notification to the recipient Shepherd
    const newNotif: CMSNotification = {
      id: `NOTIF-${Date.now()}`,
      recipientId: targetShepherd.id,
      title: 'New Member Assigned to Your Shepherd Group',
      message: `${targetMember ? `${targetMember.firstName} ${targetMember.lastName}` : 'A new member'} has been assigned to your shepherd group (${targetShepherd.cell}) by Pastor Adams. Transfer reason: ${reason}.`,
      timestamp: 'Just now',
      read: false,
      type: 'assignment',
      memberId
    };
    setNotifications((prev) => [newNotif, ...prev]);

    // Recalculate capacity counts
    setShepherds((prev) =>
      prev.map((s) => {
        if (s.id === targetShepherd.id) {
          return { ...s, assignedCount: s.assignedCount + 1 };
        }
        if (oldShepherdId && s.id === oldShepherdId) {
          return { ...s, assignedCount: Math.max(0, s.assignedCount - 1) };
        }
        return s;
      })
    );
  };

  const updateAttendance = (recordId: string, status: AttendanceStatus) => {
    setAttendanceRecords((prev) =>
      prev.map((r) =>
        r.id === recordId
          ? {
              ...r,
              status,
              recordedBy: currentUser.name,
              recordedAt: new Date().toISOString().replace('T', ' ').slice(0, 19)
            }
          : r
      )
    );

    if (isSupabaseConfigured) {
      (supabase.from('attendance_records') as any)
        .update({
          status,
          recorded_by: currentUser.name,
          recorded_at: new Date().toISOString()
        })
        .eq('id', recordId)
        .then(({ error }: any) => {
          if (error) console.error('[Supabase updateAttendance] Error:', error);
        });
    }
  };

  const recordSundayAttendance = async (
    memberId: string,
    status: AttendanceStatus,
    date = '2026-11-08',
    serviceName?: string,
    serviceCategory?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!memberId || !status) {
      return { success: false, error: 'Please enter the required information.' };
    }
    if (serviceCategory && !['sunday', 'midweek', 'vigil'].includes(serviceCategory)) {
      return { success: false, error: 'Select a valid service category.' };
    }
    const member = members.find((m) => m.id === memberId);
    if (!member) {
      return { success: false, error: 'Member not found.' };
    }

    let targetRecordId = `ATT-${date.replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;
    const existing = attendanceRecords.find(
      (r) => r.memberId === memberId && r.serviceDate === date
    );
    if (existing) {
      targetRecordId = existing.id;
    }

    if (isSupabaseConfigured) {
      try {
        const { error } = await (supabase.from('attendance_records') as any).upsert({
          id: targetRecordId,
          service_name: serviceName || 'Sunday 1st Service — Communion',
          service_category: serviceCategory || 'sunday',
          service_date: date,
          member_id: member.id,
          member_name: `${member.firstName} ${member.lastName}`,
          cell_group: member.cellGroup,
          shepherd_id: (await supabase.auth.getUser()).data.user?.id || getProfileUUID(member.currentShepherdId),
          status,
          recorded_by: currentUser.name,
          recorded_at: new Date().toISOString(),
          consecutive_absences: status === 'Absent' ? 1 : 0
        });

        if (error) {
          console.error('[Supabase recordSundayAttendance] Error:', error);
          return { success: false, error: mapError(error).message };
        }
      } catch (err: any) {
        console.error('[Supabase recordSundayAttendance] Catch:', err);
        return { success: false, error: mapError(err).message };
      }
    }

    setAttendanceRecords((prev) => {
      const existingIdx = prev.findIndex(
        (r) => r.memberId === memberId && r.serviceDate === date
      );

      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = {
          ...copy[existingIdx],
          status,
          recordedBy: currentUser.name,
          recordedAt: new Date().toISOString().replace('T', ' ').slice(0, 19)
        };
        return copy;
      }

      const newRecord: AttendanceRecord = {
        id: targetRecordId,
        serviceId: 'SRV-SUN-04',
        serviceName: 'Sunday 1st Service — Communion',
        serviceDate: date,
        memberId: member.id,
        memberName: `${member.firstName} ${member.lastName}`,
        cellGroup: member.cellGroup,
        shepherdId: member.currentShepherdId,
        status,
        recordedBy: currentUser.name,
        recordedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
        consecutiveAbsences: status === 'Absent' ? 1 : 0
      };

      return [newRecord, ...prev];
    });

    return { success: true };
  };

  const batchSaveAttendance = async (
    recordsToSave: { memberId: string; status: AttendanceStatus; date: string }[],
    serviceName?: string,
    serviceCategory?: string
  ): Promise<{ success: boolean; error?: string; count?: number }> => {
    if (!recordsToSave || recordsToSave.length === 0) {
      return { success: false, error: 'There is no data to save.' };
    }
    if (currentUser.role !== 'pastor') {
      const canManageAllRecords = recordsToSave.every((record) =>
        visibleMembers.some((member) => member.id === record.memberId)
      );
      if (!canManageAllRecords) {
        return { success: false, error: 'You can only save attendance for members in your assigned cell.' };
      }
    }

    const authUserId = isSupabaseConfigured
      ? (await supabase.auth.getUser()).data.user?.id || null
      : null;
    const resolvedServiceName = serviceName || 'Sunday 1st Service — Communion';
    const resolvedCategory = serviceCategory || 'sunday';
    if (!['sunday', 'midweek', 'vigil'].includes(resolvedCategory)) {
      return { success: false, error: 'Select a valid service category.' };
    }
    const payload = recordsToSave.map((rec) => {
      const member = members.find((m) => m.id === rec.memberId);
      const existing = attendanceRecords.find(
        (a) => a.memberId === rec.memberId && a.serviceDate === rec.date
      );
      const id = existing?.id || `ATT-${rec.date.replace(/-/g, '')}-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 1000)}`;

      return {
        id,
        service_name: resolvedServiceName,
        service_category: resolvedCategory,
        service_date: rec.date,
        member_id: rec.memberId,
        member_name: member ? `${member.firstName} ${member.lastName}` : 'Member',
        cell_group: member?.cellGroup || 'General',
        shepherd_id: authUserId || getProfileUUID(member?.currentShepherdId),
        status: rec.status,
        recorded_by: currentUser.name,
        recorded_at: new Date().toISOString(),
        consecutive_absences: rec.status === 'Absent' ? 1 : 0
      };
    });

    if (isSupabaseConfigured) {
      try {
        const { error } = await (supabase.from('attendance_records') as any).upsert(payload);
        if (error) {
          console.error('[Supabase batchSaveAttendance] Error:', error);
          return { success: false, error: mapError(error).message };
        }
      } catch (err: any) {
        console.error('[Supabase batchSaveAttendance] Catch:', err);
        return { success: false, error: mapError(err).message };
      }
    }

    // Update local state
    setAttendanceRecords((prev) => {
      const updated = [...prev];
      payload.forEach((p) => {
        const idx = updated.findIndex((r) => r.memberId === p.member_id && r.serviceDate === p.service_date);
        const localRec: AttendanceRecord = {
          id: p.id,
          serviceId: undefined,
          serviceName: p.service_name,
          serviceDate: p.service_date,
          memberId: p.member_id,
          memberName: p.member_name,
          cellGroup: p.cell_group,
          shepherdId: p.shepherd_id || undefined,
          status: p.status as AttendanceStatus,
          recordedBy: p.recorded_by,
          recordedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
          consecutiveAbsences: p.consecutive_absences
        };
        if (idx >= 0) {
          updated[idx] = localRec;
        } else {
          updated.unshift(localRec);
        }
      });
      return updated;
    });

    return { success: true, count: payload.length };
  };

  // Dynamically calculate Sunday streaks comparing all Sunday services
  const sundayAbsenceReports: SundayAbsenceReport[] = React.useMemo(() => {
    const sundayRecords = attendanceRecords.filter(
      (r) =>
        r.serviceName.toLowerCase().includes('sunday') ||
        r.serviceId.startsWith('SRV-SUN')
    );

    const sundayDates = Array.from(
      new Set(sundayRecords.map((r) => r.serviceDate))
    ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    return members.map((m) => {
      let consecutiveMissedSundays = 0;
      let lastAttendedSunday: string | undefined;
      const missedSundays: string[] = [];

      for (const sDate of sundayDates) {
        const rec = sundayRecords.find(
          (r) => r.memberId === m.id && r.serviceDate === sDate
        );
        const status = rec ? rec.status : 'Absent';

        if (status === 'Present') {
          lastAttendedSunday = sDate;
          break; // Streak stops once an attended Sunday is reached
        } else {
          consecutiveMissedSundays++;
          missedSundays.push(sDate);
        }
      }

      let category: SundayAbsenceCategory = 'regular';
      let stageLabel = 'Good Standing (Active)';
      let actionPrompt = 'Regular Sunday communion attendance';

      if (consecutiveMissedSundays === 1) {
        category = 'red_list';
        stageLabel = 'Red List • 1 Missed Sunday';
        actionPrompt = 'Prompt telephone check-in & spiritual encouragement';
      } else if (consecutiveMissedSundays === 2) {
        category = 'red_list';
        stageLabel = 'Red List • 2 Consecutive Misses';
        actionPrompt = 'High Priority: Shepherd home visitation & care check';
      } else if (consecutiveMissedSundays >= 3) {
        category = 'critical_absentee';
        stageLabel = `Critical Absentee • ${consecutiveMissedSundays} Consecutive Misses`;
        actionPrompt = 'Pastoral Office escalation & welfare intervention';
      }

      return {
        memberId: m.id,
        memberName: `${m.firstName} ${m.lastName}`,
        phone: formatGhanaianPhone(m.phone),
        cellGroup: m.cellGroup,
        shepherdName: m.currentShepherdName || 'Unassigned',
        shepherdId: m.currentShepherdId,
        consecutiveMissedSundays,
        lastAttendedSunday,
        missedSundays,
        category,
        stageLabel,
        actionPrompt
      };
    });
  }, [members, attendanceRecords]);

  // Filtered by role
  const visibleSundayAbsenceReports = React.useMemo(() => {
    if (currentUser.role === 'pastor') {
      return sundayAbsenceReports;
    }
    return sundayAbsenceReports.filter(
      (r) => r.shepherdId === currentUser.id || r.cellGroup === currentUser.assignedCell
    );
  }, [sundayAbsenceReports, currentUser]);

  const redListMembers = React.useMemo(() => {
    return visibleSundayAbsenceReports.filter((r) => r.category === 'red_list');
  }, [visibleSundayAbsenceReports]);

  const criticalAbsenteeMembers = React.useMemo(() => {
    return visibleSundayAbsenceReports.filter(
      (r) => r.category === 'critical_absentee'
    );
  }, [visibleSundayAbsenceReports]);

  const recordCellMeeting = async (
    meeting: Omit<CellMeeting, 'id' | 'shepherdId' | 'shepherdName' | 'cellName'>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!meeting || !meeting.topic?.trim() || !meeting.date) {
      return { success: false, error: 'Please enter the required information.' };
    }

    const newMeeting: CellMeeting = {
      ...meeting,
      topic: meeting.topic.trim(),
      notes: meeting.notes?.trim() || '',
      id: `CELL-MTG-${Date.now()}`,
      cellName: currentUser.assignedCell || 'My Cell',
      shepherdId: currentUser.id,
      shepherdName: currentUser.name
    };

    if (isSupabaseConfigured) {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const authUserId = userData?.user?.id || getProfileUUID(currentUser.id);
        if (!authUserId) {
          return { success: false, error: 'Your session has expired. Please log in again.' };
        }
        const { error } = await (supabase.from('cell_meetings') as any).insert({
          id: newMeeting.id,
          cell_name: newMeeting.cellName,
          shepherd_id: authUserId,
          shepherd_name: currentUser.name,
          meeting_date: newMeeting.date,
          topic: newMeeting.topic,
          attendees_count: newMeeting.attendeesCount,
          offering_amount: newMeeting.offeringAmount,
          notes: newMeeting.notes || null
        });

        if (error) {
          console.error('[Supabase recordCellMeeting] Error:', error);
          return { success: false, error: error.code === '42501' ? 'You do not have permission to save this. Please log in again or contact an administrator.' : 'Unable to save the record. Please try again.' };
        }

        // Also register cell fellowship offering in finance ledger
        if (meeting.offeringAmount > 0) {
          const newFinanceId = `FIN-${Date.now()}`;
          await (supabase.from('finance_records') as any).insert({
            id: newFinanceId,
            ref: `CELL-${Date.now().toString().slice(-4)}`,
            transaction_date: meeting.date,
            giver: `${newMeeting.cellName} Fellowship Offering`,
            category: 'Cell Fellowship Offering',
            method: 'Cash / Envelope',
            amount: meeting.offeringAmount,
            cell_group: newMeeting.cellName,
            status: 'Submitted',
            recorded_by: currentUser.name
          });
        }
      } catch (err: any) {
        console.error('[Supabase recordCellMeeting] Catch:', err);
        return { success: false, error: mapError(err).message };
      }
    }

    setCellMeetings((prev) => [newMeeting, ...prev]);

    if (meeting.offeringAmount > 0) {
      const newFinanceId = `FIN-${Date.now()}`;
      const newFinance: FinanceRecord = {
        id: newFinanceId,
        ref: `CELL-${Date.now().toString().slice(-4)}`,
        date: meeting.date,
        giver: `${newMeeting.cellName} Fellowship Offering`,
        category: 'Cell Fellowship Offering',
        method: 'Cash / Envelope',
        amount: meeting.offeringAmount,
        cellGroup: newMeeting.cellName,
        status: 'Submitted',
        recordedBy: currentUser.name
      };
      setFinanceRecords((prev) => [newFinance, ...prev]);
    }

    return { success: true };
  };

  const updateCellMeeting = async (meetingId: string, updates: Partial<CellMeeting>): Promise<{ success: boolean; error?: string }> => {
    if (!meetingId || !updates) return { success: false, error: 'There is no data to save.' };
    if (isSupabaseConfigured) {
      const dbPayload: any = {};
      if (updates.date !== undefined) dbPayload.meeting_date = updates.date;
      if (updates.topic !== undefined) dbPayload.topic = updates.topic.trim();
      if (updates.attendeesCount !== undefined) dbPayload.attendees_count = updates.attendeesCount;
      if (updates.offeringAmount !== undefined) dbPayload.offering_amount = updates.offeringAmount;
      if (updates.notes !== undefined) dbPayload.notes = updates.notes.trim() || null;
      const { error } = await (supabase.from('cell_meetings') as any).update(dbPayload).eq('id', meetingId);
      if (error) return { success: false, error: mapError(error).message };
    }
    setCellMeetings((prev) => prev.map((item) => item.id === meetingId ? { ...item, ...updates } : item));
    return { success: true };
  };

  const deleteCellMeeting = async (meetingId: string): Promise<{ success: boolean; error?: string }> => {
    if (!meetingId) return { success: false, error: 'Invalid meeting.' };
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('cell_meetings').delete().eq('id', meetingId);
      if (error) return { success: false, error: mapError(error).message };
    }
    setCellMeetings((prev) => prev.filter((item) => item.id !== meetingId));
    return { success: true };
  };

  const updateTaskStatus = async (
    taskId: string,
    status: FollowUpStatus,
    note?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!taskId) {
      return { success: false, error: 'There is no data to save.' };
    }

    if (isSupabaseConfigured) {
      try {
        const { error } = await (supabase.from('follow_up_tasks') as any)
          .update({
            status,
            notes: note || undefined,
            completed_at: status === 'Completed' ? new Date().toISOString() : null
          })
          .eq('id', taskId);

        if (error) {
          console.error('[Supabase updateTaskStatus] Error:', error);
          return { success: false, error: mapError(error).message };
        }
      } catch (err: any) {
        console.error('[Supabase updateTaskStatus] Catch:', err);
        return { success: false, error: mapError(err).message };
      }
    }

    setFollowUpTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status,
              notes: note || t.notes,
              completedAt: status === 'Completed' ? new Date().toISOString().split('T')[0] : undefined
            }
          : t
      )
    );

    return { success: true };
  };

  const submitReport = async (
    reportId: string,
    narrative: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!narrative || !narrative.trim()) {
      return { success: false, error: 'Please enter the required information.' };
    }

    const id = reportId || `RPT-${Date.now()}`;
    const targetCell = currentUser.assignedCell || 'Cell Fellowship';

    if (isSupabaseConfigured) {
      try {
        const { error } = await (supabase.from('shepherd_reports') as any).upsert({
          id,
          shepherd_id: (await supabase.auth.getUser()).data.user?.id || getProfileUUID(currentUser.id),
          shepherd_name: currentUser.name,
          cell_name: targetCell,
          narrative: narrative.trim(),
          status: 'Submitted',
          submitted_at: new Date().toISOString()
        });

        if (error) {
          console.error('[Supabase submitReport] Error:', error);
          return { success: false, error: mapError(error).message };
        }
      } catch (err: any) {
        console.error('[Supabase submitReport] Catch:', err);
        return { success: false, error: mapError(err).message };
      }
    }

    setShepherdReports((prev) => {
      const idx = prev.findIndex((r) => r.id === id);
      const updatedReport: ShepherdReport = {
        id,
        shepherdId: currentUser.id,
        shepherdName: currentUser.name,
        cellName: targetCell,
        period: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        assignedSoulsCount: members.filter((m) => m.currentShepherdId === currentUser.id).length,
        attendanceAvgRate: 85,
        followUpsCompleted: followUpTasks.filter((t) => t.shepherdId === currentUser.id && t.status === 'Completed').length,
        overdueTasks: 0,
        narrative: narrative.trim(),
        status: 'Submitted',
        submittedAt: new Date().toISOString().replace('T', ' ').slice(0, 19)
      };

      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], narrative: narrative.trim(), status: 'Submitted', submittedAt: updatedReport.submittedAt };
        return copy;
      }
      return [updatedReport, ...prev];
    });

    return { success: true };
  };

  const approveReport = (reportId: string) => {
    setShepherdReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, status: 'Approved' } : r))
    );
  };

  return (
    <CMSContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        isCloudConnected,
        members,
        visibleMembers,
        registerMember,
        updateMember,
        deleteMember,
        reassignMember,
        shepherds,
        recordShepherdLogin,
        assignmentsHistory,
        attendanceRecords,
        visibleAttendance,
        updateAttendance,
        recordSundayAttendance,
        batchSaveAttendance,
        sundayAbsenceReports,
        visibleSundayAbsenceReports,
        redListMembers,
        criticalAbsenteeMembers,
        cellMeetings,
        visibleCellMeetings,
        recordCellMeeting,
        updateCellMeeting,
        deleteCellMeeting,
        followUpTasks,
        visibleTasks,
        updateTaskStatus,
        visitors,
        visibleVisitors,
        registerVisitor,
        shepherdReports,
        submitReport,
        approveReport,
        financeRecords,
        visibleFinance,
        auditLogs,
        notifications,
        visibleNotifications,
        markNotificationRead,
        messages,
        visibleMessages,
        sendMessage,
        markMessageRead,
        announcements,
        visibleAnnouncements,
        createAnnouncement,
        updateAnnouncement,
        deleteAnnouncement,
        churchEvents,
        visibleEvents,
        createEvent,
        updateEvent,
        deleteEvent
      }}
    >
      {children}
    </CMSContext.Provider>
  );
};

export const useCMS = () => {
  const context = useContext(CMSContext);
  if (!context) {
    throw new Error('useCMS must be used within a CMSProvider');
  }
  return context;
};
