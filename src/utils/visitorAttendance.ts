import type { VisitorAttendanceRecord } from '../types/cms';

export function isSundayDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date && parsed.getUTCDay() === 0;
}

export function getRecentSunday(date = new Date()): string {
  const sunday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  sunday.setDate(sunday.getDate() - sunday.getDay());
  return `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`;
}

export function getConsecutiveSundayAttendance(
  records: readonly VisitorAttendanceRecord[],
  visitorId: string
): number {
  const dates = records
    .filter((record) => record.visitorId === visitorId)
    .sort((a, b) => b.attendanceDate.localeCompare(a.attendanceDate));
  if (dates.length === 0 || dates[0].status !== 'Present') return 0;

  let streak = 1;
  for (let index = 1; index < dates.length; index += 1) {
    if (dates[index].status !== 'Present') break;
    const previousDate = new Date(`${dates[index - 1].attendanceDate}T00:00:00Z`).getTime();
    const currentDate = new Date(`${dates[index].attendanceDate}T00:00:00Z`).getTime();
    if (previousDate - currentDate !== 7 * 24 * 60 * 60 * 1000) break;
    streak += 1;
  }
  return streak;
}
