import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, User, FileText, CheckCircle, Clock, Eye, MapPin } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function Entries() {
  const [submissions, setSubmissions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [submissionsRes, projectsRes] = await Promise.all([
        api.get('/submissions'),
        api.get('/projects')
      ]);
      setSubmissions(submissionsRes.data.data || []);
      setProjects(projectsRes.data.data || []);
    } catch (error) {
      console.error('Error fetching entries:', error);
      toast.error('Failed to load entries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredEntries = submissions
    .filter(s => projectFilter === 'all' || s.project?._id === projectFilter || s.project === projectFilter)
    .filter(s => {
      const searchString = `${s.submittedBy?.firstName} ${s.submittedBy?.lastName} ${s.formType} ${JSON.stringify(s.data)}`.toLowerCase();
      return searchString.includes(searchTerm.toLowerCase());
    });

  const getProjectName = (project) => {
    if (project && typeof project === 'object') return project.name || '—';
    const found = projects.find(p => p._id === project);
    return found?.name || project || '—';
  };

  const viewDetails = (entry) => {
    setSelectedEntry(entry);
    setShowDetailsModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">All Form Entries</h1>
        <p className="text-gray-500 mt-1">View and manage all survey submissions</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search entries by name, form, or data..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Projects ({projects.length})</option>
            {projects.map(p => (
              <option key={p._id} value={p._id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Form</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    No entries found
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr key={entry._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {entry.submittedBy?.firstName || 'Unknown'} {entry.submittedBy?.lastName || ''}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{getProjectName(entry.project)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                        {entry.formType || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {entry.location?.lat ? (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <MapPin className="w-3 h-3 text-red-500" />
                          <span className="truncate max-w-[150px]">{entry.location.lat}, {entry.location.lon}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {entry.syncStatus === 'pending' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                          <Clock className="w-3 h-3" />
                          Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                          <CheckCircle className="w-3 h-3" />
                          Synced
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => viewDetails(entry)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {filteredEntries.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
            <p className="text-sm text-gray-600">
              Showing {filteredEntries.length} of {submissions.length} total entries
            </p>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-semibold text-gray-800">Submission Details</h2>
              <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500">Submitted By</label>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedEntry.submittedBy?.firstName} {selectedEntry.submittedBy?.lastName}
                  </p>
                  <p className="text-xs text-gray-500">{selectedEntry.submittedBy?.email}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Project</label>
                  <p className="text-sm text-gray-900">{getProjectName(selectedEntry.project)}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Form</label>
                  <p className="text-sm text-gray-900">{selectedEntry.formType || '—'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Submitted On</label>
                  <p className="text-sm text-gray-900">{new Date(selectedEntry.createdAt).toLocaleString()}</p>
                </div>
              </div>

              {selectedEntry.location && (selectedEntry.location.lat || selectedEntry.location.address) && (
                <div className="border-t border-gray-100 pt-4">
                  <label className="text-xs text-gray-500 flex items-center gap-1 mb-2">
                    <MapPin className="w-3 h-3" /> Location Details
                  </label>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    {selectedEntry.location.address && (
                      <p className="text-sm text-gray-700 mb-1">{selectedEntry.location.address}</p>
                    )}
                    {(selectedEntry.location.lat || selectedEntry.location.lon) && (
                      <p className="text-xs text-gray-500">
                        Coordinates: {selectedEntry.location.lat}, {selectedEntry.location.lon}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="border-t border-gray-100 pt-4">
                <label className="text-xs text-gray-500 mb-2 block">Form Data</label>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  {selectedEntry.data && Object.entries(selectedEntry.data).map(([key, value]) => (
                    <div key={key} className="border-b border-gray-200 pb-2 last:border-0">
                      <span className="text-xs font-medium text-gray-700 block">{key.replace(/_/g, ' ').toUpperCase()}</span>
                      <span className="text-sm text-gray-900">{typeof value === 'object' ? JSON.stringify(value) : value || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}