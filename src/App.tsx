import React, { useState, useEffect, useRef } from 'react';
import { CMSProvider, useCMS } from './context/CMSContext';
import { MinisterialTerminal } from './components/MinisterialTerminal';
import { Sidebar, ActiveScreen } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { ExecutiveDashboard } from './components/dashboard/ExecutiveDashboard';
import { ShepherdDashboard } from './components/dashboard/ShepherdDashboard';
import { MemberDirectory } from './components/members/MemberDirectory';
import { AttendanceRecording } from './components/attendance/AttendanceRecording';
import { ShepherdWorkspace } from './components/shepherds/ShepherdWorkspace';
import { ShepherdAssignmentManagement } from './components/assignments/ShepherdAssignmentManagement';
import { FirstTimersTracking } from './components/visitors/FirstTimersTracking';
import { ShepherdReports } from './components/reports/ShepherdReports';
import { AddPersonModal } from './components/common/AddPersonModal';
import { CellMeetingsView } from './components/cell/CellMeetingsView';
import { MessagingCenter } from './components/communications/MessagingCenter';
import { AnnouncementsBoard } from './components/communications/AnnouncementsBoard';
import { ChurchEventsBoard } from './components/events/ChurchEventsBoard';
import {
  getStoredSession,
  saveStoredSession,
  clearStoredSession,
  touchSessionActivity
} from './utils/session';
import { supabase } from '../backend/client';
import { User } from './types/cms';

