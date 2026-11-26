import React, { useEffect, useState } from 'react';
import {
  CalendarCheck,
  Download,
  Search,
  Check,
  Save,
  Users,
  Filter,
  CheckCircle2,
  FileSpreadsheet,
  AlertTriangle,
  UserX,
  Phone,
  Shield,
  ArrowRight,
  RotateCcw,
  RefreshCw,
  AlertCircle,
  MessageSquare
} from 'lucide-react';
import { useCMS } from '../../context/CMSContext';
import { DirectOutreachModal } from '../common/DirectOutreachModal';
import { formatGhanaianPhone, getCleanDialPhone } from '../../utils/phone';
import { isFutureDate } from '../../utils/date';
import { getGenderSummary } from '../../utils/gender';
import { exportReportExcel, exportReportPdf, ReportExport } from '../../utils/reportExport';

export const AttendanceRecording: React.FC = () => {
  const {
    currentUser,
    visibleMembers,
    visibleAttendance,
    batchSaveAttendance,
    redListMembers,
    criticalAbsenteeMembers
  } = useCMS();
  const isPastor = currentUser.role === 'pastor';

  // Navigation between Roster mark-up, Red List, and Critical Absentee List
  const [activeTab, setActiveTab] = useState<'roster' | 'red_list' | 'critical_absentee'>('roster');

  const [serviceCategory, setServiceCategory] = useState<'sunday' | 'midweek' | 'vigil'>('sunday');
  const [serviceDate, setServiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [serviceName, setServiceName] = useState('Sunday 1st Service — Communion');
  const [searchTerm, setSearchTerm] = useState('');
  const [cellFilter, setCellFilter] = useState('all');
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveNotice, setSaveNotice] = useState<{ message: string; isError: boolean } | null>(null);
  const [outreachTarget, setOutreachTarget] = useState<{
    isOpen: boolean;
    name: string;
    phone: string;
    category: 'red_list_1' | 'red_list_2' | 'critical' | 'first_timer' | 'custom';
    consecutiveMissed: number;
    cellGroup?: string;
    lastAttended?: string;
  }>({
    isOpen: false,
    name: '',
    phone: '',
    category: 'red_list_1',
    consecutiveMissed: 1
  });

  // Switch category updates serviceName & default day
  const handleCategoryChange = (cat: 'sunday' | 'midweek' | 'vigil') => {
    setServiceCategory(cat);
    if (cat === 'sunday') {
      setServiceName('Sunday Service');
      setServiceDate(new Date().toISOString().split('T')[0]);
    } else if (cat === 'midweek') {
      setServiceName('Wednesday Midweek');
      setServiceDate(new Date().toISOString().split('T')[0]);
    } else if (cat === 'vigil') {
      setServiceName('Friday Prayer Meeting');
      setServiceDate(new Date().toISOString().split('T')[0]);
    } else {
      setServiceName('Friday Prayer Meeting');
      setServiceDate(new Date().toISOString().split('T')[0]);
    }
  };

  // Local state for interactive status overrides
  const [presentMembers, setPresentMembers] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    visibleAttendance.forEach((rec) => {
      if (rec.serviceDate === serviceDate) {
        initial[rec.memberId] = rec.status === 'Present';
      }
    });
    return initial;
  });

  useEffect(() => {
    const initial: Record<string, boolean> = {};
    visibleAttendance.forEach((rec) => {
      if (rec.serviceDate === serviceDate) {
        initial[rec.memberId] = rec.status === 'Present';
      }
    });
    setPresentMembers(initial);
  }, [serviceDate, visibleAttendance]);

  const handlePresentChange = (memberId: string, isPresent: boolean) => {
    setPresentMembers((prev) => ({ ...prev, [memberId]: isPresent }));
    setHasUnsavedChanges(true);
  };

  const handleMarkAllPresent = () => {
    setPresentMembers((prev) => {
      const updated = { ...prev };
      displayedMembers.forEach((member) => {
        updated[member.id] = true;
      });
      return updated;
    });
    setHasUnsavedChanges(true);
  };

  const handleMarkAllAbsent = () => {
    setPresentMembers((prev) => {
      const updated = { ...prev };
      displayedMembers.forEach((member) => {
        updated[member.id] = false;
      });
      return updated;
    });
    setHasUnsavedChanges(true);
  };

  React.useEffect(() => {
    if (!hasUnsavedChanges) return;
    const protectUnsavedChanges = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', protectUnsavedChanges);
    return () => window.removeEventListener('beforeunload', protectUnsavedChanges);
  }, [hasUnsavedChanges]);

  const handleSave = async () => {
    if (displayedMembers.length === 0) {
      setSaveNotice({ message: 'There is no data to save.', isError: true });
      setTimeout(() => setSaveNotice(null), 4000);
      return;
    }
    if (!serviceDate) {
      setSaveNotice({ message: 'Select a service date.', isError: true });
      return;
    }
    if (isFutureDate(serviceDate)) {
      setSaveNotice({ message: 'Service date cannot be in the future.', isError: true });
      return;
    }

    setIsSaving(true);
    setSaveNotice(null);

    const records = displayedMembers.map((m) => {
      return {
        memberId: m.id,
        status: presentMembers[m.id] ? 'Present' as const : 'Absent' as const,
        date: serviceDate
      };
    });

    const result = await batchSaveAttendance(records, serviceName, serviceCategory);
    setIsSaving(false);

    if (result.success) {
      setSaveNotice({ message: 'Record saved successfully.', isError: false });
      setHasUnsavedChanges(false);
    } else {
      setSaveNotice({ message: result.error || 'Unable to save the record. Please try again.', isError: true });
    }
    setTimeout(() => setSaveNotice(null), 4000);
  };

  // Filter members according to search and (if pastor) cell filter
  const displayedMembers = visibleMembers.filter((m) => {
    if (m.status === 'Pending Verification') return false;
    const matchesSearch =
      `${m.firstName} ${m.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.phone.includes(searchTerm);
    const matchesCell = cellFilter === 'all' || m.cellGroup === cellFilter;
    return matchesSearch && matchesCell;
  });

  // Calculate metrics
  const totalCount = displayedMembers.length;
  const presentCount = displayedMembers.filter(
    (m) => presentMembers[m.id] === true
  ).length;
  const absentCount = displayedMembers.filter(
    (m) => presentMembers[m.id] !== true
  ).length;
  const rate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
  const genderSummary = getGenderSummary(displayedMembers);
  const presentGender = getGenderSummary(displayedMembers.filter((member) => presentMembers[member.id]));
  const absentGender = getGenderSummary(displayedMembers.filter((member) => !presentMembers[member.id]));

  // Cells list for Pastor filter
  const uniqueCells = Array.from(new Set(visibleMembers.map((m) => m.cellGroup)));

  // Helper map for member risk labels in main table
  const redListMap = new Map(redListMembers.map((r) => [r.memberId, r]));
  const criticalMap = new Map(criticalAbsenteeMembers.map((r) => [r.memberId, r]));
  const visibleMemberMap = new Map(visibleMembers.map((member) => [member.id, member]));
  const activeRiskReports = activeTab === 'red_list' ? redListMembers : criticalAbsenteeMembers;
  const riskGenderSummary = getGenderSummary(activeRiskReports
    .map((record) => visibleMemberMap.get(record.memberId))
    .filter((member): member is (typeof visibleMembers)[number] => member !== undefined));

  const handleExport = async (format: 'excel' | 'pdf') => {
    const reportMembers = activeTab === 'roster'
      ? displayedMembers
      : (activeTab === 'red_list' ? redListMembers : criticalAbsenteeMembers)
        .map((record) => visibleMemberMap.get(record.memberId))
        .filter((member): member is (typeof visibleMembers)[number] => member !== undefined);
    const stats = getGenderSummary(reportMembers);
    const summary: ReportExport['summary'] = [
      ['Total members', stats.total],
      ['Male', stats.male],
      ['Female', stats.female],
      ['Not specified', stats.unspecified],
      ['Male share of known gender', stats.maleShare],
      ['Female share of known gender', stats.femaleShare],
      ['Male-to-female ratio', stats.maleToFemale],
      ['Service date', serviceDate],
      ['Service session', serviceName]
    ];
    let columns: string[];
    let rows: ReportExport['rows'];
    let title: string;
    if (activeTab === 'roster') {
      summary.push(
        ['Present', reportMembers.filter((member) => presentMembers[member.id]).length],
        ['Absent', reportMembers.filter((member) => !presentMembers[member.id]).length],
        ['Attendance rate', `${rate}%`],
        ['Male present', presentGender.male],
        ['Female present', presentGender.female],
        ['Male absent', absentGender.male],
        ['Female absent', absentGender.female]
      );
      title = 'Church Service Attendance';
      columns = ['Member ID', 'Member name', 'Telephone', 'Shepherd group', 'Shepherd', 'Spiritual stage', 'Gender', 'Service date', 'Service session', 'Status'];
      rows = reportMembers.map((member) => [
        member.id,
        `${member.firstName} ${member.lastName}`,
        formatGhanaianPhone(member.phone),
        member.cellGroup,
        member.currentShepherdName || '',
        member.spiritualStage,
        member.gender || 'Not specified',
        serviceDate,
        serviceName,
        presentMembers[member.id] ? 'Present' : 'Absent'
      ]);
    } else {
      const absenceReports = activeTab === 'red_list' ? redListMembers : criticalAbsenteeMembers;
      title = activeTab === 'red_list' ? 'Church Attendance Red List' : 'Church Critical Absentees';
      columns = ['Member name', 'Telephone', 'Shepherd group', 'Shepherd', 'Gender', 'Missed Sundays', 'Last attended', 'Category', 'Recommended action'];
      rows = absenceReports.map((record) => [
        record.memberName,
        formatGhanaianPhone(record.phone),
        record.cellGroup,
        record.shepherdName,
        visibleMemberMap.get(record.memberId)?.gender || 'Not specified',
        record.missedSundays.join(', '),
        record.lastAttendedSunday || 'Not recorded',
        record.stageLabel,
        record.actionPrompt
      ]);
      summary.push(['Members needing follow-up', reportMembers.length]);
    }

    try {
      const report = {
        title,
        filename: `CPI_${title.replace(/[^a-zA-Z0-9]+/g, '_')}_${serviceDate}`,
        columns,
        rows,
        summary
      };
      if (format === 'excel') await exportReportExcel(report);
      else await exportReportPdf(report);
    } catch (exportError) {
      setSaveNotice({ message: `Export failed: ${exportError instanceof Error ? exportError.message : 'Unable to create the report.'}`, isError: true });
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header - Shortened concise sub-description */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            {isPastor ? 'Service Attendance & Red List' : 'Cell Service Attendance & Red List'}
          </h2>
          <p className="text-xs text-[#a6c4eb] mt-0.5">
            {isPastor ? 'Sunday roll & absence tracking' : `${currentUser.assignedCell || 'Cell'} Sunday roll`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={() => void handleExport('excel')} className="px-3.5 py-2 bg-white text-xs text-black flex items-center gap-2 cursor-pointer">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>
          <button type="button" onClick={() => void handleExport('pdf')} className="px-3.5 py-2 bg-white text-xs text-black flex items-center gap-2 cursor-pointer">
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-[#00f0ff] hover:bg-[#3bf2ff] text-[#070c1e] text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors shadow-md shadow-black/40 disabled:opacity-50"
          >
            {isSaving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{isSaving ? 'Saving Roster...' : hasUnsavedChanges ? 'Save Attendance *' : 'Save Attendance'}</span>
          </button>
        </div>
      </div>

      {saveNotice && (
        <div className={`flex items-center gap-2 text-xs px-4 py-3 ${
          saveNotice.isError ? 'bg-[#38141e] text-[#ff6b8b]' : 'bg-[#0f382a] text-[#00ff9d]'
        }`}>
          {saveNotice.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
          <span>{saveNotice.message}</span>
        </div>
      )}

      {/* Primary Tab Switcher: Service Roster vs Red List vs Critical Absentee List */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-[#0a122e] p-1.5">
        <button
          type="button"
          onClick={() => setActiveTab('roster')}
          className={`py-3 px-4 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'roster'
              ? 'bg-[#111d44] text-[#00f0ff] shadow-md'
              : 'text-[#a6c4eb] hover:text-white'
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          <span>Sunday Service Roll ({displayedMembers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('red_list')}
          className={`py-3 px-4 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'red_list'
              ? 'bg-[#3b0f1a] text-[#ff4069] shadow-md'
              : 'text-[#a6c4eb] hover:text-[#ff4069]'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-[#ff4069]" />
          <span>Red List — 1-2 Missed Sundays</span>
          <span className="px-2 py-0.5 text-[10px] font-mono font-black bg-[#ff4069] text-[#070c1e]">
            {redListMembers.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('critical_absentee')}
          className={`py-3 px-4 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'critical_absentee'
              ? 'bg-[#3d0c18] text-[#ff6b8b] shadow-md'
              : 'text-[#a6c4eb] hover:text-[#ff6b8b]'
          }`}
        >
          <UserX className="w-4 h-4 text-[#ff6b8b]" />
          <span>Critical Absentee — 3+ Missed</span>
          <span className="px-2 py-0.5 text-[10px] font-mono font-black bg-[#ff6b8b] text-[#070c1e]">
            {criticalAbsenteeMembers.length}
          </span>
        </button>
      </div>

      {activeTab !== 'roster' && (
        <div className="rounded-lg border border-white/10 bg-[#111d44] px-4 py-3 text-xs text-[#a6c4eb]">
          Gender totals on this list: {riskGenderSummary.male} male ({riskGenderSummary.maleShare}), {riskGenderSummary.female} female ({riskGenderSummary.femaleShare}), {riskGenderSummary.unspecified} not specified. M:F {riskGenderSummary.maleToFemale}.
        </div>
      )}

      {/* TAB 1: SERVICE ROSTER MARK-UP */}
      {activeTab === 'roster' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="p-4 bg-[#111d44]">
              <p className="text-[10px] text-[#a6c4eb] uppercase tracking-wider">Total Members</p>
              <p className="text-xl font-bold text-white mt-1">{totalCount}</p>
            </div>
            <div className="p-4 bg-[#111d44]">
              <p className="text-[10px] text-[#00ff9d] uppercase tracking-wider">Present</p>
              <p className="text-xl font-bold text-[#00ff9d] mt-1">{presentCount}</p>
            </div>
            <div className="p-4 bg-[#111d44]">
              <p className="text-[10px] text-[#ff4069] uppercase tracking-wider">Absent Today</p>
              <p className="text-xl font-bold text-[#ff4069] mt-1">{absentCount}</p>
            </div>
            <div className="p-4 bg-[#111d44]">
              <p className="text-[10px] text-[#00f0ff] uppercase tracking-wider">Attendance Rate</p>
              <p className="text-xl font-bold text-[#00f0ff] mt-1">{rate}%</p>
            </div>
            <div className="p-4 bg-[#111d44]">
              <p className="text-[10px] text-[#a6c4eb] uppercase tracking-wider">Gender (M:F)</p>
              <p className="text-sm font-bold text-white mt-1">{genderSummary.male} : {genderSummary.female} ({genderSummary.maleToFemale})</p>
              <p className="mt-1 text-[10px] text-[#a6c4eb]">Present {presentGender.male}M/{presentGender.female}F · Absent {absentGender.male}M/{absentGender.female}F · {genderSummary.unspecified} unspecified</p>
            </div>
          </div>

          {/* Service Type Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#111d44] text-xs">
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-[#00f0ff]" />
              <span className="font-semibold text-white">Service Track:</span>
            </div>

            <div className="flex items-center bg-[#0a122e] p-1 text-[11px]">
              <button
                type="button"
                onClick={() => handleCategoryChange('sunday')}
                className={`px-3 py-1.5 font-medium transition-colors cursor-pointer ${
                  serviceCategory === 'sunday'
                    ? 'bg-[#00f0ff] text-[#070c1e] shadow-sm font-bold'
                    : 'text-[#a6c4eb] hover:text-slate-200'
                }`}
              >
                Sunday Services (Compares Red List)
              </button>
              <button
                type="button"
                onClick={() => handleCategoryChange('midweek')}
                className={`px-3 py-1.5 font-medium transition-colors cursor-pointer ${
                  serviceCategory === 'midweek'
                    ? 'bg-[#00f0ff] text-[#070c1e] shadow-sm font-bold'
                    : 'text-[#a6c4eb] hover:text-slate-200'
                }`}
              >
                Wednesday Midweek
              </button>
              <button
                type="button"
                onClick={() => handleCategoryChange('vigil')}
                className={`px-3 py-1.5 font-medium transition-colors cursor-pointer ${
                  serviceCategory === 'vigil'
                    ? 'bg-[#00f0ff] text-[#070c1e] shadow-sm font-bold'
                    : 'text-[#a6c4eb] hover:text-slate-200'
                }`}
              >
                Friday Night Prayer
              </button>
            </div>
          </div>

          {/* Controls: Date, Service, Search, and optional Cell Filter */}
          <div className="flex flex-wrap items-center gap-3 p-4 bg-[#111d44]">
            <div>
              <label className="text-[10px] font-semibold text-[#a6c4eb] block mb-1">Service Date</label>
              <input
                type="date"
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
                className="px-3 py-1.5 bg-[#070c1e] text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#00f0ff]"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-[#a6c4eb] block mb-1">Service Session</label>
              <select
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                className="px-3 py-1.5 bg-[#070c1e] text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#00f0ff] cursor-pointer"
              >
                <option>Sunday Service</option>
                <option>PPIT Meeting</option>
                <option>Wednesday Midweek Encounter</option>
                <option>Friday Night Prayer</option>
              </select>
            </div>

            {isPastor && (
              <div>
                <label className="text-[10px] font-semibold text-[#a6c4eb] block mb-1">Shepherd Group</label>
                <select
                  value={cellFilter}
                  onChange={(e) => setCellFilter(e.target.value)}
                  className="px-3 py-1.5 bg-[#070c1e] text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#00f0ff] cursor-pointer"
                >
                  <option value="all">All Shepherd Groups</option>
                  {uniqueCells.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex-1 min-w-[200px] ml-auto">
              <label className="text-[10px] font-semibold text-[#a6c4eb] block mb-1">Search Member</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#7b9dc7] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by name or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-[#070c1e] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00f0ff]"
                />
              </div>
            </div>
          </div>

          {/* Attendance Table */}
          <div className="bg-[#111d44] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-[#00f0ff] font-extrabold bg-[#0a122e]">
                    <th className="py-3 px-4">Member Name</th>
                    <th className="py-3 px-4">Telephone</th>
                    {isPastor && <th className="py-3 px-4">Shepherd Group</th>}
                    <th className="py-3 px-4">Sunday Attendance Risk</th>
                    <th className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={handleMarkAllPresent}
                          className="text-[10px] font-bold text-[#00ff9d] hover:text-white cursor-pointer"
                        >
                          Mark All Present
                        </button>
                        <span className="text-[#16285a]">|</span>
                        <button
                          type="button"
                          onClick={handleMarkAllAbsent}
                          className="text-[10px] font-bold text-[#ff4069] hover:text-white cursor-pointer"
                        >
                          Mark All Absent
                        </button>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#16285a]">
                  {displayedMembers.length === 0 ? (
                    <tr>
                      <td colSpan={isPastor ? 5 : 4} className="py-8 text-center text-[#7b9dc7]">
                        No data recorded yet
                      </td>
                    </tr>
                  ) : (
                    displayedMembers.map((member) => {
                      const isPresent = presentMembers[member.id] === true;
                      const redInfo = redListMap.get(member.id);
                      const critInfo = criticalMap.get(member.id);

                      return (
                        <tr key={member.id} className="hover:bg-[#16285a] transition-colors">
                          <td className="py-3 px-4">
                            <p className="font-semibold text-white">
                              {member.firstName} {member.lastName}
                            </p>
                            <p className="text-[10px] text-[#7b9dc7] font-mono">{member.id}</p>
                          </td>
                          <td className="py-3 px-4 text-slate-300 font-mono">
                            <div className="flex items-center gap-2">
                              <span>{formatGhanaianPhone(member.phone)}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const red = redListMap.get(member.id);
                                  const crit = criticalMap.get(member.id);
                                  const cat = crit
                                    ? 'critical'
                                    : red?.consecutiveMissedSundays === 2
                                    ? 'red_list_2'
                                    : red?.consecutiveMissedSundays === 1
                                    ? 'red_list_1'
                                    : 'custom';
                                  setOutreachTarget({
                                    isOpen: true,
                                    name: `${member.firstName} ${member.lastName}`,
                                    phone: formatGhanaianPhone(member.phone),
                                    category: cat,
                                    consecutiveMissed: crit ? crit.consecutiveMissedSundays : red ? red.consecutiveMissedSundays : 0,
                                    cellGroup: member.cellGroup
                                  });
                                }}
                                className="p-1 bg-[#0a122e] hover:bg-[#25D366] text-[#00f0ff] hover:text-white transition-colors cursor-pointer"
                                title="One-click WhatsApp / Outreach"
                              >
                                <MessageSquare className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          {isPastor && (
                            <td className="py-3 px-4">
                              <p className="text-white">{member.cellGroup}</p>
                              <p className="text-[10px] text-[#a6c4eb]">{member.currentShepherdName}</p>
                            </td>
                          )}
                          <td className="py-3 px-4">
                            {redInfo && redInfo.consecutiveMissedSundays === 1 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-[#3b2500] text-[#ffc400]">
                                <AlertTriangle className="w-3 h-3" />
                                Red List (1 Missed)
                              </span>
                            )}
                            {redInfo && redInfo.consecutiveMissedSundays === 2 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-[#3f0f1b] text-[#ff4069]">
                                <AlertTriangle className="w-3 h-3" />
                                Red List (2 Missed)
                              </span>
                            )}
                            {critInfo && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-[#3d0c18] text-[#ff6b8b]">
                                <UserX className="w-3 h-3" />
                                Critical Absentee ({critInfo.consecutiveMissedSundays}+ Missed)
                              </span>
                            )}
                            {!redInfo && !critInfo && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-[#043621] text-[#00ff9d]">
                                <Check className="w-3 h-3" />
                                Regular (0 Missed)
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <label className="flex items-center justify-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isPresent}
                                onChange={(event) => handlePresentChange(member.id, event.target.checked)}
                                className="h-4 w-4 accent-[#00f0ff] cursor-pointer"
                                aria-label={`Present: ${member.firstName} ${member.lastName}`}
                              />
                              <span className={isPresent ? 'font-bold text-[#00ff9d]' : 'text-[#7b9dc7]'}>
                                {isPresent ? 'Present' : 'Absent'}
                              </span>
                            </label>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RED LIST (1 or 2 Missed Sundays) */}
      {activeTab === 'red_list' && (
        <div className="space-y-6">
          {/* Explanation Banner */}
          <div className="p-5 bg-[#3b0f1a] text-[#ff4069] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-[#ff4069]" />
              <div>
                <h3 className="font-extrabold text-white text-sm">
                  Sunday Red List
                </h3>
                <p className="text-xs text-[#a6c4eb] mt-0.5">
                  Members who missed 1 or 2 consecutive Sundays
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="px-3 py-1 bg-[#ff4069] text-[#070c1e] text-xs font-black">
                {redListMembers.length} on Red List
              </span>
            </div>
          </div>

          {/* Red List Table */}
          <div className="bg-[#111d44] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-[#00f0ff] font-extrabold bg-[#0a122e]">
                    <th className="py-3 px-4">Member Name</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Shepherd Group</th>
                    <th className="py-3 px-4">Consecutive Misses</th>
                    <th className="py-3 px-4">Last Attended Sunday</th>
                    <th className="py-3 px-4">Recommended Action</th>
                    <th className="py-3 px-4 text-right">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#16285a]">
                  {redListMembers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#00ff9d] font-bold">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-80" />
                        Praise God! Zero members currently on the Sunday Red List.
                      </td>
                    </tr>
                  ) : (
                    redListMembers.map((record) => (
                      <tr key={record.memberId} className="hover:bg-[#16285a] transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-white text-sm">
                            {record.memberName}
                          </p>
                          <p className="text-[10px] font-mono text-[#7b9dc7]">{record.memberId}</p>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-slate-300">
                          <a
                            href={`tel:${getCleanDialPhone(record.phone)}`}
                            className="flex items-center gap-1.5 text-[#00f0ff] hover:underline"
                          >
                            <Phone className="w-3 h-3" />
                            <span>{formatGhanaianPhone(record.phone)}</span>
                          </a>
                        </td>

                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-200">{record.cellGroup}</p>
                          <p className="text-[10px] text-[#a6c4eb] flex items-center gap-1">
                            <Shield className="w-3 h-3 text-[#00f0ff]" />
                            <span>{record.shepherdName}</span>
                          </p>
                        </td>

                        <td className="py-3.5 px-4">
                          {record.consecutiveMissedSundays === 1 ? (
                            <span className="px-2.5 py-1 text-[10px] font-extrabold bg-[#3b2500] text-[#ffc400] inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-[#ffc400]" />
                              1 Missed Sunday (Watch)
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 text-[10px] font-extrabold bg-[#3f0f1b] text-[#ff4069] inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-[#ff4069]" />
                              2 Consecutive Misses (Urgent)
                            </span>
                          )}
                          <p className="text-[10px] text-[#7b9dc7] mt-1">
                            Missed: {record.missedSundays.join(', ')}
                          </p>
                        </td>

                        <td className="py-3.5 px-4 text-slate-200">
                          <span className="font-mono text-emerald-400 font-bold">
                            {record.lastAttendedSunday || 'Not Recorded'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <p className="text-xs text-white font-medium">
                            {record.actionPrompt}
                          </p>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setOutreachTarget({
                                  isOpen: true,
                                  name: record.memberName,
                                  phone: formatGhanaianPhone(record.phone),
                                  category: record.consecutiveMissedSundays === 1 ? 'red_list_1' : 'red_list_2',
                                  consecutiveMissed: record.consecutiveMissedSundays,
                                  cellGroup: record.cellGroup,
                                  lastAttended: record.lastAttendedSunday
                                })
                              }
                              className="px-3 py-1.5 bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold cursor-pointer transition-colors inline-flex items-center gap-1 shadow-sm"
                              title="Send WhatsApp or SMS outreach message"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPresentMembers((prev) => ({ ...prev, [record.memberId]: true }));
                                setHasUnsavedChanges(true);
                              }}
                              className="px-3 py-1.5 bg-[#00f0ff] hover:bg-[#3bf2ff] text-[#070c1e] text-xs font-extrabold cursor-pointer transition-colors inline-flex items-center gap-1 shadow-sm"
                              title="Mark present for latest Sunday to immediately clear from Red List"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Mark Present</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CRITICAL ABSENTEE LIST (3+ Missed Sundays in a row) */}
      {activeTab === 'critical_absentee' && (
        <div className="space-y-6">
          {/* Explanation Banner */}
          <div className="p-5 bg-[#3d0c18] text-[#ff6b8b] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <UserX className="w-5 h-5 shrink-0 mt-0.5 text-[#ff6b8b]" />
              <div>
                <h3 className="font-extrabold text-white text-sm">
                  Critical Absentee Roster
                </h3>
                <p className="text-xs text-[#a6c4eb] mt-0.5">
                  Members who missed 3 or more consecutive Sundays
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="px-3 py-1 bg-[#ff6b8b] text-[#070c1e] text-xs font-black">
                {criticalAbsenteeMembers.length} Critical
              </span>
            </div>
          </div>

          {/* Critical Absentee Table */}
          <div className="bg-[#111d44] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-[#00f0ff] font-extrabold bg-[#0a122e]">
                    <th className="py-3 px-4">Member Name</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Shepherd Group</th>
                    <th className="py-3 px-4">Consecutive Sunday Absences</th>
                    <th className="py-3 px-4">Last Attended Sunday</th>
                    <th className="py-3 px-4">Pastoral Action</th>
                    <th className="py-3 px-4 text-right">Intervention</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#16285a]">
                  {criticalAbsenteeMembers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#00ff9d] font-bold">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-80" />
                        Zero members currently on the Critical Absentee List!
                      </td>
                    </tr>
                  ) : (
                    criticalAbsenteeMembers.map((record) => (
                      <tr key={record.memberId} className="hover:bg-[#16285a] transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-white text-sm">
                            {record.memberName}
                          </p>
                          <p className="text-[10px] font-mono text-[#7b9dc7]">{record.memberId}</p>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-slate-300">
                          <a
                            href={`tel:${getCleanDialPhone(record.phone)}`}
                            className="flex items-center gap-1.5 text-[#00f0ff] hover:underline"
                          >
                            <Phone className="w-3 h-3" />
                            <span>{formatGhanaianPhone(record.phone)}</span>
                          </a>
                        </td>

                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-200">{record.cellGroup}</p>
                          <p className="text-[10px] text-[#a6c4eb] flex items-center gap-1">
                            <Shield className="w-3 h-3 text-[#00f0ff]" />
                            <span>{record.shepherdName}</span>
                          </p>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 text-[10px] font-extrabold bg-[#4a0e1c] text-[#ff6b8b] inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-[#ff6b8b]" />
                            {record.consecutiveMissedSundays} Consecutive Sundays Missed
                          </span>
                          <p className="text-[10px] text-[#7b9dc7] mt-1">
                            Missed: {record.missedSundays.join(', ')}
                          </p>
                        </td>

                        <td className="py-3.5 px-4 text-slate-200">
                          <span className="font-mono text-amber-400 font-bold">
                            {record.lastAttendedSunday || 'Over 1 Month Ago'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <p className="text-xs text-white font-medium">
                            {record.actionPrompt}
                          </p>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setOutreachTarget({
                                  isOpen: true,
                                  name: record.memberName,
                                  phone: formatGhanaianPhone(record.phone),
                                  category: 'critical',
                                  consecutiveMissed: record.consecutiveMissedSundays,
                                  cellGroup: record.cellGroup,
                                  lastAttended: record.lastAttendedSunday
                                })
                              }
                              className="px-3 py-1.5 bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold cursor-pointer transition-colors inline-flex items-center gap-1 shadow-sm"
                              title="Send pastoral WhatsApp or SMS outreach message"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPresentMembers((prev) => ({ ...prev, [record.memberId]: true }));
                                setHasUnsavedChanges(true);
                              }}
                              className="px-3 py-1.5 bg-[#00ff9d] hover:bg-emerald-400 text-[#070c1e] text-xs font-extrabold cursor-pointer transition-colors inline-flex items-center gap-1 shadow-sm"
                              title="Mark re-engaged and present to restore to Good Standing"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Restore to Active</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Direct Outreach Modal */}
      <DirectOutreachModal
        isOpen={outreachTarget.isOpen}
        onClose={() => setOutreachTarget((prev) => ({ ...prev, isOpen: false }))}
        recipientName={outreachTarget.name}
        phone={outreachTarget.phone}
        category={outreachTarget.category}
        consecutiveMissed={outreachTarget.consecutiveMissed}
        cellGroup={outreachTarget.cellGroup}
        lastAttended={outreachTarget.lastAttended}
      />
    </div>
  );
};
