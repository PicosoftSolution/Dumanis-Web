import React, { useState } from 'react';
import Sidebar from './Sidebar';
import MyEntries from './MyEntries';
import Dashboard from './Dashboard';
import { useAuth } from '../../context/AuthContext';

// Team Member Portal — same shell pattern as AdminPortal / SuperAdminPortal,
// but only exposes what the rights matrix gives a Team Member: their own
// dashboard, Entry (linked directly), and reviewing/editing their own entries.
export default function TeamMemberPortal() {
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();

  const handleLogout = () => {
    if (logout) {
      logout();
    } else {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
  };

  // Menu item click chesthe page marchi, mobile lo drawer close chestundi
  const handlePageChange = (page) => {
    setActivePage(page);
    setSidebarOpen(false);
  };

  const renderPage = () => {
    switch (activePage) {
      case 'entries':
        return <MyEntries />;
      case 'dashboard':
      default:
        return <Dashboard user={user} />;
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
        <Sidebar
          active={activePage}
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