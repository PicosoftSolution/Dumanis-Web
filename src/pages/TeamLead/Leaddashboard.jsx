import React, { useState, useEffect } from 'react';
import { FolderKanban, Users, UserCheck, PenSquare, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

// Team Lead home: my projects + my team at a glance.
export default function LeadDashboard({ onNavigate }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [projectsRes, usersRes] = await Promise.all([
          api.get('/projects'),   // backend returns only projects assigned to this Lead
          api.get('/users')       // backend returns only this Lead's team members
        ]);
        setProjects(projectsRes.data.data || []);
        setTeam((usersRes.data.data || []).filter(u => u._id !== user?._id));
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const activeMembers = team.filter(m => m.isActive).length;

  const cards = [
    { label: 'My Projects', value: projects.length, icon: FolderKanban, color: 'text-blue-600 bg-blue-50', go: 'projects' },
    { label: 'Team Members', value: team.length, icon: Users, color: 'text-green-600 bg-green-50', go: 'team' },
    { label: 'Active Members', value: activeMembers, icon: UserCheck, color: 'text-indigo-600 bg-indigo-50', go: 'team' },
  ];

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
            Welcome, {user?.firstName}
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Team Lead dashboard</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {cards.map(c => {
          const Icon = c.icon;
          return (
            <button
              key={c.label}
              onClick={() => onNavigate?.(c.go)}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 text-left hover:shadow-md transition-shadow"
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${c.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{c.value}</p>
              <p className="text-sm text-gray-500">{c.label}</p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Projects */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-3">My Projects</h2>
          {projects.length === 0 ? (
            <p className="text-sm text-gray-400">No project assigned yet. Your Admin will assign one.</p>
          ) : (
            <div className="space-y-3">
              {projects.map(p => (
                <div key={p._id} className="flex items-start justify-between gap-3 border border-gray-100 rounded-lg p-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{p.name}</p>
                    {p.startDate && (
                      <p className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(p.startDate).toLocaleDateString()} - {new Date(p.endDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <span className={`text-xs font-medium shrink-0 ${p.isActive ? 'text-green-600' : 'text-red-600'}`}>
                    {p.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Team */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800">My Team</h2>
            <button onClick={() => onNavigate?.('team')} className="text-xs text-blue-600 hover:underline">
              Manage
            </button>
          </div>
          {team.length === 0 ? (
            <p className="text-sm text-gray-400">No team members yet. Add your first one from My Team.</p>
          ) : (
            <div className="space-y-2">
              {team.slice(0, 6).map(m => (
                <div key={m._id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="text-gray-900 truncate">{m.firstName} {m.lastName}</p>
                    <p className="text-xs text-gray-500 truncate">{m.email}</p>
                  </div>
                  <span className={`text-xs font-medium ${m.isActive ? 'text-green-600' : 'text-red-600'}`}>
                    {m.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
              {team.length > 6 && <p className="text-xs text-gray-400">+ {team.length - 6} more</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}