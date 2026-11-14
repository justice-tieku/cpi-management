/**
 * Church Management System — Domain Types Specification
 * Cross Passion International (CMS v1.0)
 * Note: Family management is explicitly excluded per specification.
 */

export type UserRole = 'pastor' | 'shepherd' | 'finance_officer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  assignedCell?: string;
  branch: string;
}

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

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  preferredName?: string;
  phone: string;
  email: string;
  city: string;
  dateOfBirth?: string;
  status: MemberStatus;
  spiritualStage: SpiritualStage;
  department?: string;
  cellGroup: string;
  currentShepherdId?: string;
  currentShepherdName?: string;
  registeredAt: string;
  registeredBy: string;
  generalNotes?: string;
  confidentialNotes?: string;
}

export interface ShepherdAssignment {
  id: string;
  memberId: string;
  memberName: string;
  shepherdId: string;
  shepherdName: string;
  cellGroup: string;
  startDate: string;
  endDate?: string;
  status: 'Active' | 'Ended' | 'Pending' | 'Unassigned';
  assignedBy: string;
  reason?: string;
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Excused' | 'Not Recorded';

export type SundayAbsenceCategory = 'regular' | 'red_list' | 'critical_absentee';

export interface SundayAbsenceReport {
  memberId: string;
  memberName: string;
  phone: string;
  cellGroup: string;
  shepherdName: string;
  shepherdId?: string;
  consecutiveMissedSundays: number; // 0, 1, 2, 3+
  lastAttendedSunday?: string; // Date of last Sunday attended (e.g. '2026-11-01')
  missedSundays: string[]; // List of missed Sunday dates (e.g. ['2026-11-08'])
  category: SundayAbsenceCategory; // 'regular' | 'red_list' | 'critical_absentee'
  stageLabel: string; // 'Good Standing' | 'Red List (Missed 1 Sunday)' | 'Red List (Missed 2 Sundays)' | 'Critical Absentee (3+ Sundays)'
  actionPrompt: string; // Recommended shepherd/pastoral action
}

export interface AttendanceRecord {
  id: string;
  serviceId: string;
  serviceName: string;
  serviceDate: string;
  memberId: string;
  memberName: string;
  cellGroup: string;
  shepherdId?: string;
  status: AttendanceStatus;
  recordedBy: string;
  recordedAt: string;
  consecutiveAbsences: number;
}

export interface CellMeeting {
  id: string;
  cellName: string;
  shepherdId: string;
  shepherdName: string;
  date: string;
  topic: string;
  attendeesCount: number;
  offeringAmount: number;
  notes?: string;
}

export type FollowUpStatus = 'Open' | 'In Progress' | 'Waiting' | 'Completed' | 'Cancelled';

export type FollowUpType =
  | 'Absence Follow-Up'
  | 'First-Timer Welcome'
  | 'Pastoral Visitation'
  | 'Prayer Request'
  | 'Welfare Check';

export interface FollowUpTask {
  id: string;
  memberId: string;
  memberName: string;
  shepherdId: string;
  shepherdName: string;
  taskType: FollowUpType;
  dueDate: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: FollowUpStatus;
  nextAction?: string;
  notes?: string;
  contactAttempts: number;
  completedAt?: string;
}

export type VisitorJourney =
  | 'First Visit'
  | 'Contact Attempted'
  | 'Contacted'
  | 'Invited Back'
  | 'Returned'
  | 'Joined/Registered'
  | 'Closed';

export interface VisitorRecord {
  id: string;
  name: string;
  phone: string;
  email: string;
  visitDate: string;
  serviceAttended: string;
  invitedBy?: string;
  assignedShepherdId?: string;
  assignedShepherdName?: string;
  journeyStage: VisitorJourney;
  contactAttempts: number;
  notes?: string;
}

export interface ShepherdReport {
  id: string;
  shepherdId: string;
  shepherdName: string;
  cellName: string;
  period: string;
  assignedSoulsCount: number;
  attendanceAvgRate: number;
  followUpsCompleted: number;
  overdueTasks: number;
  narrative: string;
  status: 'Draft' | 'Submitted' | 'Reviewed' | 'Approved';
  submittedAt?: string;
}

export type FinanceCategory =
  | 'Tithe'
  | 'Sunday Offering'
  | 'Cathedral Building Fund'
  | 'Missions & Welfare'
  | 'Special Seed'
  | 'Cell Fellowship Offering';

export type PaymentMethod =
  | 'Bank Transfer'
  | 'Cash / Envelope'
  | 'Mobile Money / Online'
  | 'Cheque';

export interface FinanceRecord {
  id: string;
  ref: string;
  date: string;
  giver: string;
  category: FinanceCategory;
  method: PaymentMethod;
  amount: number;
  cellGroup?: string;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Paid/Posted' | 'Reversed';
  recordedBy: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'pastor' | 'shepherd';
  recipientId: string;
  recipientName: string;
  content: string;
  timestamp: string;
  read: boolean;
}

export interface ChurchAnnouncement {
  id: string;
  title: string;
  content: string;
  authorName: string;
  date: string;
  priority: 'Normal' | 'High' | 'Urgent';
  target: 'all_shepherds' | 'church_wide';
}

export interface ChurchEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  flyerUrl: string;
  category: 'Conference' | 'Revival' | 'Cell Outreach' | 'Vigil' | 'Communion' | 'Youth' | 'Special Service';
  createdBy: string;
  createdAt: string;
}
