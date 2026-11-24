import React, { useEffect, useState } from 'react';
import {
  Users,
  CalendarCheck,
  BookOpen,
  CircleDollarSign,
  TrendingUp,
  CheckCircle2,
  Clock,
  Plus,
  ArrowRight,
  Shield,
  UserPlus,
  FileText,
  Phone,
  MessageSquare,
  AlertCircle,
  AlertTriangle,
  Bell,
  Printer
} from 'lucide-react';
import { useCMS } from '../../context/CMSContext';
import { BirthdayWidget } from '../common/BirthdayWidget';
import { supabase, isSupabaseConfigured } from '../../../backend/client';

interface ShepherdDashboardProps {
  onNavigate?: (screen: any) => void;
}

export const ShepherdDashboard: React.FC<ShepherdDashboardProps> = ({ onNavigate }) => {
  const {
    currentUser,
    visibleMembers,
    visibleAttendance,
    visibleCellMeetings,
    visibleTasks,
    visibleVisitors,
    visibleNotifications,
    markNotificationRead,
    redListMembers,
    criticalAbsenteeMembers
  } = useCMS();

  const flockCount = visibleMembers.length;
  const [ppitSummary, setPpitSummary] = useState<{
    sessionDate: string;
    presentCount: number;
    absentCount: number;
    totalCount: number;
  } | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !currentUser.isPpitShepherd) return;

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
      .channel(`shepherd-ppit-${currentUser.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ppit_summary' }, loadPpitSummary)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser.id, currentUser.isPpitShepherd]);

  const recentAssignmentNotifs = visibleNotifications.filter(
    (n) => n.type === 'assignment' && !n.read
  );

  const getLatestService = (category: 'sunday' | 'midweek' | 'vigil') => {
    const records = visibleAttendance.filter((record) => {
      const name = record.serviceName.toLowerCase();
      if (category === 'midweek') return name.includes('midweek') || name.includes('wednesday');
      if (category === 'vigil') return name.includes('prayer') || name.includes('vigil');
      return name.includes('sunday') || name.includes('communion');
    });
    const latestDate = records.reduce((latest, record) =>
      record.serviceDate > latest ? record.serviceDate : latest, '');
    const latest = records.filter((record) => record.serviceDate === latestDate);
    return {
      latestDate,
      present: latest.filter((record) => record.status === 'Present').length,
      absent: latest.filter((record) => record.status === 'Absent').length
    };
  };

  const latestSunday = getLatestService('sunday');
  const latestMidweek = getLatestService('midweek');
  const latestVigil = getLatestService('vigil');
  const sundayPresent = latestSunday.present;
  const sundayAbsent = latestSunday.absent;
  const sundayRate = flockCount > 0
    ? Math.round((sundayPresent / Math.max(flockCount, sundayPresent + sundayAbsent)) * 100)
    : 0;

  const totalCellMeetings = visibleCellMeetings.length;
  const totalCellAttendees = visibleCellMeetings.reduce((sum, m) => sum + (m.attendeesCount || 0), 0);
  const avgCellAttendance = totalCellMeetings > 0 ? Math.round(totalCellAttendees / totalCellMeetings) : 0;

  const totalCellOfferings = visibleCellMeetings.reduce((sum, m) => sum + (m.offeringAmount || 0), 0);

  const openTasks = visibleTasks.filter((t) => t.status === 'Open');
  const activeVisitors = visibleVisitors.filter((visitor) =>
    visitor.journeyStage !== 'Closed'
  ).length;
  const stageCounts = [
    'New Convert',
    'Water Baptized',
    'Foundation Class',
    'Commissioned Worker',
    'Deacon / Deaconess',
    'Minister / Elder'
  ].map((stage) => ({
    stage,
    count: visibleMembers.filter((member) => member.spiritualStage === stage).length
  }));

  const recentActivity = [
    ...visibleCellMeetings.slice(0, 3).map((meeting) => ({
      title: `${meeting.topic}`,
      detail: `${meeting.attendeesCount} attendees • GH₵ ${meeting.offeringAmount.toFixed(2)}`,
      time: meeting.date,
      tone: '#a78bfa'
    })),
    ...openTasks.slice(0, 3).map((task) => ({
      title: `${task.memberName}: ${task.taskType}`,
      detail: task.nextAction || task.notes || 'Care follow-up',
      time: task.dueDate || 'Open task',
      tone: '#ff4069'
    }))
  ].slice(0, 5);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="p-6 bg-[#111d44] shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#00f0ff] text-xs font-bold uppercase tracking-wider">
            <Shield className="w-3.5 h-3.5" />
            <span>Shepherd Operating Dashboard</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight mt-0.5">
            Welcome, {currentUser.name}
          </h2>
          <p className="text-xs text-[#a6c4eb] mt-0.5">
            Shepherd Group: <strong className="text-white">{currentUser.assignedCell}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-[#16285a] hover:bg-[#1c3066] text-[#cbd5e1] text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-[#00f0ff]" />
            <span>Print Summary</span>
          </button>
          <span className="px-3 py-1.5 bg-[#043621] text-[#00ff9d] text-xs font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 bg-[#00ff9d]" />
            Live Shepherd Console
          </span>
        </div>
      </div>

      {/* Red List Alert Banner for Shepherd */}
      {redListMembers.length > 0 && (
        <div className="p-4 bg-[#3b0f1a] text-[#ff4069] text-xs flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-[#ff4069] shrink-0" />
            <div>
              <p className="font-bold text-white text-sm">
                Sunday Red List Alert ({redListMembers.length} member{redListMembers.length > 1 ? 's' : ''})
              </p>
              <p className="text-[#a6c4eb] mt-0.5">
                {redListMembers.map((r) => `${r.memberName} (${r.consecutiveMissedSundays} missed)`).join(' • ')} — Please check in.
              </p>
            </div>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('attendance')}
              className="px-3 py-1.5 bg-[#ff4069] text-[#070c1e] text-xs font-black shrink-0 cursor-pointer transition-colors"
            >
              Open Red List
            </button>
          )}
        </div>
      )}

      {/* New Member Assignment Alert Banner */}
      {recentAssignmentNotifs.length > 0 && (
        <div className="p-4 bg-[#072e54] text-[#00f0ff] text-xs flex items-start justify-between gap-3 shadow-md">
          <div className="flex items-start gap-3">
            <Bell className="w-5 h-5 text-[#00f0ff] shrink-0 mt-0.5 animate-bounce" />
            <div className="space-y-1">
              <p className="font-bold text-white text-sm">
                New Member Assigned to Your Shepherd Group!
              </p>
              <p className="text-[#a6c4eb]">
                {recentAssignmentNotifs[0].message}
              </p>
            </div>
          </div>
          <button
            onClick={() => markNotificationRead(recentAssignmentNotifs[0].id)}
            className="px-3 py-1.5 bg-[#16285a] hover:bg-[#00f0ff] hover:text-[#070c1e] text-[#00f0ff] text-xs font-bold shrink-0 cursor-pointer transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Core operational KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. Cell Flock */}
        <div className="p-5 bg-[#111d44] shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#a6c4eb] font-medium">Shepherd Group Size</span>
            <div className="w-8 h-8 bg-[#0a122e] flex items-center justify-center text-[#00f0ff]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#00f0ff] font-mono">{flockCount} Members</div>
          <p className="text-xs text-[#a6c4eb]">
            Assigned to <span className="text-white font-semibold">{currentUser.assignedCell}</span>
          </p>
        </div>

        {/* 2. Sunday Service Attendance */}
        <div className="p-5 bg-[#111d44] shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#a6c4eb] font-medium">Sunday Church Attendance</span>
            <div className="w-8 h-8 bg-[#0a122e] flex items-center justify-center text-[#3b82f6]">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#60a5fa] font-mono">
            {sundayPresent} / {flockCount}
          </div>
          <p className="text-xs text-[#a6c4eb]">
            <span className="text-[#00ff9d] font-bold">{sundayRate}% attendance rate</span> • joint communion
          </p>
        </div>

        {/* 3. Cell Meetings Attendance */}
        <div className="p-5 bg-[#111d44] shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#a6c4eb] font-medium">Cell Meetings Attendance</span>
            <div className="w-8 h-8 bg-[#0a122e] flex items-center justify-center text-[#00ff9d]">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#00ff9d] font-mono">
            {totalCellAttendees} Attendees
          </div>
          <p className="text-xs text-[#a6c4eb]">
            {totalCellMeetings} meetings held • Avg {avgCellAttendance} per meeting
          </p>
        </div>

        {/* 4. Cell Meeting Offerings ONLY */}
        <div className="p-5 bg-[#111d44] shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#a6c4eb] font-medium">Cell Meeting Offerings</span>
            <div className="w-8 h-8 bg-[#0a122e] flex items-center justify-center text-amber-400">
              <CircleDollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-300 font-mono">
            GH₵ {totalCellOfferings.toFixed(2)}
          </div>
          <p className="text-[11px] text-[#a6c4eb]">
            Cell fellowship offerings
          </p>
        </div>

        <div className="p-5 bg-[#111d44] shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#a6c4eb] font-medium">Active First-Timers</span>
            <div className="w-8 h-8 bg-[#0a122e] flex items-center justify-center text-[#00f0ff]">
              <Phone className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#00f0ff] font-mono">{activeVisitors}</div>
          <p className="text-xs text-[#a6c4eb]">
            {openTasks.length} open care tasks
          </p>
        </div>

        {currentUser.isPpitShepherd && (
          <div className="p-5 bg-[#111d44] shadow-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#a6c4eb] font-medium">Latest PPIT Attendance</span>
              <div className="w-8 h-8 bg-[#0a122e] flex items-center justify-center text-[#a78bfa]">
                <CalendarCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-[#a78bfa] font-mono">
              {ppitSummary ? `${ppitSummary.presentCount} / ${ppitSummary.totalCount}` : 'Not Recorded'}
            </div>
            <p className="text-xs text-[#a6c4eb]">
              {ppitSummary ? `${ppitSummary.sessionDate} • ${ppitSummary.absentCount} absent` : 'PPIT updates in real time'}
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 p-6 bg-[#111d44] shadow-xl space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Service Attendance Overview</h3>
            <p className="text-xs text-[#a6c4eb] mt-0.5">Latest recorded session for each service</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: 'Sunday', data: latestSunday, color: '#00f0ff' },
              { label: 'Midweek', data: latestMidweek, color: '#60a5fa' },
              { label: 'Friday Prayer', data: latestVigil, color: '#a78bfa' }
            ].map((service) => (
              <div key={service.label} className="p-4 bg-[#0a122e]">
                <p className="text-[10px] font-bold uppercase" style={{ color: service.color }}>{service.label}</p>
                <p className="text-xl font-bold text-white mt-1">
                  {service.data.present} Present
                </p>
                <p className="text-[11px] text-[#ff4069] mt-1">{service.data.absent} Absent</p>
                <p className="text-[10px] text-[#7b9dc7] mt-2 font-mono">
                  {service.data.latestDate || 'No record'}
                </p>
              </div>
            ))}
          </div>
          <div className="pt-2">
            <p className="text-[10px] text-[#a6c4eb] font-bold uppercase mb-2">Flock Spiritual Growth</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {stageCounts.map(({ stage, count }) => (
                <div key={stage} className="px-3 py-2 bg-[#0a122e]">
                  <p className="text-[9px] text-[#a6c4eb] truncate">{stage}</p>
                  <p className="text-sm font-bold text-white mt-0.5">{count}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 p-6 bg-[#111d44] shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Live Queue</h3>
              <p className="text-[11px] text-[#a6c4eb]">Recent shepherd activity</p>
            </div>
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#00ff9d]">
              <span className="w-2 h-2 bg-[#00ff9d] animate-pulse" />
              LIVE
            </span>
          </div>
          <div className="divide-y divide-[#16285a]">
            {recentActivity.length === 0 ? (
              <p className="py-8 text-center text-xs text-[#a6c4eb]">No recent activity</p>
            ) : recentActivity.map((item, index) => (
              <div key={`${item.title}-${index}`} className="py-3 flex gap-3">
                <span className="mt-1.5 w-2 h-2 shrink-0" style={{ backgroundColor: item.tone }} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white line-clamp-2">{item.title}</p>
                  <p className="text-[10px] text-[#a6c4eb] mt-1">{item.detail}</p>
                  <p className="text-[10px] text-[#7b9dc7] mt-1 font-mono">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid: Cell Meetings & Sunday Attendance Roll */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Cell Meetings & Sunday Roster */}
        <div className="lg:col-span-8 space-y-6">
          {/* Cell Fellowship Meetings Log */}
          <div className="p-6 bg-[#111d44] shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#00f0ff]" />
                  <span>My Cell Fellowship Meetings</span>
                </h3>
                <p className="text-xs text-[#a6c4eb] mt-0.5">
                  Recent fellowship meetings
                </p>
              </div>
              <span className="text-xs text-[#a6c4eb]">
                {visibleCellMeetings.length} Records
              </span>
            </div>

            {visibleCellMeetings.length === 0 ? (
              <div className="py-8 text-center text-[#a6c4eb] text-xs">
                No data recorded yet
              </div>
            ) : (
              <div className="space-y-2.5">
                {[...visibleCellMeetings].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map((mtg) => (
                  <div
                    key={mtg.id}
                    className="p-4 bg-[#0a122e] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <p className="font-bold text-white">{mtg.topic}</p>
                      <p className="text-[#a6c4eb] text-[11px] mt-0.5 line-clamp-1">{mtg.notes}</p>
                      <p className="text-[10px] text-[#a6c4eb] mt-1 font-mono">Date: {mtg.date}</p>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] uppercase text-[#a6c4eb] block font-semibold">Attendees</span>
                        <span className="font-bold text-white font-mono">{mtg.attendeesCount} Souls</span>
                      </div>
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] uppercase text-[#a6c4eb] block font-semibold">Cell Offering</span>
                        <span className="font-bold text-amber-300 font-mono">GH₵ {(mtg.offeringAmount || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sunday Service Attendance Roll for this Cell */}
          <div className="p-6 bg-[#111d44] shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-[#3b82f6]" />
                  <span>Sunday Service Attendance Checklist</span>
                </h3>
                <p className="text-xs text-[#a6c4eb] mt-0.5">
                  Sunday roll &amp; absences
                </p>
              </div>
              <span className="text-xs font-bold text-[#00f0ff] bg-[#072e54] px-3 py-1">
                {sundayPresent} Present • {sundayAbsent} Absent
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-[#a6c4eb] font-bold bg-[#0a122e]">
                    <th className="py-2.5 px-3">Member Name</th>
                    <th className="py-2.5 px-3">Telephone</th>
                    <th className="py-2.5 px-3">Spiritual Stage</th>
                    <th className="py-2.5 px-3 text-right">Sunday Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#16285a]">
                  {visibleMembers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-[#a6c4eb] text-xs">
                        No data recorded yet
                      </td>
                    </tr>
                  ) : (
                    visibleMembers.map((m) => {
                      const record = visibleAttendance.find((a) => a.memberId === m.id);
                      const isPresent = record?.status === 'Present';
                      return (
                        <tr key={m.id} className="hover:bg-[#16285a] transition-colors">
                          <td className="py-2.5 px-3 font-bold text-white">
                            {m.firstName} {m.lastName}
                          </td>
                          <td className="py-2.5 px-3 text-slate-300 font-mono">
                            {m.phone}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 text-[10px] bg-[#16285a] text-[#00f0ff] font-semibold">
                              {m.spiritualStage}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span
                              className={`px-2 py-0.5  text-[10px] font-bold ${
                                isPresent
                                  ? 'bg-[#043621] text-[#00ff9d]'
                                  : 'bg-[#38141e] text-[#ff6b8b]'
                              }`}
                            >
                              {record?.status || 'Not Checked'}
                            </span>
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

        {/* Right Column (4 cols): Care Alerts & Collated Notice */}
        <div className="lg:col-span-4 space-y-5">
          {onNavigate && (
            <div className="p-5 bg-[#111d44] shadow-xl space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Attendance', screen: 'attendance' as const, icon: CalendarCheck },
                  { label: 'Add Guest', screen: 'first-timers' as const, icon: UserPlus },
                  { label: 'Care Tasks', screen: 'care' as const, icon: Shield },
                  { label: 'Submit Report', screen: 'reports' as const, icon: FileText }
                ].map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.label}
                      type="button"
                      onClick={() => onNavigate(action.screen)}
                      className="p-3 bg-[#0a122e] hover:bg-[#16285a] text-[#a6c4eb] hover:text-white text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Icon className="w-4 h-4 text-[#00f0ff]" />
                      {action.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pastor Collation Notice */}
          <div className="p-5 bg-[#072e54] space-y-2">
            <div className="flex items-center gap-2 text-[#00f0ff] text-xs font-bold uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Collation Status: Active</span>
            </div>
            <p className="text-xs text-[#a6c4eb] leading-relaxed">
              Everything you record here — your cell attendance, cell fellowship offerings, and member follow-ups — is automatically compiled on <strong className="text-white">the Pastor's Admin Console</strong>.
            </p>
          </div>

          {/* Shepherd Group Birthdays */}
          <BirthdayWidget
            members={visibleMembers}
            title="Shepherd Group Birthdays"
            subtitle={`Celebrations for members in ${currentUser.assignedCell || 'your flock'}`}
          />

          {/* Pending Follow-up Tasks */}
          <div className="p-5 bg-[#111d44] shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Pending Care Tasks ({openTasks.length})</span>
              </h3>
            </div>

            {openTasks.length === 0 ? (
              <p className="text-[#a6c4eb] text-xs py-3 text-center">
                All member care tasks are up to date!
              </p>
            ) : (
              <div className="space-y-2">
                {openTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-3.5 bg-[#0a122e] space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{t.memberName}</span>
                      <span className="text-[10px] text-amber-400 font-mono font-bold">{t.dueDate}</span>
                    </div>
                    <p className="text-[#a6c4eb] text-[11px]">{t.notes}</p>
                    <p className="text-[10px] text-[#00f0ff] font-semibold">Action: {t.nextAction}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Direct Member Reach */}
          <div className="p-5 bg-[#111d44] shadow-xl space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Quick Member Contact
            </h3>
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {visibleMembers.length === 0 ? (
                <div className="py-4 text-center text-[#a6c4eb] text-xs">
                  No data recorded yet
                </div>
              ) : (
                visibleMembers.map((m) => (
                <div
                  key={m.id}
                  className="p-3 bg-[#0a122e] flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-white truncate">
                      {m.firstName} {m.lastName}
                    </p>
                    <p className="text-[10px] text-[#a6c4eb] font-mono truncate">{m.phone}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <a
                      href={`tel:${m.phone}`}
                      className="p-2 bg-[#16285a] hover:bg-[#00ff9d] text-[#cbd5e1] hover:text-[#070c1e] transition-colors"
                      title="Voice Call"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                    <a
                      href={`sms:${m.phone}`}
                      className="p-2 bg-[#16285a] hover:bg-[#00f0ff] text-[#cbd5e1] hover:text-[#070c1e] transition-colors"
                      title="SMS Message"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShepherdDashboard;
