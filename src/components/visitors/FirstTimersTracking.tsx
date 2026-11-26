import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  Phone,
  Mail,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  ArrowRight,
  Filter,
  Search,
  Shield,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { useCMS } from '../../context/CMSContext';
import { VisitorAttendanceRecord, VisitorJourney, VisitorRecord } from '../../types/cms';
import { AddPersonModal } from '../common/AddPersonModal';
import { DirectOutreachModal } from '../common/DirectOutreachModal';
import { formatGhanaianPhone, getCleanDialPhone } from '../../utils/phone';
import { getConsecutiveSundayAttendance, getRecentSunday, isSundayDate } from '../../utils/visitorAttendance';

export const FirstTimersTracking: React.FC = () => {
  const { visibleVisitors, visitorAttendanceRecords, recordVisitorAttendance } = useCMS();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState('all');
  const [attendanceDate, setAttendanceDate] = useState(getRecentSunday);
  const [savingVisitorId, setSavingVisitorId] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [outreachGuest, setOutreachGuest] = useState<{
    isOpen: boolean;
    name: string;
    phone: string;
    shepherd?: string;
  }>({
    isOpen: false,
    name: '',
    phone: ''
  });

  // Local state for interactive visitors list
  const [visitorsList, setVisitorsList] = useState<VisitorRecord[]>(visibleVisitors);

  // Keep visitorsList in sync whenever new visitors are registered
  useEffect(() => {
    setVisitorsList(visibleVisitors);
  }, [visibleVisitors]);

  const journeySteps: VisitorJourney[] = [
    'First Visit',
    'Contact Attempted',
    'Contacted',
    'Invited Back',
    'Returned',
    'Joined/Registered'
  ];

  const handleLogContact = (visitorId: string, name: string) => {
    setVisitorsList((prev) =>
      prev.map((v) =>
        v.id === visitorId ? { ...v, contactAttempts: v.contactAttempts + 1 } : v
      )
    );
    setFeedback(`Logged contact attempt for ${name}.`);
    setTimeout(() => setFeedback(null), 2500);
  };

  const handleAdvanceStage = (visitorId: string, name: string) => {
    setVisitorsList((prev) =>
      prev.map((v) => {
        if (v.id === visitorId) {
          const currentIndex = journeySteps.indexOf(v.journeyStage);
          const nextIndex = Math.min(currentIndex + 1, journeySteps.length - 1);
          return { ...v, journeyStage: journeySteps[nextIndex] };
        }
        return v;
      })
    );
    setFeedback(`Advanced journey stage for ${name}.`);
    setTimeout(() => setFeedback(null), 2500);
  };

  const handleVisitorAttendance = async (visitor: VisitorRecord, status: 'Present' | 'Absent') => {
    setSavingVisitorId(visitor.id);
    setFeedback(null);
    const result = await recordVisitorAttendance(visitor.id, attendanceDate, status);
    setSavingVisitorId('');
    if (!result.success) {
      setFeedback(result.error || 'Unable to save attendance.');
      return;
    }
    setFeedback(status === 'Present' && getConsecutiveSundayAttendance([
      ...visitorAttendanceRecords.filter((record) => !(record.visitorId === visitor.id && record.attendanceDate === attendanceDate)),
      { id: '', visitorId: visitor.id, attendanceDate, status }
    ], visitor.id) >= 3
      ? `${visitor.name} has been moved to the church attendance list.`
      : `${visitor.name} marked ${status.toLowerCase()} for ${attendanceDate}.`);
  };

  const filteredVisitors = visitorsList.filter((v) => {
    if (v.journeyStage === 'Joined/Registered') return false;
    const matchesSearch =
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.phone.includes(searchTerm);
    const matchesStage = filterStage === 'all' || v.journeyStage === filterStage;
    return matchesSearch && matchesStage;
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            First Timers &amp; Visitors
          </h2>
          <p className="text-xs text-[#a6c4eb] mt-0.5">
            Record visitors and follow up with them
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-[#00f0ff] hover:bg-[#3bf2ff] text-[#070c1e] text-xs font-semibold shadow-sm flex items-center gap-2 cursor-pointer transition-colors"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Add Visitor</span>
        </button>
      </div>

      {feedback && (
        <div className="p-3.5 bg-emerald-950/40 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-white/10 bg-[#111d44] p-4">
        <div>
          <label htmlFor="visitor-attendance-date" className="mb-1 block text-xs font-semibold text-[#a6c4eb]">Sunday attendance date</label>
          <input
            id="visitor-attendance-date"
            type="date"
            value={attendanceDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(event) => setAttendanceDate(event.target.value)}
            className="rounded-lg bg-[#070c1e] px-3 py-2 text-sm text-white"
          />
        </div>
        {!isSundayDate(attendanceDate) && <p className="text-xs text-amber-300">Choose a Sunday to record attendance.</p>}
      </div>

      {/* Visitor Journey Pathway Card */}
      <div className="p-5 bg-[#111d44] shadow-sm space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#00f0ff]">
          Visitor Follow-Up Steps
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {journeySteps.map((step, idx) => (
            <div
              key={step}
              className="p-3 bg-[#0a122e] text-center space-y-1"
            >
              <span className="text-[10px] font-mono text-[#00f0ff] block font-bold">
                Step 0{idx + 1}
              </span>
              <p className="text-xs font-semibold text-white leading-tight">
                {step}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-[#111d44]">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#7b9dc7] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email, or telephone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#070c1e] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00f0ff]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-[#00f0ff] shrink-0" />
          <select
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
            className="w-full sm:w-auto py-1.5 px-3 bg-[#070c1e] text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#00f0ff] cursor-pointer"
          >
            <option value="all">All Follow-Up Stages</option>
            {journeySteps.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Visitors List */}
      <div className="space-y-3">
        {filteredVisitors.length === 0 ? (
          <div className="p-8 text-center text-[#7b9dc7] text-xs bg-[#111d44]">
            No data recorded yet
          </div>
        ) : (
          filteredVisitors.map((v) => {
            const attendanceMark = visitorAttendanceRecords.find((record) =>
              record.visitorId === v.id && record.attendanceDate === attendanceDate
            )?.status;
            const attendanceStreak = getConsecutiveSundayAttendance(visitorAttendanceRecords, v.id);
            return (
            <div
              key={v.id}
              className="p-4 bg-[#111d44] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-white text-sm">{v.name}</h4>
                  <span className="text-[10px] font-mono text-[#7b9dc7]">{v.id}</span>
                  <span className="px-2.5 py-0.5 text-[10px] font-semibold bg-[#072e54] text-[#00f0ff]">
                    {v.journeyStage}
                  </span>
                  <span className="text-[10px] text-[#a6c4eb]">
                    Attended: {v.serviceAttended} ({v.visitDate})
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-[#a6c4eb] pt-1">
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#7b9dc7]" />
                    <span className="font-mono text-slate-300">{formatGhanaianPhone(v.phone)}</span>
                    <a
                      href={`tel:${getCleanDialPhone(v.phone)}`}
                      className="text-emerald-400 hover:text-emerald-300 ml-1 text-[11px] font-semibold"
                    >
                      Call
                    </a>
                    <a
                      href={`sms:${getCleanDialPhone(v.phone)}`}
                      className="text-[#00f0ff] hover:text-[#00f0ff] ml-1 text-[11px] font-semibold"
                    >
                      SMS
                    </a>
                  </span>
                  {v.email && (
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-[#7b9dc7]" />
                      {v.email}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 text-[#00f0ff]">
                    <Shield className="w-3.5 h-3.5" />
                    Shepherd: {v.assignedShepherdName || 'Unassigned'}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-[#a6c4eb]">
                    Sunday attendance: {attendanceMark || 'Not recorded'} · Streak {attendanceStreak}/3
                  </span>
                  <button
                    type="button"
                    disabled={!isSundayDate(attendanceDate) || savingVisitorId === v.id}
                    onClick={() => void handleVisitorAttendance(v, 'Present')}
                    aria-pressed={attendanceMark === 'Present'}
                    className={`rounded px-2.5 py-1.5 font-semibold disabled:opacity-40 ${attendanceMark === 'Present' ? 'bg-white text-black' : 'bg-[#16285a] text-white'}`}
                  >
                    <Check className="mr-1 inline h-3.5 w-3.5" /> Present
                  </button>
                  <button
                    type="button"
                    disabled={!isSundayDate(attendanceDate) || savingVisitorId === v.id}
                    onClick={() => void handleVisitorAttendance(v, 'Absent')}
                    aria-pressed={attendanceMark === 'Absent'}
                    className={`rounded px-2.5 py-1.5 font-semibold disabled:opacity-40 ${attendanceMark === 'Absent' ? 'bg-white text-black' : 'bg-[#16285a] text-white'}`}
                  >
                    Absent
                  </button>
                </div>

                {v.notes && (
                  <p className="text-[11px] text-slate-300 italic pt-1">
                    &ldquo;{v.notes}&rdquo;
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setOutreachGuest({
                      isOpen: true,
                      name: v.name,
                      phone: formatGhanaianPhone(v.phone),
                      shepherd: v.assignedShepherdName
                    })
                  }
                  className="px-3 py-1.5 bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold cursor-pointer transition-colors flex items-center gap-1 shadow-sm"
                  title="Send WhatsApp welcome message"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleLogContact(v.id, v.name)}
                  className="px-3 py-1.5 bg-[#16285a] hover:bg-[#072e54] text-[#00f0ff] text-xs font-medium cursor-pointer transition-colors"
                >
                  Log Contact ({v.contactAttempts})
                </button>
                <button
                  type="button"
                  onClick={() => handleAdvanceStage(v.id, v.name)}
                  className="px-3 py-1.5 bg-[#00f0ff] hover:bg-[#3bf2ff] text-[#070c1e] text-xs font-semibold shadow-sm cursor-pointer transition-colors flex items-center gap-1"
                >
                  <span>Advance Stage</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )})
        )}
      </div>

      {/* Direct WhatsApp / SMS Outreach Modal */}
      <DirectOutreachModal
        isOpen={outreachGuest.isOpen}
        onClose={() => setOutreachGuest((prev) => ({ ...prev, isOpen: false }))}
        recipientName={outreachGuest.name}
        phone={outreachGuest.phone}
        category="first_timer"
        cellGroup={outreachGuest.shepherd ? `Shepherd: ${outreachGuest.shepherd}` : undefined}
      />

      {/* Add Guest Modal */}
      <AddPersonModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultMode="guest"
      />
    </div>
  );
};

export default FirstTimersTracking;


