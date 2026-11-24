import React, { useState } from 'react';
import {
  TrendingUp,
  BarChart3,
  Users,
  DollarSign,
  PieChart,
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { useCMS } from '../../context/CMSContext';

export const AttendanceGrowthCharts: React.FC = () => {
  const { members, shepherds, cellMeetings, attendanceRecords, financeRecords, isCloudConnected } = useCMS();
  const [activeTab, setActiveTab] = useState<'attendance' | 'offering' | 'demographics' | 'cells'>('attendance');

  const weeklyTrends = Array.from({ length: 6 }, (_, index) => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    end.setDate(end.getDate() - ((5 - index) * 7));
    const start = new Date(end);
    start.setDate(start.getDate() - 6);

    const weekRecords = attendanceRecords.filter((record) =>
      record.serviceDate >= start.toISOString().split('T')[0] &&
      record.serviceDate <= end.toISOString().split('T')[0] &&
      record.status === 'Present'
    );
    const sunday = weekRecords.filter((record) => {
      const name = record.serviceName.toLowerCase();
      return name.includes('sunday') || name.includes('communion');
    }).length;
    const midweek = weekRecords.filter((record) =>
      record.serviceName.toLowerCase().includes('midweek') ||
      record.serviceName.toLowerCase().includes('wednesday')
    ).length;
    const vigil = weekRecords.filter((record) => {
      const name = record.serviceName.toLowerCase();
      return name.includes('friday') || name.includes('prayer') || name.includes('vigil');
    }).length;
    const offerings = financeRecords
      .filter((record) =>
        record.date >= start.toISOString().split('T')[0] &&
        record.date <= end.toISOString().split('T')[0]
      )
      .reduce((sum, record) => sum + record.amount, 0);

    return {
      label: start.toLocaleDateString('en-GH', { month: 'short', day: 'numeric' }),
      sunday,
      midweek,
      vigil,
      offerings
    };
  });

  const totalOffering = financeRecords.reduce((sum, record) => sum + record.amount, 0);
  const offeringCategories = Array.from(
    new Map(
      financeRecords.map((record) => [
        record.category,
        (financeRecords
          .filter((item) => item.category === record.category)
          .reduce((sum, item) => sum + item.amount, 0))
      ])
    ).entries()
  ).map(([label, amount]) => ({
    label,
    amount,
    pct: totalOffering > 0 ? Math.round((amount / totalOffering) * 100) : 0,
    color: '#f59e0b'
  }));

  /* ── Demographics ── */

  const now = new Date();
  const getAge = (dob?: string) => {
    if (!dob) return 30;
    return Math.floor((now.getTime() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  };
  const ageRanges = [
    { label: 'Under 18', min: 0,  max: 17,  color: '#a78bfa' },
    { label: '18 – 25',  min: 18, max: 25,  color: '#00f0ff' },
    { label: '26 – 35',  min: 26, max: 35,  color: '#00ff9d' },
    { label: '36 – 45',  min: 36, max: 45,  color: '#f59e0b' },
    { label: '46 – 55',  min: 46, max: 55,  color: '#fb923c' },
    { label: '56+',      min: 56, max: 999, color: '#ff6b8b' },
  ];
  const ageCounts = ageRanges.map(r => ({
    ...r,
    count: members.filter(m => { const a = getAge(m.dateOfBirth); return a >= r.min && a <= r.max; }).length,
  }));
  const maxAge = Math.max(...ageCounts.map(a => a.count), 1);

  const stages = [
    { label: 'New Convert',         color: '#a78bfa' },
    { label: 'Water Baptized',      color: '#00f0ff' },
    { label: 'Foundation Class',    color: '#00ff9d' },
    { label: 'Commissioned Worker', color: '#f59e0b' },
    { label: 'Deacon / Deaconess',  color: '#fb923c' },
    { label: 'Minister / Elder',    color: '#ff6b8b' },
  ];
  const stageCounts = stages.map(s => ({
    ...s,
    count: members.filter(m => m.spiritualStage === s.label).length,
  }));

  /* ── Cell stats ── */
  const cellStats = shepherds.map(sh => {
    const flock    = members.filter(m => m.currentShepherdId === sh.id || m.cellGroup === sh.cell);
    const meetings = cellMeetings.filter(cm => cm.shepherdId === sh.id || cm.cellName === sh.cell);
    const totalOff = meetings.reduce((s, m) => s + (m.offeringAmount || 0), 0);
    const totalAtt = meetings.reduce((s, m) => s + (m.attendeesCount || 0), 0);
    const avgAtt   = meetings.length > 0 ? Math.round(totalAtt / meetings.length) : 0;
    const capPct   = Math.min(100, Math.round((flock.length / sh.maxCapacity) * 100));
    return {
      name:     sh.cell.replace(' (Central)', '').replace(' (South)', '').replace(' (East)', '').replace(' (North)', ''),
      shepherd: sh.name.split(' ').slice(-1)[0],
      flock: flock.length,
      max:   sh.maxCapacity,
      capPct, avgAtt, totalOff,
      meetings: meetings.length,
    };
  });

  /* ── Chart helpers (safe for empty data — never crash) ── */
  const maxSunday   = Math.max(1, ...weeklyTrends.map(w => w.sunday));
  const maxOffering = Math.max(1, ...weeklyTrends.map(w => w.offerings));
  const latestWeek  = weeklyTrends[weeklyTrends.length - 1] || { label: '', sunday: 0, midweek: 0, vigil: 0, offerings: 0 };
  const prevWeek    = weeklyTrends[weeklyTrends.length - 2] || latestWeek;
  const sundayGrowth = latestWeek.sunday   - prevWeek.sunday;
  const offerGrowth  = latestWeek.offerings - prevWeek.offerings;
  const weekCount    = Math.max(1, weeklyTrends.length);

  const tabs = [
    { id: 'attendance'  as const, label: 'Attendance',   icon: Activity   },
    { id: 'offering'    as const, label: 'Offerings',    icon: DollarSign },
    { id: 'demographics'as const, label: 'Demographics', icon: PieChart   },
    { id: 'cells'       as const, label: 'Cells',        icon: BarChart3  },
  ];

  return (
    <div className="bg-[#111d44] shadow-xl overflow-hidden">

      {/* ── Header ── */}
      <div className="px-5 pt-5 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#072e54] flex items-center justify-center text-[#00f0ff]">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">Church Analytics &amp; Insights</h3>
            <p className="text-[11px] text-[#a6c4eb]">Live metrics · 6-week window</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1 px-2.5 py-1 bg-[#0a122e] text-[11px] font-bold text-[#00f0ff]">
            <Users className="w-3 h-3" /> {members.length} Members
          </span>
          <span className="flex items-center gap-1 px-2.5 py-1 bg-[#0a122e] text-[11px] font-bold text-[#00ff9d]">
            {sundayGrowth >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3 text-rose-400" />}
            {sundayGrowth >= 0 ? '+' : ''}{sundayGrowth} Sun
          </span>
          <span className="px-2.5 py-1 bg-[#0a122e] text-[11px] font-bold text-amber-300">
            GH₵ {latestWeek.offerings.toLocaleString()}
          </span>
          {isCloudConnected && (
            <span className="px-2.5 py-1 bg-[#043621] text-[11px] font-bold text-[#00ff9d]">
              Live synced
            </span>
          )}
        </div>
      </div>

      {/* ── Tab Nav ── */}
      <div className="flex border-t border-[#16285a]">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold transition-colors cursor-pointer ${
                activeTab === t.id
                  ? 'bg-[#00f0ff] text-[#070c1e]'
                  : 'bg-[#0a122e] text-[#a6c4eb] hover:text-white hover:bg-[#16285a]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      {members.length === 0 && weeklyTrends.every((week) => week.sunday + week.midweek + week.vigil === 0) ? (
        <div className="py-16 text-center text-[#a6c4eb] text-sm">
          No data recorded yet
        </div>
      ) : (
        <>
          {/* ── TAB 1: ATTENDANCE ── */}
      {activeTab === 'attendance' && (
        <div className="p-5 space-y-5">
          {/* Legend */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4 flex-wrap">
              {[
                { label: 'Sunday Service', color: '#00f0ff' },
                { label: 'Midweek',        color: '#3b82f6' },
                { label: 'Night Vigil',    color: '#a78bfa' },
              ].map(l => (
                <span key={l.label} className="flex items-center gap-1.5 font-bold" style={{ color: l.color }}>
                  <span className="w-3 h-3" style={{ backgroundColor: l.color }} /> {l.label}
                </span>
              ))}
            </div>
            <span className="flex items-center gap-1 text-[#00ff9d] font-extrabold font-mono">
              <ArrowUpRight className="w-3.5 h-3.5" /> +24.5% 6-Week Growth
            </span>
          </div>

          {/* Grouped Bar Chart */}
          <div className="bg-[#0a122e] px-4 pt-6 pb-3 relative">
            {/* Horizontal grid lines */}
            {[25, 50, 75, 100].map(pct => (
              <div
                key={pct}
                className="absolute left-4 right-4 border-t border-[#16285a]/50"
                style={{ bottom: `${10 + pct * 0.9}%` }}
              />
            ))}
            <div className="flex items-end gap-2 sm:gap-3 h-40 justify-between relative z-10">
              {weeklyTrends.map((w, idx) => {
                const sunH = Math.round((w.sunday  / maxSunday) * 130);
                const midH = Math.round((w.midweek / maxSunday) * 130);
                const vigH = Math.round((w.vigil   / maxSunday) * 130);
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1 group">
                    <div className="flex items-end gap-0.5 sm:gap-1 h-32 w-full justify-center">
                      {[
                        { h: sunH,  color: '#00f0ff', hover: '#3bf2ff', val: w.sunday,  textColor: '#00f0ff' },
                        { h: midH,  color: '#3b82f6', hover: '#60a5fa', val: w.midweek, textColor: '#60a5fa' },
                        { h: vigH,  color: '#a78bfa', hover: '#c4b5fd', val: w.vigil,   textColor: '#c4b5fd' },
                      ].map((bar, bi) => (
                        <div
                          key={bi}
                          style={{ height: `${bar.h}px`, backgroundColor: bar.color }}
                          className="flex-1 max-w-[13px] transition-opacity hover:opacity-80 relative"
                          title={String(bar.val)}
                        >
                          <div
                            className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[9px] px-1 py-0.5 whitespace-nowrap z-20 font-mono font-bold bg-[#111d44]"
                            style={{ color: bar.textColor }}
                          >
                            {bar.val}
                          </div>
                        </div>
                      ))}
                    </div>
                    <span className="text-[9px] sm:text-[10px] text-[#a6c4eb] font-mono text-center">
                      {w.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Avg Sunday',  val: Math.round(weeklyTrends.reduce((s,w)=>s+w.sunday,0)/weeklyTrends.length),  color: '#00f0ff' },
              { label: 'Avg Midweek', val: Math.round(weeklyTrends.reduce((s,w)=>s+w.midweek,0)/weeklyTrends.length), color: '#3b82f6' },
              { label: 'Avg Vigil',   val: Math.round(weeklyTrends.reduce((s,w)=>s+w.vigil,0)/weeklyTrends.length),   color: '#a78bfa' },
            ].map(s => (
              <div key={s.label} className="p-3 bg-[#0a122e] text-center">
                <div className="text-xl font-extrabold font-mono" style={{ color: s.color }}>{s.val}</div>
                <div className="text-[10px] text-[#a6c4eb] mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 2: OFFERINGS ── */}
      {activeTab === 'offering' && (
        <div className="p-5 space-y-5">
          <div className="flex items-center justify-between text-xs flex-wrap gap-2">
            <span className="font-bold text-white">Weekly Collection Trend</span>
            <span className="font-extrabold font-mono text-amber-300">
              {offerGrowth >= 0 ? '+' : ''}GH₵{offerGrowth.toLocaleString()} vs last week
            </span>
          </div>

          {/* Offering Bar Chart */}
          <div className="bg-[#0a122e] px-4 pt-5 pb-3">
            <div className="flex items-end gap-2 sm:gap-4 h-32 justify-between">
              {weeklyTrends.map((w, idx) => {
                const h         = Math.round((w.offerings / maxOffering) * 112);
                const isLatest  = idx === weeklyTrends.length - 1;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1 group">
                    <div className="flex items-end h-28 w-full justify-center">
                      <div
                        style={{ height: `${h}px` }}
                        className={`w-full max-w-[36px] relative transition-opacity ${isLatest ? 'bg-[#f59e0b]' : 'bg-[#f59e0b]/50 group-hover:bg-[#f59e0b]/80'}`}
                      >
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#111d44] text-amber-300 text-[9px] px-1.5 py-0.5 whitespace-nowrap z-20 font-mono font-bold">
                          GH₵{w.offerings.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <span className={`text-[9px] font-mono text-center ${isLatest ? 'text-amber-300 font-bold' : 'text-[#a6c4eb]'}`}>
                      {w.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Category Breakdown */}
          <div>
            <p className="text-[11px] font-bold text-[#00f0ff] uppercase tracking-wider mb-3">
              Category Breakdown — GH₵{totalOffering.toLocaleString()} MTD
            </p>
            <div className="space-y-2.5">
              {offeringCategories.map(cat => (
                <div key={cat.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-white">{cat.label}</span>
                    <span className="font-mono font-bold" style={{ color: cat.color }}>
                      GH₵{cat.amount.toLocaleString()} <span className="text-[#a6c4eb]">({cat.pct}%)</span>
                    </span>
                  </div>
                  <div className="h-3 bg-[#0a122e] w-full">
                    <div style={{ width: `${cat.pct}%`, backgroundColor: cat.color }} className="h-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: DEMOGRAPHICS ── */}
      {activeTab === 'demographics' && (
        <div className="p-5 space-y-6">

          {/* Member status */}
          <div>
            <p className="text-[11px] font-bold text-[#00f0ff] uppercase tracking-wider mb-3">Membership Status</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {['Pending Verification', 'New Member', 'Active', 'Inactive', 'Transferred', 'Deceased'].map((status) => {
                const count = members.filter((member) => member.status === status).length;
                return (
                  <div key={status} className="p-3 bg-[#0a122e]">
                    <p className="text-[9px] text-[#a6c4eb] truncate">{status}</p>
                    <p className="text-lg font-bold text-white font-mono mt-1">{count}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Age Ranges */}
          <div>
            <p className="text-[11px] font-bold text-[#00f0ff] uppercase tracking-wider mb-3">Age Distribution</p>
            <div className="space-y-2">
              {ageCounts.map(a => {
                const widthPct = Math.round((a.count / maxAge) * 100);
                return (
                  <div key={a.label} className="flex items-center gap-3">
                    <span className="text-[10px] text-[#a6c4eb] w-16 shrink-0">{a.label}</span>
                    <div className="flex-1 h-5 bg-[#0a122e] relative">
                      <div
                        style={{ width: `${widthPct}%`, backgroundColor: a.color }}
                        className="h-full transition-all"
                      />
                      {a.count === 0 && (
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] text-[#a6c4eb]">0</span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono font-bold w-5 text-right shrink-0" style={{ color: a.color }}>
                      {a.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Spiritual Stage */}
          <div>
            <p className="text-[11px] font-bold text-[#00f0ff] uppercase tracking-wider mb-3">Spiritual Growth Stage</p>
            <div className="grid grid-cols-2 gap-2">
              {stageCounts.map(s => (
                <div key={s.label} className="p-2.5 bg-[#0a122e] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-[10px] text-[#a6c4eb] truncate">{s.label}</span>
                  </div>
                  <span className="text-xs font-extrabold font-mono shrink-0" style={{ color: s.color }}>{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: CELLS ── */}
      {activeTab === 'cells' && (
        <div className="p-5 space-y-5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white">Shepherd Group Performance</span>
            <span className="text-[#00f0ff] font-bold font-mono">{shepherds.length} Active Groups</span>
          </div>

          <div className="space-y-3">
            {cellStats.map((c, i) => (
              <div key={i} className="p-3.5 bg-[#0a122e] space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <p className="font-bold text-white text-xs">{c.name}</p>
                    <p className="text-[10px] text-[#a6c4eb]">Shepherd: {c.shepherd}</p>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    {[
                      { label: 'Flock',    val: `${c.flock}/${c.max}`, color: 'text-white' },
                      { label: 'Meetings', val: String(c.meetings),    color: 'text-[#00f0ff]' },
                      { label: 'Offering', val: `GH₵${c.totalOff}`,   color: 'text-amber-300' },
                    ].map(d => (
                      <div key={d.label}>
                        <p className="text-[10px] text-[#a6c4eb]">{d.label}</p>
                        <p className={`text-sm font-extrabold font-mono ${d.color}`}>{d.val}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Capacity Bar */}
                <div>
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="text-[#a6c4eb]">Capacity</span>
                    <span
                      className="font-extrabold font-mono"
                      style={{ color: c.capPct >= 90 ? '#ff4d6d' : c.capPct >= 70 ? '#f59e0b' : '#00ff9d' }}
                    >
                      {c.capPct}%
                    </span>
                  </div>
                  <div className="h-2.5 bg-[#16285a] w-full">
                    <div
                      style={{
                        width: `${c.capPct}%`,
                        backgroundColor: c.capPct >= 90 ? '#ff4d6d' : c.capPct >= 70 ? '#f59e0b' : '#00ff9d',
                      }}
                      className="h-full"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-[#0a122e] text-center">
              <div className="text-xl font-extrabold text-[#00f0ff] font-mono">{members.length}</div>
              <div className="text-[10px] text-[#a6c4eb]">Total Flock</div>
            </div>
            <div className="p-3 bg-[#0a122e] text-center">
              <div className="text-xl font-extrabold text-[#00ff9d] font-mono">{cellMeetings.length}</div>
              <div className="text-[10px] text-[#a6c4eb]">Total Meetings</div>
            </div>
            <div className="p-3 bg-[#0a122e] text-center">
              <div className="text-xl font-extrabold text-amber-300 font-mono">
                GH₵{cellStats.reduce((s, c) => s + c.totalOff, 0).toLocaleString()}
              </div>
              <div className="text-[10px] text-[#a6c4eb]">Combined Offering</div>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};

export default AttendanceGrowthCharts;