const CMSApp: React.FC = () => {
  const { currentUser, setCurrentUser, recordShepherdLogin } = useCMS();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const session = getStoredSession();
    return !!session;
  });
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('dashboard');
  const [isAddPersonOpen, setIsAddPersonOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const lastTouchRef = useRef<number>(Date.now());

  // Restore session on initial load if present and valid
  useEffect(() => {
    const session = getStoredSession();
    if (session) {
      setCurrentUser(session.user);
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, [setCurrentUser]);

  // Handle explicit logout
  const handleLogout = () => {
    clearStoredSession();
    supabase.auth.signOut().catch(() => {});
    setIsAuthenticated(false);
  };

  // 15-Minute Inactivity Tracker:
  // Listens to user interactions and logs out automatically if inactive for 15+ minutes
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleUserActivity = () => {
      const now = Date.now();
      // Throttle localStorage updates to at most once every 10 seconds
      if (now - lastTouchRef.current > 10000) {
        lastTouchRef.current = now;
        touchSessionActivity();
      }
    };

    const events: Array<keyof WindowEventMap> = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click'
    ];

    events.forEach((evt) => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    // Check inactivity every 10 seconds
    const interval = setInterval(() => {
      const session = getStoredSession();
      if (!session) {
        // Session expired after 15 minutes of inactivity
        console.warn('Session expired due to 15 minutes of inactivity.');
        handleLogout();
      }
    }, 10000);

    return () => {
      events.forEach((evt) => {
        window.removeEventListener(evt, handleUserActivity);
      });
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="w-full min-h-screen bg-[#070c1e]">
        <MinisterialTerminal
          onSuccess={(role, profile) => {
            let newUser: User;
            if (role === 'pastor') {
              newUser = {
                id: profile.id || 'USR-PASTOR-01',
                name: profile.name,
                email: profile.email,
                role: 'pastor',
                branch: 'Main Sanctuary — Central Cathedral'
              };
            } else {
              const registered = recordShepherdLogin(profile.name, profile.assignedCell);
              newUser = {
                id: registered.id,
                name: registered.name,
                email: registered.email,
                role: 'shepherd',
                assignedCell: registered.cell,
                isPpitShepherd: profile.isPpitShepherd === true,
                branch: 'Main Sanctuary — Central Cathedral'
              };
            }

            setCurrentUser(newUser);
            saveStoredSession(newUser, role);
            setIsAuthenticated(true);
            setActiveScreen('dashboard');
          }}
        />
      </div>
    );
  }

  const isPastor = currentUser.role === 'pastor';

  // Simple, clean, short titles & descriptions with "Shepherd" terminology
  const screenTitles: Record<ActiveScreen, { title: string; subtitle: string }> = {
    dashboard: {
      title: isPastor ? 'Dashboard' : 'My Shepherd Dashboard',
      subtitle: isPastor ? 'Overview & key metrics' : 'Flock overview & status'
    },
    members: {
      title: isPastor ? 'Members' : 'My Flock Members',
      subtitle: isPastor ? 'Church directory' : 'Flock member roster'
    },
    shepherds: {
      title: 'Shepherds',
      subtitle: 'Shepherd assignments & flocks'
    },
    attendance: {
      title: 'Attendance & Red List',
      subtitle: isPastor ? 'Sunday service roll & Red List' : 'Sunday attendance & Red List'
    },
    'first-timers': {
      title: 'First Timers',
      subtitle: 'Guest registry & follow-up'
    },
    care: {
      title: 'Care & Follow-Ups',
      subtitle: isPastor ? 'Member care tasks & visits' : 'Care tasks & follow-up calls'
    },
    'cell-meetings': {
      title: isPastor ? 'Shepherd Meetings' : 'My Shepherd Meetings',
      subtitle: isPastor ? 'Shepherd fellowship & offerings' : 'Weekly shepherd report & offerings'
    },
    reports: {
      title: isPastor ? 'Weekly Reports' : 'Submit Report',
      subtitle: isPastor ? 'Compiled weekly reports' : 'Weekly shepherd report'
    },
    login: {
      title: 'Sign In',
      subtitle: 'Authentication'
    },
    messages: {
      title: 'Messages',
      subtitle: 'Direct ministerial messages'
    },
    announcements: {
      title: 'Announcements',
      subtitle: 'Official church notices'
    },
    events: {
      title: 'Church Events',
      subtitle: 'Church calendar & activities'
    }
  };

  const currentMeta = screenTitles[activeScreen] || screenTitles.dashboard;

  return (
    <div className="flex h-screen w-full bg-[#070c1e] text-slate-200 overflow-hidden font-sans">
      <Sidebar
        activeScreen={activeScreen}
        onNavigate={setActiveScreen}
        onLogout={handleLogout}
        mobileOpen={isMobileNavOpen}
        onMobileClose={() => setIsMobileNavOpen(false)}
      />

      <div className="flex flex-col flex-1 h-full overflow-hidden">
        <Navbar
          title={currentMeta.title}
          subtitle={currentMeta.subtitle}
          onOpenAddPerson={() => setIsAddPersonOpen(true)}
          showAddPerson={activeScreen === 'members' || activeScreen === 'first-timers'}
          onToggleMobileMenu={() => setIsMobileNavOpen((prev) => !prev)}
        />

        <main className={`flex-1 bg-[#070c1e] ${
          activeScreen === 'messages'
            ? 'min-h-0 overflow-hidden'
            : 'overflow-y-auto pb-12'
        }`}>
          {activeScreen === 'dashboard' && (isPastor ? <ExecutiveDashboard onNavigate={setActiveScreen} /> : <ShepherdDashboard onNavigate={setActiveScreen} />)}
          {activeScreen === 'members' && <MemberDirectory />}
          {activeScreen === 'shepherds' && <ShepherdAssignmentManagement />}
          {activeScreen === 'attendance' && <AttendanceRecording />}
          {activeScreen === 'first-timers' && <FirstTimersTracking />}
          {activeScreen === 'care' && <ShepherdWorkspace />}
          {activeScreen === 'cell-meetings' && <CellMeetingsView />}
          {activeScreen === 'reports' && <ShepherdReports />}
          {activeScreen === 'messages' && <MessagingCenter />}
          {activeScreen === 'announcements' && <AnnouncementsBoard />}
          {activeScreen === 'events' && <ChurchEventsBoard />}
        </main>
      </div>

      {/* Global Add Person Modal */}
      <AddPersonModal
        isOpen={isAddPersonOpen}
        onClose={() => setIsAddPersonOpen(false)}
        defaultMode={activeScreen === 'first-timers' ? 'guest' : 'member'}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <CMSProvider>
      <CMSApp />
    </CMSProvider>
  );
};

export default App;
