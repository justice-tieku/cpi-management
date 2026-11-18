import React, { useState } from 'react';
import { CalendarDays, Plus, X, MapPin, Clock, Tag, Image, CheckCircle2, AlertCircle } from 'lucide-react';
import { useCMS } from '../../context/CMSContext';
import { ChurchEvent } from '../../types/cms';
import { validateName } from '../../utils/validation';

const categoryColors: Record<string, { bg: string; text: string }> = {
  Conference: { bg: 'bg-[#072e54]', text: 'text-[#00f0ff]' },
  Revival: { bg: 'bg-[#3b2b10]', text: 'text-amber-300' },
  'Cell Outreach': { bg: 'bg-[#043621]', text: 'text-[#00ff9d]' },
  Vigil: { bg: 'bg-[#1e3a5f]', text: 'text-[#60a5fa]' },
  Communion: { bg: 'bg-[#38141e]', text: 'text-[#ff6b8b]' },
  Youth: { bg: 'bg-[#072e54]', text: 'text-[#00f0ff]' },
  'Special Service': { bg: 'bg-[#3b2b10]', text: 'text-amber-300' }
};

const categories: ChurchEvent['category'][] = [
  'Conference', 'Revival', 'Cell Outreach', 'Vigil', 'Communion', 'Youth', 'Special Service'
];

