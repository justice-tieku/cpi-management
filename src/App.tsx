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
import { PPITManagement } from './components/ppit/PPITManagement';
import { ArrowLeft, ArrowRight, HelpCircle, X } from 'lucide-react';
import {
  getStoredSession,
  saveStoredSession,
  clearStoredSession,
  touchSessionActivity
} from './utils/session';
import { supabase } from '../backend/client';
import { User } from './types/cms';

interface TourStep {
  screen: ActiveScreen;
  title: string;
  description: string;
}

const getTourSteps = (isPastor: boolean): TourStep[] => [
  { screen: 'dashboard', title: 'Dashboard', description: 'See key updates at a glance.' },
  { screen: 'members', title: 'Members', description: 'Find and update member records.' },
  ...(isPastor ? [{ screen: 'shepherds' as ActiveScreen, title: 'Shepherds', description: 'Create accounts and manage flocks.' }] : []),
  { screen: 'attendance', title: 'Attendance', description: 'Record service attendance.' },
  { screen: 'ppit', title: 'PPIT', description: 'Manage the PPIT roster and attendance.' },
  { screen: 'first-timers', title: 'First Timers', description: 'Track visitors and follow-ups.' },
  { screen: 'care', title: 'Care & Follow-Ups', description: 'Manage care tasks and visits.' },
  { screen: 'cell-meetings', title: 'Shepherd Meetings', description: 'Review meetings and offerings.' },
  { screen: 'reports', title: 'Reports', description: 'View or submit weekly reports.' },
  { screen: 'messages', title: 'Messages', description: 'Send and read ministry messages.' },
  { screen: 'announcements', title: 'Announcements', description: 'Read church-wide notices.' },
  { screen: 'events', title: 'Events', description: 'See upcoming church events.' }
];

