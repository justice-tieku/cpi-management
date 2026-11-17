import React, { useState } from 'react';
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

const CMSApp: React.FC = () => {
  const { currentUser, setCurrentUser, recordShepherdLogin } = useCMS();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('dashboard');
  const [isAddPersonOpen, setIsAddPersonOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  if (!isAuthenticated) {
    return (
      <div className="w-full min-h-screen bg-[#070c1e]">
        <MinisterialTerminal
          onSuccess={(role, profile) => {
            setIsAuthenticated(true);
            if (role === 'pastor') {
              setCurrentUser({
                id: profile.id || 'USR-PASTOR-01',
                name: profile.name,
                email: profile.email,
                role: 'pastor',
                branch: 'Main Sanctuary — Central Cathedral'
              });
              setActiveScreen('dashboard');
            } else {
              const registered = recordShepherdLogin(profile.name, profile.assignedCell);
              setCurrentUser({
                id: registered.id,
                name: registered.name,
                email: registered.email,
                role: 'shepherd',
                assignedCell: registered.cell,
                branch: 'Main Sanctuary — Central Cathedral'
              });
              setActiveScreen('dashboard');
            }
          }}
        />
      </div>
    );
  }

  const isPastor = currentUser.role === 'pastor';

  // Simple, clean, short titles & descriptions
  const screenTitles: Record<ActiveScreen, { title: string; subtitle: string }> = {
    dashboard: {
      title: isPastor ? 'Dashboard' : 'My Cell Dashboard',
      subtitle: isPastor ? 'Overview & key metrics' : 'Cell overview & status'
    },
    members: {
      title: isPastor ? 'Members' : 'My Cell Members',
      subtitle: isPastor ? 'Church directory' : 'Cell member roster'
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
      title: 'Cell Meetings',
      subtitle: isPastor ? 'Cell fellowship & offerings' : 'Weekly cell report & offerings'
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
        onLogout={() => setIsAuthenticated(false)}
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

        <main className="flex-1 overflow-y-auto bg-[#070c1e] pb-12">
          {activeScreen === 'dashboard' && (isPastor ? <ExecutiveDashboard /> : <ShepherdDashboard />)}
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
