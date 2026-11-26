import { formatPhone, validatePhone } from './validation.ts';

export interface PpitAttendanceEntry {
  ppit_member_id: string;
  session_date: string;
  status: 'Present' | 'Absent';
}
export interface PpitAbsenceStreak {
  count: number;
  missedDates: string[];
}

export const PPIT_MEETING_LEADER_ID = 'PPIT-001';

export function getPpitMobileError(
  phone: string,
  members: readonly { id: string; name: string; contact: string | null }[],
  editingMemberId?: string
): string | null {
  const value = phone.trim();
  if (!value) return null;
  const validationError = validatePhone(value);
  if (validationError) return validationError;

  const normalized = formatPhone(value).replace(/\D/g, '').replace(/^233/, '');
  const duplicate = members.find((member) =>
    member.id !== editingMemberId &&
    member.contact &&
    validatePhone(member.contact) === null &&
    formatPhone(member.contact).replace(/\D/g, '').replace(/^233/, '') === normalized
  );
  return duplicate ? `This mobile number already belongs to ${duplicate.name}.` : null;
}

export function getPpitRosterMembers<T extends { id: string }>(members: readonly T[]): T[] {
  return members.filter((member) => member.id !== PPIT_MEETING_LEADER_ID);
}

export function getPpitAbsenceStreaks(
  records: readonly PpitAttendanceEntry[]
): Map<string, PpitAbsenceStreak> {
  const grouped = new Map<string, PpitAttendanceEntry[]>();

  records.forEach((record) => {
    const memberRecords = grouped.get(record.ppit_member_id) || [];
    memberRecords.push(record);
    grouped.set(record.ppit_member_id, memberRecords);
  });

  return new Map(
    Array.from(grouped, ([memberId, memberRecords]) => {
      const missedDates: string[] = [];
      memberRecords
        .sort((a, b) => b.session_date.localeCompare(a.session_date))
        .some((record) => {
          if (record.status !== 'Absent') return true;
          missedDates.push(record.session_date);
          return false;
        });

      return [memberId, { count: missedDates.length, missedDates }];
    })
  );
}
