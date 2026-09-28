import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Search, Eye, X, ClipboardList } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

// ── date helpers ────────────────────────────────────────────────
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const startOfWeek = (d) => { const x = startOfDay(d); return addDays(x, -((x.getDay() + 6) % 7)); }; // Monday
const toInputDate = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const fmtDate = (d) => d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
const fmtDateTime = (d) => new Date(d).toLocaleString(undefined, {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
});

const renderValue = (v) => {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

// ── form field helpers (field id -> question label) ─────────────
const LABEL_KEYS = ['label', 'question', 'title', 'fieldLabel', 'questionText', 'text', 'name', 'fieldName', 'placeholder'];
const ID_KEYS = ['_id', 'id', 'fieldId', 'key'];

const pickLabel = (o) => {
  for (const k of LABEL_KEYS) {
    if (typeof o[k] === 'string' && o[k].trim()) return o[k].trim();
  }
  return null;
};

// Walks ANY nested structure and maps every id -> label it finds
const addFormToMap = (map, node, depth = 0) => {
  if (!node || typeof node !== 'object' || depth > 8) return;
  if (Array.isArray(node)) {
    node.forEach(n => addFormToMap(map, n, depth + 1));
    return;
  }
  const label = pickLabel(node);
  if (label) {
    ID_KEYS.forEach(k => {
      const id = node[k];
      if (typeof id === 'string' && id && !map[id]) map[id] = label;
    });
  }
  Object.values(node).forEach(v => addFormToMap(map, v, depth + 1));
};

const getFormId = (s) => {
  const f = s?.form || s?.template;
  if (typeof f === 'string') return f;
  return f?._id || s?.formId || null;
};

// Team Lead: review his own + his team's records per Day / Week.
export default function LeadEntries() {
  const { user } = useAuth();

  const [submissions, setSubmissions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [team, setTeam] = useState([]);
  const [forms, setForms] = useState([]);
  const [fetchedForms, setFetchedForms] = useState({}); // formId -> full form
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [period, setPeriod] = useState('day');      // 'day' | 'week'
  const [anchor, setAnchor] = useState(startOfDay(new Date()));
  const [scope, setScope] = useState('all');        // 'all' | 'mine' | 'team'
  const [projectFilter, setProjectFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      // allSettled: one failing request must not break the whole page
      const [subsRes, projectsRes, usersRes, formsRes] = await Promise.allSettled([
        api.get('/submissions'),
        api.get('/projects'),
        api.get('/users'),
        api.get('/forms')
      ]);

      if (subsRes.status === 'fulfilled') {
        setSubmissions(subsRes.value.data.data || []);
      } else {
        const msg = subsRes.reason?.response?.data?.message || 'Could not load entries';
        setError(msg);
        toast.error(msg);
      }
      if (projectsRes.status === 'fulfilled') setProjects(projectsRes.value.data.data || []);
      if (usersRes.status === 'fulfilled') setTeam(usersRes.value.data.data || []);
      if (formsRes.status === 'fulfilled') {
        const d = formsRes.value.data.data;
        setForms(Array.isArray(d) ? d : (d?.forms || []));
      }
      setLoading(false);
    };
    load();
  }, []);

  // when an entry is opened, fetch its exact form so labels are always available
  useEffect(() => {
    if (!selected) return;
    const formId = getFormId(selected);
    if (!formId || fetchedForms[formId]) return;
    api.get(`/forms/${formId}`)
      .then(res => {
        const form = res.data.data || res.data;
        console.log('[form]', form);
        setFetchedForms(prev => ({ ...prev, [formId]: form }));
      })
      .catch(err => console.log('[form] fetch failed', err?.response?.status, err?.response?.data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  // field id -> question label
  const labelMap = useMemo(() => {
    const map = {};
    Object.values(fetchedForms).forEach(f => addFormToMap(map, f));
    forms.forEach(f => addFormToMap(map, f));
    submissions.forEach(s => {
      if (s.form && typeof s.form === 'object') addFormToMap(map, s.form);
      if (s.template && typeof s.template === 'object') addFormToMap(map, s.template);
    });
    return map;
  }, [forms, fetchedForms, submissions]);

  const questionLabel = (key) => labelMap[key] || key;

  // ── normalising helpers (tolerant to different submission shapes) ──
  const getSubmitter = (s) =>
    s.submittedBy || s.user || s.createdBy || s.submitter || s.enteredBy || s.collectedBy || null;
  const submitterId = (s) => {
    const u = getSubmitter(s);
    return u?._id || u || null;
  };
  const submitterName = (s) => {
    const u = getSubmitter(s);
    if (u && u.firstName) return `${u.firstName} ${u.lastName || ''}`.trim();
    const id = u?._id || u;
    if (id && id === user?._id) return `${user.firstName} ${user.lastName || ''}`.trim();
    const found = team.find(t => t._id === id);
    return found ? `${found.firstName} ${found.lastName || ''}`.trim() : 'Unknown';
  };
  const projectName = (s) =>
    s.project?.name ||
    projects.find(p => p._id === (s.project?._id || s.project))?.name ||
    '—';
  const formName = (s) => {
    const direct = s.form?.name || s.formName || s.template?.name || s.formType;
    if (direct) return direct;
    const formId = getFormId(s);
    const found = forms.find(f => f._id === formId) || fetchedForms[formId];
    return found?.name || 'Survey entry';
  };
  const dataOf = (s) => s.data || s.responses || s.answers || s.formData || {};

  // ── date range ──
  const rangeStart = period === 'day' ? startOfDay(anchor) : startOfWeek(anchor);
  const rangeEnd = addDays(rangeStart, period === 'day' ? 1 : 7); // exclusive

  const rangeLabel = period === 'day'
    ? fmtDate(rangeStart)
    : `${fmtDate(rangeStart)} - ${fmtDate(addDays(rangeEnd, -1))}`;

  const shift = (dir) => setAnchor(addDays(anchor, dir * (period === 'day' ? 1 : 7)));

  // ── filtering ──
  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return submissions
      .filter(s => {
        const t = new Date(s.createdAt || s.submittedAt || s.date);
        return t >= rangeStart && t < rangeEnd;
      })
      .filter(s => {
        const mine = submitterId(s) === user?._id;
        if (scope === 'mine') return mine;
        if (scope === 'team') return !mine;
        return true;
      })
      .filter(s => projectFilter === 'all' || (s.project?._id || s.project) === projectFilter)
      .filter(s => !q || `${submitterName(s)} ${projectName(s)} ${formName(s)}`.toLowerCase().includes(q))
      .sort((a, b) => new Date(b.createdAt || b.submittedAt) - new Date(a.createdAt || a.submittedAt));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissions, rangeStart.getTime(), rangeEnd.getTime(), scope, projectFilter, searchTerm, team, projects, forms]);

  const myCount = filtered.filter(s => submitterId(s) === user?._id).length;
  const teamCount = filtered.length - myCount;

  // entries per person for the selected period
  const perMember = useMemo(() => {
    const map = {};
    filtered.forEach(s => {
      const n = submitterName(s);
      map[n] = (map[n] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered]);
  const maxCount = perMember[0]?.[1] || 1;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const pill = (active) =>
    `px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
      active ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300'
    }`;

  return (
    <div className="p-4 sm:p-6 max-w-full overflow-x-hidden">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Entries & Review</h1>
        <p className="text-gray-500 mt-1 text-sm sm:text-base">
          Review your records and your team's records per day / week
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            <button className={pill(period === 'day')} onClick={() => setPeriod('day')}>Day</button>
            <button className={pill(period === 'week')} onClick={() => setPeriod('week')}>Week</button>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => shift(-1)} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={toInputDate(anchor)}
              onChange={(e) => e.target.value && setAnchor(startOfDay(new Date(e.target.value + 'T00:00:00')))}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg"
            />
            <button onClick={() => shift(1)} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button onClick={() => setAnchor(startOfDay(new Date()))}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
              Today
            </button>
          </div>

          <span className="text-sm font-medium text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg">{rangeLabel}</span>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex gap-2">
            <button className={pill(scope === 'all')} onClick={() => setScope('all')}>All</button>
            <button className={pill(scope === 'mine')} onClick={() => setScope('mine')}>My records</button>
           
          </div>
          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
            <option value="all">All projects</option>
            {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search by member, project or form..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: `Entries (${period === 'day' ? 'day' : 'week'})`, value: filtered.length, color: 'text-blue-600 bg-blue-50' },
          { label: 'My entries', value: myCount, color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Team entries', value: teamCount, color: 'text-green-600 bg-green-50' }
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${c.color}`}>
              <ClipboardList className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{c.value}</p>
            <p className="text-sm text-gray-500">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Entries table */}
        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Date & Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Submitted by</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Project</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Form</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(s => (
                  <tr key={s._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{fmtDateTime(s.createdAt || s.submittedAt)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {submitterName(s)}
                      {submitterId(s) === user?._id && (
                        <span className="ml-2 px-1.5 py-0.5 text-[10px] rounded bg-blue-100 text-blue-700">You</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{projectName(s)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formName(s)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelected(s)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="View">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500 text-sm">
                      No entries for {rangeLabel}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Per member */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 h-fit">
          <h2 className="font-semibold text-gray-800 mb-3">Entries per member</h2>
          {perMember.length === 0 ? (
            <p className="text-sm text-gray-400">No entries in this period.</p>
          ) : (
            <div className="space-y-3">
              {perMember.map(([name, count]) => (
                <div key={name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 truncate">{name}</span>
                    <span className="font-medium text-gray-900">{count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${(count / maxCount) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-gray-800">Entry details</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 sm:p-6 space-y-3 text-sm">
              {[
                ['Submitted by', submitterName(selected)],
                ['Date & time', fmtDateTime(selected.createdAt || selected.submittedAt)],
                ['Project', projectName(selected)],
                ['Form', formName(selected)]
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-gray-50 pb-2">
                  <span className="text-gray-500">{k}</span>
                  <span className="text-gray-900 text-right">{v}</span>
                </div>
              ))}
              <p className="pt-2 text-xs font-semibold text-gray-500 uppercase">Responses</p>
              {Object.keys(dataOf(selected)).length === 0 ? (
                <p className="text-gray-400">No response data.</p>
              ) : (
                Object.entries(dataOf(selected)).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 border-b border-gray-50 pb-2">
                    <span className="text-gray-500 break-words">{questionLabel(k)}</span>
                    <span className="text-gray-900 text-right break-words max-w-[60%]">{renderValue(v)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}