import React, { useState, useEffect } from 'react';
import {
  FileText,
  CalendarDays,
  CalendarRange,
  FolderKanban,
  TrendingUp,
  Activity,
} from 'lucide-react';
import api from '../../api/axios';
import StatCard from '../../components/StatCard';

export default function Dashboard({ user }) {
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/submissions/stats'),
      api.get('/projects'),
    ])
      .then(([s, p]) => {
        setStats(s.data.data);
        setProjects(p.data.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-700" />
      </div>
    );
  }

  const statCards = [
    { title: 'My Total Entries', value: stats?.total || 0, icon: FileText, color: 'blue', subtitle: `${stats?.today || 0} Today` },
    { title: "Today's Entries", value: stats?.today || 0, icon: CalendarDays, color: 'green', subtitle: 'Since midnight' },
    { title: 'This Week', value: stats?.week || 0, icon: CalendarRange, color: 'orange', subtitle: 'Rolling 7 days' },
    { title: 'Assigned Projects', value: projects.length, icon: FolderKanban, color: 'purple', subtitle: `${projects.filter(p => p.isActive).length} Active` },
  ];

  return (
    <div className="p-6">
      {/* Welcome Header */}
      <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Welcome back, {user?.firstName || 'there'}! 👋
          </h1>
          <p className="text-gray-500 mt-1">Here's your activity summary.</p>
        </div>
        <a
          href="/entry"
          className="px-5 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
        >
          + New Entry
        </a>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, index) => (
          <StatCard key={index} {...card} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Submissions by Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">My Submissions by Form</h3>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {stats?.byForm?.length > 0 ? (
              stats.byForm.slice(0, 5).map((form) => (
                <div key={form._id}>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">{form._id}</span>
                    <span className="text-sm font-semibold text-gray-900">{form.count}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-indigo-600"
                      style={{ width: `${(form.count / (stats?.total || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No submissions yet</p>
            )}
          </div>
        </div>

        {/* My assigned projects */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">My Assigned Projects</h3>
            <Activity className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {projects.length ? projects.map((p) => (
              <div key={p._id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <FolderKanban className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span className="text-sm font-medium text-gray-800 truncate">{p.name}</span>
                </div>
                <span className={`shrink-0 px-2 py-1 text-xs rounded-full font-medium
                  ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                >
                  {p.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            )) : (
              <p className="text-gray-500 text-center py-8">No projects assigned yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
