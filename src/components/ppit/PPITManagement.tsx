import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CalendarCheck,
  Check,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Shield,
  ShieldCheck,
  Trash2,
  Users,
  X
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../../backend/client';
import { Database } from '../../../backend/types';
import { useCMS } from '../../context/CMSContext';
import { isFutureDate } from '../../utils/date';
import { getPpitAbsenceStreaks, getPpitMobileError, getPpitRosterMembers, PPIT_MEETING_LEADER_ID } from '../../utils/ppit';
import { mapError } from '../../utils/errors';
import { getGenderSummary } from '../../utils/gender';
import { exportReportExcel, exportReportPdf, ReportExport } from '../../utils/reportExport';
import { formatPhone } from '../../utils/validation';

type PpitMember = Database['public']['Tables']['ppit_members']['Row'];
type PpitAttendance = Database['public']['Tables']['ppit_attendance_records']['Row'];
type PpitTab = 'roster' | 'attendance' | 'red-list';
type AttendanceMark = 'Present' | 'Absent';

const today = () => new Date().toISOString().slice(0, 10);
const meetingLeaderName = 'REV FESTUS AGYEI SARFO';

export const PPITManagement: React.FC = () => {
  const { currentUser, setCurrentUser, shepherds, setPpitShepherdPermission } = useCMS();
  const isPastor = currentUser.role === 'pastor';
  const isShepherd = currentUser.role === 'shepherd';
  const [permissionVerified, setPermissionVerified] = useState(!isShepherd);
  const canManage = isShepherd && permissionVerified && currentUser.isPpitShepherd === true;
  const canView = isPastor || canManage;
  const isLockedShepherd = isShepherd && !canManage;
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferError, setTransferError] = useState('');
  const [transferSuccess, setTransferSuccess] = useState('');
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
  const [memberForm, setMemberForm] = useState({ name: '', branch: '', contact: '', gender: '' as '' | 'Male' | 'Female' });
  const [isSavingMember, setIsSavingMember] = useState(false);
  const attendanceDirtyRef = useRef(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const meetingLeader = members.find((member) => member.id === PPIT_MEETING_LEADER_ID);
  const rosterMembers = useMemo(
    () => getPpitRosterMembers(members),
    [members]
  );

  const verifyPpitPermission = useCallback(async () => {
    if (!isShepherd) return;
    const { data, error: permissionError } = await supabase
      .from('profiles')
      .select('role,is_ppit_shepherd')
      .eq('id', currentUser.id)
      .maybeSingle();
    if (permissionError) {
      setError(mapError(permissionError).message);
      if (currentUser.isPpitShepherd) {
        setCurrentUser({ ...currentUser, isPpitShepherd: false });
      }
    } else {
      const hasPermission = data?.role === 'shepherd' && data.is_ppit_shepherd === true;
      if (currentUser.isPpitShepherd !== hasPermission) {
        setCurrentUser({ ...currentUser, isPpitShepherd: hasPermission });
      }
    }
    setPermissionVerified(true);
  }, [currentUser, isShepherd, setCurrentUser]);

  useEffect(() => {
    if (!isShepherd) return;
    setPermissionVerified(false);
    void verifyPpitPermission();
    window.addEventListener('focus', verifyPpitPermission);
    const permissionCheck = window.setInterval(() => void verifyPpitPermission(), 30000);
    return () => {
      window.removeEventListener('focus', verifyPpitPermission);
      window.clearInterval(permissionCheck);
    };
  }, [isShepherd, verifyPpitPermission]);

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
        .filter((record) => record.session_date === sessionDate && record.ppit_member_id !== PPIT_MEETING_LEADER_ID)
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
    () => Array.from(new Set(rosterMembers.map((member) => member.branch))).sort(),
    [rosterMembers]
  );
  const filteredMembers = useMemo(
    () => rosterMembers.filter((member) => {
      const matchesSearch = `${member.name} ${member.contact || ''}`.toLowerCase().includes(search.toLowerCase());
      return matchesSearch && (branchFilter === 'all' || member.branch === branchFilter);
    }),
    [branchFilter, rosterMembers, search]
  );
  const absenceStreaks = useMemo(() => getPpitAbsenceStreaks(
    attendance.filter((record): record is PpitAttendance & { status: AttendanceMark } =>
      record.ppit_member_id !== PPIT_MEETING_LEADER_ID && (record.status === 'Present' || record.status === 'Absent')
    )
  ), [attendance]);
  const redList = rosterMembers
    .map((member) => ({ member, streak: absenceStreaks.get(member.id) }))
    .filter((item) => item.streak && item.streak.count > 0 && item.streak.count < 3);
  const criticalAbsentees = rosterMembers
    .map((member) => ({ member, streak: absenceStreaks.get(member.id) }))
    .filter((item) => item.streak && item.streak.count >= 3);
  const activeReportMembers = activeTab === 'roster'
    ? filteredMembers
    : activeTab === 'attendance'
      ? rosterMembers
      : [...redList, ...criticalAbsentees].map(({ member }) => member);
  const genderSummary = getGenderSummary(activeReportMembers);

  const handleExport = async (format: 'excel' | 'pdf') => {
    const redListItems = [...redList, ...criticalAbsentees];
    const reportMembers = activeTab === 'roster'
      ? filteredMembers
      : activeTab === 'attendance'
        ? rosterMembers
        : redListItems.map(({ member }) => member);
    const stats = getGenderSummary(reportMembers);
    const summary: ReportExport['summary'] = [
      ['Total members', stats.total],
      ['Male', stats.male],
      ['Female', stats.female],
      ['Not specified', stats.unspecified],
      ['Male share of known gender', stats.maleShare],
      ['Female share of known gender', stats.femaleShare],
      ['Male-to-female ratio', stats.maleToFemale]
    ];
    let columns: string[];
    let rows: ReportExport['rows'];
    let title: string;
    if (activeTab === 'roster') {
      title = 'PPIT Membership Roster';
      columns = ['Name', 'Contact', 'Branch', 'Gender'];
      rows = filteredMembers.map((member) => [member.name, member.contact || '', member.branch, member.gender || 'Not specified']);
    } else if (activeTab === 'attendance') {
      const sessionRecords = attendance.filter((record) => record.session_date === sessionDate);
      const presentMembers = rosterMembers.filter((member) => draftMarks[member.id] === 'Present');
      const absentMembers = rosterMembers.filter((member) => draftMarks[member.id] === 'Absent');
      const presentGender = getGenderSummary(presentMembers);
      const absentGender = getGenderSummary(absentMembers);
      summary.push(
        ['Session date', sessionDate],
        ['Present', presentMembers.length],
        ['Absent', absentMembers.length],
        ['Not recorded', rosterMembers.length - presentMembers.length - absentMembers.length],
        ['Male present', presentGender.male],
        ['Female present', presentGender.female],
        ['Male absent', absentGender.male],
        ['Female absent', absentGender.female],
        ['Recorded session entries', sessionRecords.length]
      );
      title = `PPIT Attendance — ${sessionDate}`;
      columns = ['Name', 'Branch', 'Gender', 'Attendance status'];
      rows = rosterMembers.map((member) => [member.name, member.branch, member.gender || 'Not specified', draftMarks[member.id] || 'Not recorded']);
    } else {
      title = 'PPIT Red List and Critical Absentees';
      columns = ['Name', 'Branch', 'Gender', 'Risk category', 'Consecutive sessions missed', 'Missed session dates'];
      rows = redListItems.map(({ member, streak }) => [
        member.name,
        member.branch,
        member.gender || 'Not specified',
        (streak?.count || 0) >= 3 ? 'Critical absentee' : 'Red List',
        streak?.count || 0,
        streak?.missedDates.join(', ') || ''
      ]);
    }

    try {
      const report = {
        title,
        filename: `CPI_${title.replace(/[^a-zA-Z0-9]+/g, '_')}_${today()}`,
        columns,
        rows,
        summary
      };
      if (format === 'excel') await exportReportExcel(report);
      else await exportReportPdf(report);
    } catch (exportError) {
      setNotice({ message: mapError(exportError).message, isError: true });
    }
  };

  const openNewMember = () => {
    setEditingMember(null);
    setMemberForm({ name: '', branch: '', contact: '', gender: '' });
    setIsCreatingMember(true);
  };

  const openEditMember = (member: PpitMember) => {
    setEditingMember(member);
    setMemberForm({ name: member.name, branch: member.branch, contact: member.contact || '', gender: member.gender || '' });
    setIsCreatingMember(true);
  };

  const handleSaveMember = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canManage) {
      setNotice({ message: 'Only the assigned PPIT shepherd can manage this roster.', isError: true });
      return;
    }
    const name = memberForm.name.trim();
    const branch = memberForm.branch.trim();
    if (name.length < 2 || branch.length < 2) {
      setNotice({ message: 'Enter the member name and branch.', isError: true });
      return;
    }
    const rawContact = memberForm.contact.trim();
    const phoneError = getPpitMobileError(rawContact, members, editingMember?.id);
    if (phoneError) {
      setNotice({ message: phoneError, isError: true });
      return;
    }

    setIsSavingMember(true);
    setNotice(null);
    try {
      const payload = {
        name,
        branch,
        contact: rawContact ? formatPhone(rawContact) : null,
        gender: memberForm.gender || null,
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

  const handleDeleteMember = async (member: PpitMember) => {
    if (!canManage || !window.confirm(`Delete ${member.name} from the PPIT roster? This cannot be undone.`)) return;
    setIsSavingMember(true);
    setNotice(null);
    try {
      const { error: deleteError } = await supabase.from('ppit_members').delete().eq('id', member.id);
      if (deleteError) throw deleteError;
      const refreshed = await loadData(true);
      setNotice({
        message: refreshed ? `${member.name} was deleted.` : 'Member deleted, but the roster could not be refreshed. Use Refresh to reload it.',
        isError: !refreshed
      });
    } catch (deleteError) {
      setNotice({ message: mapError(deleteError).message, isError: true });
    } finally {
      setIsSavingMember(false);
    }
  };

  const markAll = (status: AttendanceMark) => {
    setDraftMarks(Object.fromEntries(rosterMembers.map((member) => [member.id, status])));
    setHasUnsavedAttendance(true);
  };

  const handleSessionDateChange = (nextDate: string) => {
    if (hasUnsavedAttendance && !window.confirm('Discard unsaved attendance changes?')) return;
    setSessionDate(nextDate);
  };

  const handleSaveAttendance = async () => {
    if (!canManage) return;
    if (rosterMembers.length === 0) {
      setNotice({ message: 'The PPIT roster is empty.', isError: true });
      return;
    }
    if (isFutureDate(sessionDate)) {
      setNotice({ message: 'Attendance date cannot be in the future.', isError: true });
      return;
    }
    if (rosterMembers.some((member) => !draftMarks[member.id])) {
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

      const records = rosterMembers.map((member) => ({
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

  if (!canView && !isLockedShepherd) {
    return (
      <div className="p-6 text-sm text-[#ff6b8b]" role="alert">
        PPIT records are available only to the Pastor and designated PPIT shepherd.
      </div>
    );
  }

  if (isLockedShepherd) {
    return (
      <section className="mx-auto max-w-2xl p-6 sm:p-10">
        <div className="rounded-2xl border border-[#00f0ff]/20 bg-gradient-to-br from-[#111d44] to-[#0c152e] p-8 text-center shadow-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#00f0ff]/10 text-[#00f0ff]">
            <Lock className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 className="mt-5 text-xl font-bold text-white">PPIT access is restricted</h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#a6c4eb]">
            {error
              ? 'We could not verify your PPIT access. Please try again or contact the Pastor.'
              : permissionVerified
              ? 'Your account has not been granted permission to manage PPIT. Ask the Pastor to grant access before using this page.'
              : 'Checking your PPIT access…'}
          </p>
          {error && <p className="mt-4 rounded-lg bg-[#38141e] p-3 text-left text-sm text-[#ff9caf]" role="alert">{error}</p>}
          <div className="mt-6 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#070c1e]/60 px-4 py-2 text-xs font-semibold text-slate-400">
            <Shield className="h-4 w-4" />
            PPIT roster and attendance are hidden until access is granted
          </div>
        </div>
      </section>
    );
  }

  // ── Shepherd Transfer handlers (pastor only) ─────────────────────────────
  const handleOpenTransfer = () => {
    const currentPpit = shepherds.find((s) => s.isPpitShepherd);
    const nextCandidate = shepherds.find((s) => !s.isPpitShepherd && s.id);
    setTransferTargetId(nextCandidate?.id || currentPpit?.id || shepherds[0]?.id || '');
    setTransferError('');
    setTransferSuccess('');
    setShowTransferModal(true);
  };

  const handleConfirmTransfer = async () => {
    if (!transferTargetId) {
      setTransferError('Please select a shepherd to transfer the PPIT role to.');
      return;
    }
    setIsTransferring(true);
    setTransferError('');
    const result = await setPpitShepherdPermission(transferTargetId, true);
    setIsTransferring(false);
    if (result.success) {
      const target = shepherds.find((s) => s.id === transferTargetId);
      setTransferSuccess(`PPIT role transferred to ${target?.name || 'the selected shepherd'} successfully.`);
      setTimeout(() => {
        setShowTransferModal(false);
        setTransferSuccess('');
      }, 2500);
    } else {
      setTransferError(result.error || 'Unable to transfer PPIT role. Please try again.');
    }
  };

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
            {isPastor ? 'Pastor view — review records and assign the PPIT shepherd.' : 'Manage the PPIT roster and record attendance.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => void handleExport('excel')} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-black">
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </button>
          <button type="button" onClick={() => void handleExport('pdf')} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-black">
            <Download className="h-4 w-4" /> PDF
          </button>
          {isPastor && (
            <button
              type="button"
              onClick={handleOpenTransfer}
              disabled={shepherds.length === 0}
              className="flex items-center gap-2 rounded-lg border border-[#00f0ff]/30 bg-[#111d44] px-3 py-2 text-xs font-semibold text-[#a6c4eb] transition hover:border-[#00f0ff] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Shield className="h-4 w-4 text-[#00f0ff]" />
              Assign / transfer PPIT
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
          {canManage && activeTab === 'roster' && (
            <button type="button" onClick={openNewMember} className="flex items-center gap-2 rounded-lg bg-[#00f0ff] px-3 py-2 text-xs font-bold text-[#070c1e]">
              <Plus className="h-4 w-4" /> Add member
            </button>
          )}
          {showTransferModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleConfirmTransfer();
                }}
                className="w-full max-w-md space-y-5 rounded-2xl border border-white/10 bg-[#111d44] p-6 shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="ppit-transfer-title"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 id="ppit-transfer-title" className="text-lg font-bold text-white">Assign PPIT responsibility</h2>
                    <p className="mt-1 text-sm text-[#a6c4eb]">Choose the shepherd who will manage the PPIT roster and attendance.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowTransferModal(false)}
                    disabled={isTransferring}
                    aria-label="Close dialog"
                    className="rounded-lg p-2 text-[#a6c4eb] hover:bg-[#16285a] disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <label htmlFor="ppit-transfer-shepherd" className="block text-xs font-semibold text-[#a6c4eb]">
                  Shepherd
                  <select
                    id="ppit-transfer-shepherd"
                    required
                    value={transferTargetId}
                    onChange={(event) => setTransferTargetId(event.target.value)}
                    disabled={isTransferring || shepherds.length === 0}
                    className="mt-2 w-full rounded-lg bg-[#070c1e] px-3 py-3 text-sm text-white disabled:opacity-50"
                  >
                    <option value="">Select a shepherd</option>
                    {shepherds.map((shepherd) => (
                      <option key={shepherd.id} value={shepherd.id}>
                        {shepherd.name}{shepherd.isPpitShepherd ? ' — currently assigned' : ''}
                      </option>
                    ))}
                  </select>
                </label>
                {transferError && <p className="rounded-lg bg-[#38141e] p-3 text-sm text-[#ff9caf]" role="alert">{transferError}</p>}
                {transferSuccess && <p className="rounded-lg bg-[#0f382a] p-3 text-sm text-[#8fffc1]" role="status">{transferSuccess}</p>}
                {shepherds.length === 0 && <p className="text-sm text-amber-300">Create a shepherd account before assigning PPIT responsibility.</p>}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTransferModal(false)}
                    disabled={isTransferring}
                    className="rounded-lg bg-[#16285a] px-4 py-2.5 text-xs font-semibold text-[#a6c4eb] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isTransferring || !transferTargetId || shepherds.length === 0}
                    className="rounded-lg bg-[#00f0ff] px-4 py-2.5 text-xs font-bold text-[#070c1e] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isTransferring ? 'Updating…' : 'Confirm assignment'}
                  </button>
                </div>
              </form>
            </div>
          )}
          <button type="button" onClick={() => void loadData()} disabled={isLoading} className="flex items-center gap-2 rounded-lg bg-[#111d44] px-3 py-2 text-xs font-semibold text-[#a6c4eb] disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {isPastor && (
        <div className="flex items-start gap-2 rounded-lg border border-[#00f0ff]/20 bg-[#111d44] p-3 text-xs text-[#a6c4eb]">
          <ShieldCheck className="h-4 w-4 shrink-0 text-[#00f0ff]" />
          You can view PPIT records and assign the shepherd responsible for managing this page.
        </div>
      )}
      <p className="rounded-lg border border-[#00f0ff]/20 bg-[#111d44] px-3 py-2 text-sm text-[#a6c4eb]">
        <span className="font-semibold text-white">Pastor:</span> {meetingLeader?.name || meetingLeaderName}
      </p>
      {error && <div className="rounded-lg border border-[#ff6b8b]/30 bg-[#38141e] p-3 text-sm text-[#ff9caf]" role="alert">{error}</div>}
      {notice && (
        <div className={`rounded-lg p-3 text-sm ${notice.isError ? 'bg-[#38141e] text-[#ff9caf]' : 'bg-[#0f382a] text-[#8fffc1]'}`} role={notice.isError ? 'alert' : 'status'}>
          {notice.message}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/5 bg-[#111d44] p-4">
          <div className="flex items-center gap-2 text-xs text-[#a6c4eb]"><Users className="h-4 w-4 text-[#00f0ff]" /> Roster</div>
          <p className="mt-2 text-2xl font-bold text-white">{rosterMembers.length}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-[#111d44] p-4">
          <div className="flex items-center gap-2 text-xs text-[#a6c4eb]"><AlertTriangle className="h-4 w-4 text-amber-400" /> Red List</div>
          <p className="mt-2 text-2xl font-bold text-amber-300">{redList.length}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-[#111d44] p-4">
          <div className="flex items-center gap-2 text-xs text-[#a6c4eb]"><AlertTriangle className="h-4 w-4 text-[#ff6b8b]" /> Critical (3+ missed)</div>
          <p className="mt-2 text-2xl font-bold text-[#ff8fa5]">{criticalAbsentees.length}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-[#111d44] p-4">
          <div className="text-xs text-[#a6c4eb]">Gender breakdown</div>
          <p className="mt-2 text-sm font-bold text-white">{genderSummary.male} male · {genderSummary.female} female</p>
          <p className="mt-1 text-xs text-[#a6c4eb]">M:F {genderSummary.maleToFemale} · {genderSummary.maleShare}/{genderSummary.femaleShare} · {genderSummary.unspecified} not specified</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabButton('roster', 'Roster', Users, rosterMembers.length)}
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
            <p className="py-8 text-center text-sm text-[#a6c4eb]">
              {rosterMembers.length
                ? 'No matching PPIT members.'
                : members.length
                  ? 'There are no regular PPIT members in the roster.'
                  : 'No PPIT members loaded. Run the PPIT migration in Supabase.'}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead className="border-b border-white/10 bg-[#111d44] text-xs uppercase text-[#a6c4eb]">
                  <tr>
                    <th scope="col" className="px-3 py-3">Name</th>
                    <th scope="col" className="px-3 py-3">Contact</th>
                    <th scope="col" className="px-3 py-3">Branch</th>
                    <th scope="col" className="px-3 py-3">Gender</th>
                    {canManage && <th scope="col" className="px-3 py-3">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredMembers.map((member) => (
                    <tr key={member.id} className="text-white">
                      <td className="max-w-[220px] px-3 py-3 font-semibold">{member.name}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-[#a6c4eb]">{member.contact || '—'}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-[#a6c4eb]">{member.branch}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-[#a6c4eb]">{member.gender || 'Not specified'}</td>
                      {canManage && (
                        <td className="whitespace-nowrap px-3 py-3 text-right">
                          <button type="button" onClick={() => openEditMember(member)} aria-label={`Edit ${member.name}`} className="mr-2 rounded-lg bg-[#16285a] p-2 text-[#00f0ff] hover:bg-[#203a7a]">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => void handleDeleteMember(member)} disabled={isSavingMember} aria-label={`Delete ${member.name}`} className="rounded-lg bg-[#38141e] p-2 text-[#ff9caf] hover:bg-[#57202e] disabled:opacity-50">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
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
            {rosterMembers.map((member) => (
              <div key={member.id} className="flex min-w-0 flex-nowrap items-center gap-2 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{member.name}</p>
                  <p className="mt-1 text-xs text-[#a6c4eb]">{member.branch}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
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
                      className={`whitespace-nowrap rounded-lg px-2.5 py-2 text-[11px] font-bold sm:px-3 sm:text-xs disabled:cursor-default ${
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
          {rosterMembers.length === 0 && <p className="py-6 text-center text-sm text-[#a6c4eb]">The PPIT roster is empty.</p>}
          {canManage && (
            <div className="flex items-center justify-between border-t border-white/5 pt-4">
              <span className="text-xs text-[#a6c4eb]">{hasUnsavedAttendance ? 'Unsaved attendance changes' : 'Changes save to Supabase'}</span>
              <button type="button" onClick={() => void handleSaveAttendance()} disabled={isSaving || isFutureDate(sessionDate) || rosterMembers.length === 0} className="flex items-center gap-2 rounded-lg bg-[#00f0ff] px-4 py-2.5 text-xs font-bold text-[#070c1e] disabled:opacity-50">
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
              Mobile number (optional)
              <input type="tel" inputMode="tel" maxLength={18} value={memberForm.contact} onChange={(event) => setMemberForm((form) => ({ ...form, contact: event.target.value }))} placeholder="e.g. 024 123 4567" className="mt-1 w-full rounded-lg bg-[#070c1e] px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-[#00f0ff]" />
            </label>
            <label className="block text-xs text-[#a6c4eb]">
              Gender (optional)
              <select value={memberForm.gender} onChange={(event) => setMemberForm((form) => ({ ...form, gender: event.target.value as '' | 'Male' | 'Female' }))} className="mt-1 w-full rounded-lg bg-[#070c1e] px-3 py-2.5 text-sm text-white">
                <option value="">Not specified</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
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
