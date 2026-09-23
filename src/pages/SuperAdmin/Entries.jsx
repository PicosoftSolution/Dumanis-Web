import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, User, FileText, CheckCircle, Clock, Eye, MapPin, Copy } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

// Turn a raw stored answer into something readable in the modal.
// - arrays (multi_choice / checkbox answers) get joined with commas
// - switch/boolean answers show as Yes/No instead of true/false
// - base64 image answers are huge — don't dump the whole data: URI on screen
const formatEntryValue = (value, type) => {
  if (value === undefined || value === null || value === '') return '—';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (type === 'switch' || typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (type === 'image' && typeof value === 'string' && value.startsWith('data:image')) return '📷 Photo attached';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
};

export default function Entries() {
  const [submissions, setSubmissions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Caches the question bank for a given project+formType so the "Form Data"
  // section can show real labels ("Owner's Name") instead of the raw field
  // id ("6AAB83AD500C1B3E418D1542") that submissions are actually keyed by.
  // Keyed by `${projectId}::${formType}` -> { [fieldName]: { label, type } }.
  const [formFieldMaps, setFormFieldMaps] = useState({});
  const [loadingFieldMap, setLoadingFieldMap] = useState(false);

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

  const fieldMapKey = (entry) => {
    const projectId = entry?.project?._id || entry?.project;
    return `${projectId}::${entry?.formType}`;
  };

  const viewDetails = async (entry) => {
    setSelectedEntry(entry);
    setShowDetailsModal(true);

    const projectId = entry.project?._id || entry.project;
    const key = fieldMapKey(entry);

    // Already have this project+formType's questions cached, or missing the
    // info needed to look it up — nothing more to fetch.
    if (!projectId || !entry.formType || formFieldMaps[key]) return;

    setLoadingFieldMap(true);
    try {
      const res = await api.get(`/forms/render/${projectId}/${encodeURIComponent(entry.formType)}`);
      if (res.data.success) {
        const map = {};
        (res.data.data.questions || []).forEach((q) => {
          map[q.fieldName] = { label: q.label, type: q.type };
        });
        setFormFieldMaps((prev) => ({ ...prev, [key]: map }));
      }
    } catch (err) {
      console.error('Could not load question labels for this entry:', err);
      // Not fatal — the modal falls back to showing the raw field key below.
    } finally {
      setLoadingFieldMap(false);
    }
  };

  // Copies a location's address (if present) plus its coordinates to the clipboard.
  const copyLocation = (location) => {
    if (!location) return;
    const text = location.address
      ? `${location.address} (${location.lat}, ${location.lon})`
      : `${location.lat}, ${location.lon}`;
    navigator.clipboard.writeText(text)
      .then(() => toast.success('Location copied'))
      .catch(() => toast.error('Failed to copy location'));
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
                          <span className="truncate max-w-[130px]">{entry.location.lat}, {entry.location.lon}</span>
                          <button
                            onClick={() => copyLocation(entry.location)}
                            title="Copy location"
                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors shrink-0"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
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
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Location Details
                    </label>
                    <button
                      onClick={() => copyLocation(selectedEntry.location)}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                  </div>
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
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-gray-500 block">Form Data</label>
                  {loadingFieldMap && !formFieldMaps[fieldMapKey(selectedEntry)] && (
                    <span className="text-xs text-gray-400">Loading question labels…</span>
                  )}
                </div>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  {selectedEntry.data && Object.entries(selectedEntry.data).map(([key, value]) => {
                    const questionMeta = formFieldMaps[fieldMapKey(selectedEntry)]?.[key];
                    // Falls back to the raw key (prettified) only if we couldn't
                    // find this field in the form's question bank — e.g. the
                    // question was later deleted, or the form couldn't be loaded.
                    const displayLabel = questionMeta?.label || key.replace(/_/g, ' ').toUpperCase();
                    const displayValue = formatEntryValue(value, questionMeta?.type);
                    return (
                      <div key={key} className="border-b border-gray-200 pb-2 last:border-0">
                        <span className="text-xs font-medium text-gray-700 block">{displayLabel}</span>
                        <span className="text-sm text-gray-900">{displayValue}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}