import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Dashboard from './Dashboard';
import Projects from '../SuperAdmin/Projects';
import Templates from '../SuperAdmin/Templates';
import TeamMembers from '../SuperAdmin/TeamMembers';
import Entries from '../SuperAdmin/Entries';
import Reports from '../SuperAdmin/Reports';
import Forms from '../SuperAdmin/Forms';
import DynamicFormBuilder from '../SuperAdmin/DynamicFormBuilder';
import FormResponsesViewer from '../SuperAdmin/FormResponsesViewer';
import api from '../../api/axios';

// Admin Portal — same shell/pages as the Super Admin portal, but every API
// call below is automatically scoped server-side to the projects assigned
// to this Admin (see projectController / userController / submissionController).
export default function AdminPortal() {
  const [activePage, setActivePage] = useState('dashboard');
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
        api.get('/submissions')
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

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard stats={stats} projects={projects} users={users} user={user} />;
      case 'projects':
        return <Projects />;
      case 'templates':
        return <Templates />;
      case 'forms':
        return <Forms />;
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-700 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

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
