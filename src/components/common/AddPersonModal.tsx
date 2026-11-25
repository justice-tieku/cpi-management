import React, { useState, useEffect } from 'react';
import { X, UserPlus, Phone, Mail, Calendar, MapPin, User, CheckCircle2, UserCheck, Sparkles } from 'lucide-react';
import { useCMS } from '../../context/CMSContext';
import { validateName, validatePhone, validateEmail, validateDob, formatPhone } from '../../utils/validation';

interface AddPersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'member' | 'guest';
}

export const AddPersonModal: React.FC<AddPersonModalProps> = ({
  isOpen,
  onClose,
  defaultMode = 'member'
}) => {
  const { currentUser, shepherds, registerMember, registerVisitor } = useCMS();
  const isPastor = currentUser.role === 'pastor';

  const [registrationType, setRegistrationType] = useState<'member' | 'guest'>(defaultMode);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'' | 'Male' | 'Female'>('');
  const [dob, setDob] = useState('');
  const [location, setLocation] = useState('');
  const [email, setEmail] = useState('');
  const [selectedShepherdId, setSelectedShepherdId] = useState(
    currentUser.role === 'shepherd' ? currentUser.id : shepherds[0]?.id || ''
  );

  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRegistrationType(defaultMode);
      setFeedback(null);
    }
  }, [isOpen, defaultMode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const errors: string[] = [];
    const nameErr = validateName(fullName.trim(), 'Full name');
    if (nameErr) errors.push(nameErr);
    const phoneErr = validatePhone(phone);
    if (phoneErr) errors.push(phoneErr);
    if (email.trim()) {
      const emailErr = validateEmail(email.trim());
      if (emailErr) errors.push(emailErr);
    }
    if (dob.trim()) {
      const dobErr = validateDob(dob);
      if (dobErr) errors.push(dobErr);
    }
    if (errors.length > 0) {
      setFeedback({ type: 'error', message: errors.join(' ') });
      return;
    }
    const formattedPhone = formatPhone(phone);

    setIsSubmitting(true);

    // Find assigned shepherd
    const assignedShepherd =
      currentUser.role === 'shepherd'
        ? { id: currentUser.id, name: currentUser.name, cell: currentUser.assignedCell || 'My Shepherd Group' }
        : shepherds.find((s) => s.id === selectedShepherdId) || shepherds[0];

    try {
      if (registrationType === 'guest') {
        // Register as First-Timer / Guest
        const result = await registerVisitor({
          name: fullName.trim(),
          phone: formattedPhone,
          email: email.trim(),
          visitDate: dob.trim() || new Date().toISOString().split('T')[0],
          serviceAttended: 'Sunday Service',
          invitedBy: location.trim() || 'Walk-in',
          assignedShepherdId: assignedShepherd ? assignedShepherd.id : undefined,
          assignedShepherdName: assignedShepherd ? assignedShepherd.name : undefined,
          journeyStage: 'First Visit',
          notes: location.trim() ? `Location: ${location.trim()}` : ''
        });

        if (result.success) {
          setFeedback({
            type: 'success',
            message: 'Record saved successfully.'
          });
          setTimeout(() => {
            onClose();
            resetForm();
          }, 1200);
        } else {
          setFeedback({
            type: 'error',
            message: result.error || 'Unable to save the record. Please try again.'
          });
        }
      } else {
        // Register as regular church member
        const nameParts = fullName.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '—';

        const result = await registerMember({
          firstName,
          lastName,
          phone: formattedPhone,
          email: email.trim(),
          city: location.trim() || 'Central',
          dateOfBirth: dob.trim() || undefined,
          gender: gender || undefined,
          status: 'New Member',
          spiritualStage: 'New Convert',
          cellGroup: assignedShepherd ? assignedShepherd.cell : 'Central Cathedral',
          currentShepherdId: assignedShepherd ? assignedShepherd.id : undefined,
          currentShepherdName: assignedShepherd ? assignedShepherd.name : undefined,
          generalNotes: dob ? `Date of Birth: ${dob}` : ''
        });

        if (result.success) {
          setFeedback({
            type: 'success',
            message: 'Record saved successfully.'
          });
          setTimeout(() => {
            onClose();
            resetForm();
          }, 1200);
        } else {
          setFeedback({
            type: 'error',
            message: result.error || 'Unable to save the record. Please try again.'
          });
        }
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Unable to save the record. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFullName('');
    setPhone('');
    setGender('');
    setDob('');
    setLocation('');
    setEmail('');
    setFeedback(null);
  };

  const isGuest = registrationType === 'guest';

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#111d44] shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-[#16285a]/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#072e54] flex items-center justify-center text-[#00f0ff]">
              {isGuest ? <Sparkles className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                {isGuest ? 'Register New Guest' : 'Add New Person'}
              </h3>
              <p className="text-[11px] text-[#a6c4eb]">
                {isGuest
                  ? 'First-timer registry & pastoral follow-up'
                  : 'Register into church & shepherd group records'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 hover:bg-slate-800 text-[#a6c4eb] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Type Selector Toggle: Member vs First-Timer / Guest */}
        <div className="p-4 pb-0">
          <div className="grid grid-cols-2 gap-2 bg-[#0a122e] p-1">
            <button
              type="button"
              onClick={() => {
                setRegistrationType('member');
                setFeedback(null);
              }}
              className={`py-2 px-3 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                !isGuest
                  ? 'bg-[#00f0ff] text-[#070c1e] shadow-sm'
                  : 'bg-transparent text-[#a6c4eb] hover:text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Church Member</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setRegistrationType('guest');
                setFeedback(null);
              }}
              className={`py-2 px-3 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                isGuest
                  ? 'bg-[#00f0ff] text-[#070c1e] shadow-sm'
                  : 'bg-transparent text-[#a6c4eb] hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>First-Timer / Guest</span>
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mx-4 mt-3 px-4 py-2.5 text-xs font-semibold flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-[#043621] text-[#00ff9d]'
                : 'bg-[#38141e] text-[#ff6b8b]'
            }`}
          >
            {feedback.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Concise Form */}
        <form onSubmit={handleSubmit} className="p-4 pt-3 space-y-3 text-xs">
          {/* 1. Full Name */}
          <div>
            <label className="text-[11px] font-semibold text-[#cbd5e1] block mb-1">
              Full Name <span className="text-[#00f0ff]">*</span>
            </label>
            <div className="relative">
              <User className="w-3.5 h-3.5 text-[#7b9dc7] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Samuel Tieku"
                className="w-full pl-9 pr-3 py-2 bg-[#0a122e] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00f0ff]"
              />
            </div>
          </div>

          {/* 2. Contact Phone */}
          <div>
            <label className="text-[11px] font-semibold text-[#cbd5e1] block mb-1">
              Contact / Telephone <span className="text-[#00f0ff]">*</span>
            </label>
            <div className="relative">
              <Phone className="w-3.5 h-3.5 text-[#7b9dc7] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +233 24 000 0000"
                className="w-full pl-9 pr-3 py-2 bg-[#0a122e] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00f0ff]"
              />
            </div>
          </div>

          {/* 3. Date of Birth / Visit Date */}
          {!isGuest && (
            <div>
              <label className="text-[11px] font-semibold text-[#cbd5e1] block mb-1">Gender (optional)</label>
              <select value={gender} onChange={(e) => setGender(e.target.value as '' | 'Male' | 'Female')} className="w-full px-3 py-2 bg-[#0a122e] text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#00f0ff]">
                <option value="">Not specified</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          )}
          <div>
            <label className="text-[11px] font-semibold text-[#cbd5e1] block mb-1">
              {isGuest ? 'Visit Date' : 'Date of Birth'}
            </label>
            <div className="relative">
              <Calendar className="w-3.5 h-3.5 text-[#7b9dc7] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#0a122e] text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#00f0ff]"
              />
            </div>
          </div>

          {/* 4. Location / Invited By */}
          <div>
            <label className="text-[11px] font-semibold text-[#cbd5e1] block mb-1">
              {isGuest ? 'Invited By / Residential Area' : 'Location / Residential Area'}
            </label>
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 text-[#7b9dc7] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={isGuest ? 'e.g. Invited by Bro. Samuel / East Gate' : 'e.g. Metro Campus / East Gate'}
                className="w-full pl-9 pr-3 py-2 bg-[#0a122e] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00f0ff]"
              />
            </div>
          </div>

          {/* 5. Email (Optional) */}
          <div>
            <label className="text-[11px] font-semibold text-[#cbd5e1] block mb-1">
              Email Address <span className="text-[#7b9dc7] font-normal">(optional)</span>
            </label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-[#7b9dc7] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. member@email.com"
                className="w-full pl-9 pr-3 py-2 bg-[#0a122e] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00f0ff]"
              />
            </div>
          </div>

          {/* If Pastor is adding, allow assigning to a specific Shepherd */}
          {isPastor && (
            <div>
              <label className="text-[11px] font-semibold text-[#cbd5e1] block mb-1">
                Assign to Shepherd Group
              </label>
              <select
                value={selectedShepherdId}
                onChange={(e) => setSelectedShepherdId(e.target.value)}
                className="w-full px-3 py-2 bg-[#0a122e] text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#00f0ff] cursor-pointer"
              >
                {shepherds.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.cell}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 bg-[#16285a] hover:bg-[#1c3066] text-[#cbd5e1] text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#00f0ff] hover:bg-[#3bf2ff] text-[#070c1e] text-xs font-semibold shadow-md transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Saving...' : isGuest ? 'Register Guest' : 'Add Person'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPersonModal;
