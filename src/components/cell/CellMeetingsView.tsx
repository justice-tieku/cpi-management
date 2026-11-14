import React, { useState } from 'react';
import {
  BookOpen,
  Users,
  CircleDollarSign,
  CalendarDays,
  Plus,
  X,
  CheckCircle2,
  Clock,
  FileText,
  TrendingUp
} from 'lucide-react';
import { useCMS } from '../../context/CMSContext';

const inputCls =
  'w-full bg-[#070c1e]    px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00f0ff] transition-colors';
const labelCls = 'block text-xs text-[#a6c4eb] mb-1 font-medium';

export const CellMeetingsView: React.FC = () => {
  const { currentUser, visibleCellMeetings, recordCellMeeting } = useCMS();
  const isPastor = currentUser.role === 'pastor';

  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    topic: '',
    attendeesCount: '',
    offeringAmount: '',
    notes: ''
  });
  const [error, setError] = useState('');

  // KPIs derived from visible meetings
  const totalMeetings = visibleCellMeetings.length;
  const totalOffering = visibleCellMeetings.reduce((sum, m) => sum + (m.offeringAmount || 0), 0);
  const totalAttendees = visibleCellMeetings.reduce((sum, m) => sum + (m.attendeesCount || 0), 0);
  const avgAttendees =
    totalMeetings > 0 ? Math.round(totalAttendees / totalMeetings) : 0;

  const handleSubmit = () => {
    if (!form.topic.trim()) {
      setError('Please enter a meeting topic.');
      return;
    }
    if (!form.attendeesCount || isNaN(Number(form.attendeesCount))) {
      setError('Please enter a valid attendees count.');
      return;
    }
    setError('');

    recordCellMeeting({
      date: form.date,
      topic: form.topic.trim(),
      attendeesCount: Number(form.attendeesCount),
      offeringAmount: Number(form.offeringAmount) || 0,
      notes: form.notes.trim()
    });

    setForm({
      date: new Date().toISOString().split('T')[0],
      topic: '',
      attendeesCount: '',
      offeringAmount: '',
      notes: ''
    });
    setSubmitted(true);
    setShowForm(false);
    setTimeout(() => setSubmitted(false), 4000);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">
            {isPastor ? 'All Cell Meetings' : 'My Cell Meetings'}
          </h2>
          <p className="text-xs text-[#a6c4eb] mt-0.5">
            {isPastor
              ? 'Weekly cell fellowship logs & offerings'
              : `${currentUser.assignedCell} meetings & offerings`}
          </p>
        </div>
        {!isPastor && (
          <button
            onClick={() => { setShowForm(true); setSubmitted(false); }}
            className="flex items-center gap-2 bg-[#00f0ff] hover:bg-[#3bf2ff] text-[#070c1e] text-xs font-semibold px-4 py-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Record Meeting
          </button>
        )}
      </div>

      {/* Success banner */}
      {submitted && (
        <div className="flex items-center gap-2 bg-emerald-900/30 text-emerald-300 px-4 py-3 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Cell meeting recorded and offering submitted to the finance ledger.
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Meetings Held',
            value: totalMeetings,
            icon: CalendarDays,
            color: 'purple'
          },
          {
            label: 'Total Offering',
            value: `GH₵ ${totalOffering.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
            icon: CircleDollarSign,
            color: 'amber'
          },
          {
            label: 'Total Attendees',
            value: totalAttendees,
            icon: Users,
            color: 'indigo'
          },
          {
            label: 'Avg. Attendance',
            value: avgAttendees,
            icon: TrendingUp,
            color: 'emerald'
          }
        ].map((kpi) => {
          const Icon = kpi.icon;
          const colorMap: Record<string, string> = {
            purple: 'bg-[#072e54]  text-[#00f0ff]',
            amber: 'bg-amber-900/20  text-amber-400',
            indigo: 'bg-indigo-900/20  text-indigo-400',
            emerald: 'bg-emerald-900/20  text-emerald-400'
          };
          return (
            <div
              key={kpi.label}
              className="bg-[#0a122e] p-4 flex items-center gap-3"
            >
              <div className={`w-10 h-10  flex items-center justify-center  ${colorMap[kpi.color]}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-[#a6c4eb] uppercase tracking-wider">{kpi.label}</p>
                <p className="text-lg font-bold text-white mt-0.5">{kpi.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Meeting log */}
      <div className="bg-[#0a122e] overflow-hidden">
        <div className="px-5 py-3 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#00f0ff]" />
          <span className="text-sm font-semibold text-white">Meeting Log</span>
          <span className="ml-auto text-xs text-[#7b9dc7]">{visibleCellMeetings.length} records</span>
        </div>

        {visibleCellMeetings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-[#7b9dc7]">
            <BookOpen className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">No cell meetings recorded yet.</p>
            {!isPastor && (
              <p className="text-xs mt-1">Click "Record Meeting" to add the first entry.</p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[#16285a]">
            {visibleCellMeetings.map((mtg) => (
              <div key={mtg.id} className="px-5 py-4 flex items-start gap-4 hover:bg-[#111d44] transition-colors">
                {/* Date column */}
                <div className="shrink-0 w-16 text-center">
                  <div className="text-xs font-bold text-[#00f0ff] uppercase">
                    {new Date(mtg.date).toLocaleDateString('en-GB', { month: 'short' })}
                  </div>
                  <div className="text-xl font-bold text-white leading-tight">
                    {new Date(mtg.date).getDate()}
                  </div>
                  <div className="text-[10px] text-[#7b9dc7]">
                    {new Date(mtg.date).getFullYear()}
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-white">{mtg.topic}</p>
                    {isPastor && (
                      <span className="text-[10px] bg-slate-800 text-[#a6c4eb] px-2 py-0.5 shrink-0">
                        {mtg.cellName}
                      </span>
                    )}
                  </div>
                  {mtg.notes && (
                    <p className="text-xs text-[#a6c4eb] mt-1 line-clamp-2">{mtg.notes}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-[#a6c4eb]">
                      <Users className="w-3 h-3 text-indigo-400" />
                      {mtg.attendeesCount} attendees
                    </span>
                    <span className="flex items-center gap-1 text-xs text-[#a6c4eb]">
                      <CircleDollarSign className="w-3 h-3 text-amber-400" />
                      GH₵ {(mtg.offeringAmount || 0).toFixed(2)} offering
                    </span>
                    {isPastor && (
                      <span className="flex items-center gap-1 text-xs text-[#a6c4eb]">
                        <FileText className="w-3 h-3 text-[#7b9dc7]" />
                        {mtg.shepherdName}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Record Meeting Modal */}
      {showForm && !isPastor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0a122e] w-full max-w-md shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#00f0ff]" />
                <h3 className="text-sm font-bold text-white">Record Cell Meeting</h3>
              </div>
              <button
                onClick={() => { setShowForm(false); setError(''); }}
                className="text-[#a6c4eb] hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <div className="p-5 space-y-4">
              {/* Cell name (read-only) */}
              <div>
                <label className={labelCls}>Cell Group</label>
                <div className="bg-[#070c1e] px-3 py-2 text-sm text-[#a6c4eb]">
                  {currentUser.assignedCell}
                </div>
              </div>

              {/* Date */}
              <div>
                <label className={labelCls}>Meeting Date *</label>
                <input
                  type="date"
                  className={inputCls}
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>

              {/* Topic */}
              <div>
                <label className={labelCls}>Meeting Topic / Bible Study *</label>
                <input
                  type="text"
                  placeholder="e.g. Walking in the Spirit — Romans 8"
                  className={inputCls}
                  value={form.topic}
                  onChange={(e) => setForm({ ...form, topic: e.target.value })}
                />
              </div>

              {/* Attendees + Offering in row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Number of Attendees *</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    className={inputCls}
                    value={form.attendeesCount}
                    onChange={(e) => setForm({ ...form, attendeesCount: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelCls}>Offering Amount (GH₵)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className={inputCls}
                    value={form.offeringAmount}
                    onChange={(e) => setForm({ ...form, offeringAmount: e.target.value })}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className={labelCls}>Notes / Observations</label>
                <textarea
                  rows={3}
                  placeholder="Prayer points, testimonies, new converts, key observations…"
                  className={`${inputCls} resize-none`}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>

              {error && (
                <p className="text-xs text-red-400 bg-red-950/30 -red-800/30 px-3 py-2">
                  {error}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-5 py-4">
              <button
                onClick={() => { setShowForm(false); setError(''); }}
                className="text-xs font-medium text-[#a6c4eb] hover:text-white px-4 py-2 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex items-center gap-2 bg-[#00f0ff] hover:bg-[#3bf2ff] text-[#070c1e] text-xs font-semibold px-5 py-2 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                Save Meeting Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};



