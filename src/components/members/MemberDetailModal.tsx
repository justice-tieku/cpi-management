import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Shield,
  Edit3,
  CheckCircle2,
  CalendarCheck,
  Clock,
  Save,
  MessageSquare,
  Cake,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { Member, SpiritualStage, MemberStatus } from '../../types/cms';
import { useCMS } from '../../context/CMSContext';
import { formatGhanaianPhone, getCleanDialPhone } from '../../utils/phone';
import { normalizeDate } from '../../utils/date';
import { validateName, validatePhone, validateEmail, validateDob, formatPhone } from '../../utils/validation';

interface MemberDetailModalProps {
  member: Member | null;
  isOpen: boolean;
  onClose: () => void;
}

const spiritualStages: SpiritualStage[] = [
  'New Convert',
  'Water Baptized',
  'Foundation Class',
  'Commissioned Worker',
  'Deacon / Deaconess',
  'Minister / Elder'
];

const memberStatuses: MemberStatus[] = [
  'Active',
  'New Member',
  'Pending Verification',
  'Inactive',
  'Transferred'
];

export const MemberDetailModal: React.FC<MemberDetailModalProps> = ({
  member,
  isOpen,
  onClose
}) => {
  const { updateMember, deleteMember, currentUser, attendanceRecords, followUpTasks } = useCMS();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'attendance' | 'tasks'>('profile');
  const [saveNotice, setSaveNotice] = useState<{ message: string; isError: boolean } | null>(null);

  // Editable form state
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    city: '',
    dateOfBirth: '',
    gender: '' as '' | 'Male' | 'Female',
    spiritualStage: 'New Convert' as SpiritualStage,
    status: 'Active' as MemberStatus,
    generalNotes: ''
  });

  useEffect(() => {
    if (member) {
      setForm({
        firstName: member.firstName || '',
        lastName: member.lastName || '',
        phone: formatGhanaianPhone(member.phone || ''),
        email: member.email || '',
        city: member.city || '',
        dateOfBirth: member.dateOfBirth || '',
        gender: member.gender || '',
        spiritualStage: member.spiritualStage || 'New Convert',
        status: member.status || 'Active',
        generalNotes: member.generalNotes || ''
      });
      setIsEditing(false);
      setSaveNotice(null);
    }
  }, [member, isOpen]);

  if (!isOpen || !member) return null;

  // Member's attendance records
  const memberAttendance = attendanceRecords.filter((a) => a.memberId === member.id);
  const presentCount = memberAttendance.filter((a) => a.status === 'Present').length;
  const attendanceRate =
    memberAttendance.length > 0 ? Math.round((presentCount / memberAttendance.length) * 100) : 0;

  // Member's care tasks
  const memberTasks = followUpTasks.filter((t) => t.memberId === member.id);

  // Age calculation
  const calculateAge = (dobString?: string) => {
    if (!dobString || !/^\d{4}-\d{2}-\d{2}$/.test(dobString)) return null;
    const birthDate = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: string[] = [];
    const firstNameErr = validateName(form.firstName, 'First name');
    if (firstNameErr) errors.push(firstNameErr);
    const phoneErr = validatePhone(form.phone);
    if (phoneErr) errors.push(phoneErr);
    if (form.email.trim()) {
      const emailErr = validateEmail(form.email.trim());
      if (emailErr) errors.push(emailErr);
    }
    if (form.dateOfBirth.trim()) {
      const dobErr = validateDob(form.dateOfBirth);
      if (dobErr) errors.push(dobErr);
    }
    if (errors.length > 0) {
      setSaveNotice({ message: errors.join(' '), isError: true });
      return;
    }

    setIsSaving(true);
    setSaveNotice(null);

    try {
      const result = await updateMember(member.id, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: formatPhone(form.phone),
        email: form.email.trim(),
        city: form.city.trim(),
        dateOfBirth: normalizeDate(form.dateOfBirth) || undefined,
        gender: form.gender || undefined,
        spiritualStage: form.spiritualStage,
        status: form.status,
        generalNotes: form.generalNotes.trim()
      });

      if (result.success) {
        setSaveNotice({ message: 'Changes updated successfully.', isError: false });
        setTimeout(() => {
          setSaveNotice(null);
          setIsEditing(false);
        }, 1200);
      } else {
        setSaveNotice({ message: result.error || 'Unable to save the record. Please try again.', isError: true });
      }
    } catch (err: any) {
      setSaveNotice({ message: 'Unable to save the record. Please try again.', isError: true });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete ${member.firstName} ${member.lastName}? This cannot be undone.`)) return;
    setIsDeleting(true);
    setSaveNotice(null);
    const result = await deleteMember(member.id);
    setIsDeleting(false);
    if (result.success) {
      onClose();
    } else {
      setSaveNotice({ message: result.error || 'Unable to delete this member.', isError: true });
    }
  };

  const initials = `${member.firstName?.[0] || ''}${member.lastName?.[0] || ''}`.toUpperCase();

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="w-full max-w-2xl bg-[#111d44] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 bg-[#0c152e] flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-[#072e54] flex items-center justify-center text-[#00f0ff] font-bold text-base shadow-inner">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  {member.firstName} {member.lastName}
                </h3>
                <span
                  className={`px-2 py-0.5  text-[10px] font-semibold ${
                    member.status === 'Active'
                      ? 'bg-emerald-950/60 text-emerald-300  '
                      : 'bg-[#072e54] text-[#00f0ff]  '
                  }`}
                >
                  {member.status}
                </span>
              </div>
              <p className="text-xs text-[#a6c4eb] mt-0.5">
                {member.cellGroup} • Assigned to{' '}
                <strong className="text-slate-200">
                  {member.currentShepherdName || 'Care Shepherd'}
                </strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing && (
              <>
                {currentUser.role === 'pastor' && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="px-3 py-1.5 bg-rose-950/50 hover:bg-rose-900 text-rose-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-1.5 bg-[#16285a] hover:bg-[#00f0ff] text-[#00f0ff] text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#a6c4eb] hover:text-white hover:bg-[#16285a] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-5 bg-[#0a122e] text-xs">
          <button
            type="button"
            onClick={() => {
              setActiveTab('profile');
              setIsEditing(false);
            }}
            className={`py-3 px-3.5 font-medium -2 transition-colors cursor-pointer ${
              activeTab === 'profile'
                ? ' text-[#00f0ff]'
                : '-transparent text-[#a6c4eb] hover:text-slate-200'
            }`}
          >
            Profile &amp; Details
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('attendance');
              setIsEditing(false);
            }}
            className={`py-3 px-3.5 font-medium -2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'attendance'
                ? ' text-[#00f0ff]'
                : '-transparent text-[#a6c4eb] hover:text-slate-200'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>Attendance ({memberAttendance.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('tasks');
              setIsEditing(false);
            }}
            className={`py-3 px-3.5 font-medium -2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'tasks'
                ? ' text-[#00f0ff]'
                : '-transparent text-[#a6c4eb] hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Care Tasks ({memberTasks.length})</span>
          </button>
        </div>

        {/* Status feedback alert */}
        {saveNotice && (
          <div className={`mx-5 mt-4 p-3 text-xs flex items-center gap-2 ${
            saveNotice.isError ? 'bg-[#38141e] text-[#ff6b8b]' : 'bg-[#0f382a] text-[#00ff9d]'
          }`}>
            {saveNotice.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
            <span>{saveNotice.message}</span>
          </div>
        )}

        {/* Modal Body Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* TAB 1: Profile & Details */}
          {activeTab === 'profile' && !isEditing && (
            <div className="space-y-5">
              {/* Quick Contact Bar */}
              <div className="p-4 bg-[#0a122e] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-emerald-950/50 flex items-center justify-center text-emerald-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-[#a6c4eb] block font-mono">Telephone</span>
                    <span className="font-bold text-white text-sm font-mono">{formatGhanaianPhone(member.phone)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${getCleanDialPhone(member.phone)}`}
                    className="px-3 py-1.5 bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-300 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call</span>
                  </a>
                  <a
                    href={`sms:${getCleanDialPhone(member.phone)}`}
                    className="px-3 py-1.5 bg-[#16285a] hover:bg-[#00f0ff] hover:text-[#070c1e] text-[#00f0ff] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>SMS</span>
                  </a>
                </div>
              </div>

              {/* Information Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 bg-[#0a122e] space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-[#a6c4eb] font-semibold flex items-center gap-1.5">
                    <Mail className="w-3 h-3 text-[#00f0ff]" />
                    Email Address
                  </span>
                  <p className="font-semibold text-white truncate">
                    {member.email || 'No email provided'}
                  </p>
                </div>

                <div className="p-3.5 bg-[#0a122e] space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-[#a6c4eb] font-semibold flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-[#00f0ff]" />
                    Residential Area / City
                  </span>
                  <p className="font-semibold text-white">{member.city || 'Central District'}</p>
                </div>

                <div className="p-3.5 bg-[#0a122e] space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-[#a6c4eb] font-semibold flex items-center gap-1.5">
                    <Cake className="w-3 h-3 text-pink-400" />
                    Date of Birth &amp; Age
                  </span>
                  <p className="font-semibold text-white font-mono">
                    {member.dateOfBirth ? (
                      <>
                        {member.dateOfBirth}
                        {calculateAge(member.dateOfBirth) !== null && (
                          <span className="text-pink-400 ml-1.5 font-sans">
                            ({calculateAge(member.dateOfBirth)} years old)
                          </span>
                        )}
                      </>
                    ) : (
                      'Not recorded'
                    )}
                  </p>
                </div>

                <div className="p-3.5 bg-[#0a122e] space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-[#a6c4eb] font-semibold flex items-center gap-1.5">
                    <Shield className="w-3 h-3 text-indigo-400" />
                    Spiritual Stage
                  </span>
                  <p className="font-bold text-[#00f0ff]">{member.spiritualStage}</p>
                </div>
              </div>

              {/* Enrolled metadata */}
              <div className="p-3.5 bg-[#0a122e] flex items-center justify-between text-[#a6c4eb]">
                <span>Member ID: <strong className="text-white font-mono">{member.id}</strong></span>
                <span>Enrolled on {member.registeredAt} by {member.registeredBy}</span>
              </div>

              {/* Pastoral / General Notes */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                  Pastoral Care Notes
                </span>
                <div className="p-3.5 bg-[#0a122e] text-slate-300 leading-relaxed min-h-[60px]">
                  {member.generalNotes || 'No notes entered for this member yet.'}
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: EDIT MODE */}
          {activeTab === 'profile' && isEditing && (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0a122e] text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0a122e] text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Contact Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+233 24 000 0000"
                    className="w-full px-3 py-2 bg-[#0a122e] text-white focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0a122e] text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Residential Area / City
                  </label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0a122e] text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0a122e] text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Gender (optional)</label>
                  <select
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value as '' | 'Male' | 'Female' })}
                    className="w-full px-3 py-2 bg-[#0a122e] text-white focus:outline-none"
                  >
                    <option value="">Not specified</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Spiritual Stage
                  </label>
                  <select
                    value={form.spiritualStage}
                    onChange={(e) =>
                      setForm({ ...form, spiritualStage: e.target.value as SpiritualStage })
                    }
                    className="w-full px-3 py-2 bg-[#0a122e] text-white focus:outline-none cursor-pointer"
                  >
                    {spiritualStages.map((stg) => (
                      <option key={stg} value={stg}>
                        {stg}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Membership Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value as MemberStatus })
                    }
                    className="w-full px-3 py-2 bg-[#0a122e] text-white focus:outline-none cursor-pointer"
                  >
                    {memberStatuses.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Pastoral Notes
                </label>
                <textarea
                  rows={3}
                  value={form.generalNotes}
                  onChange={(e) => setForm({ ...form, generalNotes: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0a122e] text-white focus:outline-none leading-relaxed resize-none"
                  placeholder="Record pastoral care notes, prayer points, or observations..."
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-[#16285a] hover:bg-[#1c3066] text-[#cbd5e1] font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-[#00f0ff] hover:bg-[#3bf2ff] text-[#070c1e] font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-md disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving...' : 'Save Profile'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Attendance History */}
          {activeTab === 'attendance' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 bg-[#0a122e]">
                <div>
                  <span className="text-[10px] uppercase text-[#a6c4eb] block font-semibold">
                    Attendance Rate
                  </span>
                  <span className="text-lg font-bold text-[#00f0ff] font-mono">
                    {attendanceRate}%
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase text-[#a6c4eb] block font-semibold">
                    Services Recorded
                  </span>
                  <span className="text-sm font-bold text-white font-mono">
                    {presentCount} Present / {memberAttendance.length} Total
                  </span>
                </div>
              </div>

              {memberAttendance.length === 0 ? (
                <div className="py-8 text-center text-[#7b9dc7]">
                  No attendance entries recorded for this member yet.
                </div>
              ) : (
                <div className="divide-y divide-[#16285a] bg-[#0a122e] overflow-hidden">
                  {memberAttendance.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-3 flex items-center justify-between gap-3 hover:bg-[#16285a] transition-colors"
                    >
                      <div>
                        <p className="font-semibold text-white">{rec.serviceName}</p>
                        <p className="text-[10px] text-[#7b9dc7] font-mono mt-0.5">
                          {rec.serviceDate} • Recorded by {rec.recordedBy}
                        </p>
                      </div>

                      <span
                        className={`px-2.5 py-1  text-[10px] font-semibold ${
                          rec.status === 'Present'
                            ? 'bg-[#043621] text-[#00ff9d]'
                            : 'bg-[#38141e] text-[#ff6b8b]'
                        }`}
                      >
                        {rec.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Care Follow-Up Tasks */}
          {activeTab === 'tasks' && (
            <div className="space-y-3">
              {memberTasks.length === 0 ? (
                <div className="py-8 text-center text-[#7b9dc7]">
                  No pastoral follow-up tasks currently assigned for this member.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {memberTasks.map((t) => (
                    <div
                      key={t.id}
                      className="p-3.5 bg-[#0a122e] space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">{t.taskType}</span>
                        <span
                          className={`px-2 py-0.5  text-[10px] font-semibold ${
                            t.status === 'Completed'
                              ? 'bg-[#043621] text-[#00ff9d]'
                              : 'bg-[#3b2b10] text-amber-300'
                          }`}
                        >
                          {t.status}
                        </span>
                      </div>
                      <p className="text-slate-300 text-[11px]">{t.notes}</p>
                      <div className="flex items-center justify-between text-[10px] text-[#7b9dc7] pt-1">
                        <span>Action: {t.nextAction || 'Phone / Visit'}</span>
                        <span className="font-mono">Due: {t.dueDate}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#0c152e] flex items-center justify-between">
          <span className="text-[10px] text-[#7b9dc7]">
            Cross Passion International • Ministerial Registry
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#16285a] hover:bg-[#1c3066] text-white font-semibold cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default MemberDetailModal;



