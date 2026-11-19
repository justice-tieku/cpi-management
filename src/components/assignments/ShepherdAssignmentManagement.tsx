import React, { useState } from 'react';
import {
  UserCheck,
  Users,
  Shield,
  ArrowRight,
  Clock,
  CheckCircle2,
  Filter,
  BookOpen,
  CircleDollarSign,
  CalendarCheck,
  TrendingUp,
  UserPlus,
  RefreshCw,
  Phone,
  Layers,
  ChevronRight,
  AlertCircle,
  Copy,
  Check,
  Mail,
  Lock,
  X
} from 'lucide-react';
import { useCMS } from '../../context/CMSContext';
import { apiClient } from '../../services/apiClient';
import { formatGhanaianPhone } from '../../utils/phone';
import { validateName, validateEmail, validatePhone, validateText, formatPhone } from '../../utils/validation';

export const ShepherdAssignmentManagement: React.FC = () => {
  const {
    members,
    shepherds,
    attendanceRecords,
    cellMeetings,
    followUpTasks,
    reassignMember
  } = useCMS();

  // Mode: 'categories' (overview of all cells) or 'deep-dive' (individual shepherd)
  const [viewMode, setViewMode] = useState<'categories' | 'deep-dive'>('categories');
  const [selectedShepherdId, setSelectedShepherdId] = useState<string>(shepherds[0]?.id || 'SH-01');

  // Reassignment Modal State
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignMemberId, setReassignMemberId] = useState<string>('');
  const [targetShepherdId, setTargetShepherdId] = useState<string>(shepherds[1]?.id || 'SH-02');
  const [transferReason, setTransferReason] = useState('Geographic relocation / Care balancing');
  const [isTransferring, setIsTransferring] = useState(false);
  const [reassignError, setReassignError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState('');

  // Invite / Create Shepherd Modal State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [newShepherdName, setNewShepherdName] = useState('');
  const [newShepherdEmail, setNewShepherdEmail] = useState('');
  const [newShepherdPhone, setNewShepherdPhone] = useState('');
  const [newShepherdCell, setNewShepherdCell] = useState('');
  const [newShepherdPassword, setNewShepherdPassword] = useState('');
  const [isCreatingShepherd, setIsCreatingShepherd] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    email: string;
    cell: string;
    password: string;
  } | null>(null);
  const [copiedNotice, setCopiedNotice] = useState(false);

  const handleCreateShepherd = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: string[] = [];
    const nameErr = validateName(newShepherdName, 'Name');
    if (nameErr) errors.push(nameErr);
    if (!newShepherdEmail.trim()) errors.push('Email is required.');
    else {
      const emailErr = validateEmail(newShepherdEmail.trim());
      if (emailErr) errors.push(emailErr);
    }
    const phoneErr = newShepherdPhone.trim() ? validatePhone(newShepherdPhone) : null;
    if (phoneErr) errors.push(phoneErr);
    const cellErr = validateText(newShepherdCell, 'Cell name', 2, 120);
    if (cellErr) errors.push(cellErr);
    if (newShepherdPassword.trim().length < 6) errors.push('Password must be at least 6 characters.');
    if (errors.length > 0) {
      setInviteError(errors.join(' '));
      return;
    }

    setInviteError('');
    setIsCreatingShepherd(true);

    try {
      const res = await apiClient.createShepherd({
        name: newShepherdName.trim(),
        email: newShepherdEmail.trim(),
        phone: formatPhone(newShepherdPhone.trim()),
        cellName: newShepherdCell.trim(),
        password: newShepherdPassword.trim()
      });

      if (!res.success) throw new Error(res.error || 'Faied to create shepherd account.');

      setCreatedCredentials({
        name: newShepherdName.trim(),
        email: newShepherdEmail.trim(),
        cell: newShepherdCell.trim(),
        password: newShepherdPassword.trim()
      });

      // Success is shown inside the modal via createdCredentials panel
    } catch (err: any) {
      setInviteError(err?.message || 'Could not create the shepherd account. Check the details and try again.');
    } finally {
      setIsCreatingShepherd(false);
    }
  };

  const copyCredentialsForShare = () => {
    if (!createdCredentials) return;
    const text = `Shalom ${createdCredentials.name},

Your Shepherd portal access for Cross Passion International is ready:
• Website: https://cpi-management.vercel.app
• Email: ${createdCredentials.email}
• Password: ${createdCredentials.password}
• Assigned Cell: ${createdCredentials.cell}

Please sign in and lead your flock in prayer and discipleship. God bless you!`;

    navigator.clipboard.writeText(text);
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 3000);
  };

  // Active Shepherd for Deep Dive
  const activeShepherd = shepherds.find((s) => s.id === selectedShepherdId) || shepherds[0] || {
    id: '',
    name: 'No shepherd yet',
    cell: '—',
    assignedCount: 0,
    maxCapacity: 30
  };
  const activeMembers = members.filter(
    (m) => activeShepherd && (m.currentShepherdId === activeShepherd.id || m.cellGroup === activeShepherd.cell)
  );
  const activeMeetings = cellMeetings.filter(
    (cm) => activeShepherd && (cm.shepherdId === activeShepherd.id || cm.cellName === activeShepherd.cell)
  );
  const activeAttendance = attendanceRecords.filter(
    (a) => activeShepherd && (a.shepherdId === activeShepherd.id || a.cellGroup === activeShepherd.cell)
  );
  const activeTasks = followUpTasks.filter((t) => activeShepherd && t.shepherdId === activeShepherd.id);

  // Cell Category Stats (Calculated across all cells)
  const cellStats = shepherds.map((sh) => {
    const shMembers = members.filter(
      (m) => m.currentShepherdId === sh.id || m.cellGroup === sh.cell
    );
    const shMeetings = cellMeetings.filter(
      (cm) => cm.shepherdId === sh.id || cm.cellName === sh.cell
    );
    const shAttendance = attendanceRecords.filter(
      (a) => a.shepherdId === sh.id || a.cellGroup === sh.cell
    );
    const presentCount = shAttendance.filter((a) => a.status === 'Present').length;
    const totalOffering = shMeetings.reduce((sum, m) => sum + (m.offeringAmount || 0), 0);
    const totalCellAttendees = shMeetings.reduce((sum, m) => sum + (m.attendeesCount || 0), 0);
    const avgMeetingAttendees = shMeetings.length > 0 ? Math.round(totalCellAttendees / shMeetings.length) : 0;
    const loadPercent = Math.round((shMembers.length / sh.maxCapacity) * 100);
    const sundayRate = shMembers.length > 0 ? Math.round((presentCount / shMembers.length) * 100) : 0;

    return {
      ...sh,
      actualCount: shMembers.length,
      loadPercent,
      totalOffering,
      totalMeetings: shMeetings.length,
      avgMeetingAttendees,
      sundayRate,
      presentCount
    };
  });

  const handleOpenTransfer = (memberId?: string) => {
    if (memberId) {
      setReassignMemberId(memberId);
    } else if (members.length > 0) {
      setReassignMemberId(members[0].id);
    }
    setShowReassignModal(true);
  };

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignMemberId) {
      setReassignError('Please select at least one record before proceeding.');
      return;
    }
    if (!targetShepherdId) {
      setReassignError('Please select a shepherd shepherd.');
      return;
    }

    setReassignError(null);
    setIsTransferring(true);

    try {
      const res = await reassignMember(reassignMemberId, targetShepherdId, transferReason);
      if (res.success) {
        setSuccessNotice('Changes updated successfully.');
        setShowReassignModal(false);
        setTimeout(() => setSuccessNotice(''), 5000);
      } else {
        setReassignError(res.error || 'Unable to add a new person. Please try again.');
      }
    } catch (err: any) {
      setReassignError('Unable to add a new person. Please try again.');
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-[#111d44]">
        <div>
          <span className="text-[11px] font-semibold text-[#00f0ff] uppercase tracking-wider block">
            Pastoral Administration
          </span>
          <h2 className="text-xl font-bold text-white tracking-tight mt-0.5">
            Shepherds Management
          </h2>
          <p className="text-xs text-[#a6c4eb] mt-0.5">
            Shepherd Assignment & Sheep Allocation
          </p>
        </div>

        {/* Actions & View Mode Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setCreatedCredentials(null);
              setInviteError('');
              setShowInviteModal(true);
            }}
            className="px-3.5 py-1.5 bg-[#00ff9d] hover:bg-[#3bf2ff] text-[#070c1e] text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Add New Shepherd</span>
          </button>

          <div className="flex items-center gap-2 bg-[#0a122e] p-1">
            <button
              onClick={() => setViewMode('categories')}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                viewMode === 'categories'
                  ? 'bg-[#00f0ff] text-[#070c1e] shadow-sm'
                  : 'text-[#a6c4eb] hover:text-white'
              }`}
            >
              All Cells
            </button>
            <button
              onClick={() => setViewMode('deep-dive')}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                viewMode === 'deep-dive'
                  ? 'bg-[#00f0ff] text-[#070c1e] shadow-sm'
                  : 'text-[#a6c4eb] hover:text-white'
              }`}
            >
              Individual Shepherd
            </button>
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successNotice && (
        <div className="p-4 bg-emerald-950/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* MODE 1: ALL CELLS IN CATEGORIES */}
      {viewMode === 'categories' && (
        <div className="space-y-6">
          {/* Category Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Category A: Sunday Attendance */}
            <div className="p-4 bg-[#111d44] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">
                  Category: Attendance
                </span>
                <CalendarCheck className="w-4 h-4 text-indigo-400" />
              </div>
              <p className="text-xl font-bold text-white font-mono">
                {Math.round(cellStats.reduce((sum, s) => sum + s.sundayRate, 0) / cellStats.length)}% Avg
              </p>
              <p className="text-[11px] text-[#a6c4eb]">
                Joint Sunday communion attendance rate across all 5 cells
              </p>
            </div>

            {/* Category B: Cell Offerings */}
            <div className="p-4 bg-[#111d44] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
                  Category: Cell Offerings
                </span>
                <CircleDollarSign className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-xl font-bold text-amber-300 font-mono">
                GH₵ {cellStats.reduce((sum, s) => sum + s.totalOffering, 0).toFixed(2)}
              </p>
              <p className="text-[11px] text-[#a6c4eb]">
                Total fellowship offerings collected from cell meetings
              </p>
            </div>

            {/* Category C: Growth & Capacity */}
            <div className="p-4 bg-[#111d44] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#00f0ff] uppercase tracking-wider">
                  Category: Growth &amp; Capacity
                </span>
                <Users className="w-4 h-4 text-[#00f0ff]" />
              </div>
              <p className="text-xl font-bold text-white font-mono">
                {members.length} Souls Enrolled
              </p>
              <p className="text-[11px] text-[#a6c4eb]">
                Across 5 shepherd groups • {Math.round((members.length / 150) * 100)}% capacity utilized
              </p>
            </div>

            {/* Category D: Cell Meetings */}
            <div className="p-4 bg-[#111d44] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                  Category: Cell Meetings
                </span>
                <BookOpen className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-xl font-bold text-emerald-300 font-mono">
                {cellMeetings.length} Meetings Held
              </p>
              <p className="text-[11px] text-[#a6c4eb]">
                Weekly fellowship sessions reported by shepherds
              </p>
            </div>
          </div>

          {/* Collated Category Table of All Cells */}
          <div className="p-5 bg-[#111d44] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  All Shepherd Groups — Category Breakdown
                </h3>
                <p className="text-xs text-[#a6c4eb] mt-0.5">
                  Click any shepherd group to view members
                </p>
              </div>

              <button
                onClick={() => handleOpenTransfer()}
                className="px-3.5 py-1.5 bg-[#00f0ff] hover:bg-[#3bf2ff] text-[#070c1e] text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reassign / Transfer Member</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-[#a6c4eb] font-semibold bg-[#0a122e]">
                    <th className="py-3 px-3">Shepherd &amp; Group</th>
                    <th className="py-3 px-3 font-mono">Flock / Capacity</th>
                    <th className="py-3 px-3">Sunday Attendance</th>
                    <th className="py-3 px-3">Cell Meeting Rate</th>
                    <th className="py-3 px-3">Cell Offerings</th>
                    <th className="py-3 px-3">Growth Status</th>
                    <th className="py-3 px-3 text-right">Deep Dive</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#16285a]">
                  {cellStats.map((cs) => (
                    <tr
                      key={cs.id}
                      onClick={() => {
                        setSelectedShepherdId(cs.id);
                        setViewMode('deep-dive');
                      }}
                      className="hover:bg-[#16285a] transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-3">
                        <p className="font-semibold text-white">{cs.name}</p>
                        <p className="text-[11px] text-[#00f0ff] font-medium">{cs.cell}</p>
                      </td>
                      <td className="py-3 px-3 font-mono">
                        <span className="font-bold text-white">{cs.actualCount}</span> / {cs.maxCapacity} Souls
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-indigo-300 font-mono">{cs.sundayRate}%</span>
                        <span className="text-[#a6c4eb] text-[10px] ml-1.5">({cs.presentCount} present)</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-white">{cs.totalMeetings} meetings</span>
                        <span className="text-[#a6c4eb] text-[10px] ml-1">avg {cs.avgMeetingAttendees}</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-amber-300 font-bold">
                        GH₵ {cs.totalOffering.toFixed(2)}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5  text-[10px] font-semibold ${
                            cs.loadPercent >= 100
                              ? 'bg-rose-950/40 text-rose-300  '
                              : cs.loadPercent >= 85
                              ? 'bg-amber-950/40 text-amber-300  '
                              : 'bg-emerald-950/40 text-emerald-300  '
                          }`}
                        >
                          {cs.loadPercent >= 100
                            ? 'Capacity Reached'
                            : cs.loadPercent >= 85
                            ? 'Near Limit'
                            : 'Optimal Growth'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="inline-flex items-center gap-1 text-[#00f0ff] hover:text-[#00f0ff] font-semibold text-xs">
                          <span>Inspect</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: INDIVIDUAL SHEPHERD & CELL DEEP DIVE */}
      {viewMode === 'deep-dive' && (
        <div className="space-y-6">
          {/* Shepherd Selection Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {shepherds.map((sh) => (
              <button
                key={sh.id}
                onClick={() => setSelectedShepherdId(sh.id)}
                className={`px-3.5 py-2  text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedShepherdId === sh.id
                    ? 'bg-[#00f0ff] text-[#070c1e] shadow-sm'
                    : 'bg-[#111d44] text-[#a6c4eb] hover:text-white  '
                }`}
              >
                {sh.name} ({sh.cell.split(' ')[0]})
              </button>
            ))}
          </div>

          {/* Deep Dive Dossier Card */}
          <div className="p-6 bg-[#111d44] space-y-6">
            {/* Top Shepherd Identity Row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">{activeShepherd.name}</h3>
                  <span className="text-[10px] font-mono text-[#00f0ff] bg-[#072e54] px-2 py-0.5">
                    {activeShepherd.id}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Shepherd Group: <strong className="text-white">{activeShepherd.cell}</strong>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleOpenTransfer()}
                  className="px-3.5 py-2 bg-[#00f0ff] hover:bg-[#3bf2ff] text-[#070c1e] text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Assign / Transfer Soul</span>
                </button>
              </div>
            </div>

            {/* Quick Stats Grid for this Shepherd */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3.5 bg-[#0a122e]">
                <span className="text-[10px] uppercase text-[#a6c4eb] block font-medium">Assigned Flock</span>
                <span className="text-lg font-bold text-white font-mono mt-0.5 block">
                  {activeMembers.length} / {activeShepherd.maxCapacity} Souls
                </span>
              </div>
              <div className="p-3.5 bg-[#0a122e]">
                <span className="text-[10px] uppercase text-indigo-400 block font-medium">Sunday Attendance</span>
                <span className="text-lg font-bold text-indigo-300 font-mono mt-0.5 block">
                  {activeAttendance.filter((a) => a.status === 'Present').length} Present
                </span>
              </div>
              <div className="p-3.5 bg-[#0a122e]">
                <span className="text-[10px] uppercase text-emerald-400 block font-medium">Cell Meetings</span>
                <span className="text-lg font-bold text-emerald-300 font-mono mt-0.5 block">
                  {activeMeetings.length} Held
                </span>
              </div>
              <div className="p-3.5 bg-[#0a122e]">
                <span className="text-[10px] uppercase text-amber-400 block font-medium">Cell Offering Remitted</span>
                <span className="text-lg font-bold text-amber-300 font-mono mt-0.5 block">
                  GH₵ {activeMeetings.reduce((sum, m) => sum + (m.offeringAmount || 0), 0).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Section 1: Assigned Members in this Cell */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#00f0ff]" />
                  <span>Members Assigned to {activeShepherd.cell} ({activeMembers.length})</span>
                </h4>
                <span className="text-xs text-[#a6c4eb]">
                  Pastor can reassign any member to another shepherd
                </span>
              </div>

              <div className="overflow-x-auto bg-[#0a122e]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-[#a6c4eb] font-semibold bg-[#0a122e]">
                      <th className="py-2.5 px-3">Member Name</th>
                      <th className="py-2.5 px-3">Telephone</th>
                      <th className="py-2.5 px-3">Enrolled Date</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#16285a]">
                    {activeMembers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-[#7b9dc7]">
                          No data recorded yet
                        </td>
                      </tr>
                    ) : (
                      activeMembers.map((m) => (
                        <tr key={m.id} className="hover:bg-[#16285a]/40 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-white">
                            {m.firstName} {m.lastName}
                          </td>
                          <td className="py-2.5 px-3 text-slate-300 font-mono">{formatGhanaianPhone(m.phone)}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 text-[10px] bg-slate-800 text-slate-300">
                              {m.spiritualStage}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-[#a6c4eb] font-mono text-[11px]">
                            {m.registeredAt}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => handleOpenTransfer(m.id)}
                              className="px-2.5 py-1 bg-[#16285a] hover:bg-[#00f0ff] text-slate-300 hover:text-[#070c1e] text-xs font-medium cursor-pointer transition-colors"
                            >
                              Transfer Out
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 2: Cell Fellowship Meetings Log */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <span>Cell Meetings Log for {activeShepherd.cell}</span>
              </h4>

              <div className="overflow-x-auto bg-[#0a122e] divide-y divide-[#16285a]">
                {activeMeetings.length === 0 ? (
                  <p className="p-5 text-center text-[#7b9dc7] text-xs">
                    No data recorded yet
                  </p>
                ) : (
                  activeMeetings.map((cm) => (
                    <div key={cm.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <p className="font-semibold text-white">{cm.topic}</p>
                        <p className="text-[#a6c4eb] text-[11px] mt-0.5">{cm.notes}</p>
                        <p className="text-[10px] text-[#7b9dc7] mt-1 font-mono">Date: {cm.date}</p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0 text-left sm:text-right">
                        <div>
                          <span className="text-[10px] text-[#a6c4eb] uppercase block">Attendees</span>
                          <span className="font-bold text-white font-mono">{cm.attendeesCount} Souls</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#a6c4eb] uppercase block">Offering</span>
                          <span className="font-bold text-amber-300 font-mono">GH₵ {(cm.offeringAmount || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REASSIGNMENT / TRANSFER MODAL */}
      {showReassignModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#111d44] shadow-2xl overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-[#00f0ff]" />
                <h3 className="text-sm font-bold text-white">
                  Assign / Reassign Member
                </h3>
              </div>
              <button
                onClick={() => setShowReassignModal(false)}
                className="text-[#a6c4eb] hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteTransfer} className="p-5 space-y-4 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Select Member to Reassign
                </label>
                <select
                  value={reassignMemberId}
                  onChange={(e) => setReassignMemberId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0a122e] text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#00f0ff] cursor-pointer"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.firstName} {m.lastName} (Currently: {m.cellGroup})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Assign to Target Shepherd &amp; Cell
                </label>
                <select
                  value={targetShepherdId}
                  onChange={(e) => setTargetShepherdId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0a122e] text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#00f0ff] cursor-pointer"
                >
                  {shepherds.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {s.cell} ({s.assignedCount}/{s.maxCapacity} full)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Transfer Reason
                </label>
                <input
                  type="text"
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="e.g. Geographic relocation / Workload balance"
                  className="w-full px-3 py-2 bg-[#0a122e] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00f0ff]"
                />
              </div>

              {reassignError && (
                <div className="p-3 bg-[#38141e] text-[#ff6b8b] text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{reassignError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowReassignModal(false); setReassignError(null); }}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isTransferring}
                  className="px-4 py-2 bg-[#00f0ff] hover:bg-[#3bf2ff] text-[#070c1e] text-xs font-semibold shadow-md cursor-pointer transition-colors disabled:opacity-50"
                >
                  {isTransferring ? 'Transferring...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Invite / Add Shepherd Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#111d44] shadow-2xl overflow-hidden flex flex-col p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#16285a]">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#00ff9d]" />
                <div>
                  <h3 className="text-base font-bold text-white">Add New Shepherd</h3>
                  <p className="text-[11px] text-[#a6c4eb]">Provide private credentials and assign a flock</p>
                </div>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-[#a6c4eb] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createdCredentials ? (
              <div className="space-y-4 py-2">
                <div className="p-4 bg-[#0f382a] text-[#00ff9d] flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span className="text-xs font-bold">
                  Account successfully created for {createdCredentials.name}.
                  </span>
                </div>

                <div className="bg-[#0a122e] p-4 space-y-2.5 font-mono text-xs text-white">
                  <div>
                    <span className="text-[#a6c4eb] block text-[10px] uppercase font-sans">Name</span>
                    <span className="font-bold">{createdCredentials.name}</span>
                  </div>
                  <div>
                    <span className="text-[#a6c4eb] block text-[10px] uppercase font-sans">Email</span>
                    <span className="text-[#00f0ff]">{createdCredentials.email}</span>
                  </div>
                  <div>
                    <span className="text-[#a6c4eb] block text-[10px] uppercase font-sans">Temporary Password</span>
                    <span className="text-[#00ff9d]">{createdCredentials.password}</span>
                  </div>
                  <div>
                    <span className="text-[#a6c4eb] block text-[10px] uppercase font-sans">Assigned Cell</span>
                    <span>{createdCredentials.cell}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={copyCredentialsForShare}
                    className="flex-1 py-3 px-4 bg-[#00f0ff] hover:bg-[#3bf2ff] text-[#070c1e] text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    {copiedNotice ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedNotice ? 'Copied to Clipboard!' : 'Copy Credentials for WhatsApp / SMS'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowInviteModal(false);
                      setCreatedCredentials(null);
                    }}
                    className="py-3 px-4 bg-[#16285a] hover:bg-[#203a7a] text-white text-xs font-bold cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateShepherd} className="space-y-3.5">
                <div>
                  <label className="text-[11px] font-semibold text-[#a6c4eb] block mb-1">
                    Shepherd Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newShepherdName}
                    onChange={(e) => setNewShepherdName(e.target.value)}
                    placeholder="e.g. Sister Chloe Mensah"
                    className="w-full px-3 py-2 bg-[#0a122e] text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#00f0ff]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#a6c4eb] block mb-1">
                    Personal Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={newShepherdEmail}
                    onChange={(e) => setNewShepherdEmail(e.target.value)}
                    placeholder="e.g. chloe.mensah@gmail.com"
                    className="w-full px-3 py-2 bg-[#0a122e] text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#00f0ff]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[#a6c4eb] block mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={newShepherdPhone}
                      onChange={(e) => setNewShepherdPhone(e.target.value)}
                      placeholder="+233 54 000 0000"
                      className="w-full px-3 py-2 bg-[#0a122e] text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#00f0ff]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#a6c4eb] block mb-1">
                      Shepherd Group Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newShepherdCell}
                      onChange={(e) => setNewShepherdCell(e.target.value)}
                      placeholder="e.g. Mount Zion Cell (West)"
                      className="w-full px-3 py-2 bg-[#0a122e] text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#00f0ff]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#a6c4eb] block mb-1">
                    Initial Private Password
                  </label>
                  <input
                    type="text"
                    value={newShepherdPassword}
                    onChange={(e) => setNewShepherdPassword(e.target.value)}
                    placeholder="CrossPassion@99"
                    className="w-full px-3 py-2 bg-[#0a122e] text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#00f0ff]"
                  />
                  <p className="text-[10px] text-[#7b9dc7] mt-1">
                    The shepherd will use this password to sign in. They can change it anytime in their profile.
                  </p>
                </div>

                {inviteError && (
                  <div className="p-3 bg-[#38141e] text-[#ff6b8b] text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{inviteError}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#16285a]">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="px-4 py-2 bg-[#16285a] hover:bg-[#203a7a] text-[#a6c4eb] text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingShepherd}
                    className="px-5 py-2 bg-[#00ff9d] hover:bg-[#3bf2ff] text-[#070c1e] text-xs font-bold cursor-pointer disabled:opacity-50"
                  >
                    {isCreatingShepherd ? 'Creating Account...' : 'Create Shepherd Account'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ShepherdAssignmentManagement;


