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
  const { user, logout } = useAuth();

  const handleLogout = () => {
    if (logout) {
      logout();
    } else {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
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
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        active={activePage}
        onChange={setActivePage}
        user={user}
        onLogout={handleLogout}
      />
      <div className="flex-1 overflow-auto">
        {renderPage()}
      </div>
    </div>
  );
}
