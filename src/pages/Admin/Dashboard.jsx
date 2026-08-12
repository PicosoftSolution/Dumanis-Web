import React from 'react';
import {
  Users,
  FolderKanban,
  FileText,
  CheckCircle,
  TrendingUp,
  Activity,
  UserCheck
} from 'lucide-react';
import StatCard from '../../components/StatCard';

export default function Dashboard({ stats, projects, users, user }) {
  const leadCount = users?.filter(u => u.role === 'lead').length || 0;
  const memberCount = users?.filter(u => u.role === 'team_member').length || 0;
  const activeProjects = projects?.filter(p => p.isActive).length || 0;

  const statCards = [
    {
      title: 'Assigned Projects',
      value: projects?.length || 0,
      icon: FolderKanban,
      color: 'blue',
      subtitle: `${activeProjects} Active`
    },
    {
      title: 'My Team',
      value: users?.length || 0,
      icon: Users,
      color: 'green',
      subtitle: `${leadCount} Leads, ${memberCount} Members`
    },
    {
      title: 'Total Submissions',
      value: stats?.total || 0,
      icon: FileText,
      color: 'purple',
      subtitle: `${stats?.today || 0} Today`
    },
    {
      title: 'Completion Rate',
      value: `${Math.round((stats?.total / (stats?.total || 1)) * 100)}%`,
      icon: CheckCircle,
      color: 'orange',
      subtitle: 'Overall Success'
    },
  ];

  const roleStats = [
    { label: 'Leads', count: leadCount, color: 'blue', icon: '⭐' },
    { label: 'Team Members', count: memberCount, color: 'green', icon: '👥' },
  ];

  const totalUsers = users?.length || 0;

  return (
    <div className="p-6">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">
          Welcome back, {user?.firstName || 'Admin'}! 👋
        </h1>
        <p className="text-gray-500 mt-1">
          Here's an overview of your assigned projects and team.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, index) => (
          <StatCard key={index} {...card} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Role Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">Team Role Distribution</h3>
            <Activity className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {roleStats.map((role) => (
              <div key={role.label}>
                <div className="flex justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span>{role.icon}</span>
                    <span className="text-sm font-medium text-gray-700">{role.label}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{role.count}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 bg-${role.color}-500`}
                    style={{ width: totalUsers ? `${(role.count / totalUsers) * 100}%` : '0%' }}
                  ></div>
                </div>
              </div>
            ))}
            {totalUsers === 0 && (
              <p className="text-gray-500 text-center py-6">No team members yet</p>
            )}
          </div>
        </div>

        {/* Submissions by Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">Submissions by Form</h3>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {stats?.byForm?.length > 0 ? (
              stats.byForm.slice(0, 4).map((form) => (
                <div key={form._id}>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">{form._id}</span>
                    <span className="text-sm font-semibold text-gray-900">{form.count}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-blue-500"
                      style={{ width: `${(form.count / (stats?.total || 1)) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No submissions yet</p>
            )}
          </div>
        </div>
      </div>

      {/* My Team Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">My Team</h3>
            <UserCheck className="w-5 h-5 text-gray-400" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users?.slice(0, 5).map((u) => (
                <tr key={u._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">
                    {u.firstName} {u.lastName}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600">{u.email}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium
                      ${u.role === 'lead' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}
                    >
                      {u.role?.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium
                      ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                    >
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
              {(!users || users.length === 0) && (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                    No team members yet. Add one from "Team Members".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
