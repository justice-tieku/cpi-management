import React, { createContext, useContext, useState } from 'react';
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
  const [members, setMembers] = useState<Member[]>([
    {
      id: 'CPI-M-1024',
      firstName: 'David',
      lastName: 'Adebayo',
      phone: '+1 (555) 234-8901',
      email: 'd.adebayo@gmail.com',
      city: 'Central District',
      dateOfBirth: '1992-11-06',
      status: 'Active',
      spiritualStage: 'Commissioned Worker',
      department: 'Worship & Choir',
      cellGroup: 'Bethel Cell (Central)',
      currentShepherdId: 'SH-01',
      currentShepherdName: 'Elder Nathan Cole',
      registeredAt: '2025-03-12',
      registeredBy: 'Pastor Adams',
      generalNotes: 'Faithful in choir practice and Sunday early service communion.'
    },
    {
      id: 'CPI-M-1025',
      firstName: 'Sarah',
      lastName: 'Jenkins',
      phone: '+1 (555) 432-1190',
      email: 'sarah.j@outlook.com',
      city: 'South Ridge',
      dateOfBirth: '1995-04-12',
      status: 'Active',
      spiritualStage: 'Foundation Class',
      department: 'Ushering',
      cellGroup: 'Eden Cell (South)',
      currentShepherdId: 'SH-02',
      currentShepherdName: 'Deaconess Ruth Taiwo',
      registeredAt: '2025-08-19',
      registeredBy: 'Deaconess Ruth Taiwo',
      generalNotes: 'Missed consecutive services due to relocation.'
    },
    {
      id: 'CPI-M-1026',
      firstName: 'Christian',
      lastName: 'Okon',
      phone: '+1 (555) 987-6543',
      email: 'c.okon@yahoo.com',
      city: 'Metro Campus Area',
      dateOfBirth: '2001-11-15',
      status: 'Active',
      spiritualStage: 'Water Baptized',
      department: 'Media & Tech',
      cellGroup: 'Moriah Young Adults',
      currentShepherdId: 'SH-03',
      currentShepherdName: 'Bro. Matthew Kim',
      registeredAt: '2026-01-14',
      registeredBy: 'Bro. Matthew Kim',
      generalNotes: 'Active youth member in Moriah cell.'
    },
    {
      id: 'CPI-M-1031',
      firstName: 'Kimberly',
      lastName: 'Brooks',
      phone: '+1 (555) 444-9988',
      email: 'k.brooks@gmail.com',
      city: 'Metro Campus Area',
      dateOfBirth: '1998-11-08',
      status: 'Active',
      spiritualStage: 'Foundation Class',
      department: 'Youth Ushering',
      cellGroup: 'Moriah Young Adults',
      currentShepherdId: 'SH-03',
      currentShepherdName: 'Bro. Matthew Kim',
      registeredAt: '2026-02-10',
      registeredBy: 'Bro. Matthew Kim',
      generalNotes: 'Attending Friday cell fellowship regularly.'
    },
    {
      id: 'CPI-M-1032',
      firstName: 'Joshua',
      lastName: 'Acheampong',
      phone: '+1 (555) 777-1234',
      email: 'j.acheampong@yahoo.com',
      city: 'Metro Campus Area',
      dateOfBirth: '2000-11-04',
      status: 'Active',
      spiritualStage: 'Water Baptized',
      cellGroup: 'Moriah Young Adults',
      currentShepherdId: 'SH-03',
      currentShepherdName: 'Bro. Matthew Kim',
      registeredAt: '2026-03-01',
      registeredBy: 'Bro. Matthew Kim'
    },
    {
      id: 'CPI-M-1027',
      firstName: 'Elizabeth',
      lastName: 'Warren',
      phone: '+1 (555) 321-7788',
      email: 'elizabeth.w@crosspassion.org',
      city: 'East Gateway',
      dateOfBirth: '1985-07-22',
      status: 'Active',
      spiritualStage: 'Deacon / Deaconess',
      department: 'Protocol & Hospitality',
      cellGroup: 'Sharon Cell (East)',
      currentShepherdId: 'SH-04',
      currentShepherdName: 'Sister Grace Olatunji',
      registeredAt: '2024-11-05',
      registeredBy: 'Pastor Adams'
    },
    {
      id: 'CPI-M-1028',
      firstName: 'Samuel',
      lastName: 'Mensah',
      phone: '+1 (555) 876-5432',
      email: 'samuel.mensah@gmail.com',
      city: 'North Hills',
      dateOfBirth: '1996-12-01',
      status: 'Active',
      spiritualStage: 'New Convert',
      cellGroup: 'Hebron Cell (North)',
      currentShepherdId: 'SH-05',
      currentShepherdName: 'Pastor Emmanuel Vance',
      registeredAt: '2026-09-02',
      registeredBy: 'Pastor Emmanuel Vance'
    }
  ]);

  // Assignments History
  const [assignmentsHistory, setAssignmentsHistory] = useState<ShepherdAssignment[]>([
    {
      id: 'ASN-001',
      memberId: 'CPI-M-1024',
      memberName: 'David Adebayo',
      shepherdId: 'SH-01',
      shepherdName: 'Elder Nathan Cole',
      cellGroup: 'Bethel Cell (Central)',
      startDate: '2025-03-12',
      status: 'Active',
      assignedBy: 'Pastor Adams',
      reason: 'Initial enrollment'
    }
  ]);

  // Church Service Attendance Records Across Consecutive Sundays
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([
    // === SUNDAY 4: 2026-11-08 (Latest Sunday) ===
    {
      id: 'ATT-261108-01',
      serviceId: 'SRV-SUN-04',
      serviceName: 'Sunday 1st Service — Communion',
      serviceDate: '2026-11-08',
      memberId: 'CPI-M-1024',
      memberName: 'David Adebayo',
      cellGroup: 'Bethel Cell (Central)',
      shepherdId: 'SH-01',
      status: 'Present',
      recordedBy: 'Elder Nathan Cole',
      recordedAt: '2026-11-08 08:35:00',
      consecutiveAbsences: 0
    },
    {
      id: 'ATT-261108-02',
      serviceId: 'SRV-SUN-04',
      serviceName: 'Sunday 1st Service — Communion',
      serviceDate: '2026-11-08',
      memberId: 'CPI-M-1026',
      memberName: 'Christian Okon',
      cellGroup: 'Moriah Young Adults',
      shepherdId: 'SH-03',
      status: 'Present',
      recordedBy: 'Bro. Matthew Kim',
      recordedAt: '2026-11-08 08:38:00',
      consecutiveAbsences: 0
    },
    {
      id: 'ATT-261108-03',
      serviceId: 'SRV-SUN-04',
      serviceName: 'Sunday 1st Service — Communion',
      serviceDate: '2026-11-08',
      memberId: 'CPI-M-1031',
      memberName: 'Kimberly Brooks',
      cellGroup: 'Moriah Young Adults',
      shepherdId: 'SH-03',
      status: 'Present',
      recordedBy: 'Bro. Matthew Kim',
      recordedAt: '2026-11-08 08:39:00',
      consecutiveAbsences: 0
    },
    {
      id: 'ATT-261108-04',
      serviceId: 'SRV-SUN-04',
      serviceName: 'Sunday 1st Service — Communion',
      serviceDate: '2026-11-08',
      memberId: 'CPI-M-1027',
      memberName: 'Elizabeth Warren',
      cellGroup: 'Sharon Cell (East)',
      shepherdId: 'SH-04',
      status: 'Present',
      recordedBy: 'Sister Grace Olatunji',
      recordedAt: '2026-11-08 08:41:00',
      consecutiveAbsences: 0
    },
    {
      id: 'ATT-261108-05',
      serviceId: 'SRV-SUN-04',
      serviceName: 'Sunday 1st Service — Communion',
      serviceDate: '2026-11-08',
      memberId: 'CPI-M-1032',
      memberName: 'Joshua Acheampong',
      cellGroup: 'Moriah Young Adults',
      shepherdId: 'SH-03',
      status: 'Absent',
      recordedBy: 'Bro. Matthew Kim',
      recordedAt: '2026-11-08 08:42:00',
      consecutiveAbsences: 1
    },
    {
      id: 'ATT-261108-06',
      serviceId: 'SRV-SUN-04',
      serviceName: 'Sunday 1st Service — Communion',
      serviceDate: '2026-11-08',
      memberId: 'CPI-M-1025',
      memberName: 'Sarah Jenkins',
      cellGroup: 'Eden Cell (South)',
      shepherdId: 'SH-02',
      status: 'Absent',
      recordedBy: 'Deaconess Ruth Taiwo',
      recordedAt: '2026-11-08 08:40:00',
      consecutiveAbsences: 2
    },
    {
      id: 'ATT-261108-07',
      serviceId: 'SRV-SUN-04',
      serviceName: 'Sunday 1st Service — Communion',
      serviceDate: '2026-11-08',
      memberId: 'CPI-M-1028',
      memberName: 'Samuel Mensah',
      cellGroup: 'Hebron Cell (North)',
      shepherdId: 'SH-05',
      status: 'Absent',
      recordedBy: 'Pastor Emmanuel Vance',
      recordedAt: '2026-11-08 08:45:00',
      consecutiveAbsences: 3
    },

    // === SUNDAY 3: 2026-11-01 ===
    {
      id: 'ATT-261101-01',
      serviceId: 'SRV-SUN-03',
      serviceName: 'Sunday Celebration & Word Encounter',
      serviceDate: '2026-11-01',
      memberId: 'CPI-M-1024',
      memberName: 'David Adebayo',
      cellGroup: 'Bethel Cell (Central)',
      shepherdId: 'SH-01',
      status: 'Present',
      recordedBy: 'Elder Nathan Cole',
      recordedAt: '2026-11-01 08:35:00',
      consecutiveAbsences: 0
    },
    {
      id: 'ATT-261101-02',
      serviceId: 'SRV-SUN-03',
      serviceName: 'Sunday Celebration & Word Encounter',
      serviceDate: '2026-11-01',
      memberId: 'CPI-M-1026',
      memberName: 'Christian Okon',
      cellGroup: 'Moriah Young Adults',
      shepherdId: 'SH-03',
      status: 'Present',
      recordedBy: 'Bro. Matthew Kim',
      recordedAt: '2026-11-01 08:38:00',
      consecutiveAbsences: 0
    },
    {
      id: 'ATT-261101-03',
      serviceId: 'SRV-SUN-03',
      serviceName: 'Sunday Celebration & Word Encounter',
      serviceDate: '2026-11-01',
      memberId: 'CPI-M-1031',
      memberName: 'Kimberly Brooks',
      cellGroup: 'Moriah Young Adults',
      shepherdId: 'SH-03',
      status: 'Present',
      recordedBy: 'Bro. Matthew Kim',
      recordedAt: '2026-11-01 08:39:00',
      consecutiveAbsences: 0
    },
    {
      id: 'ATT-261101-04',
      serviceId: 'SRV-SUN-03',
      serviceName: 'Sunday Celebration & Word Encounter',
      serviceDate: '2026-11-01',
      memberId: 'CPI-M-1027',
      memberName: 'Elizabeth Warren',
      cellGroup: 'Sharon Cell (East)',
      shepherdId: 'SH-04',
      status: 'Present',
      recordedBy: 'Sister Grace Olatunji',
      recordedAt: '2026-11-01 08:41:00',
      consecutiveAbsences: 0
    },
    {
      id: 'ATT-261101-05',
      serviceId: 'SRV-SUN-03',
      serviceName: 'Sunday Celebration & Word Encounter',
      serviceDate: '2026-11-01',
      memberId: 'CPI-M-1032',
      memberName: 'Joshua Acheampong',
      cellGroup: 'Moriah Young Adults',
      shepherdId: 'SH-03',
      status: 'Present',
      recordedBy: 'Bro. Matthew Kim',
      recordedAt: '2026-11-01 08:42:00',
      consecutiveAbsences: 0
    },
    {
      id: 'ATT-261101-06',
      serviceId: 'SRV-SUN-03',
      serviceName: 'Sunday Celebration & Word Encounter',
      serviceDate: '2026-11-01',
      memberId: 'CPI-M-1025',
      memberName: 'Sarah Jenkins',
      cellGroup: 'Eden Cell (South)',
      shepherdId: 'SH-02',
      status: 'Absent',
      recordedBy: 'Deaconess Ruth Taiwo',
      recordedAt: '2026-11-01 08:40:00',
      consecutiveAbsences: 1
    },
    {
      id: 'ATT-261101-07',
      serviceId: 'SRV-SUN-03',
      serviceName: 'Sunday Celebration & Word Encounter',
      serviceDate: '2026-11-01',
      memberId: 'CPI-M-1028',
      memberName: 'Samuel Mensah',
      cellGroup: 'Hebron Cell (North)',
      shepherdId: 'SH-05',
      status: 'Absent',
      recordedBy: 'Pastor Emmanuel Vance',
      recordedAt: '2026-11-01 08:45:00',
      consecutiveAbsences: 2
    },

    // === SUNDAY 2: 2026-10-25 ===
    {
      id: 'ATT-261025-01',
      serviceId: 'SRV-SUN-02',
      serviceName: 'Sunday Anointing & Breakthrough Service',
      serviceDate: '2026-10-25',
      memberId: 'CPI-M-1024',
      memberName: 'David Adebayo',
      cellGroup: 'Bethel Cell (Central)',
      shepherdId: 'SH-01',
      status: 'Present',
      recordedBy: 'Elder Nathan Cole',
      recordedAt: '2026-10-25 08:35:00',
      consecutiveAbsences: 0
    },
    {
      id: 'ATT-261025-02',
      serviceId: 'SRV-SUN-02',
      serviceName: 'Sunday Anointing & Breakthrough Service',
      serviceDate: '2026-10-25',
      memberId: 'CPI-M-1026',
      memberName: 'Christian Okon',
      cellGroup: 'Moriah Young Adults',
      shepherdId: 'SH-03',
      status: 'Present',
      recordedBy: 'Bro. Matthew Kim',
      recordedAt: '2026-10-25 08:38:00',
      consecutiveAbsences: 0
    },
    {
      id: 'ATT-261025-03',
      serviceId: 'SRV-SUN-02',
      serviceName: 'Sunday Anointing & Breakthrough Service',
      serviceDate: '2026-10-25',
      memberId: 'CPI-M-1031',
      memberName: 'Kimberly Brooks',
      cellGroup: 'Moriah Young Adults',
      shepherdId: 'SH-03',
      status: 'Present',
      recordedBy: 'Bro. Matthew Kim',
      recordedAt: '2026-10-25 08:39:00',
      consecutiveAbsences: 0
    },
    {
      id: 'ATT-261025-04',
      serviceId: 'SRV-SUN-02',
      serviceName: 'Sunday Anointing & Breakthrough Service',
      serviceDate: '2026-10-25',
      memberId: 'CPI-M-1027',
      memberName: 'Elizabeth Warren',
      cellGroup: 'Sharon Cell (East)',
      shepherdId: 'SH-04',
      status: 'Present',
      recordedBy: 'Sister Grace Olatunji',
      recordedAt: '2026-10-25 08:41:00',
      consecutiveAbsences: 0
    },
    {
      id: 'ATT-261025-05',
      serviceId: 'SRV-SUN-02',
      serviceName: 'Sunday Anointing & Breakthrough Service',
      serviceDate: '2026-10-25',
      memberId: 'CPI-M-1032',
      memberName: 'Joshua Acheampong',
      cellGroup: 'Moriah Young Adults',
      shepherdId: 'SH-03',
      status: 'Present',
      recordedBy: 'Bro. Matthew Kim',
      recordedAt: '2026-10-25 08:42:00',
      consecutiveAbsences: 0
    },
    {
      id: 'ATT-261025-06',
      serviceId: 'SRV-SUN-02',
      serviceName: 'Sunday Anointing & Breakthrough Service',
      serviceDate: '2026-10-25',
      memberId: 'CPI-M-1025',
      memberName: 'Sarah Jenkins',
      cellGroup: 'Eden Cell (South)',
      shepherdId: 'SH-02',
      status: 'Present',
      recordedBy: 'Deaconess Ruth Taiwo',
      recordedAt: '2026-10-25 08:40:00',
      consecutiveAbsences: 0
    },
    {
      id: 'ATT-261025-07',
      serviceId: 'SRV-SUN-02',
      serviceName: 'Sunday Anointing & Breakthrough Service',
      serviceDate: '2026-10-25',
      memberId: 'CPI-M-1028',
      memberName: 'Samuel Mensah',
      cellGroup: 'Hebron Cell (North)',
      shepherdId: 'SH-05',
      status: 'Absent',
      recordedBy: 'Pastor Emmanuel Vance',
      recordedAt: '2026-10-25 08:45:00',
      consecutiveAbsences: 1
    },

    // === SUNDAY 1: 2026-10-18 ===
    {
      id: 'ATT-261018-01',
      serviceId: 'SRV-SUN-01',
      serviceName: 'Sunday Covenant of Increase Service',
      serviceDate: '2026-10-18',
      memberId: 'CPI-M-1024',
      memberName: 'David Adebayo',
      cellGroup: 'Bethel Cell (Central)',
      shepherdId: 'SH-01',
      status: 'Present',
      recordedBy: 'Elder Nathan Cole',
      recordedAt: '2026-10-18 08:35:00',
      consecutiveAbsences: 0
    },
    {
      id: 'ATT-261018-02',
      serviceId: 'SRV-SUN-01',
      serviceName: 'Sunday Covenant of Increase Service',
      serviceDate: '2026-10-18',
      memberId: 'CPI-M-1026',
      memberName: 'Christian Okon',
      cellGroup: 'Moriah Young Adults',
      shepherdId: 'SH-03',
      status: 'Present',
      recordedBy: 'Bro. Matthew Kim',
      recordedAt: '2026-10-18 08:38:00',
      consecutiveAbsences: 0
    },
    {
      id: 'ATT-261018-03',
      serviceId: 'SRV-SUN-01',
      serviceName: 'Sunday Covenant of Increase Service',
      serviceDate: '2026-10-18',
      memberId: 'CPI-M-1031',
      memberName: 'Kimberly Brooks',
      cellGroup: 'Moriah Young Adults',
      shepherdId: 'SH-03',
      status: 'Present',
      recordedBy: 'Bro. Matthew Kim',
      recordedAt: '2026-10-18 08:39:00',
      consecutiveAbsences: 0
    },
    {
      id: 'ATT-261018-04',
      serviceId: 'SRV-SUN-01',
      serviceName: 'Sunday Covenant of Increase Service',
      serviceDate: '2026-10-18',
      memberId: 'CPI-M-1027',
      memberName: 'Elizabeth Warren',
      cellGroup: 'Sharon Cell (East)',
      shepherdId: 'SH-04',
      status: 'Present',
      recordedBy: 'Sister Grace Olatunji',
      recordedAt: '2026-10-18 08:41:00',
      consecutiveAbsences: 0
    },
    {
      id: 'ATT-261018-05',
      serviceId: 'SRV-SUN-01',
      serviceName: 'Sunday Covenant of Increase Service',
      serviceDate: '2026-10-18',
      memberId: 'CPI-M-1032',
      memberName: 'Joshua Acheampong',
      cellGroup: 'Moriah Young Adults',
      shepherdId: 'SH-03',
      status: 'Present',
      recordedBy: 'Bro. Matthew Kim',
      recordedAt: '2026-10-18 08:42:00',
      consecutiveAbsences: 0
    },
    {
      id: 'ATT-261018-06',
      serviceId: 'SRV-SUN-01',
      serviceName: 'Sunday Covenant of Increase Service',
      serviceDate: '2026-10-18',
      memberId: 'CPI-M-1025',
      memberName: 'Sarah Jenkins',
      cellGroup: 'Eden Cell (South)',
      shepherdId: 'SH-02',
      status: 'Present',
      recordedBy: 'Deaconess Ruth Taiwo',
      recordedAt: '2026-10-18 08:40:00',
      consecutiveAbsences: 0
    },
    {
      id: 'ATT-261018-07',
      serviceId: 'SRV-SUN-01',
      serviceName: 'Sunday Covenant of Increase Service',
      serviceDate: '2026-10-18',
      memberId: 'CPI-M-1028',
      memberName: 'Samuel Mensah',
      cellGroup: 'Hebron Cell (North)',
      shepherdId: 'SH-05',
      status: 'Present',
      recordedBy: 'Pastor Emmanuel Vance',
      recordedAt: '2026-10-18 08:45:00',
      consecutiveAbsences: 0
    }
  ]);

  // Cell Meetings & Cell Fellowship Offerings
  const [cellMeetings, setCellMeetings] = useState<CellMeeting[]>([
    {
      id: 'CELL-MTG-01',
      cellName: 'Moriah Young Adults',
      shepherdId: 'SH-03',
      shepherdName: 'Bro. Matthew Kim',
      date: '2026-11-03',
      topic: 'Walking in Spiritual Authority (Romans 8)',
      attendeesCount: 18,
      offeringAmount: 185.0,
      notes: 'Deep prayer session. 2 members shared breakthrough testimonies.'
    },
    {
      id: 'CELL-MTG-02',
      cellName: 'Moriah Young Adults',
      shepherdId: 'SH-03',
      shepherdName: 'Bro. Matthew Kim',
      date: '2026-10-27',
      topic: 'The Power of Consistency in Prayer',
      attendeesCount: 20,
      offeringAmount: 210.0,
      notes: 'Welcomed 1 new convert. Cell fellowship offering counted and remitted.'
    },
    {
      id: 'CELL-MTG-03',
      cellName: 'Bethel Cell (Central)',
      shepherdId: 'SH-01',
      shepherdName: 'Elder Nathan Cole',
      date: '2026-11-02',
      topic: 'Faith That Overcomes the World',
      attendeesCount: 31,
      offeringAmount: 420.0,
      notes: 'Central cell fellowship hosted at Cathedral Annex.'
    }
  ]);

  // Follow-Up Tasks
  const [followUpTasks, setFollowUpTasks] = useState<FollowUpTask[]>([
    {
      id: 'TSK-101',
      memberId: 'CPI-M-1025',
      memberName: 'Sarah Jenkins',
      shepherdId: 'SH-02',
      shepherdName: 'Deaconess Ruth Taiwo',
      taskType: 'Absence Follow-Up',
      dueDate: 'Tomorrow, 4:00 PM',
      priority: 'High',
      status: 'Open',
      nextAction: 'Phone call & prayer check',
      notes: 'Consecutive absence alert.',
      contactAttempts: 1
    },
    {
      id: 'TSK-102',
      memberId: 'CPI-M-1032',
      memberName: 'Joshua Acheampong',
      shepherdId: 'SH-03',
      shepherdName: 'Bro. Matthew Kim',
      taskType: 'Absence Follow-Up',
      dueDate: 'Today, 6:00 PM',
      priority: 'Medium',
      status: 'Open',
      nextAction: 'Check in on exam schedule and absence',
      notes: 'Missed Sunday 1st service. Call before Friday cell meeting.',
      contactAttempts: 0
    }
  ]);

  // Visitors
  const [visitors] = useState<VisitorRecord[]>([
    {
      id: 'VIS-901',
      name: 'Grace Ampofo',
      phone: '+1 (555) 777-8899',
      email: 'grace.ampofo@gmail.com',
      visitDate: '2026-11-05',
      serviceAttended: '2nd Service — Celebration',
      assignedShepherdId: 'SH-03',
      assignedShepherdName: 'Bro. Matthew Kim',
      journeyStage: 'Contact Attempted',
      contactAttempts: 1,
      notes: 'Lives in Metro area, invited to Moriah cell fellowship.'
    },
    {
      id: 'VIS-902',
      name: 'Michael Boateng',
      phone: '+1 (555) 333-4455',
      email: 'm.boateng@outlook.com',
      visitDate: '2026-10-29',
      serviceAttended: '1st Service — Communion',
      assignedShepherdId: 'SH-01',
      assignedShepherdName: 'Elder Nathan Cole',
      journeyStage: 'Joined/Registered',
      contactAttempts: 3
    }
  ]);

  // Reports
  const [shepherdReports, setShepherdReports] = useState<ShepherdReport[]>([
    {
      id: 'RPT-OCT-01',
      shepherdId: 'SH-03',
      shepherdName: 'Bro. Matthew Kim',
      cellName: 'Moriah Young Adults',
      period: 'October 2026',
      assignedSoulsCount: 24,
      attendanceAvgRate: 88,
      followUpsCompleted: 12,
      overdueTasks: 0,
      narrative: 'Moriah cell is growing steadily. 4 cell meetings held with consistent offering collections.',
      status: 'Submitted',
      submittedAt: '2026-11-01 19:40:00'
    },
    {
      id: 'RPT-OCT-02',
      shepherdId: 'SH-01',
      shepherdName: 'Elder Nathan Cole',
      cellName: 'Bethel Cell (Central)',
      period: 'October 2026',
      assignedSoulsCount: 35,
      attendanceAvgRate: 94,
      followUpsCompleted: 14,
      overdueTasks: 0,
      narrative: 'Strong spiritual revival in the cell.',
      status: 'Approved',
      submittedAt: '2026-11-01 10:15:00'
    }
  ]);

  // Finance Records
  const [financeRecords, setFinanceRecords] = useState<FinanceRecord[]>([
    {
      id: 'FIN-101',
      ref: 'TXN-9021',
      date: '2026-11-05',
      giver: 'Bro. David Adebayo',
      category: 'Tithe',
      method: 'Bank Transfer',
      amount: 850.0,
      cellGroup: 'Bethel Cell (Central)',
      status: 'Approved',
      recordedBy: 'Finance Secretariat'
    },
    {
      id: 'FIN-102',
      ref: 'TXN-9022',
      date: '2026-11-05',
      giver: 'Sunday 1st Service Collection',
      category: 'Sunday Offering',
      method: 'Cash / Envelope',
      amount: 3420.0,
      status: 'Paid/Posted',
      recordedBy: 'Chief Usher'
    },
    {
      id: 'FIN-103',
      ref: 'TXN-9023',
      date: '2026-11-03',
      giver: 'Moriah Cell Fellowship Offering',
      category: 'Cell Fellowship Offering',
      method: 'Cash / Envelope',
      amount: 185.0,
      cellGroup: 'Moriah Young Adults',
      status: 'Approved',
      recordedBy: 'Bro. Matthew Kim'
    },
    {
      id: 'FIN-104',
      ref: 'TXN-9024',
      date: '2026-10-27',
      giver: 'Moriah Cell Fellowship Offering',
      category: 'Cell Fellowship Offering',
      method: 'Cash / Envelope',
      amount: 210.0,
      cellGroup: 'Moriah Young Adults',
      status: 'Paid/Posted',
      recordedBy: 'Bro. Matthew Kim'
    }
  ]);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    {
      id: 'LOG-01',
      timestamp: '2026-11-05 08:38:00',
      actorName: 'Bro. Matthew Kim',
      actorRole: 'Shepherd',
      action: 'RECORD_ATTENDANCE',
      entityType: 'AttendanceRecord',
      entityId: 'CPI-M-1026',
      details: 'Recorded attendance for Christian Okon (Moriah Cell)'
    }
  ]);

  // Notifications
  const [notifications, setNotifications] = useState<CMSNotification[]>([
    {
      id: 'NOTIF-1',
      recipientId: 'SH-03',
      title: 'Welcome to Shepherd Console',
      message: 'Moriah Young Adults cell fellowship console is active. All activities collate to Pastor Adams.',
      timestamp: 'Today',
      read: false,
      type: 'general'
    }
  ]);

  // Messages Store
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'MSG-001',
      senderId: 'SH-03',
      senderName: 'Bro. Matthew Kim',
      senderRole: 'shepherd',
      recipientId: 'USR-PASTOR-01',
      recipientName: 'Pastor Adams',
      content: 'Good morning Pastor Adams. Moriah cell fellowship went well on Friday. 18 members in attendance and 2 new converts welcomed.',
      timestamp: 'Yesterday at 9:15 AM',
      read: true
    },
    {
      id: 'MSG-002',
      senderId: 'USR-PASTOR-01',
      senderName: 'Pastor Adams',
      senderRole: 'pastor',
      recipientId: 'SH-03',
      recipientName: 'Bro. Matthew Kim',
      content: 'Hallelujah Bro. Matthew! Great job leading the youth cell. Please follow up closely with Sister Kimberly Brooks for Sunday communion.',
      timestamp: 'Yesterday at 10:30 AM',
      read: true
    },
    {
      id: 'MSG-003',
      senderId: 'SH-02',
      senderName: 'Deaconess Ruth Taiwo',
      senderRole: 'shepherd',
      recipientId: 'USR-PASTOR-01',
      recipientName: 'Pastor Adams',
      content: 'Pastor Adams, Sister Sarah Jenkins in Eden cell had family relocation challenges. We visited her home and prayed with her family.',
      timestamp: 'Today at 7:45 AM',
      read: false
    }
  ]);

  // Announcements Store
  const [announcements, setAnnouncements] = useState<ChurchAnnouncement[]>([
    {
      id: 'ANN-001',
      title: 'Church-Wide 3 Days Fasting & Prophetic Encounters',
      content: 'Beloved Shepherds and Ministers, our corporate monthly 3-day consecration begins this Wednesday. All cell fellowships should align their prayer meetings with this fasting direction. Break daily at 6:00 PM with holy communion.',
      authorName: 'Pastor Adams',
      date: '2026-11-04',
      priority: 'Urgent',
      target: 'all_shepherds'
    },
    {
      id: 'ANN-002',
      title: 'Mandatory Quarterly Shepherd & Ministerial Review',
      content: 'All appointed cell shepherds and assistant leaders are requested to assemble at the Cathedral Conference Annex this Saturday at 9:00 AM. We will review cell attendance reports and kingdom allocations.',
      authorName: 'Pastor Adams',
      date: '2026-11-03',
      priority: 'High',
      target: 'all_shepherds'
    },
    {
      id: 'ANN-003',
      title: 'Water Baptism & Believers Foundation Class Induction',
      content: 'Shepherds should submit the names of all new converts from their cell ready for water baptism by Friday noon.',
      authorName: 'Pastor Adams',
      date: '2026-11-01',
      priority: 'Normal',
      target: 'church_wide'
    }
  ]);

  // Church Events Store (with flyer URLs)
  const [churchEvents, setChurchEvents] = useState<ChurchEvent[]>([
    {
      id: 'EVT-001',
      title: 'Annual Kingdom Harvest Convention 2026',
      date: '2026-11-20',
      time: '6:00 PM - 9:30 PM (Daily)',
      location: 'Central Cathedral — Main Sanctuary',
      description: 'A 3-day sacred gathering of revival, apostolic doctrine, supernatural healings, and ministerial impartation. Every care cell is mobilizing their district for the great harvest.',
      flyerUrl: 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=1200&q=80',
      category: 'Conference',
      createdBy: 'Pastor Adams',
      createdAt: '2026-11-01'
    },
    {
      id: 'EVT-002',
      title: 'All-Night Prophetic & Miracle Communion Vigil',
      date: '2026-11-27',
      time: '10:00 PM - 5:00 AM',
      location: 'Cathedral Dome & Global Live Stream',
      description: 'Overnight breakthrough night of warfare prayers, communion of fire, and prophetic decree. All cell shepherds are expected with their flock delegates.',
      flyerUrl: 'https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&w=1200&q=80',
      category: 'Vigil',
      createdBy: 'Pastor Adams',
      createdAt: '2026-11-02'
    },
    {
      id: 'EVT-003',
      title: 'District Cell Street Evangelism & Soul Outreach',
      date: '2026-12-05',
      time: '8:00 AM - 12:00 PM',
      location: 'Designated Metro Cell Zones & Neighborhoods',
      description: 'Simultaneous soul-winning drive across all 5 cell territories. Materials, tracts, and follow-up cards provided by pastoral secretariat.',
      flyerUrl: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1200&q=80',
      category: 'Cell Outreach',
      createdBy: 'Pastor Adams',
      createdAt: '2026-11-03'
    }
  ]);

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

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
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
  };

  const markMessageRead = (messageId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, read: true } : m))
    );
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
  };

  const recordSundayAttendance = (
    memberId: string,
    status: AttendanceStatus,
    date = '2026-11-08'
  ) => {
    const member = members.find((m) => m.id === memberId);
    if (!member) return;

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
        id: `ATT-${date.replace(/-/g, '')}-${Date.now().toString().slice(-4)}`,
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

    // Also register cell fellowship offering in finance ledger
    if (meeting.offeringAmount > 0) {
      const newFinance: FinanceRecord = {
        id: `FIN-${Date.now()}`,
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
