import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CalendarCheck,
  Check,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Users,
  X
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../../backend/client';
import { Database } from '../../../backend/types';
import { useCMS } from '../../context/CMSContext';
import { isFutureDate } from '../../utils/date';
import { getPpitAbsenceStreaks } from '../../utils/ppit';
import { mapError } from '../../utils/errors';

type PpitMember = Database['public']['Tables']['ppit_members']['Row'];
type PpitAttendance = Database['public']['Tables']['ppit_attendance_records']['Row'];
type PpitTab = 'roster' | 'attendance' | 'red-list';
type AttendanceMark = 'Present' | 'Absent';

const today = () => new Date().toISOString().slice(0, 10);

export const PPITManagement: React.FC = () => {
  const { currentUser } = useCMS();
  const isPastor = currentUser.role === 'pastor';
  const canManage = currentUser.role === 'shepherd' && currentUser.isPpitShepherd === true;
  const canView = isPastor || canManage;
  const [members, setMembers] = useState<PpitMember[]>([]);
  const [attendance, setAttendance] = useState<PpitAttendance[]>([]);
  const [activeTab, setActiveTab] = useState<PpitTab>('roster');
  const [sessionDate, setSessionDate] = useState(today);
  const [draftMarks, setDraftMarks] = useState<Record<string, AttendanceMark>>({});
  const [hasUnsavedAttendance, setHasUnsavedAttendance] = useState(false);
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<{ message: string; isError: boolean } | null>(null);
  const [editingMember, setEditingMember] = useState<PpitMember | null>(null);
  const [isCreatingMember, setIsCreatingMember] = useState(false);
  const [memberForm, setMemberForm] = useState({ name: '', branch: '', contact: '' });
  const [isSavingMember, setIsSavingMember] = useState(false);
  const attendanceDirtyRef = useRef(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadData = useCallback(async (force = false, showLoading = true) => {
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured. Configure the project URL and public anon key first.');
      if (showLoading) setIsLoading(false);
      return false;
    }

    if (showLoading) setIsLoading(true);
    setError('');
    try {
      const [membersResult, attendanceResult] = await Promise.all([
        supabase.from('ppit_members').select('*').order('branch').order('name'),
        supabase.from('ppit_attendance_records').select('*').order('session_date', { ascending: false })
      ]);
      if (membersResult.error) throw membersResult.error;
      if (attendanceResult.error) throw attendanceResult.error;
      setMembers(membersResult.data || []);
      if (force || !attendanceDirtyRef.current) setAttendance(attendanceResult.data || []);
      return true;
    } catch (loadError) {
      setError(mapError(loadError, 'load').message);
      return false;
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  const queueRealtimeRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      void loadData(false, false);
    }, 150);
  }, [loadData]);

  useEffect(() => {
    if (!canView) return;
    void loadData(true);
    if (!isSupabaseConfigured) return;
    const channel = supabase
      .channel(`ppit-records-${currentUser.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ppit_members' }, queueRealtimeRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ppit_attendance_records' }, queueRealtimeRefresh)
      .subscribe();

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      void supabase.removeChannel(channel);
    };
  }, [canView, currentUser.id, loadData, queueRealtimeRefresh]);

  useEffect(() => {
    const currentMarks = Object.fromEntries(
      attendance
        .filter((record) => record.session_date === sessionDate)
        .map((record) => [record.ppit_member_id, record.status as AttendanceMark])
    );
    setDraftMarks(currentMarks);
    setHasUnsavedAttendance(false);
  }, [attendance, sessionDate]);
  useEffect(() => {
    attendanceDirtyRef.current = hasUnsavedAttendance;
  }, [hasUnsavedAttendance]);
  useEffect(() => {
    if (!hasUnsavedAttendance) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [hasUnsavedAttendance]);

  const branches = useMemo(
    () => Array.from(new Set(members.map((member) => member.branch))).sort(),
    [members]
  );
  const filteredMembers = useMemo(
    () => members.filter((member) => {
      const matchesSearch = `${member.name} ${member.contact || ''}`.toLowerCase().includes(search.toLowerCase());
      return matchesSearch && (branchFilter === 'all' || member.branch === branchFilter);
    }),
    [branchFilter, members, search]
  );
  const absenceStreaks = useMemo(() => getPpitAbsenceStreaks(
    attendance.filter((record): record is PpitAttendance & { status: AttendanceMark } =>
      record.status === 'Present' || record.status === 'Absent'
    )
  ), [attendance]);
  const redList = members
    .map((member) => ({ member, streak: absenceStreaks.get(member.id) }))
    .filter((item) => item.streak && item.streak.count > 0 && item.streak.count < 3);
  const criticalAbsentees = members
    .map((member) => ({ member, streak: absenceStreaks.get(member.id) }))
    .filter((item) => item.streak && item.streak.count >= 3);

  const openNewMember = () => {
    setEditingMember(null);
    setMemberForm({ name: '', branch: '', contact: '' });
    setIsCreatingMember(true);
  };

  const openEditMember = (member: PpitMember) => {
    setEditingMember(member);
    setMemberForm({ name: member.name, branch: member.branch, contact: member.contact || '' });
    setIsCreatingMember(true);
  };

  const handleSaveMember = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = memberForm.name.trim();
    const branch = memberForm.branch.trim();
    if (name.length < 2 || branch.length < 2) {
      setNotice({ message: 'Enter the member name and branch.', isError: true });
      return;
    }

    setIsSavingMember(true);
    setNotice(null);
    try {
      const payload = {
        name,
        branch,
        contact: memberForm.contact.trim() || null,
        updated_at: new Date().toISOString()
      };
      const result = editingMember
        ? await supabase.from('ppit_members').update(payload).eq('id', editingMember.id)
        : await supabase.from('ppit_members').insert({
            id: `PPIT-${crypto.randomUUID()}`,
            ...payload
          });
      if (result.error) throw result.error;

      setIsCreatingMember(false);
      const refreshed = await loadData(true);
      setNotice({
        message: refreshed
          ? (editingMember ? 'PPIT member updated.' : 'PPIT member added.')
          : 'Saved, but the roster could not be refreshed. Use Refresh to reload it.',
        isError: !refreshed
      });
    } catch (saveError) {
      setNotice({ message: mapError(saveError).message, isError: true });
    } finally {
      setIsSavingMember(false);
    }
  };

  const markAll = (status: AttendanceMark) => {
    setDraftMarks(Object.fromEntries(members.map((member) => [member.id, status])));
    setHasUnsavedAttendance(true);
  };

  const handleSessionDateChange = (nextDate: string) => {
    if (hasUnsavedAttendance && !window.confirm('Discard unsaved attendance changes?')) return;
    setSessionDate(nextDate);
  };

  const handleSaveAttendance = async () => {
    if (!canManage) return;
    if (members.length === 0) {
      setNotice({ message: 'The PPIT roster is empty.', isError: true });
      return;
    }
    if (isFutureDate(sessionDate)) {
      setNotice({ message: 'Attendance date cannot be in the future.', isError: true });
      return;
    }
    if (members.some((member) => !draftMarks[member.id])) {
      setNotice({ message: 'Mark every member present or absent before saving.', isError: true });
      return;
    }

    setIsSaving(true);
    setNotice(null);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) {
        setNotice({ message: 'Your session has expired. Please sign in again.', isError: true });
        return;
      }

      const records = members.map((member) => ({
        ppit_member_id: member.id,
        session_date: sessionDate,
        status: draftMarks[member.id],
        recorded_by: authData.user.id,
        recorded_at: new Date().toISOString()
      }));
      const { error: saveError } = await supabase
        .from('ppit_attendance_records')
        .upsert(records, { onConflict: 'ppit_member_id,session_date' });
      if (saveError) throw saveError;

      const presentCount = records.filter((record) => record.status === 'Present').length;
      const { error: summaryError } = await supabase.from('ppit_summary').upsert({
        session_date: sessionDate,
        present_count: presentCount,
        absent_count: records.length - presentCount,
        total_count: records.length,
        recorded_by: authData.user.id,
        updated_at: new Date().toISOString()
      }, { onConflict: 'session_date' });

      setHasUnsavedAttendance(false);
      const refreshed = await loadData(true);
      if (summaryError) {
        setNotice({
          message: `Attendance saved, but the dashboard summary did not update: ${mapError(summaryError).message}`,
          isError: true
        });
      } else {
        setNotice({
          message: refreshed
            ? 'PPIT attendance saved.'
            : 'Attendance saved, but the roster could not be refreshed. Use Refresh to reload it.',
          isError: !refreshed
        });
      }
    } catch (saveError) {
      setNotice({ message: mapError(saveError).message, isError: true });
    } finally {
      setIsSaving(false);
    }
  };

  if (!canView) {
    return (
      <div className="p-6 text-sm text-[#ff6b8b]" role="alert">
        PPIT records are available only to the Pastor and designated PPIT shepherd.
      </div>
    );
  }

  const tabButton = (tab: PpitTab, label: string, icon: React.ElementType, count?: number) => {
    const Icon = icon;
    return (
      <button
        key={tab}
        type="button"
        onClick={() => setActiveTab(tab)}
        className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-colors ${
          activeTab === tab ? 'bg-[#00f0ff] text-[#070c1e]' : 'bg-[#111d44] text-[#a6c4eb] hover:text-white'
        }`}
      >
        <Icon className="h-4 w-4" />
        {label}
        {count !== undefined && <span className="rounded-full bg-black/10 px-2 py-0.5">{count}</span>}
      </button>
    );
  };

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">PPIT Full Membership</h1>
          <p className="mt-1 text-xs text-[#a6c4eb]">
            {isPastor ? 'Pastor view — read-only roster and attendance.' : 'Manage the PPIT roster and record attendance.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canManage && activeTab === 'roster' && (
            <button type="button" onClick={openNewMember} className="flex items-center gap-2 rounded-lg bg-[#00f0ff] px-3 py-2 text-xs font-bold text-[#070c1e]">
              <Plus className="h-4 w-4" /> Add member
            </button>
          )}
          <button type="button" onClick={() => void loadData()} disabled={isLoading} className="flex items-center gap-2 rounded-lg bg-[#111d44] px-3 py-2 text-xs font-semibold text-[#a6c4eb] disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {isPastor && (
        <div className="flex items-start gap-2 rounded-lg border border-[#00f0ff]/20 bg-[#111d44] p-3 text-xs text-[#a6c4eb]">
          <ShieldCheck className="h-4 w-4 shrink-0 text-[#00f0ff]" />
          You can view PPIT records. Only the designated PPIT shepherd can edit the roster or record attendance.
        </div>
      )}
      {error && <div className="rounded-lg border border-[#ff6b8b]/30 bg-[#38141e] p-3 text-sm text-[#ff9caf]" role="alert">{error}</div>}
      {notice && (
        <div className={`rounded-lg p-3 text-sm ${notice.isError ? 'bg-[#38141e] text-[#ff9caf]' : 'bg-[#0f382a] text-[#8fffc1]'}`} role={notice.isError ? 'alert' : 'status'}>
          {notice.message}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/5 bg-[#111d44] p-4">
          <div className="flex items-center gap-2 text-xs text-[#a6c4eb]"><Users className="h-4 w-4 text-[#00f0ff]" /> Roster</div>
          <p className="mt-2 text-2xl font-bold text-white">{members.length}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-[#111d44] p-4">
          <div className="flex items-center gap-2 text-xs text-[#a6c4eb]"><AlertTriangle className="h-4 w-4 text-amber-400" /> Red List</div>
          <p className="mt-2 text-2xl font-bold text-amber-300">{redList.length}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-[#111d44] p-4">
          <div className="flex items-center gap-2 text-xs text-[#a6c4eb]"><AlertTriangle className="h-4 w-4 text-[#ff6b8b]" /> Critical (3+ missed)</div>
          <p className="mt-2 text-2xl font-bold text-[#ff8fa5]">{criticalAbsentees.length}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabButton('roster', 'Roster', Users, members.length)}
        {tabButton('attendance', 'Attendance', CalendarCheck)}
        {tabButton('red-list', 'Red List', AlertTriangle, redList.length + criticalAbsentees.length)}
      </div>

      {isLoading ? (
        <div className="rounded-xl bg-[#111d44] p-8 text-center text-sm text-[#a6c4eb]">Loading PPIT records…</div>
      ) : activeTab === 'roster' ? (
        <section className="space-y-3 rounded-xl border border-white/5 bg-[#0c152e] p-4 sm:p-5">
          <div className="flex flex-wrap gap-3">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name or contact"
              aria-label="Search PPIT roster"
              className="min-w-[220px] flex-1 rounded-lg bg-[#070c1e] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-[#00f0ff]"
            />
            <select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)} aria-label="Filter by branch" className="rounded-lg bg-[#070c1e] px-3 py-2 text-sm text-white">
              <option value="all">All branches</option>
              {branches.map((branch) => <option key={branch}>{branch}</option>)}
            </select>
          </div>
          {filteredMembers.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#a6c4eb]">{members.length ? 'No matching PPIT members.' : 'No PPIT members loaded. Run the PPIT migration in Supabase.'}</p>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{member.name}</p>
                    <p className="mt-1 text-xs text-[#a6c4eb]">{member.branch} <span className="px-1">·</span> {member.contact || 'Contact not added'}</p>
                  </div>
                  {canManage && (
                    <button type="button" onClick={() => openEditMember(member)} aria-label={`Edit ${member.name}`} className="rounded-lg bg-[#16285a] p-2 text-[#00f0ff] hover:bg-[#203a7a]">
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      ) : activeTab === 'attendance' ? (
        <section className="space-y-4 rounded-xl border border-white/5 bg-[#0c152e] p-4 sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <label htmlFor="ppit-session-date" className="mb-1 block text-xs font-semibold text-[#a6c4eb]">PPIT session date</label>
              <input id="ppit-session-date" type="date" value={sessionDate} onChange={(event) => handleSessionDateChange(event.target.value)} className="rounded-lg bg-[#070c1e] px-3 py-2 text-sm text-white" />
            </div>
            {canManage && (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => markAll('Present')} className="rounded-lg bg-[#0f382a] px-3 py-2 text-xs font-semibold text-[#8fffc1]">Mark all present</button>
                <button type="button" onClick={() => markAll('Absent')} className="rounded-lg bg-[#38141e] px-3 py-2 text-xs font-semibold text-[#ff9caf]">Mark all absent</button>
              </div>
            )}
          </div>
          {isFutureDate(sessionDate) && <p className="text-xs text-amber-300">Choose today or an earlier date to record attendance.</p>}
          <div className="divide-y divide-white/5">
            {members.map((member) => (
              <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{member.name}</p>
                  <p className="mt-1 text-xs text-[#a6c4eb]">{member.branch}</p>
                </div>
                <div className="flex items-center gap-2">
                  {(['Present', 'Absent'] as const).map((mark) => (
                    <button
                      key={mark}
                      type="button"
                      disabled={!canManage}
                      aria-pressed={draftMarks[member.id] === mark}
                      onClick={() => {
                        setDraftMarks((previous) => ({ ...previous, [member.id]: mark }));
                        setHasUnsavedAttendance(true);
                      }}
                      className={`rounded-lg px-3 py-2 text-xs font-bold disabled:cursor-default ${
                        draftMarks[member.id] === mark
                          ? mark === 'Present' ? 'bg-[#0f382a] text-[#8fffc1]' : 'bg-[#38141e] text-[#ff9caf]'
                          : 'bg-[#111d44] text-[#a6c4eb]'
                      }`}
                    >
                      {draftMarks[member.id] === mark && <Check className="mr-1 inline h-3.5 w-3.5" />}
                      {mark}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {members.length === 0 && <p className="py-6 text-center text-sm text-[#a6c4eb]">The PPIT roster is empty.</p>}
          {canManage && (
            <div className="flex items-center justify-between border-t border-white/5 pt-4">
              <span className="text-xs text-[#a6c4eb]">{hasUnsavedAttendance ? 'Unsaved attendance changes' : 'Changes save to Supabase'}</span>
              <button type="button" onClick={() => void handleSaveAttendance()} disabled={isSaving || isFutureDate(sessionDate) || members.length === 0} className="flex items-center gap-2 rounded-lg bg-[#00f0ff] px-4 py-2.5 text-xs font-bold text-[#070c1e] disabled:opacity-50">
                <Save className="h-4 w-4" /> {isSaving ? 'Saving…' : 'Save attendance'}
              </button>
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-5 rounded-xl border border-white/5 bg-[#0c152e] p-4 sm:p-5">
          <div>
            <h2 className="text-sm font-bold text-amber-300">Red List — 1–2 consecutive PPIT sessions missed</h2>
            {redList.length === 0 ? <p className="mt-3 text-sm text-[#a6c4eb]">No PPIT members are currently on the Red List.</p> : (
              <div className="mt-3 divide-y divide-white/5">
                {redList.map(({ member, streak }) => (
                  <div key={member.id} className="flex flex-wrap justify-between gap-2 py-3">
                    <div><p className="text-sm font-semibold text-white">{member.name}</p><p className="mt-1 text-xs text-[#a6c4eb]">{member.branch}</p></div>
                    <p className="text-xs text-amber-300">{streak?.count} missed: {streak?.missedDates.join(', ')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="border-t border-white/5 pt-4">
            <h2 className="text-sm font-bold text-[#ff8fa5]">Critical Absentees — 3+ consecutive PPIT sessions missed</h2>
            {criticalAbsentees.length === 0 ? <p className="mt-3 text-sm text-[#a6c4eb]">No PPIT members are currently critical absentees.</p> : (
              <div className="mt-3 divide-y divide-white/5">
                {criticalAbsentees.map(({ member, streak }) => (
                  <div key={member.id} className="flex flex-wrap justify-between gap-2 py-3">
                    <div><p className="text-sm font-semibold text-white">{member.name}</p><p className="mt-1 text-xs text-[#a6c4eb]">{member.branch}</p></div>
                    <p className="text-xs text-[#ff8fa5]">{streak?.count} missed: {streak?.missedDates.join(', ')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {isCreatingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" role="presentation">
          <form onSubmit={handleSaveMember} className="w-full max-w-md space-y-4 rounded-xl border border-white/10 bg-[#111d44] p-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="ppit-member-modal-title">
            <div className="flex items-center justify-between">
              <h2 id="ppit-member-modal-title" className="text-base font-bold text-white">{editingMember ? 'Edit PPIT member' : 'Add PPIT member'}</h2>
              <button type="button" onClick={() => setIsCreatingMember(false)} aria-label="Close dialog" className="rounded-lg p-2 text-[#a6c4eb] hover:bg-[#16285a]"><X className="h-4 w-4" /></button>
            </div>
            <label className="block text-xs text-[#a6c4eb]">
              Full name
              <input required minLength={2} maxLength={120} value={memberForm.name} onChange={(event) => setMemberForm((form) => ({ ...form, name: event.target.value }))} className="mt-1 w-full rounded-lg bg-[#070c1e] px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-[#00f0ff]" />
            </label>
            <label className="block text-xs text-[#a6c4eb]">
              Branch
              <input required minLength={2} maxLength={120} value={memberForm.branch} onChange={(event) => setMemberForm((form) => ({ ...form, branch: event.target.value }))} className="mt-1 w-full rounded-lg bg-[#070c1e] px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-[#00f0ff]" />
            </label>
            <label className="block text-xs text-[#a6c4eb]">
              Contact (optional)
              <input maxLength={120} value={memberForm.contact} onChange={(event) => setMemberForm((form) => ({ ...form, contact: event.target.value }))} placeholder="Add phone or email later" className="mt-1 w-full rounded-lg bg-[#070c1e] px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-[#00f0ff]" />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsCreatingMember(false)} className="rounded-lg bg-[#16285a] px-4 py-2.5 text-xs font-semibold text-[#a6c4eb]">Cancel</button>
              <button type="submit" disabled={isSavingMember} className="rounded-lg bg-[#00f0ff] px-4 py-2.5 text-xs font-bold text-[#070c1e] disabled:opacity-50">{isSavingMember ? 'Saving…' : 'Save member'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
