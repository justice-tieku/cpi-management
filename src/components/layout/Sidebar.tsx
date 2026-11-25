import React from 'react';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  CalendarCheck,
  UserPlus,
  FileBarChart2,
  LogOut,
  ShieldCheck,
  BookOpen,
  MessageSquare,
  Megaphone,
  CalendarDays,
  ClipboardCheck,
  X
} from 'lucide-react';
import cpiLogo from '../../assets/cpi-logo.png';
import { useCMS } from '../../context/CMSContext';

export type ActiveScreen =
  | 'login'
  | 'dashboard'
  | 'members'
  | 'shepherds'
  | 'attendance'
  | 'first-timers'
  | 'care'
  | 'cell-meetings'
  | 'reports'
  | 'messages'
  | 'announcements'
  | 'events'
  | 'ppit';

interface SidebarProps {
  activeScreen: ActiveScreen;
  onNavigate: (screen: ActiveScreen) => void;
  onLogout: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeScreen,
  onNavigate,
  onLogout,
  mobileOpen = false,
  onMobileClose
}) => {
  const { currentUser, visibleMembers, visibleTasks, visibleMessages, redListMembers } = useCMS();
  const isPastor = currentUser.role === 'pastor';
  // Simple, direct navigation names as requested
  const navItems = [
    {
      id: 'dashboard' as ActiveScreen,
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['pastor', 'shepherd']
    },
    {
      id: 'members' as ActiveScreen,
      label: isPastor ? 'Members' : 'My Members',
      icon: Users,
      badge: visibleMembers.length > 0 ? String(visibleMembers.length) : undefined,
      roles: ['pastor', 'shepherd']
    },
    {
      id: 'shepherds' as ActiveScreen,
      label: 'Shepherds',
      icon: UserCheck,
      roles: ['pastor']
    },
    {
      id: 'attendance' as ActiveScreen,
      label: 'Attendance',
      icon: CalendarCheck,
      badge: redListMembers.length > 0 ? `Red: ${redListMembers.length}` : undefined,
      roles: ['pastor', 'shepherd']
    },
    ...(isPastor || currentUser.role === 'shepherd' ? [{
      id: 'ppit' as ActiveScreen,
      label: 'PPIT',
      icon: ClipboardCheck,
      roles: ['pastor', 'shepherd']
    }] : []),
    {
      id: 'first-timers' as ActiveScreen,
      label: 'First Timers',
      icon: UserPlus,
      roles: ['pastor', 'shepherd']
    },
    {
      id: 'care' as ActiveScreen,
      label: 'Care & Follow-Ups',
      icon: ShieldCheck,
      badge: visibleTasks.filter((t) => t.status === 'Open').length > 0
        ? String(visibleTasks.filter((t) => t.status === 'Open').length)
        : undefined,
      roles: ['shepherd', 'pastor']
    },
    {
      id: 'cell-meetings' as ActiveScreen,
      label: 'Shepherd Meetings',
      icon: BookOpen,
      roles: ['shepherd', 'pastor']
    },
    {
      id: 'reports' as ActiveScreen,
      label: isPastor ? 'Weekly Reports' : 'Submit Report',
      icon: FileBarChart2,
      roles: ['pastor', 'shepherd']
    },
    {
      id: 'messages' as ActiveScreen,
      label: 'Messages',
      icon: MessageSquare,
      badge: visibleMessages.filter((m) => !m.read && m.recipientId === currentUser.id).length > 0
        ? String(visibleMessages.filter((m) => !m.read && m.recipientId === currentUser.id).length)
        : undefined,
      roles: ['pastor', 'shepherd']
    },
    {
      id: 'announcements' as ActiveScreen,
      label: 'Announcements',
      icon: Megaphone,
      roles: ['pastor', 'shepherd']
    },
    {
      id: 'events' as ActiveScreen,
      label: 'Events',
      icon: CalendarDays,
      roles: ['pastor', 'shepherd']
    }
  ];

  const filteredItems = navItems.filter((item) => item.roles.includes(currentUser.role));

  const handleItemClick = (id: ActiveScreen) => {
    onNavigate(id);
    if (onMobileClose) {
      onMobileClose();
    }
  };

  const renderSidebarContent = (isMobileView = false) => (
    <div className="flex flex-col h-full justify-between">
      {/* Brand Header */}
      <div>
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={cpiLogo}
              alt="CPI Logo"
              className="w-10 h-10 object-contain shrink-0"
            />
            <div className="overflow-hidden">
              <h1 className="text-xs font-bold text-white uppercase tracking-wider font-serif truncate">
                Cross Passion
              </h1>
              <p className="text-xs font-bold text-white uppercase tracking-wider font-serif">
                International
              </p>
            </div>
          </div>
          {isMobileView && onMobileClose && (
            <button
              onClick={onMobileClose}
              className="p-1 text-[#a6c4eb] hover:text-white hover:bg-[#16285a] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Current User Badge in Sidebar */}
        <div className="mx-3 mt-3 px-3 py-2 bg-[#111d44] shadow-sm">
          <p className="text-[10px] uppercase font-bold text-[#00f0ff] tracking-wider">
            {isPastor ? 'Pastor' : 'Shepherd'}
          </p>
          <p className="text-xs font-bold text-white truncate mt-0.5">{currentUser.name}</p>
          {!isPastor && currentUser.assignedCell && (
            <p className="text-[11px] text-[#a6c4eb] truncate mt-0.5">{currentUser.assignedCell}</p>
          )}
        </div>

        {/* Navigation List */}
        <nav className="p-3 space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-bold text-[#a6c4eb] uppercase tracking-wider">
            Menu
          </div>
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5  text-xs font-semibold transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#00f0ff] text-[#070c1e] shadow-md'
                    : 'text-[#a6c4eb] hover:text-white hover:bg-[#111d44]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-[#070c1e]' : 'text-[#a6c4eb]'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5  font-bold ${
                      isActive
                        ? 'bg-[#070c1e] text-[#00f0ff]'
                        : 'bg-[#16285a] text-[#00f0ff]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Logout */}
      <div className="p-3">
        <button
          onClick={() => {
            if (onMobileClose) onMobileClose();
            onLogout();
          }}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium text-[#a6c4eb] hover:text-[#ff6b8b] hover:bg-[#38141e] transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (hidden on mobile, flex on md and above) */}
      <aside className="hidden md:flex w-64 bg-[#0c152e] flex-col justify-between shrink-0 select-none h-full">
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Drawer (visible only when mobileOpen is true) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={onMobileClose}
          />

          {/* Drawer Panel */}
          <div className="relative w-72 max-w-[80vw] bg-[#0c152e] z-10 flex flex-col justify-between select-none shadow-2xl h-full animate-in slide-in-from-left duration-200">
            {renderSidebarContent(true)}
          </div>
        </div>
      )}
    </>
  );
};
