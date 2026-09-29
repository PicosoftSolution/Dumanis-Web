import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Dashboard from './Dashboard';
import AdminList from './AdminList';
import Projects from './Projects';
import Templates from './Templates';
import TeamMembers from './TeamMembers';
import Entries from './Entries';
import Reports from './Reports';
import DynamicFormBuilder from './DynamicFormBuilder';
import FormResponsesViewer from './FormResponsesViewer';
import api from '../../api/axios';

export default function SuperAdminPortal() {
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const userRes = await api.get('/auth/me');
      setUser(userRes.data.data);

      const [statsRes, projectsRes, usersRes, submissionsRes] = await Promise.all([
        api.get('/submissions/stats'),
        api.get('/projects'),
        api.get('/users'),
        api.get('/submissions'),
      ]);
      setStats(statsRes.data.data);
      setProjects(projectsRes.data.data || []);
      setUsers(usersRes.data.data || []);
      setSubmissions(submissionsRes.data.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  // Menu item click chesthe page marchi, mobile lo drawer close chestundi
  const handlePageChange = (page) => {
    setActivePage(page);
    setSidebarOpen(false);
  };

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard stats={stats} projects={projects} users={users} user={user} />;
      case 'admins':
        return <AdminList users={users} onRefresh={fetchAllData} />;
      case 'projects':
        return <Projects projects={projects} onRefresh={fetchAllData} />;
      case 'templates':
        return <Templates />;
      case 'dynamic-forms':
        return <DynamicFormBuilder />;
      case 'form-responses':
        return <FormResponsesViewer />;
      case 'team':
        return <TeamMembers users={users} projects={projects} onRefresh={fetchAllData} />;
      case 'entries':
        return <Entries submissions={submissions} projects={projects} />;
      case 'reports':
        return <Reports stats={stats} projects={projects} users={users} submissions={submissions} />;
      default:
        return <Dashboard stats={stats} projects={projects} users={users} user={user} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh bg-gray-50">
      {/* Mobile overlay (drawer ostunte background dim avthundi) */}
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