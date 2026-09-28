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

  const handleLogout = () => {
    logout?.();
    navigate('/login');
  };

  const renderPage = () => {
    switch (active) {
      case 'projects': return <Projects />;
      case 'team':     return <MyTeam />;
      case 'entries':  return <Entries />;
      case 'reports':  return <Reports />;
      default:         return <LeadDashboard onNavigate={setActive} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <LeadSidebar active={active} onChange={setActive} user={user} onLogout={handleLogout} />
      <main className="flex-1 min-w-0">{renderPage()}</main>
    </div>
  );
}