const CMSApp: React.FC = () => {
  const { currentUser, setCurrentUser, recordShepherdLogin } = useCMS();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const session = getStoredSession();
    return !!session;
  });
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('dashboard');
  const [isAddPersonOpen, setIsAddPersonOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [showTourPrompt, setShowTourPrompt] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState<number | null>(null);
  const lastTouchRef = useRef<number>(Date.now());

  // Restore session on initial load if present and valid
  useEffect(() => {
    const session = getStoredSession();
    if (session) {
      setCurrentUser(session.user);
      setIsAuthenticated(true);
      setShowTourPrompt(true);
    } else {
      setIsAuthenticated(false);
    }
  }, [setCurrentUser]);

  // Handle explicit logout
  const handleLogout = () => {
    clearStoredSession();
    supabase.auth.signOut().catch(() => {});
    setIsAuthenticated(false);
    setShowTourPrompt(false);
    setTourStepIndex(null);
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
            setShowTourPrompt(true);
          }}
        />
      </div>
    );
  }

  const isPastor = currentUser.role === 'pastor';
  const tourSteps = getTourSteps(isPastor);
  const activeTourStep = tourStepIndex === null ? null : tourSteps[tourStepIndex];
  const goToTourStep = (index: number) => {
    const step = tourSteps[index];
    if (!step) return;
    setTourStepIndex(index);
    setActiveScreen(step.screen);
    setIsMobileNavOpen(false);
  };

  // Simple, clean, short titles & descriptions with "Shepherd" terminology
  const screenTitles: Record<ActiveScreen, { title: string; subtitle: string }> = {
    dashboard: {
      title: isPastor ? 'Dashboard' : 'Shepherd Dashboard',
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
      title: 'First Timers & Visitors',
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
    },
    ppit: {
      title: 'PPIT Membership',
      subtitle: 'Roster, attendance & Red List'
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
          {activeScreen === 'members' && <MemberDirectory onRegistered={() => setActiveScreen('first-timers')} />}
          {activeScreen === 'shepherds' && <ShepherdAssignmentManagement />}
          {activeScreen === 'attendance' && <AttendanceRecording />}
          {activeScreen === 'first-timers' && <FirstTimersTracking />}
          {activeScreen === 'care' && <ShepherdWorkspace />}
          {activeScreen === 'cell-meetings' && <CellMeetingsView />}
          {activeScreen === 'reports' && <ShepherdReports />}
          {activeScreen === 'messages' && <MessagingCenter />}
          {activeScreen === 'announcements' && <AnnouncementsBoard />}
          {activeScreen === 'events' && <ChurchEventsBoard />}
          {activeScreen === 'ppit' && (isPastor || currentUser.role === 'shepherd') && <PPITManagement />}
        </main>
      </div>

      {/* Global Add Person Modal */}
      <AddPersonModal
        isOpen={isAddPersonOpen}
        onClose={() => setIsAddPersonOpen(false)}
        onRegistered={() => {
          if (activeScreen === 'members') setActiveScreen('first-timers');
        }}
        defaultMode={activeScreen === 'first-timers' ? 'guest' : 'member'}
      />

      {showTourPrompt && !activeTourStep && (
        <aside className="fixed bottom-4 right-4 z-40 w-[calc(100vw-2rem)] max-w-sm rounded-xl border border-[#00f0ff]/25 bg-[#111d44] p-4 shadow-2xl" aria-live="polite">
          <button
            type="button"
            onClick={() => setShowTourPrompt(false)}
            aria-label="Dismiss tour prompt"
            className="absolute right-3 top-3 rounded-md p-1 text-[#a6c4eb] hover:bg-[#16285a] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-start gap-3 pr-7">
            <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#00f0ff]" />
            <div>
              <p className="text-sm font-bold text-white">Need help?</p>
              <p className="mt-1 text-xs text-[#a6c4eb]">Take a quick tour of your workspace.</p>
              <button
                type="button"
                onClick={() => {
                  setShowTourPrompt(false);
                  goToTourStep(0);
                }}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#00f0ff] px-3 py-2 text-xs font-bold text-[#070c1e] hover:bg-[#3bf2ff]"
              >
                Take a tour <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </aside>
      )}

      {activeTourStep && tourStepIndex !== null && (
        <aside className="fixed bottom-4 right-4 z-40 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-xl border border-[#00f0ff]/25 bg-[#111d44] shadow-2xl" aria-label="Workspace tour">
          <div className="h-1 bg-[#16285a]">
            <div className="h-full bg-[#00f0ff] transition-all" style={{ width: `${((tourStepIndex + 1) / tourSteps.length) * 100}%` }} />
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#a6c4eb]">
                <HelpCircle className="h-4 w-4 text-[#00f0ff]" />
                Quick tour <span className="text-[#7b9dc7]">{tourStepIndex + 1} of {tourSteps.length}</span>
              </div>
              <button type="button" onClick={() => setTourStepIndex(null)} aria-label="End tour" className="rounded-md p-1 text-[#a6c4eb] hover:bg-[#16285a] hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <h2 className="mt-3 text-sm font-bold text-white">{activeTourStep.title}</h2>
            <p className="mt-1 text-xs text-[#a6c4eb]">{activeTourStep.description}</p>
            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => goToTourStep(tourStepIndex - 1)}
                disabled={tourStepIndex === 0}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold text-[#a6c4eb] hover:bg-[#16285a] disabled:opacity-40"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>
              <button
                type="button"
                onClick={() => tourStepIndex === tourSteps.length - 1 ? setTourStepIndex(null) : goToTourStep(tourStepIndex + 1)}
                className="inline-flex items-center gap-2 rounded-lg bg-[#00f0ff] px-3 py-2 text-xs font-bold text-[#070c1e] hover:bg-[#3bf2ff]"
              >
                {tourStepIndex === tourSteps.length - 1 ? 'Finish' : 'Next'}
                {tourStepIndex !== tourSteps.length - 1 && <ArrowRight className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </aside>
      )}
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