export const ChurchEventsBoard: React.FC = () => {
  const { currentUser, visibleEvents, createEvent } = useCMS();
  const isPastor = currentUser.role === 'pastor';

  const [showModal, setShowModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState<'All' | ChurchEvent['category']>('All');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bannerNotice, setBannerNotice] = useState<{ message: string; isError: boolean } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    description: '',
    flyerUrl: '',
    category: 'Conference' as ChurchEvent['category']
  });

  const filtered = visibleEvents.filter(
    (e) => filterCategory === 'All' || e.category === filterCategory
  );

  // Sort: upcoming events first
  const sorted = [...filtered].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const handleSubmit = async () => {
    const errs: Record<string, string> = {};
    const titleErr = validateName(form.title, 'Event title');
    if (titleErr) errs.title = titleErr;
    if (!form.date.trim()) errs.date = 'Event date is required.';
    else if (Number.isNaN(new Date(form.date).getTime())) errs.date = 'Enter a valid event date.';
    const locationErr = validateName(form.location, 'Location');
    if (locationErr) errs.location = locationErr;
    if (form.flyerUrl.trim() && !/^https?:\/\/.+/i.test(form.flyerUrl.trim())) {
      errs.flyerUrl = 'Enter a valid image URL starting with http:// or https://.';
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      setFormError('Please enter the required information.');
      return;
    }

    setErrors({});
    setFormError(null);
    setIsSubmitting(true);

    try {
      const res = await createEvent({
        title: form.title.trim(),
        date: form.date.trim(),
        time: form.time.trim() || '18:00',
        location: form.location.trim(),
        description: form.description.trim() || form.title.trim(),
        flyerUrl: form.flyerUrl.trim() || undefined,
        category: form.category
      });

      if (res.success) {
        setForm({ title: '', date: '', time: '', location: '', description: '', flyerUrl: '', category: 'Conference' });
        setShowModal(false);
        setBannerNotice({ message: 'Record saved successfully.', isError: false });
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

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const isUpcoming = (dateStr: string) => {
    try {
      return new Date(dateStr + 'T23:59:59') >= new Date();
    } catch {
      return true;
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
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
            <CalendarDays className="w-5 h-5 text-[#00f0ff]" />
            <h1 className="text-lg font-bold text-white">Church Events</h1>
            <span className="px-2 py-0.5 bg-[#072e54] text-[#00f0ff] text-[10px] font-bold">
              {sorted.filter((e) => isUpcoming(e.date)).length} upcoming
            </span>
          </div>
          <p className="text-xs text-[#7b9dc7] mt-0.5">
            {isPastor ? 'Church programs & flyers' : 'Upcoming church programs'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as typeof filterCategory)}
            className="appearance-none px-3 py-2 bg-[#111d44] text-xs text-slate-300 outline-none focus:ring-2 focus:ring-[#00f0ff] cursor-pointer"
          >
            <option value="All">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {isPastor && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#00f0ff] hover:bg-[#3bf2ff] text-xs font-semibold text-[#070c1e] transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Event
            </button>
          )}
        </div>
      </div>

      {/* Events Grid */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <CalendarDays className="w-10 h-10 text-slate-700 mb-3" />
          <p className="text-[#7b9dc7] text-sm font-medium">No data recorded yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {sorted.map((event) => {
            const catColor = categoryColors[event.category] || categoryColors.Conference;
            const upcoming = isUpcoming(event.date);

            return (
              <div
                key={event.id}
                className={`  bg-[#111d44] overflow-hidden transition-all  ${
                  upcoming ? '' : ' opacity-70'
                }`}
              >
                {/* Flyer Image */}
                {event.flyerUrl ? (
                  <div className="relative h-44 w-full overflow-hidden bg-slate-900">
                    <img
                      src={event.flyerUrl}
                      alt={event.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    {/* Category Badge over flyer */}
                    <div className="absolute top-3 left-3">
                      <span className={`px-2.5 py-1 text-[10px] font-bold ${catColor.bg} ${catColor.text} backdrop-blur-sm`}>
                        {event.category}
                      </span>
                    </div>
                    {!upcoming && (
                      <div className="absolute top-3 right-3 px-2.5 py-1 bg-slate-900/80 text-[#a6c4eb] text-[10px] font-bold">
                        Past Event
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative h-28 w-full bg-[#0a122e] flex items-center justify-center">
                    <Image className="w-8 h-8 text-slate-700" />
                    <div className="absolute top-3 left-3">
                      <span className={`px-2.5 py-1 text-[10px] font-bold ${catColor.bg} ${catColor.text}`}>
                        {event.category}
                      </span>
                    </div>
                  </div>
                )}

                {/* Event Details */}
                <div className="p-5">
                  <h3 className="text-sm font-bold text-white leading-snug mb-3">{event.title}</h3>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-3.5 h-3.5 text-[#00f0ff] shrink-0" />
                      <span className="text-xs text-slate-300">{formatDate(event.date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-[#00f0ff] shrink-0" />
                      <span className="text-xs text-slate-300">{event.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-[#00f0ff] shrink-0" />
                      <span className="text-xs text-slate-300">{event.location}</span>
                    </div>
                  </div>

                  <p className="text-xs text-[#a6c4eb] leading-relaxed mb-4 line-clamp-3">{event.description}</p>

                  <div className="flex items-center justify-between pt-3">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-[#072e54] flex items-center justify-center text-[8px] font-bold text-[#00f0ff]">
                        {event.createdBy.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </div>
                      <span className="text-[10px] text-[#7b9dc7]">{event.createdBy}</span>
                    </div>
                    <span className="text-[10px] text-slate-600">Posted {event.createdAt}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========== Create Event Modal =========== */}
      {showModal && isPastor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#111d44] shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 sticky top-0 bg-[#111d44] z-10">
              <div>
                <h2 className="text-sm font-bold text-white">Create New Event</h2>
                <p className="text-xs text-[#7b9dc7] mt-0.5">Visible to all shepherds</p>
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
              {/* Event Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Event Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Annual Kingdom Harvest Convention"
                  className={`w-full px-3 py-2.5 bg-[#0a122e]   text-xs text-slate-200 placeholder-slate-500 outline-none focus:ring-2 focus:ring-[#00f0ff]/60 ${errors.title ? '' : ''}`}
                />
                {errors.title && <p className="text-rose-400 text-[10px] mt-1">{errors.title}</p>}
              </div>

              {/* Date + Time Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Event Date *</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className={`w-full px-3 py-2.5 bg-[#0a122e]   text-xs text-slate-200 outline-none focus:ring-2 focus:ring-[#00f0ff]/60 cursor-pointer ${errors.date ? '' : ''}`}
                  />
                  {errors.date && <p className="text-rose-400 text-[10px] mt-1">{errors.date}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Time *</label>
                  <input
                    type="text"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    placeholder="e.g. 6:00 PM - 9:00 PM"
                    className={`w-full px-3 py-2.5 bg-[#0a122e]   text-xs text-slate-200 placeholder-slate-500 outline-none focus:ring-2 focus:ring-[#00f0ff]/60 ${errors.time ? '' : ''}`}
                  />
                  {errors.time && <p className="text-rose-400 text-[10px] mt-1">{errors.time}</p>}
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Location *</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="e.g. Central Cathedral — Main Sanctuary"
                  className={`w-full px-3 py-2.5 bg-[#0a122e]   text-xs text-slate-200 placeholder-slate-500 outline-none focus:ring-2 focus:ring-[#00f0ff]/60 ${errors.location ? '' : ''}`}
                />
                {errors.location && <p className="text-rose-400 text-[10px] mt-1">{errors.location}</p>}
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Category</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => {
                    const catColor = categoryColors[cat] || categoryColors.Conference;
                    const selected = form.category === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => setForm({ ...form, category: cat })}
                        className={`px-3 py-1.5 text-[10px] font-bold transition-colors cursor-pointer ${
                          selected
                            ? `${catColor.bg} ${catColor.text} ring-1 ring-[#00f0ff]/30`
                            : 'bg-[#0a122e] text-[#7b9dc7]'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Description *</label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe the event details, what to expect, who should attend…"
                  className={`w-full px-3 py-2.5 bg-[#0a122e]   text-xs text-slate-200 placeholder-slate-500 outline-none focus:ring-2 focus:ring-[#00f0ff]/60 resize-none leading-relaxed ${errors.description ? '' : ''}`}
                />
                {errors.description && <p className="text-rose-400 text-[10px] mt-1">{errors.description}</p>}
              </div>

              {/* Flyer URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Image className="w-3 h-3" />
                    Flyer Image URL
                    <span className="text-[#7b9dc7] font-normal">(optional)</span>
                  </span>
                </label>
                <input
                  type="text"
                  value={form.flyerUrl}
                  onChange={(e) => setForm({ ...form, flyerUrl: e.target.value })}
                  placeholder="https://example.com/event-flyer.jpg"
                  className="w-full px-3 py-2.5 bg-[#0a122e] text-xs text-slate-200 placeholder-slate-500 outline-none focus:ring-2 focus:ring-[#00f0ff]/60"
                />
                <p className="text-[10px] text-slate-600 mt-1">Paste a direct link to your event flyer image</p>

                {/* Flyer Preview */}
                {form.flyerUrl.trim() && (
                  <div className="mt-3 overflow-hidden h-32">
                    <img
                      src={form.flyerUrl}
                      alt="Flyer preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              {formError && (
                <div className="p-3 bg-[#38141e] text-[#ff6b8b] text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-5 sticky bottom-0 bg-[#111d44]">
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
                {isSubmitting ? 'Creating...' : 'Create Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};



