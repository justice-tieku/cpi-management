import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Send,
  Plus,
  FileCheck,
  Printer
} from 'lucide-react';
import { useCMS } from '../../context/CMSContext';

export const ShepherdReports: React.FC = () => {
  const { currentUser, shepherdReports, submitReport, approveReport } = useCMS();
  const [narrativeInput, setNarrativeInput] = useState('');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submittedNotice, setSubmittedNotice] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const isPastor = currentUser.role === 'pastor';

  const displayedReports = isPastor
    ? shepherdReports
    : shepherdReports.filter((r) => r.shepherdId === currentUser.id);

  const handleShepherdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!narrativeInput.trim()) {
      setStatusError('Please enter the required information.');
      return;
    }

    setStatusError(null);
    setIsSubmitting(true);

    try {
      const res = await submitReport(displayedReports[0]?.id || 'RPT-OCT-01', narrativeInput.trim());
      if (res.success) {
        setSubmittedNotice(true);
        setTimeout(() => {
          setSubmittedNotice(false);
          setShowSubmitModal(false);
          setNarrativeInput('');
        }, 1500);
      } else {
        setStatusError(res.error || 'Unable to save the record. Please try again.');
      }
    } catch (err: any) {
      setStatusError('Unable to save the record. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Reasonable Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Monthly Reports
          </h2>
          <p className="text-xs text-[#a6c4eb] mt-0.5">
            {isPastor
              ? 'Compiled shepherd submissions & reviews'
              : 'Monthly flock report submission'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-[#111d44] hover:bg-[#16285a] text-xs text-slate-300 flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-[#00f0ff]" />
            <span>Print Reports</span>
          </button>

          {!isPastor && (
            <button
              onClick={() => setShowSubmitModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#00f0ff] hover:bg-[#3bf2ff] text-[#070c1e] text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Submit This Month's Report</span>
            </button>
          )}
        </div>
      </div>

      {submittedNotice && (
        <div className="p-3.5 bg-emerald-950/40 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Monthly report submitted successfully to Pastor Adams.</span>
        </div>
      )}

      {/* Reports List */}
      <div className="space-y-4">
        {displayedReports.length === 0 ? (
          <div className="p-10 bg-[#111d44] text-center text-[#7b9dc7] text-xs">
            No data recorded yet
          </div>
        ) : (
          displayedReports.map((rpt) => (
          <div
            key={rpt.id}
            className="p-5 bg-[#111d44] shadow-sm space-y-4"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">
                    {rpt.shepherdName} — {rpt.cellName}
                  </h3>
                  <span className="text-[11px] font-mono text-[#00f0ff] bg-[#072e54] px-2 py-0.5">
                    {rpt.period}
                  </span>
                </div>
                <p className="text-xs text-[#a6c4eb] mt-0.5">
                  Submitted: {rpt.submittedAt || 'Pending submission'}
                </p>
              </div>

              <span
                className={`text-[10px] uppercase font-bold px-2.5 py-0.5   ${
                  rpt.status === 'Approved'
                    ? 'bg-emerald-950/40 text-emerald-300 '
                    : rpt.status === 'Submitted'
                    ? 'bg-[#072e54] text-[#00f0ff] '
                    : 'bg-amber-950/40 text-amber-300 '
                }`}
              >
                {rpt.status}
              </span>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-[#0a122e]">
                <span className="text-[10px] text-[#a6c4eb] block uppercase font-medium">Assigned Flock</span>
                <span className="text-base font-bold text-white font-mono">{rpt.assignedSoulsCount} Souls</span>
              </div>
              <div className="p-3 bg-[#0a122e]">
                <span className="text-[10px] text-[#a6c4eb] block uppercase font-medium">Avg Attendance</span>
                <span className="text-base font-bold text-[#00f0ff] font-mono">{rpt.attendanceAvgRate}%</span>
              </div>
              <div className="p-3 bg-[#0a122e]">
                <span className="text-[10px] text-[#a6c4eb] block uppercase font-medium">Completed Follow-Ups</span>
                <span className="text-base font-bold text-emerald-400 font-mono">{rpt.followUpsCompleted}</span>
              </div>
              <div className="p-3 bg-[#0a122e]">
                <span className="text-[10px] text-[#a6c4eb] block uppercase font-medium">Overdue Tasks</span>
                <span className="text-base font-bold text-rose-400 font-mono">{rpt.overdueTasks}</span>
              </div>
            </div>

            {/* Narrative Notes */}
            <div className="p-3.5 bg-[#0a122e] text-xs text-slate-300 leading-relaxed">
              <span className="text-[10px] uppercase font-bold text-[#a6c4eb] block mb-1">Shepherd Comments:</span>
              &ldquo;{rpt.narrative}&rdquo;
            </div>

            {/* Pastor Approval Action */}
            {isPastor && rpt.status === 'Submitted' && (
              <div className="flex items-center justify-end pt-1">
                <button
                  onClick={() => approveReport(rpt.id)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>Approve &amp; Archive Report</span>
                </button>
              </div>
            )}
          </div>
        )))}
      </div>

      {/* Shepherd Submit Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#111d44] p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">
              Submit Monthly Shepherd Report
            </h3>
            <p className="text-xs text-[#a6c4eb]">
              Reporting for <strong className="text-[#00f0ff]">{currentUser.name}</strong> • {currentUser.assignedCell || 'Assigned Cell'}
            </p>

            <form onSubmit={handleShepherdSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Monthly Pastoral Care Summary &amp; Cell Notes
                </label>
                <textarea
                  rows={4}
                  value={narrativeInput}
                  onChange={(e) => setNarrativeInput(e.target.value)}
                  placeholder="Record summary of cell attendance, prayer needs, and members visited this month..."
                  className="w-full p-3 bg-[#0a122e] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00f0ff] resize-none"
                  required
                />
              </div>

              {statusError && (
                <div className="p-3 bg-[#38141e] text-[#ff6b8b] text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{statusError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowSubmitModal(false); setStatusError(null); }}
                  className="px-4 py-2 bg-[#16285a] hover:bg-[#072e54] text-slate-300 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#00f0ff] hover:bg-[#3bf2ff] text-[#070c1e] text-xs font-semibold shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Submitting...' : 'Submit to Pastor'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShepherdReports;


