import React, { useState } from 'react';
import {
  Shield,
  Phone,
  MessageSquare,
  Plus,
  CheckCircle2,
  Clock,
  UserCheck,
  Send,
  AlertCircle,
  Filter
} from 'lucide-react';
import { useCMS } from '../../context/CMSContext';
import { DirectOutreachModal } from '../common/DirectOutreachModal';

export const ShepherdWorkspace: React.FC = () => {
  const {
    currentUser,
    visibleTasks,
    visibleMembers,
    updateTaskStatus,
    shepherds,
    redListMembers,
    criticalAbsenteeMembers
  } = useCMS();
  const isPastor = currentUser.role === 'pastor';

  const [activeTab, setActiveTab] = useState<'tasks' | 'notes'>('tasks');
  const [selectedShepherdFilter, setSelectedShepherdFilter] = useState('all');
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [outreachTarget, setOutreachTarget] = useState<{
    isOpen: boolean;
    name: string;
    phone: string;
    category: 'red_list_1' | 'red_list_2' | 'critical' | 'first_timer' | 'custom';
    consecutiveMissed: number;
    cellGroup?: string;
  }>({
    isOpen: false,
    name: '',
    phone: '',
    category: 'custom',
    consecutiveMissed: 0
  });
  const [newNote, setNewNote] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState(visibleMembers[0]?.id || '');
  const [notesList, setNotesList] = useState<Array<{
    id: string;
    member: string;
    shepherd: string;
    date: string;
    text: string;
  }>>([]);

  // Filter tasks if pastor wants to see a specific shepherd
  const displayedTasks = visibleTasks.filter((t) => {
    if (!isPastor || selectedShepherdFilter === 'all') return true;
    return t.shepherdId === selectedShepherdFilter;
  });

  const [noteNotice, setNoteNotice] = useState<{ message: string; isError: boolean } | null>(null);

  const openTasksCount = displayedTasks.filter((t) => t.status === 'Open').length;
  const completedTasksCount = displayedTasks.filter((t) => t.status === 'Completed').length;

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    await updateTaskStatus(
      taskId,
      currentStatus === 'Completed' ? 'Open' : 'Completed'
    );
  };

  const handleAddNote = () => {
    if (!selectedMemberId) {
      setNoteNotice({ message: 'Select a member before adding a note.', isError: true });
      return;
    }
    if (!newNote.trim()) {
      setNoteNotice({ message: 'Note cannot be empty. Type what you want to record.', isError: true });
      return;
    }
    if (newNote.trim().length > 2000) {
      setNoteNotice({ message: 'Note is too long. Keep it under 2000 characters.', isError: true });
      return;
    }
    const member = visibleMembers.find((m) => m.id === selectedMemberId);
    setNotesList((prev) => [
      {
        id: `N-${Date.now()}`,
        member: member ? `${member.firstName} ${member.lastName}` : 'Flock Member',
        shepherd: currentUser.name,
        date: new Date().toISOString().split('T')[0],
        text: newNote.trim()
      },
      ...prev
    ]);
    setNewNote('');
    setNoteNotice({ message: 'Record saved successfully.', isError: false });
    setTimeout(() => setNoteNotice(null), 3500);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-[#111d44]">
        <div>
          <span className="text-[11px] font-semibold text-[#00f0ff] uppercase tracking-wider block">
            {isPastor ? 'Pastoral Care & Follow-Up Oversight' : 'Shepherd Care Workspace'}
          </span>
          <h2 className="text-xl font-bold text-white tracking-tight mt-0.5">
            {isPastor ? 'Church-Wide Care & Member Touchpoints' : `${currentUser.name} — Care Console`}
          </h2>
          <p className="text-xs text-[#a6c4eb] mt-0.5">
            {isPastor
              ? 'Member care tasks & follow-ups'
              : `${currentUser.assignedCell} care tasks & visits`}
          </p>
        </div>

        {isPastor && (
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[#a6c4eb]" />
            <select
              value={selectedShepherdFilter}
              onChange={(e) => setSelectedShepherdFilter(e.target.value)}
              className="px-3 py-1.5 bg-[#070c1e] text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#00f0ff] cursor-pointer"
            >
              <option value="all">All Shepherds</option>
              {shepherds.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.cell})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Red List Follow-up Alert Bar */}
      {redListMembers.length > 0 && (
        <div className="p-4 bg-[#3b0f1a] text-[#ff4069] text-xs flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 bg-[#ff4069]" />
            <div>
              <p className="font-bold text-white text-sm">
                Sunday Red List ({redListMembers.length} Members Awaiting Check-in)
              </p>
              <p className="text-[#a6c4eb] mt-0.5">
                {redListMembers.map((r) => `${r.memberName} (${r.consecutiveMissedSundays} missed)`).join(' • ')} — Check-in required.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 pb-2">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-4 py-2  text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'tasks'
              ? 'bg-[#16285a] text-white  '
              : 'text-[#a6c4eb] hover:text-slate-200'
          }`}
        >
          Follow-Up Tasks ({openTasksCount} Pending)
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`px-4 py-2  text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'notes'
              ? 'bg-[#16285a] text-white  '
              : 'text-[#a6c4eb] hover:text-slate-200'
          }`}
        >
          Care Notes &amp; Touchpoints
        </button>
      </div>

      {/* Content */}
      {activeTab === 'tasks' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Tasks Column */}
          <div className="lg:col-span-8 space-y-3">
            {displayedTasks.length === 0 ? (
              <div className="p-10 bg-[#111d44] text-center text-[#7b9dc7] text-xs">
                No data recorded yet
              </div>
            ) : (
              displayedTasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-4   transition-colors ${
                    task.status === 'Completed'
                      ? 'bg-[#0a122e]/60  opacity-60'
                      : 'bg-[#111d44]  '
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleTask(task.id, task.status)}
                        className={`mt-0.5 w-5 h-5  flex items-center justify-center transition-colors cursor-pointer ${
                          task.status === 'Completed'
                            ? 'bg-[#00f0ff] text-[#070c1e]'
                            : '  '
                        }`}
                      >
                        {task.status === 'Completed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </button>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white text-xs">
                            {task.memberName}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 bg-[#072e54] text-[#00f0ff]">
                            {task.taskType}
                          </span>
                          {isPastor && (
                            <span className="text-[10px] text-[#a6c4eb]">
                              by {task.shepherdName}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300 mt-1">{task.notes}</p>
                        <p className="text-[10px] text-[#7b9dc7] flex items-center gap-1 mt-2">
                          <Clock className="w-3 h-3" />
                          Due: {task.dueDate} • Action: {task.nextAction}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const memberMatch = visibleMembers.find(
                            (m) => m.id === task.memberId || `${m.firstName} ${m.lastName}` === task.memberName
                          );
                          const memberPhone = memberMatch?.phone || '+233 24 123 4567';
                          const red = redListMembers.find((r) => r.memberId === task.memberId);
                          const crit = criticalAbsenteeMembers.find((c) => c.memberId === task.memberId);
                          const cat = crit
                            ? 'critical'
                            : red?.consecutiveMissedSundays === 2
                            ? 'red_list_2'
                            : red?.consecutiveMissedSundays === 1
                            ? 'red_list_1'
                            : task.taskType === 'First-Timer Welcome'
                            ? 'first_timer'
                            : 'custom';
                          setOutreachTarget({
                            isOpen: true,
                            name: task.memberName,
                            phone: memberPhone,
                            category: cat,
                            consecutiveMissed: red ? red.consecutiveMissedSundays : crit ? crit.consecutiveMissedSundays : 0,
                            cellGroup: memberMatch?.cellGroup
                          });
                        }}
                        className="px-2 py-1 bg-[#25D366] hover:bg-[#20ba59] text-white text-[10px] font-bold cursor-pointer transition-colors flex items-center gap-1 shadow-sm"
                        title="Send WhatsApp message"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>WhatsApp</span>
                      </button>

                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5  ${
                          task.status === 'Completed'
                            ? 'bg-emerald-950/40 text-emerald-300  '
                            : task.priority === 'High'
                            ? 'bg-rose-950/40 text-rose-300  '
                            : 'bg-[#072e54] text-[#00f0ff]  '
                        }`}
                      >
                        {task.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right Action Column */}
          <div className="lg:col-span-4 space-y-4">
            <div className="p-4 bg-[#111d44] space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Flock Contact &amp; Quick Reach
              </h3>
              <p className="text-[11px] text-[#a6c4eb]">
                Call or message assigned members directly to provide encouragement and track communion.
              </p>

              <div className="space-y-2 pt-1 max-h-72 overflow-y-auto">
                {visibleMembers.length === 0 ? (
                  <div className="py-4 text-center text-[#a6c4eb] text-xs">
                    No data recorded yet
                  </div>
                ) : (
                  visibleMembers.map((m) => (
                  <div
                    key={m.id}
                    className="p-2.5 bg-[#070c1e] flex items-center justify-between gap-2"
                  >
                    <div>
                      <p className="text-xs font-semibold text-white">
                        {m.firstName} {m.lastName}
                      </p>
                      <p className="text-[10px] text-[#a6c4eb] font-mono">{m.phone}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const red = redListMembers.find((r) => r.memberId === m.id);
                          const crit = criticalAbsenteeMembers.find((c) => c.memberId === m.id);
                          const cat = crit
                            ? 'critical'
                            : red?.consecutiveMissedSundays === 2
                            ? 'red_list_2'
                            : red?.consecutiveMissedSundays === 1
                            ? 'red_list_1'
                            : 'custom';
                          setOutreachTarget({
                            isOpen: true,
                            name: `${m.firstName} ${m.lastName}`,
                            phone: m.phone,
                            category: cat,
                            consecutiveMissed: red ? red.consecutiveMissedSundays : crit ? crit.consecutiveMissedSundays : 0,
                            cellGroup: m.cellGroup
                          });
                        }}
                        className="p-1.5 bg-[#25D366] hover:bg-[#20ba59] text-white transition-colors cursor-pointer"
                        title="WhatsApp Outreach"
                      >
                        <MessageSquare className="w-3 h-3" />
                      </button>
                      <a
                        href={`tel:${m.phone}`}
                        className="p-1.5 bg-[#16285a] hover:bg-[#072e54] text-slate-300 hover:text-[#00f0ff] transition-colors"
                        title="Voice Call"
                      >
                        <Phone className="w-3 h-3" />
                      </a>
                      <a
                        href={`sms:${m.phone}`}
                        className="p-1.5 bg-[#16285a] hover:bg-[#072e54] text-slate-300 hover:text-[#00f0ff] transition-colors"
                        title="SMS Message"
                      >
                        <Send className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                )))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Notes Tab */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-3">
            {notesList.length === 0 ? (
              <div className="p-8 bg-[#111d44] text-center text-[#7b9dc7] text-xs">
                No data recorded yet
              </div>
            ) : (
              notesList.map((n) => (
                <div key={n.id} className="p-4 bg-[#111d44] space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-white">{n.member}</span>
                      <span className="text-[10px] text-[#a6c4eb] ml-2">Recorded by {n.shepherd}</span>
                    </div>
                    <span className="text-[10px] text-[#7b9dc7] font-mono">{n.date}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{n.text}</p>
                </div>
              ))
            )}
          </div>

          <div className="lg:col-span-5 p-4 bg-[#111d44] space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Log Member Touchpoint / Care Note
            </h3>
            <div>
              <label className="text-[10px] font-semibold text-[#a6c4eb] block mb-1">
                Select Flock Member
              </label>
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full px-3 py-2 bg-[#070c1e] text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#00f0ff] cursor-pointer"
              >
                {visibleMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.firstName} {m.lastName} ({m.cellGroup})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-[#a6c4eb] block mb-1">
                Touchpoint Details / Prayer Request
              </label>
              <textarea
                rows={4}
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Enter pastoral care notes, prayer points, visitation outcomes..."
                className="w-full p-3 bg-[#070c1e] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00f0ff] resize-none"
              />
            </div>

            {noteNotice && (
              <div className={`p-2.5 text-xs flex items-center gap-2 ${
                noteNotice.isError ? 'bg-[#38141e] text-[#ff6b8b]' : 'bg-[#0f382a] text-[#00ff9d]'
              }`}>
                {noteNotice.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                <span>{noteNotice.message}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleAddNote}
              className="w-full py-2 px-4 bg-[#00f0ff] hover:bg-[#3bf2ff] text-[#070c1e] text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Save Touchpoint Note</span>
            </button>
          </div>
        </div>
      )}

      {/* Direct Outreach Modal */}
      <DirectOutreachModal
        isOpen={outreachTarget.isOpen}
        onClose={() => setOutreachTarget((prev) => ({ ...prev, isOpen: false }))}
        recipientName={outreachTarget.name}
        phone={outreachTarget.phone}
        category={outreachTarget.category}
        consecutiveMissed={outreachTarget.consecutiveMissed}
        cellGroup={outreachTarget.cellGroup}
      />
    </div>
  );
};

export default ShepherdWorkspace;


