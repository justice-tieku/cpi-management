import React, { useState } from 'react';
import { Cake, Phone, MessageSquare, Sparkles, Calendar, ChevronRight } from 'lucide-react';
import { Member } from '../../types/cms';

interface BirthdayWidgetProps {
  members: Member[];
  title?: string;
  subtitle?: string;
}

interface BirthdayPerson {
  member: Member;
  dob: string;
  birthDateThisYear: Date;
  daysUntil: number;
  isToday: boolean;
  age?: number;
  formattedDate: string;
}

export const BirthdayWidget: React.FC<BirthdayWidgetProps> = ({
  members,
  title = 'Birthdays & Celebrations',
  subtitle = 'Upcoming celebrations across your flock'
}) => {
  const [activeTab, setActiveTab] = useState<'week' | 'month' | 'all'>('week');

  const parseMemberBirthday = (m: Member): { dob: string } | null => {
    if (m.dateOfBirth && /^\d{4}-\d{2}-\d{2}$/.test(m.dateOfBirth)) {
      return { dob: m.dateOfBirth };
    }
    if (m.generalNotes) {
      const match = m.generalNotes.match(/Date of Birth:\s*(\d{4}-\d{2}-\d{2})/i);
      if (match && match[1]) {
        return { dob: match[1] };
      }
    }
    return null;
  };

  const now = new Date();
  const currentYear = now.getFullYear();

  const birthdayList: BirthdayPerson[] = [];

  members.forEach((m) => {
    const parsed = parseMemberBirthday(m);
    if (!parsed) return;

    const [yearStr, monthStr, dayStr] = parsed.dob.split('-');
    const birthYear = parseInt(yearStr, 10);
    const birthMonth = parseInt(monthStr, 10) - 1;
    const birthDay = parseInt(dayStr, 10);

    let bdayThisYear = new Date(currentYear, birthMonth, birthDay);
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let daysDiff = Math.round((bdayThisYear.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff < 0) {
      bdayThisYear = new Date(currentYear + 1, birthMonth, birthDay);
      daysDiff = Math.round((bdayThisYear.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
    }

    const isToday = daysDiff === 0;
    const age = birthYear ? currentYear - birthYear : undefined;

    const formattedDate = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric'
    }).format(new Date(currentYear, birthMonth, birthDay));

    birthdayList.push({
      member: m,
      dob: parsed.dob,
      birthDateThisYear: bdayThisYear,
      daysUntil: daysDiff,
      isToday,
      age,
      formattedDate
    });
  });

  birthdayList.sort((a, b) => a.daysUntil - b.daysUntil);

  const filteredList = birthdayList.filter((item) => {
    if (activeTab === 'week') return item.daysUntil <= 7;
    if (activeTab === 'month') return item.daysUntil <= 30;
    return true;
  });

  const todayCount = birthdayList.filter((b) => b.isToday).length;

  return (
    <div className="p-6 bg-[#111d44] shadow-xl space-y-4">
      {/* Widget Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#072e54] flex items-center justify-center text-[#00f0ff]">
            <Cake className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">{title}</h3>
              {todayCount > 0 && (
                <span className="px-2 py-0.5 bg-[#ff4d6d] text-white text-[10px] font-extrabold animate-pulse flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  {todayCount} Today!
                </span>
              )}
            </div>
            <p className="text-xs text-[#a6c4eb]">{subtitle}</p>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center bg-[#0a122e] p-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('week')}
            className={`px-3 py-1.5  transition-colors font-bold cursor-pointer ${
              activeTab === 'week' ? 'bg-[#00f0ff] text-[#070c1e] shadow-sm' : 'text-[#a6c4eb] hover:text-white'
            }`}
          >
            Next 7 Days
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('month')}
            className={`px-3 py-1.5  transition-colors font-bold cursor-pointer ${
              activeTab === 'month' ? 'bg-[#00f0ff] text-[#070c1e] shadow-sm' : 'text-[#a6c4eb] hover:text-white'
            }`}
          >
            This Month
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5  transition-colors font-bold cursor-pointer ${
              activeTab === 'all' ? 'bg-[#00f0ff] text-[#070c1e] shadow-sm' : 'text-[#a6c4eb] hover:text-white'
            }`}
          >
            All ({birthdayList.length})
          </button>
        </div>
      </div>

      {/* Birthday Cards List */}
      {filteredList.length === 0 ? (
        <div className="py-8 text-center text-[#a6c4eb] text-xs">
          <Cake className="w-8 h-8 mx-auto mb-2 text-[#a6c4eb] opacity-50" />
          No data recorded yet
        </div>
      ) : (
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {filteredList.map(({ member, daysUntil, isToday, age, formattedDate }) => (
            <div
              key={member.id}
              className={`p-3.5  transition-all flex items-center justify-between gap-3 text-xs ${
                isToday
                  ? 'bg-[#1b2b5a] shadow-sm'
                  : 'bg-[#0a122e] hover:bg-[#16285a]'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-9 h-9  flex items-center justify-center font-bold text-xs shrink-0 ${
                    isToday
                      ? 'bg-[#ff4d6d] text-white shadow-md'
                      : 'bg-[#16285a] text-[#00f0ff]'
                  }`}
                >
                  {isToday ? '🎂' : formattedDate.slice(0, 3)}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-white truncate">
                      {member.firstName} {member.lastName}
                    </p>
                    {isToday ? (
                      <span className="px-2 py-0.5 bg-[#ff4d6d] text-white text-[9px] font-extrabold uppercase tracking-wider">
                        Today!
                      </span>
                    ) : daysUntil === 1 ? (
                      <span className="px-1.5 py-0.5 text-amber-300 bg-[#3b2b10] text-[10px] font-bold">
                        Tomorrow
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#a6c4eb]">
                        In {daysUntil} days
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-[#a6c4eb] truncate mt-0.5">
                    {member.cellGroup} {member.currentShepherdName ? `• ${member.currentShepherdName}` : ''}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] font-mono text-[#00f0ff] font-bold bg-[#111d44] px-2.5 py-1 hidden sm:inline-block">
                  {formattedDate} {age ? `(${age} yrs)` : ''}
                </span>

                <a
                  href={`tel:${member.phone}`}
                  className="p-2 bg-[#16285a] hover:bg-[#00ff9d] text-[#cbd5e1] hover:text-[#070c1e] transition-colors cursor-pointer"
                  title={`Call ${member.firstName}`}
                >
                  <Phone className="w-3.5 h-3.5" />
                </a>

                <a
                  href={`sms:${member.phone}?body=Happy Birthday ${member.firstName}! May God bless you abundantly from Cross Passion International!`}
                  className="p-2 bg-[#16285a] hover:bg-[#00f0ff] text-[#cbd5e1] hover:text-[#070c1e] transition-colors cursor-pointer"
                  title={`Send Birthday SMS to ${member.firstName}`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BirthdayWidget;
