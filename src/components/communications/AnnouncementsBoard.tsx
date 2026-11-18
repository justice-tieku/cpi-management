import React, { useState } from 'react';
import { Megaphone, Plus, X, ChevronDown, CheckCircle2, AlertCircle } from 'lucide-react';
import { useCMS } from '../../context/CMSContext';
import { ChurchAnnouncement } from '../../types/cms';
import { validateName } from '../../utils/validation';

const priorityConfig = {
  Normal: { label: 'Normal', bg: 'bg-[#16285a]', text: 'text-[#a6c4eb]', dot: 'bg-[#7b9dc7]' },
  High: { label: 'High Priority', bg: 'bg-amber-900/30', text: 'text-amber-300', dot: 'bg-amber-400' },
  Urgent: { label: 'Urgent', bg: 'bg-rose-900/30', text: 'text-rose-300', dot: 'bg-rose-400' }
};

export const AnnouncementsBoard: React.FC = () => {
  const { currentUser, visibleAnnouncements, createAnnouncement } = useCMS();
  const isPastor = currentUser.role === 'pastor';

  const [showModal, setShowModal] = useState(false);
  const [filterPriority, setFilterPriority] = useState<'All' | ChurchAnnouncement['priority']>('All');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bannerNotice, setBannerNotice] = useState<{ message: string; isError: boolean } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ title?: string; content?: string }>({});
  const [form, setForm] = useState({
    title: '',
    content: '',
    priority: 'Normal' as ChurchAnnouncement['priority'],
    target: 'all_shepherds' as ChurchAnnouncement['target']
  });

  const filtered = visibleAnnouncements.filter(
    (a) => filterPriority === 'All' || a.priority === filterPriority
  );

  const handleSubmit = async () => {
    const errs: { title?: string; content?: string } = {};
    const titleErr = validateName(form.title, 'Title');
    if (titleErr) errs.title = titleErr;
    if (!form.content.trim()) errs.content = 'Message is required.';
    else if (form.content.trim().length > 2000) errs.content = 'Message is too long. Keep it under 2000 characters.';

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      setFormError('Please enter the required information.');
      return;
    }

    setErrors({});
    setFormError(null);
    setIsSubmitting(true);

    try {
      const res = await createAnnouncement({
        title: form.title.trim(),
        content: form.content.trim(),
        priority: form.priority,
        target: form.target
      });

      if (res.success) {
        setForm({ title: '', content: '', priority: 'Normal', target: 'all_shepherds' });
        setShowModal(false);
        setBannerNotice({ message: 'Information sent successfully.', isError: false });
        setTimeout(() => setBannerNotice(null), 4000);
      } else {
        setFormError(res.error || 'Unable to save the record. Please try again.');
      }
    } catch (err: any) {
      setFormError('Unable to save the record. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const urgentCount = visibleAnnouncements.filter((a) => a.priority === 'Urgent').length;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      {bannerNotice && (
        <div className={`p-4 text-xs font-semibold flex items-center gap-2 ${
          bannerNotice.isError ? 'bg-[#38141e] text-[#ff6b8b]' : 'bg-[#0f382a] text-[#00ff9d]'
        }`}>
          {bannerNotice.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
          <span>{bannerNotice.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Megaphone className="w-5 h-5 text-[#00f0ff]" />
            <h1 className="text-lg font-bold text-white">
              {isPastor ? 'Announcements' : 'Church Announcements'}
            </h1>
            {urgentCount > 0 && (
              <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                {urgentCount} urgent
              </span>
            )}
          </div>
          <p className="text-xs text-[#7b9dc7] mt-0.5">
            {isPastor
              ? 'Church announcements & directives'
              : 'Messages from Pastor Adams'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Priority Filter */}
          <div className="relative">
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as typeof filterPriority)}
              className="appearance-none pl-3 pr-8 py-2 bg-[#111d44] text-xs text-slate-300 outline-none focus:ring-2 focus:ring-[#00f0ff] cursor-pointer"
            >
              <option value="All">All Priorities</option>
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Normal">Normal</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#7b9dc7] pointer-events-none" />
          </div>

          {isPastor && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#00f0ff] hover:bg-[#3bf2ff] text-xs font-semibold text-[#070c1e] transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Post Announcement
            </button>
          )}
        </div>
      </div>

      {/* Announcements List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Megaphone className="w-10 h-10 text-slate-700 mb-3" />
          <p className="text-[#7b9dc7] text-sm font-medium">No data recorded yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((ann) => {
            const cfg = priorityConfig[ann.priority];
            return (
              <div
                key={ann.id}
                className={`p-5 ${cfg.bg}`}
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h3 className="text-sm font-bold text-white leading-snug">{ann.title}</h3>
                  <div className={`flex items-center gap-1.5 shrink-0 px-2.5 py-1  text-[10px] font-bold ${cfg.text}`}>
                    <span className={`w-1.5 h-1.5  ${cfg.dot}`} />
                    {cfg.label}
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mb-4">{ann.content}</p>
                <div className="flex items-center justify-between pt-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-[#072e54] flex items-center justify-center text-[9px] font-bold text-[#00f0ff]">
                      {ann.authorName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </div>
                    <span className="text-[10px] text-[#7b9dc7]">{ann.authorName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-600">
                    <span>{ann.target === 'all_shepherds' ? '→ All Shepherds' : '→ Church-Wide'}</span>
                    <span>·</span>
                    <span>{ann.date}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Announcement Modal */}
      {showModal && isPastor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#111d44] shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5">
              <div>
                <h2 className="text-sm font-bold text-white">Post New Announcement</h2>
                <p className="text-xs text-[#7b9dc7] mt-0.5">Broadcast to all shepherds</p>
              </div>
              <button
                onClick={() => { setShowModal(false); setErrors({}); }}
                className="p-1.5 hover:bg-slate-700/40 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 text-[#a6c4eb]" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Announcement Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Special Prayer & Fasting Week"
                  className={`w-full px-3 py-2.5 bg-[#0a122e]   text-xs text-slate-200 placeholder-slate-500 outline-none focus:ring-2 focus:ring-[#00f0ff]/60 ${errors.title ? '' : ''}`}
                />
                {errors.title && <p className="text-rose-400 text-[10px] mt-1">{errors.title}</p>}
              </div>

              {/* Message Content */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Message *</label>
                <textarea
                  rows={5}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="Write your announcement message here…"
                  className={`w-full px-3 py-2.5 bg-[#0a122e]   text-xs text-slate-200 placeholder-slate-500 outline-none focus:ring-2 focus:ring-[#00f0ff]/60 resize-none leading-relaxed ${errors.content ? '' : ''}`}
                />
                {errors.content && <p className="text-rose-400 text-[10px] mt-1">{errors.content}</p>}
              </div>

              {/* Priority + Target in a row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Priority Level</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value as ChurchAnnouncement['priority'] })}
                    className="w-full px-3 py-2.5 bg-[#0a122e] text-xs text-slate-200 outline-none focus:ring-2 focus:ring-[#00f0ff]/60 cursor-pointer"
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Send To</label>
                  <select
                    value={form.target}
                    onChange={(e) => setForm({ ...form, target: e.target.value as ChurchAnnouncement['target'] })}
                    className="w-full px-3 py-2.5 bg-[#0a122e] text-xs text-slate-200 outline-none focus:ring-2 focus:ring-[#00f0ff]/60 cursor-pointer"
                  >
                    <option value="all_shepherds">All Shepherds</option>
                    <option value="church_wide">Church-Wide</option>
                  </select>
                </div>
              </div>

              {formError && (
                <div className="p-3 bg-[#38141e] text-[#ff6b8b] text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-5">
              <button
                onClick={() => { setShowModal(false); setFormError(null); }}
                className="px-4 py-2 text-xs font-medium text-[#a6c4eb] hover:text-slate-200 hover:bg-slate-700/40 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-5 py-2 bg-[#00f0ff] hover:bg-[#3bf2ff] text-xs font-semibold text-[#070c1e] transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Posting...' : 'Post Announcement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};



