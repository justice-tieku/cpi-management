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
  registerMember: (member: Omit<Member, 'id' | 'registeredAt' | 'registeredBy'>) => { success: boolean; error?: string };
  updateMember: (memberId: string, updates: Partial<Member>) => void;
  reassignMember: (memberId: string, newShepherdId: string, reason: string) => void;
  shepherds: { id: string; name: string; cell: string; assignedCount: number; maxCapacity: number }[];
  recordShepherdLogin: (name: string, cellName?: string) => { id: string; name: string; cell: string; email: string };
  assignmentsHistory: ShepherdAssignment[];
  attendanceRecords: AttendanceRecord[];
  visibleAttendance: AttendanceRecord[];
  updateAttendance: (recordId: string, status: AttendanceStatus) => void;
  recordSundayAttendance: (memberId: string, status: AttendanceStatus, date?: string) => void;
  sundayAbsenceReports: SundayAbsenceReport[];
  visibleSundayAbsenceReports: SundayAbsenceReport[];
  redListMembers: SundayAbsenceReport[];
  criticalAbsenteeMembers: SundayAbsenceReport[];
  cellMeetings: CellMeeting[];
  visibleCellMeetings: CellMeeting[];
  recordCellMeeting: (meeting: Omit<CellMeeting, 'id' | 'shepherdId' | 'shepherdName' | 'cellName'>) => void;
  followUpTasks: FollowUpTask[];
  visibleTasks: FollowUpTask[];
  updateTaskStatus: (taskId: string, status: FollowUpStatus, note?: string) => void;
  visitors: VisitorRecord[];
  visibleVisitors: VisitorRecord[];
  shepherdReports: ShepherdReport[];
  submitReport: (reportId: string, narrative: string) => void;
  approveReport: (reportId: string) => void;
  financeRecords: FinanceRecord[];
  visibleFinance: FinanceRecord[];
  auditLogs: AuditLog[];
  notifications: CMSNotification[];
  visibleNotifications: CMSNotification[];
  markNotificationRead: (id: string) => void;
  messages: ChatMessage[];
  visibleMessages: ChatMessage[];
  sendMessage: (recipientId: string, content: string) => void;
  markMessageRead: (messageId: string) => void;
  announcements: ChurchAnnouncement[];
  visibleAnnouncements: ChurchAnnouncement[];
  createAnnouncement: (data: Omit<ChurchAnnouncement, 'id' | 'authorName' | 'date'>) => void;
  churchEvents: ChurchEvent[];
  visibleEvents: ChurchEvent[];
  createEvent: (data: Omit<ChurchEvent, 'id' | 'createdBy' | 'createdAt'>) => void;
}

const CMSContext = createContext<CMSContextType | undefined>(undefined);

