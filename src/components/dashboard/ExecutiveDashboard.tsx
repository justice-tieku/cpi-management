import React, { useEffect, useState } from 'react';
import {
  Users,
  CalendarCheck,
  UserPlus,
  BookOpen,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ChevronRight,
  Eye,
  X,
  Phone,
  FileText,
  Printer,
  AlertTriangle,
  UserX
} from 'lucide-react';
import { useCMS } from '../../context/CMSContext';
import { AttendanceGrowthCharts } from './AttendanceGrowthCharts';
import { BirthdayWidget } from '../common/BirthdayWidget';
import { supabase, isSupabaseConfigured } from '../../../backend/client';

export const ExecutiveDashboard: React.FC = () => {
  const {
    currentUser,
    members,
    shepherds,
    attendanceRecords,
    cellMeetings,
    followUpTasks,
    visitors,
    shepherdReports,
    redListMembers,
    criticalAbsenteeMembers
  } = useCMS();

  const [selectedShepherdId, setSelectedShepherdId] = useState<string | null>(null);
  const [ppitSummary, setPpitSummary] = useState<{
    sessionDate: string;
    presentCount: number;
    absentCount: number;
    totalCount: number;
  } | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const loadPpitSummary = async () => {
      const { data } = await (supabase.from('ppit_summary') as any)
        .select('*')
        .order('session_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setPpitSummary({
          sessionDate: data.session_date,
          presentCount: data.present_count,
          absentCount: data.absent_count,
          totalCount: data.total_count
        });
      }
    };

    loadPpitSummary();
    const channel = supabase
      .channel('ppit-dashboard-summary')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ppit_summary' }, loadPpitSummary)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Derive dynamic metrics
  const totalSouls = members.length;
  const sundayAttendanceCount = attendanceRecords.filter((a) => a.status === 'Present').length;
  const activeVisitorsCount = visitors.length;
  const weeklyCellMeetingsCount = cellMeetings.length;

  const kpiData = [
    {
      title: 'Total Souls in Care',
      value: `${totalSouls} Members`,
      change: '+100% assigned to shepherds',
      subtext: 'Canonical church roll',
      icon: Users
    },
    {
      title: 'Sunday Attendance',
      value: `${sundayAttendanceCount} Present`,
      change: 'Latest Communion service',
      subtext: 'Live attendance roll',
      icon: CalendarCheck
    },
    {
      title: 'Active First-Timers',
      value: `${activeVisitorsCount} Guests`,
      change: 'Assigned to care shepherds',
      subtext: 'In follow-up queue',
      icon: UserPlus
    },
    {
      title: 'Weekly Cell Meetings',
      value: `${weeklyCellMeetingsCount} Meetings Held`,
      change: 'Cell fellowship network',
      subtext: 'Offerings & Bible studies',
      icon: BookOpen
    },
    {
      title: 'Latest PPIT',
      value: ppitSummary ? `${ppitSummary.presentCount} / ${ppitSummary.totalCount} Present` : 'No PPIT recorded',
      change: ppitSummary ? ppitSummary.sessionDate : 'Waiting for PPIT shepherd',
      subtext: ppitSummary ? `${ppitSummary.absentCount} absent` : 'Summary updates in real time',
      icon: CalendarCheck
    }
  ];

  // Selected shepherd dossier data for modal
  const selectedShepherd = shepherds.find((s) => s.id === selectedShepherdId);
  const selectedShepherdMembers = members.filter(
    (m) => m.currentShepherdId === selectedShepherdId || m.cellGroup === selectedShepherd?.cell
  );
  const selectedShepherdMeetings = cellMeetings.filter(
    (cm) => cm.shepherdId === selectedShepherdId || cm.cellName === selectedShepherd?.cell
  );
  const selectedShepherdTasks = followUpTasks.filter((t) => t.shepherdId === selectedShepherdId);
  const selectedShepherdReports = shepherdReports.filter((r) => r.shepherdId === selectedShepherdId);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 bg-[#111d44] shadow-xl">
        <div>
          <span className="text-xs font-bold text-[#00f0ff] uppercase tracking-wider block">
            Pastor Console • Cross Passion International
          </span>
          <h2 className="text-xl font-bold text-white tracking-tight mt-0.5">
            Executive Dashboard
          </h2>
          <p className="text-xs text-[#a6c4eb]">
            {currentUser.name} • {currentUser.branch}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-[#16285a] hover:bg-[#1c3066] text-[#cbd5e1] text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-[#00f0ff]" />
            <span>Print Report</span>
          </button>
          <span className="px-3 py-1.5 bg-[#072e54] text-[#00f0ff] text-xs font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 bg-[#00ff9d]" />
            5 Shepherd Groups Active
          </span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiData.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="p-5 bg-[#111d44] shadow-xl"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#a6c4eb] font-medium">
                  {kpi.title}
                </span>
                <div className="w-8 h-8 bg-[#0a122e] flex items-center justify-center text-[#00f0ff]">
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-[#00f0ff] tracking-tight">
                {kpi.value}
              </div>
              <p className="text-xs text-[#00ff9d] font-semibold mt-1">
                {kpi.change}
              </p>
              <p className="text-[11px] text-[#a6c4eb] mt-2 pt-2">
                {kpi.subtext}
              </p>
            </div>
          );
        })}
      </div>

      {/* Analytics — Full-Width Charts, Birthday stacked below on mobile */}
      <div className="space-y-6">
        <AttendanceGrowthCharts />
        <BirthdayWidget
          members={members}
          title="Church Birthday Roster"
          subtitle="Upcoming celebrations across all shepherd groups"
        />
      </div>

      {/* Weekly Shepherd Activity Compilation */}
      <div className="p-6 bg-[#111d44] shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wide">
              Weekly Shepherd Activity
            </h3>
            <p className="text-xs text-[#a6c4eb]">
              Compiled weekly reports submitted by shepherds
            </p>
          </div>
          <span className="text-xs text-[#00f0ff] bg-[#072e54] px-3 py-1 font-bold">
            Pastoral View: All 5 Shepherds
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-[#a6c4eb] font-bold bg-[#0a122e]">
                <th className="py-3 px-3">Shepherd</th>
                <th className="py-3 px-3">Shepherd Group</th>
                <th className="py-3 px-3">Flock Count</th>
                <th className="py-3 px-3">Cell Meeting Held</th>
                <th className="py-3 px-3">Cell Offering</th>
                <th className="py-3 px-3">Follow-Ups</th>
                <th className="py-3 px-3">Weekly Report</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#16285a]">
              {shepherds.map((sh) => {
                const assigned = members.filter(
                  (m) => m.currentShepherdId === sh.id || m.cellGroup === sh.cell
                );
                const meetings = cellMeetings.filter(
                  (cm) => cm.shepherdId === sh.id || cm.cellName === sh.cell
                );
                const tasks = followUpTasks.filter((t) => t.shepherdId === sh.id);
                const report = shepherdReports.find((r) => r.shepherdId === sh.id);
                const latestMeeting = meetings[0];
                const totalOffering = meetings.reduce((sum, m) => sum + (m.offeringAmount || 0), 0);

                return (
                  <tr key={sh.id} className="hover:bg-[#16285a] transition-colors">
                    <td className="py-3 px-3">
                      <p className="font-bold text-white">{sh.name}</p>
                      <p className="text-[10px] text-[#a6c4eb] font-mono">{sh.id}</p>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-slate-300">{sh.cell}</span>
                    </td>
                    <td className="py-3 px-3 font-mono">
                      <strong className="text-white">{assigned.length}</strong> / {sh.maxCapacity}
                    </td>
                    <td className="py-3 px-3">
                      {latestMeeting ? (
                        <div>
                          <p className="text-[#00ff9d] font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                            <span>{latestMeeting.topic}</span>
                          </p>
                          <p className="text-[10px] text-[#a6c4eb]">
                            {latestMeeting.attendeesCount} attended • {latestMeeting.date}
                          </p>
                        </div>
                      ) : (
                        <span className="text-[#a6c4eb] text-[11px]">No meeting this week</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-amber-300 font-bold">
                      GH₵ {totalOffering.toFixed(2)}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-slate-300">
                        {tasks.filter((t) => t.status === 'Completed').length} done / {tasks.length} total
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5  text-[10px] font-bold ${
                          report?.status === 'Approved'
                            ? 'bg-[#043621] text-[#00ff9d]'
                            : report?.status === 'Submitted'
                            ? 'bg-[#072e54] text-[#00f0ff]'
                            : 'bg-[#16285a] text-[#a6c4eb]'
                        }`}
                      >
                        {report?.status || 'Pending'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedShepherdId(sh.id)}
                        className="px-3 py-1.5 bg-[#16285a] hover:bg-[#00f0ff] hover:text-[#070c1e] text-[#cbd5e1] text-xs font-bold flex items-center gap-1 ml-auto cursor-pointer transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Dossier</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pastoral Attention & Red List Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-[#3b0f1a] text-[#ff4069] shadow-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-[#ff4069] shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-white uppercase tracking-wider">
              Sunday Red List ({redListMembers.length})
            </p>
            <p className="text-xs text-[#a6c4eb] mt-1 leading-relaxed">
              {redListMembers.length > 0
                ? redListMembers.map((r) => `${r.memberName} (${r.consecutiveMissedSundays} missed)`).join(', ')
                : 'All members attended the latest Sunday.'}
            </p>
          </div>
        </div>

        <div className="p-5 bg-[#3d0c18] text-[#ff6b8b] shadow-xl flex items-start gap-3">
          <UserX className="w-5 h-5 text-[#ff6b8b] shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-white uppercase tracking-wider">
              Critical Absentees ({criticalAbsenteeMembers.length})
            </p>
            <p className="text-xs text-[#a6c4eb] mt-1 leading-relaxed">
              {criticalAbsenteeMembers.length > 0
                ? criticalAbsenteeMembers.map((r) => `${r.memberName} (${r.consecutiveMissedSundays}+ missed)`).join(', ')
                : 'No members on critical 3+ absence roster.'}
            </p>
          </div>
        </div>

        <div className="p-5 bg-[#111d44] shadow-xl flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-white uppercase tracking-wider">
              First-Timers Welcome ({activeVisitorsCount})
            </p>
            <p className="text-xs text-[#a6c4eb] mt-1 leading-relaxed">
              {activeVisitorsCount} new guests registered for follow-up.
            </p>
          </div>
        </div>
      </div>

      {/* PASTOR MODAL: Individual Shepherd Full Dossier */}
      {selectedShepherd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#111d44] w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6">
              <div>
                <p className="text-[10px] uppercase font-bold text-[#00f0ff] tracking-wider">
                  Shepherd Dossier &amp; Weekly Activity
                </p>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  {selectedShepherd.name}
                </h3>
                <p className="text-xs text-[#a6c4eb]">
                  {selectedShepherd.cell} • ID: {selectedShepherd.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedShepherdId(null)}
                className="p-1.5 text-[#a6c4eb] hover:text-white hover:bg-[#16285a] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Section 1: Assigned Members */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#00f0ff]" />
                    <span>Assigned Members ({selectedShepherdMembers.length})</span>
                  </h4>
                  <span className="text-[11px] text-[#a6c4eb]">
                    Capacity: {selectedShepherd.maxCapacity} Max
                  </span>
                </div>

                <div className="bg-[#0a122e] divide-y divide-[#16285a]">
                  {selectedShepherdMembers.length === 0 ? (
                    <div className="p-4 text-xs text-[#a6c4eb] text-center">
                      No data recorded yet
                    </div>
                  ) : (
                    selectedShepherdMembers.map((m) => (
                      <div key={m.id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                        <div>
                          <p className="font-bold text-white">
                            {m.firstName} {m.lastName}
                          </p>
                          <p className="text-[10px] text-[#a6c4eb] font-mono">{m.phone}</p>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 text-[10px] bg-[#16285a] text-[#00f0ff] font-semibold">
                            {m.spiritualStage}
                          </span>
                          <p className="text-[10px] text-[#a6c4eb] mt-0.5">Enrolled: {m.registeredAt}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Section 2: Cell Meetings & Offerings */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                  <span>Cell Fellowship Meetings &amp; Offerings</span>
                </h4>

                <div className="bg-[#0a122e] divide-y divide-[#16285a]">
                  {selectedShepherdMeetings.length === 0 ? (
                    <div className="p-4 text-xs text-[#a6c4eb] text-center">
                      No data recorded yet
                    </div>
                  ) : (
                    selectedShepherdMeetings.map((cm) => (
                      <div key={cm.id} className="p-3.5 space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">{cm.topic}</span>
                          <span className="font-mono text-amber-300 font-bold">GH₵ {(cm.offeringAmount || 0).toFixed(2)} Offering</span>
                        </div>
                        <p className="text-[#a6c4eb] text-[11px]">{cm.notes}</p>
                        <p className="text-[10px] text-[#a6c4eb]">
                          Date: {cm.date} • Attendees: {cm.attendeesCount}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Section 3: Follow-Up Tasks */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#00f0ff]" />
                  <span>Member Follow-Up Tasks ({selectedShepherdTasks.length})</span>
                </h4>

                <div className="bg-[#0a122e] divide-y divide-[#16285a]">
                  {selectedShepherdTasks.length === 0 ? (
                    <div className="p-4 text-xs text-[#a6c4eb] text-center">
                      No data recorded yet
                    </div>
                  ) : (
                    selectedShepherdTasks.map((t) => (
                      <div key={t.id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                        <div>
                          <p className="font-bold text-white">{t.memberName}</p>
                          <p className="text-[#a6c4eb] text-[11px]">{t.notes}</p>
                        </div>
                        <div className="text-right">
                          <span
                            className={`px-2 py-0.5  text-[10px] font-bold ${
                              t.status === 'Completed'
                                ? 'bg-[#043621] text-[#00ff9d]'
                                : 'bg-[#072e54] text-[#00f0ff]'
                            }`}
                          >
                            {t.status}
                          </span>
                          <p className="text-[10px] text-[#a6c4eb] mt-0.5">{t.dueDate}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Section 4: Submitted Reports */}
              {selectedShepherdReports.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#00ff9d]" />
                    <span>Monthly / Weekly Shepherd Report</span>
                  </h4>
                  {selectedShepherdReports.map((rpt) => (
                    <div key={rpt.id} className="p-4 bg-[#0a122e] text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{rpt.period}</span>
                        <span className="text-[#00ff9d] font-bold">{rpt.status}</span>
                      </div>
                      <p className="text-slate-300 text-[11px]">{rpt.narrative}</p>
                      <div className="flex gap-4 text-[10px] text-[#a6c4eb] pt-1">
                        <span>Attendance: {rpt.attendanceAvgRate}%</span>
                        <span>Follow-ups: {rpt.followUpsCompleted}</span>
                        <span>Souls in care: {rpt.assignedSoulsCount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-5 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedShepherdId(null)}
                className="px-5 py-2.5 bg-[#00f0ff] hover:bg-[#3bf2ff] text-[#070c1e] text-xs font-extrabold cursor-pointer transition-colors"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExecutiveDashboard;
