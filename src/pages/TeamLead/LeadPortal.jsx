import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LeadSidebar from './LeadSidebar';
import LeadDashboard from './Leaddashboard';
import MyTeam from './MyTeam';
// Reuse the existing Projects page. For a Lead it is read-only
// ("Projects assigned to you") because canManage is false for this role.
import Projects from '../SuperAdmin/Projects';   // shared Projects page (read-only for Lead)
import Reports from '../SuperAdmin/Reports';     // shared Reports page (fetches its own data)
import Entries from './Leadentries';             // Entries & Review (Day / Week)

export default function LeadPortal() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [active, setActive] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout?.();
    navigate('/login');
  };

  // Menu item click chesthe page marchi, mobile lo drawer close chestundi
  const handlePageChange = (page) => {
    setActive(page);
    setSidebarOpen(false);
  };

  const renderPage = () => {
    switch (active) {
      case 'projects': return <Projects />;
      case 'team':     return <MyTeam />;
      case 'entries':  return <Entries />;
      case 'reports':  return <Reports />;
      default:         return <LeadDashboard onNavigate={handlePageChange} />;
    }
  };

  return (
    <div className="flex min-h-dvh bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar: mobile lo drawer, desktop lo normal sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-max max-w-[85vw] overflow-y-auto
          transform transition-transform duration-200
          md:static md:z-auto md:translate-x-0 md:shrink-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <LeadSidebar
          active={active}
          onChange={handlePageChange}
          user={user}
          onLogout={handleLogout}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar (desktop lo hide) */}
        <header
          className="sticky top-0 z-20 flex items-center gap-3 bg-white border-b px-4 py-3 md:hidden"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100"
            aria-label="Open menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-semibold text-gray-800">DUNAMIS GeoSurvey</span>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}