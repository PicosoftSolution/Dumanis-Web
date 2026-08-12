import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, FileText, FolderKanban, Download, Calendar, Filter } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function Reports() {
  const [period, setPeriod] = useState('week');
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const fetchReportData = async () => {
    setLoading(true);
    try {
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
      console.error('Error fetching reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  const exportReport = async () => {
    try {
      const response = await api.get('/reports/export', {
        params: { startDate: dateRange.start, endDate: dateRange.end }
      });
      const csvData = response.data.data;
      const csvContent = convertToCSV(csvData);
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${new Date().toISOString()}.csv`;
      a.click();
      toast.success('Report exported successfully');
    } catch (error) {
      toast.error('Failed to export report');
    }
  };

  const convertToCSV = (data) => {
    if (!data.length) return '';
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    for (const row of data) {
      const values = headers.map(header => JSON.stringify(row[header] || ''));
      csvRows.push(values.join(','));
    }
    return csvRows.join('\n');
  };

  const activeUsers = users?.filter(u => u.isActive).length || 0;
  const activeProjects = projects?.filter(p => p.isActive).length || 0;
  const completionRate = submissions?.length > 0 
    ? Math.round((submissions.filter(s => s.syncStatus !== 'pending').length / submissions.length) * 100) 
    : 0;

  const statsCards = [
    { label: 'Total Users', value: users?.length || 0, active: activeUsers, icon: Users, color: 'blue' },
    { label: 'Total Projects', value: projects?.length || 0, active: activeProjects, icon: FolderKanban, color: 'green' },
    { label: 'Total Submissions', value: submissions?.length || 0, icon: FileText, color: 'purple' },
    { label: 'Completion Rate', value: `${completionRate}%`, icon: TrendingUp, color: 'orange' },
  ];

  const roleDistribution = [
    { role: 'Super Admin', count: 1, color: 'amber' },
    { role: 'Admin', count: users?.filter(u => u.role === 'admin').length || 0, color: 'purple' },
    { role: 'Lead', count: users?.filter(u => u.role === 'lead').length || 0, color: 'blue' },
    { role: 'Team Member', count: users?.filter(u => u.role === 'team_member').length || 0, color: 'green' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Reports & Analytics</h1>
            <p className="text-gray-500 mt-1">Comprehensive platform insights</p>
          </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-1.5">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input type="date" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                className="text-sm focus:outline-none" />
              <span className="text-gray-400">to</span>
              <input type="date" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                className="text-sm focus:outline-none" />
            </div>
            <button onClick={exportReport} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statsCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 bg-${card.color}-100 rounded-lg`}>
                  <Icon className={`w-6 h-6 text-${card.color}-600`} />
                </div>
                <span className="text-2xl font-bold text-gray-800">{card.value}</span>
              </div>
              <p className="text-gray-600 text-sm">{card.label}</p>
              {card.active !== undefined && (
                <p className="text-xs text-gray-400 mt-1">{card.active} active</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">User Role Distribution</h3>
          <div className="space-y-4">
            {roleDistribution.map((role) => (
              <div key={role.role}>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">{role.role}</span>
                  <span className="text-sm font-semibold text-gray-900">{role.count}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className={`h-2 rounded-full bg-${role.color}-500`}
                    style={{ width: `${(role.count / (users?.length || 1)) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Form Submissions Distribution</h3>
          {stats?.byForm?.length > 0 ? (
            <div className="space-y-4">
              {stats.byForm.slice(0, 5).map((form) => (
                <div key={form._id}>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">{form._id}</span>
                    <span className="text-sm font-semibold text-gray-900">{form.count}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="h-2 rounded-full bg-blue-500"
                      style={{ width: `${(form.count / (stats?.total || 1)) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No submissions yet</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800">Projects Summary</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Forms Enabled</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submissions</th>
              </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {projects?.slice(0, 10).map((project) => (
                <tr key={project._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{project.name}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {project.enabledForms?.slice(0, 2).map(form => (
                        <span key={form} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded">{form}</span>
                      ))}
                      {project.enabledForms?.length > 2 && (
                        <span className="text-xs text-gray-500">+{project.enabledForms.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${project.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {project.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {submissions?.filter(s => (s.project?._id || s.project) === project._id).length || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}