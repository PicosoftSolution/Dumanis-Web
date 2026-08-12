import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, MapPin, Pencil, FileText, Search } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import EditSubmissionModal from '../../components/EditSubmissionModal';

const PERIODS = [
  { key: 'day', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'all', label: 'All' },
];

function startOfWeek(d) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - date.getDay());
  return date;
}
function startOfDay(d) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
}

export default function MyEntries() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('week');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);

  const fetchEntries = () => {
    setLoading(true);
    // GET /submissions is already scoped server-side to "my own" for team_member.
    api.get('/submissions')
      .then((res) => setSubmissions(res.data.data || []))
      .catch(() => toast.error('Could not load your entries'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchEntries(); }, []);

  const filtered = useMemo(() => {
    const now = new Date();
    return submissions
      .filter((s) => {
        if (period === 'all') return true;
        const created = new Date(s.createdAt);
        if (period === 'day') return created >= startOfDay(now);
        if (period === 'week') return created >= startOfWeek(now);
        return true;
      })
      .filter((s) => {
        const str = `${s.formType} ${s.project?.name || ''} ${JSON.stringify(s.data)}`.toLowerCase();
        return str.includes(search.toLowerCase());
      });
  }, [submissions, period, search]);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Entries</h1>
          <p className="text-gray-500 mt-1 text-sm">Review and edit the entries you've submitted.</p>
        </div>
        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all
                ${period === p.key ? 'bg-indigo-700 text-white shadow' : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 relative max-w-sm">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search your entries..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-700" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No entries in this period.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((s) => (
            <div key={s._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700">{s.formType}</span>
                  <span className="text-sm font-medium text-gray-800 truncate">{s.project?.name || '—'}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(s.createdAt).toLocaleString()}
                  </span>
                  {s.location?.lat && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {Number(s.location.lat).toFixed(4)}, {Number(s.location.lon).toFixed(4)}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setEditing(s)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <EditSubmissionModal
          submission={editing}
          onClose={() => setEditing(null)}
          onSaved={fetchEntries}
        />
      )}
    </div>
  );
}
