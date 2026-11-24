import React, { useEffect, useState } from 'react';
import {
  Search,
  Filter,
  UserPlus,
  Mail,
  Phone,
  Shield,
  FileSpreadsheet,
  HeartHandshake,
  Printer,
  Eye,
  Edit3,
  MessageSquare
} from 'lucide-react';
import { Member } from '../../types/cms';
import { useCMS } from '../../context/CMSContext';
import { AddPersonModal } from '../common/AddPersonModal';
import { MemberDetailModal } from './MemberDetailModal';
import { DirectOutreachModal } from '../common/DirectOutreachModal';
import { formatGhanaianPhone } from '../../utils/phone';

export const MemberDirectory: React.FC = () => {
  const { visibleMembers, currentUser, redListMembers, criticalAbsenteeMembers } = useCMS();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCell, setSelectedCell] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [outreachMember, setOutreachMember] = useState<{
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

  const redMap = new Map(redListMembers.map((r) => [r.memberId, r]));
  const critMap = new Map(criticalAbsenteeMembers.map((r) => [r.memberId, r]));

  const handleExportCSV = () => {
    const headers = ['ID', 'First Name', 'Last Name', 'Phone', 'Email', 'City', 'Shepherd Group', 'Shepherd', 'Stage', 'Date of Birth'];
    const rows = filteredMembers.map((m) => [
      `"${m.id}"`,
      `"${m.firstName}"`,
      `"${m.lastName}"`,
      `"${formatGhanaianPhone(m.phone)}"`,
      `"${m.email || ''}"`,
      `"${m.city || ''}"`,
      `"${m.cellGroup || ''}"`,
      `"${m.currentShepherdName || ''}"`,
      `"${m.spiritualStage || ''}"`,
      `"${m.dateOfBirth || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CPI_Flock_Roster_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredMembers = visibleMembers.filter((m) => {
    const matchesSearch =
      m.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.phone.includes(searchTerm);
    const matchesCell = selectedCell === 'all' || m.cellGroup.includes(selectedCell);
    return matchesSearch && matchesCell;
  });

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / pageSize));
  const pagedMembers = filteredMembers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCell]);

  return (
    <div className="p-6 md:p-8 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            {currentUser.role === 'pastor' ? 'Flock Directory' : 'My Assigned Flock'}
          </h2>
          <p className="text-xs text-[#a6c4eb]">
            {currentUser.role === 'pastor'
              ? `${visibleMembers.length} Members Enrolled Church-Wide`
              : `${visibleMembers.length} Souls assigned to your care`}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-[#111d44] hover:bg-[#16285a] text-xs text-[#cbd5e1] flex items-center gap-2 cursor-pointer transition-colors shadow-md"
            title="Download CSV spreadsheet of members"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#00f0ff]" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-[#111d44] hover:bg-[#16285a] text-xs text-[#cbd5e1] flex items-center gap-2 cursor-pointer transition-colors shadow-md"
            title="Print member directory"
          >
            <Printer className="w-3.5 h-3.5 text-[#00f0ff]" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="p-4 bg-[#111d44] shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#a6c4eb] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, or telephone..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#0a122e] text-xs text-white placeholder-[#7b9dc7] focus:outline-none focus:ring-2 focus:ring-[#00f0ff] transition-all"
          />
        </div>

        {currentUser.role === 'pastor' && (
          <div className="flex items-center gap-2 text-xs text-[#a6c4eb] w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-[#00f0ff]" />
            <select
              value={selectedCell}
              onChange={(e) => setSelectedCell(e.target.value)}
              className="py-2 px-3 bg-[#0a122e] text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#00f0ff] cursor-pointer transition-all"
            >
              <option value="all">All Shepherd Groups</option>
              <option value="Bethel">Bethel Cell (Central)</option>
              <option value="Eden">Eden Cell (South)</option>
              <option value="Moriah">Moriah Young Adults</option>
              <option value="Sharon">Sharon Cell (East)</option>
              <option value="Hebron">Hebron Cell (North)</option>
            </select>
          </div>
        )}
      </div>

      {/* Members Table */}
      <div className="bg-[#111d44] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-[#00f0ff] font-extrabold bg-[#0a122e]">
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Shepherd Group</th>
                <th className="py-3 px-4">Spiritual Stage</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#16285a]">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#a6c4eb] text-sm">
                    No data recorded yet
                  </td>
                </tr>
              ) : (
                pagedMembers.map((member) => (
                <tr key={member.id} className="hover:bg-[#16285a] transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-bold text-white">
                      {member.firstName} {member.lastName}
                    </p>
                    <p className="text-[10px] font-mono text-[#a6c4eb]">{member.id}</p>
                  </td>

                  <td className="py-3 px-4 space-y-0.5">
                    <p className="flex items-center gap-1.5 text-slate-300">
                      <Phone className="w-3 h-3 text-[#a6c4eb]" />
                      <span>{formatGhanaianPhone(member.phone)}</span>
                    </p>
                    {member.email && (
                      <p className="flex items-center gap-1.5 text-[#a6c4eb] text-[11px]">
                        <Mail className="w-3 h-3 text-[#a6c4eb]" />
                        <span>{member.email}</span>
                      </p>
                    )}
                  </td>

                  <td className="py-3 px-4">
                    <p className="font-semibold text-slate-200">{member.cellGroup}</p>
                    <p className="text-[11px] text-[#00f0ff] flex items-center gap-1 font-semibold">
                      <Shield className="w-3 h-3" />
                      <span>{member.currentShepherdName}</span>
                    </p>
                  </td>

                  <td className="py-3 px-4">
                    <span className="px-2.5 py-0.5 text-[10px] font-bold bg-[#072e54] text-[#00f0ff]">
                      {member.spiritualStage}
                    </span>
                  </td>

                  <td className="py-3 px-4 space-y-1">
                    <div>
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-[#043621] text-[#00ff9d]">
                        {member.status}
                      </span>
                    </div>
                    {redMap.has(member.id) && (
                      <div>
                        <span className="px-2 py-0.5 text-[9px] font-extrabold bg-[#3b0f1a] text-[#ff4069]">
                          Red List ({redMap.get(member.id)?.consecutiveMissedSundays} Missed)
                        </span>
                      </div>
                    )}
                    {critMap.has(member.id) && (
                      <div>
                        <span className="px-2 py-0.5 text-[9px] font-extrabold bg-[#3d0c18] text-[#ff6b8b]">
                          Critical ({critMap.get(member.id)?.consecutiveMissedSundays}+ Missed)
                        </span>
                      </div>
                    )}
                  </td>

                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const red = redMap.get(member.id);
                          const crit = critMap.get(member.id);
                          const cat = crit
                            ? 'critical'
                            : red?.consecutiveMissedSundays === 2
                            ? 'red_list_2'
                            : red?.consecutiveMissedSundays === 1
                            ? 'red_list_1'
                            : 'custom';
                          setOutreachMember({
                            isOpen: true,
                            name: `${member.firstName} ${member.lastName}`,
                            phone: formatGhanaianPhone(member.phone),
                            category: cat,
                            consecutiveMissed: red ? red.consecutiveMissedSundays : crit ? crit.consecutiveMissedSundays : 0,
                            cellGroup: member.cellGroup
                          });
                        }}
                        className="px-2.5 py-1.5 bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                        title="Send WhatsApp or SMS outreach"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </button>

                      <button
                        onClick={() => setSelectedMember(member)}
                        title="View & Edit Member Profile"
                        className="px-3 py-1.5 bg-[#16285a] hover:bg-[#00f0ff] hover:text-[#070c1e] text-[#00f0ff] text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Profile</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
        {filteredMembers.length > 0 && (
          <div className="px-4 py-3 border-t border-[#16285a] flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[11px] text-[#a6c4eb]">
              Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredMembers.length)} of {filteredMembers.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                className="px-3 py-1.5 bg-[#0a122e] text-xs text-[#a6c4eb] disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-xs font-mono text-white">Page {Math.min(currentPage, totalPages)} of {totalPages}</span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                className="px-3 py-1.5 bg-[#0a122e] text-xs text-[#a6c4eb] disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Member Profile / Edit Modal */}
      <MemberDetailModal
        member={selectedMember}
        isOpen={!!selectedMember}
        onClose={() => setSelectedMember(null)}
      />

      {/* Add Person Modal */}
      <AddPersonModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Direct Outreach Modal */}
      <DirectOutreachModal
        isOpen={outreachMember.isOpen}
        onClose={() => setOutreachMember((prev) => ({ ...prev, isOpen: false }))}
        recipientName={outreachMember.name}
        phone={outreachMember.phone}
        category={outreachMember.category}
        consecutiveMissed={outreachMember.consecutiveMissed}
        cellGroup={outreachMember.cellGroup}
      />
    </div>
  );
};

export default MemberDirectory;