export const CMSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Current active user
  const [currentUser, setCurrentUser] = useState<User>({
    id: 'USR-PASTOR-01',
    name: 'Pastor Adams',
    email: 'pastor.adams@crosspassion.org',
    role: 'pastor',
    branch: 'Main Sanctuary — Central Cathedral'
  });

  // Cell Shepherds definition
  const [shepherds, setShepherds] = useState([
    { id: 'SH-01', name: 'Elder Nathan Cole', cell: 'Bethel Cell (Central)', assignedCount: 35, maxCapacity: 35 },
    { id: 'SH-02', name: 'Deaconess Ruth Taiwo', cell: 'Eden Cell (South)', assignedCount: 19, maxCapacity: 30 },
    { id: 'SH-03', name: 'Bro. Matthew Kim', cell: 'Moriah Young Adults', assignedCount: 24, maxCapacity: 30 },
    { id: 'SH-04', name: 'Sister Grace Olatunji', cell: 'Sharon Cell (East)', assignedCount: 29, maxCapacity: 30 },
    { id: 'SH-05', name: 'Pastor Emmanuel Vance', cell: 'Hebron Cell (North)', assignedCount: 32, maxCapacity: 35 }
  ]);

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
    const cell = cellName?.trim() || `${trimmed}'s Care Cell`;
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
              phone: m.phone,
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

  const getProfileUUID = (userIdOrShepherdId?: string): string => {
    if (!userIdOrShepherdId) return 'a0000000-0000-0000-0000-000000000001';
    const idMap: Record<string, string> = {
      'USR-PASTOR-01': 'a0000000-0000-0000-0000-000000000001',
      'SH-01': 'a0000000-0000-0000-0000-000000000002',
      'SH-02': 'a0000000-0000-0000-0000-000000000003',
      'SH-03': 'a0000000-0000-0000-0000-000000000004',
      'SH-04': 'a0000000-0000-0000-0000-000000000005',
      'SH-05': 'a0000000-0000-0000-0000-000000000006'
    };
    return idMap[userIdOrShepherdId] || 'a0000000-0000-0000-0000-000000000001';
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

  const sendMessage = (recipientId: string, content: string) => {
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
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' — just now',
      read: false
    };
    setMessages((prev) => [...prev, newMsg]);

    if (isSupabaseConfigured) {
      (supabase.from('chat_messages') as any)
        .insert({
          id: newMsg.id,
          sender_id: getProfileUUID(currentUser.id),
          sender_name: currentUser.name,
          recipient_id: getProfileUUID(recipientId),
          recipient_name: newMsg.recipientName,
          content,
          is_read: false
        })
        .then(({ error }: any) => {
          if (error) console.error('[Supabase sendMessage] Error:', error);
        });
    }
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

  const createAnnouncement = (data: Omit<ChurchAnnouncement, 'id' | 'authorName' | 'date'>) => {
    const newAnn: ChurchAnnouncement = {
      ...data,
      id: `ANN-${Date.now()}`,
      authorName: currentUser.name,
      date: new Date().toISOString().split('T')[0]
    };
    setAnnouncements((prev) => [newAnn, ...prev]);

    if (isSupabaseConfigured) {
      (supabase.from('announcements') as any)
        .insert({
          id: newAnn.id,
          title: newAnn.title,
          content: newAnn.content,
          author_id: getProfileUUID(currentUser.id),
          author_name: currentUser.name,
          priority: newAnn.priority,
          target: newAnn.target
        })
        .then(({ error }: any) => {
          if (error) console.error('[Supabase createAnnouncement] Error:', error);
        });
    }
  };

  // 10. Church Events — all roles see all events
  const visibleEvents = churchEvents;

  const createEvent = (data: Omit<ChurchEvent, 'id' | 'createdBy' | 'createdAt'>) => {
    const newEvt: ChurchEvent = {
      ...data,
      id: `EVT-${Date.now()}`,
      createdBy: currentUser.name,
      createdAt: new Date().toISOString().split('T')[0]
    };
    setChurchEvents((prev) => [newEvt, ...prev]);

    if (isSupabaseConfigured) {
      (supabase.from('church_events') as any)
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
        })
        .then(({ error }: any) => {
          if (error) console.error('[Supabase createEvent] Error:', error);
        });
    }
  };

  // Actions
  const registerMember = (newMemData: Omit<Member, 'id' | 'registeredAt' | 'registeredBy'>) => {
    const isDuplicate = members.some(
      (m) =>
        m.phone === newMemData.phone ||
        (newMemData.email && m.email.toLowerCase() === newMemData.email.toLowerCase())
    );

    if (isDuplicate) {
      return { success: false, error: 'A member with this telephone or email already exists in the registry.' };
    }

    const newId = `CPI-M-${1035 + members.length}`;
    const newMember: Member = {
      ...newMemData,
      id: newId,
      registeredAt: new Date().toISOString().split('T')[0],
      registeredBy: currentUser.name
    };

    setMembers((prev) => [newMember, ...prev]);

    if (isSupabaseConfigured) {
      (supabase.from('members') as any).insert({
        id: newId,
        first_name: newMember.firstName,
        last_name: newMember.lastName,
        phone: newMember.phone,
        email: newMember.email || null,
        city: newMember.city || 'Central District',
        date_of_birth: newMember.dateOfBirth || null,
        status: newMember.status,
        spiritual_stage: newMember.spiritualStage,
        department: newMember.department || null,
        cell_group: newMember.cellGroup,
        current_shepherd_id: newMember.currentShepherdId || null,
        current_shepherd_name: newMember.currentShepherdName || null,
        registered_at: newMember.registeredAt,
        registered_by: newMember.registeredBy,
        general_notes: newMember.generalNotes || null
      }).then(({ error }: any) => {
        if (error) console.error('[Supabase registerMember] Error:', error);
      });
    }

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

    return { success: true };
  };

  const updateMember = (memberId: string, updates: Partial<Member>) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, ...updates } : m))
    );

    if (isSupabaseConfigured) {
      const dbPayload: any = {};
      if (updates.firstName !== undefined) dbPayload.first_name = updates.firstName;
      if (updates.lastName !== undefined) dbPayload.last_name = updates.lastName;
      if (updates.phone !== undefined) dbPayload.phone = updates.phone;
      if (updates.email !== undefined) dbPayload.email = updates.email || null;
      if (updates.city !== undefined) dbPayload.city = updates.city;
      if (updates.dateOfBirth !== undefined) dbPayload.date_of_birth = updates.dateOfBirth || null;
      if (updates.status !== undefined) dbPayload.status = updates.status;
      if (updates.spiritualStage !== undefined) dbPayload.spiritual_stage = updates.spiritualStage;
      if (updates.department !== undefined) dbPayload.department = updates.department || null;
      if (updates.cellGroup !== undefined) dbPayload.cell_group = updates.cellGroup;
      if (updates.generalNotes !== undefined) dbPayload.general_notes = updates.generalNotes || null;
      if (updates.confidentialNotes !== undefined) dbPayload.confidential_notes = updates.confidentialNotes || null;

      (supabase.from('members') as any)
        .update(dbPayload)
        .eq('id', memberId)
        .then(({ error }: any) => {
          if (error) console.error('[Supabase updateMember] Error:', error);
        });
    }
  };

  const reassignMember = (memberId: string, newShepherdId: string, reason: string) => {
    const targetShepherd = shepherds.find((s) => s.id === newShepherdId);
    if (!targetShepherd) return;

    const targetMember = members.find((m) => m.id === memberId);
    const oldShepherdId = targetMember?.currentShepherdId;

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

    // Record assignment history
    const newAssignment: ShepherdAssignment = {
      id: `ASN-${Date.now()}`,
      memberId,
      memberName: targetMember ? `${targetMember.firstName} ${targetMember.lastName}` : 'Member',
      shepherdId: targetShepherd.id,
      shepherdName: targetShepherd.name,
      cellGroup: targetShepherd.cell,
      startDate: new Date().toISOString().split('T')[0],
      status: 'Active',
      assignedBy: currentUser.name,
      reason
    };
    setAssignmentsHistory((prev) => [newAssignment, ...prev]);

    if (isSupabaseConfigured) {
      const shepherdUuid = getProfileUUID(targetShepherd.id);
      (supabase.from('members') as any)
        .update({
          current_shepherd_id: shepherdUuid,
          current_shepherd_name: targetShepherd.name,
          cell_group: targetShepherd.cell
        })
        .eq('id', memberId)
        .then(({ error }: any) => {
          if (error) console.error('[Supabase reassignMember] Error:', error);
        });

      (supabase.from('shepherd_assignments') as any)
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
          reason
        })
        .then(({ error }: any) => {
          if (error) console.error('[Supabase assignment] Error:', error);
        });
    }

    // Send automatic notification to the recipient Shepherd
    const newNotif: CMSNotification = {
      id: `NOTIF-${Date.now()}`,
      recipientId: targetShepherd.id,
      title: 'New Member Assigned to Your Cell',
      message: `${targetMember ? `${targetMember.firstName} ${targetMember.lastName}` : 'A new member'} has been assigned to your care cell (${targetShepherd.cell}) by Pastor Adams. Transfer reason: ${reason}.`,
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

  const recordSundayAttendance = (
    memberId: string,
    status: AttendanceStatus,
    date = '2026-11-08'
  ) => {
    const member = members.find((m) => m.id === memberId);
    if (!member) return;

    let targetRecordId = `ATT-${date.replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;

    setAttendanceRecords((prev) => {
      const existingIdx = prev.findIndex(
        (r) => r.memberId === memberId && r.serviceDate === date
      );

      if (existingIdx >= 0) {
        targetRecordId = prev[existingIdx].id;
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

    if (isSupabaseConfigured) {
      (supabase.from('attendance_records') as any)
        .upsert({
          id: targetRecordId,
          service_id: 'SRV-SUN-04',
          service_name: 'Sunday 1st Service — Communion',
          service_date: date,
          member_id: member.id,
          member_name: `${member.firstName} ${member.lastName}`,
          cell_group: member.cellGroup,
          shepherd_id: getProfileUUID(member.currentShepherdId),
          status,
          recorded_by: currentUser.name,
          recorded_at: new Date().toISOString(),
          consecutive_absences: status === 'Absent' ? 1 : 0
        })
        .then(({ error }: any) => {
          if (error) console.error('[Supabase recordSundayAttendance] Error:', error);
        });
    }
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
        phone: m.phone,
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

  const recordCellMeeting = (meeting: Omit<CellMeeting, 'id' | 'shepherdId' | 'shepherdName' | 'cellName'>) => {
    const newMeeting: CellMeeting = {
      ...meeting,
      id: `CELL-MTG-${Date.now()}`,
      cellName: currentUser.assignedCell || 'My Cell',
      shepherdId: currentUser.id,
      shepherdName: currentUser.name
    };

    setCellMeetings((prev) => [newMeeting, ...prev]);

    if (isSupabaseConfigured) {
      (supabase.from('cell_meetings') as any)
        .insert({
          id: newMeeting.id,
          cell_name: newMeeting.cellName,
          shepherd_id: getProfileUUID(currentUser.id),
          shepherd_name: currentUser.name,
          meeting_date: newMeeting.date,
          topic: newMeeting.topic,
          attendees_count: newMeeting.attendeesCount,
          offering_amount: newMeeting.offeringAmount,
          notes: newMeeting.notes || null
        })
        .then(({ error }: any) => {
          if (error) console.error('[Supabase recordCellMeeting] Error:', error);
        });
    }

    // Also register cell fellowship offering in finance ledger
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

      if (isSupabaseConfigured) {
        (supabase.from('finance_records') as any)
          .insert({
            id: newFinance.id,
            ref: newFinance.ref,
            transaction_date: newFinance.date,
            giver: newFinance.giver,
            category: newFinance.category,
            method: newFinance.method,
            amount: newFinance.amount,
            cell_group: newFinance.cellGroup || null,
            status: newFinance.status,
            recorded_by: newFinance.recordedBy
          })
          .then(({ error }: any) => {
            if (error) console.error('[Supabase recordFinance] Error:', error);
          });
      }
    }
  };

  const updateTaskStatus = (taskId: string, status: FollowUpStatus, note?: string) => {
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

    if (isSupabaseConfigured) {
      (supabase.from('follow_up_tasks') as any)
        .update({
          status,
          notes: note || undefined,
          completed_at: status === 'Completed' ? new Date().toISOString() : null
        })
        .eq('id', taskId)
        .then(({ error }: any) => {
          if (error) console.error('[Supabase updateTaskStatus] Error:', error);
        });
    }
  };

  const submitReport = (reportId: string, narrative: string) => {
    setShepherdReports((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? {
              ...r,
              narrative,
              status: 'Submitted',
              submittedAt: new Date().toISOString().replace('T', ' ').slice(0, 19)
            }
          : r
      )
    );
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
        reassignMember,
        shepherds,
        recordShepherdLogin,
        assignmentsHistory,
        attendanceRecords,
        visibleAttendance,
        updateAttendance,
        recordSundayAttendance,
        sundayAbsenceReports,
        visibleSundayAbsenceReports,
        redListMembers,
        criticalAbsenteeMembers,
        cellMeetings,
        visibleCellMeetings,
        recordCellMeeting,
        followUpTasks,
        visibleTasks,
        updateTaskStatus,
        visitors,
        visibleVisitors,
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
        churchEvents,
        visibleEvents,
        createEvent
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
