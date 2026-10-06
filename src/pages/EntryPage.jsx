import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Folder, MapPin, ChevronLeft, ClipboardList, WifiOff, RefreshCw, Home, Plus } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import SurveyForm from './SuperAdmin/SurveyForm';
import {
  getPendingSubmissions,
  syncPendingSubmissions,
  cacheProjects,
  getCachedProjects,
  preloadAllForms,
} from '../utils/offlineSync';

const DASHBOARD_PATH = '/dashboard'; // change if your home/dashboard route is different

// "Entry" — every role (Team Member, Lead, Admin, Super Admin) has this
// right per the permissions matrix. Pick one of your assigned projects,
// pick a form type, and fill in whatever dynamic survey was built for it.
export default function EntryPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedFormType, setSelectedFormType] = useState('');
  const [search, setSearch] = useState('');

  // "New Form" box (step 2)
  const [showNewForm, setShowNewForm] = useState(false);
  const [newFormType, setNewFormType] = useState('');
  const [creatingForm, setCreatingForm] = useState(false);

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(getPendingSubmissions().length);
  const [syncing, setSyncing] = useState(false);

  const runSync = useCallback(async () => {
    if (!navigator.onLine || getPendingSubmissions().length === 0) return;
    setSyncing(true);
    const result = await syncPendingSubmissions(api);
    setSyncing(false);
    setPendingCount(result.remaining);
    if (result.synced > 0) {
      toast.success(`${result.synced} offline ${result.synced === 1 ? 'entry' : 'entries'} synced`);
    }
  }, []);

  useEffect(() => {
    // If the browser itself reports offline, don't even attempt the
    // request — go straight to whatever was cached last time.
    if (!navigator.onLine) {
      const cached = getCachedProjects();
      if (cached.length > 0) {
        setProjects(cached);
        toast('Offline — showing your last-loaded projects', { icon: '📴' });
      } else {
        toast.error("You're offline and no projects are cached on this device yet.");
      }
      setLoading(false);
      return;
    }

    api.get('/projects')
      .then((res) => {
        const active = (res.data.data || []).filter((p) => p.isActive);
        setProjects(active);
        cacheProjects(active); // keep a local copy for the next time we're offline

        // Quietly fetch + cache every project's enabled form types in the
        // background so any project/form combination works offline later.
        // Only preload the form types each project actually has enabled, so we
        // don't request forms that don't exist (those return 400 Bad Request).
        active.forEach((proj) => {
          if (!proj.enabledForms?.length) return; // nothing enabled -> nothing to preload
          preloadAllForms(api, [proj], proj.enabledForms);
        });
      })
      .catch((err) => {
        // No response at all -> we're offline; fall back to cached projects.
        if (!err.response) {
          const cached = getCachedProjects();
          if (cached.length > 0) {
            setProjects(cached);
            toast('Offline — showing your last-loaded projects', { icon: '📴' });
          } else {
            toast.error("You're offline and no projects are cached on this device yet.");
          }
        } else {
          toast.error('Could not load your projects');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); runSync(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    runSync(); // try once on mount too, in case we loaded while already online
    const interval = setInterval(runSync, 30000); // background retry every 30s
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [runSync]);

  const handleOfflineSave = () => {
    setPendingCount(getPendingSubmissions().length);
  };

  // Create a new (empty) form for the selected project. Questions are added
  // later from Survey Forms (Builder).
  const handleCreateForm = async () => {
    const name = newFormType.trim().replace(/\s+/g, ' ');
    if (!name) return toast.error('Enter a name for the new form');
    if (name.length > 40) return toast.error('Form name is too long (max 40 characters)');
    if (name.toLowerCase() === 'common') return toast.error('"Common" is reserved — choose another name');
    if (enabledList.some((t) => t.toLowerCase() === name.toLowerCase())) {
      return toast.error(`A form named "${name}" already exists for this project`);
    }
    if (!navigator.onLine) return toast.error('You need to be online to create a new form.');

    setCreatingForm(true);
    try {
      const res = await api.post('/forms', {
        project: selectedProject,
        formType: name,
        title: name,
        description: '',
        questions: [],
      });
      if (res.data.success) {
        // show the new form in the list right away
        setProjects((prev) =>
          prev.map((p) =>
            p._id === selectedProject
              ? { ...p, enabledForms: [...(p.enabledForms || []), name] }
              : p
          )
        );
        toast.success(`"${name}" form created`);
        setShowNewForm(false);
        setNewFormType('');
      } else {
        toast.error(res.data.message || 'Could not create the form');
      }
    } catch (err) {
      if (err.response?.status === 409) {
        toast.error(`A form named "${name}" already exists for this project`);
      } else {
        toast.error(err.response?.data?.message || 'Could not create the form');
      }
    } finally {
      setCreatingForm(false);
    }
  };

  const filteredProjects = projects.filter((p) => p.name?.toLowerCase().includes(search.toLowerCase()));
  const activeProject = projects.find((p) => p._id === selectedProject);
  const enabledList = activeProject?.enabledForms || [];
  const step = !selectedProject ? 1 : !selectedFormType ? 2 : 3;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Network / sync status banner */}
      {(!isOnline || pendingCount > 0) && (
        <div className={`px-4 py-2.5 flex items-center justify-between gap-3 text-sm ${!isOnline ? 'bg-amber-50 text-amber-800 border-b border-amber-200' : 'bg-blue-50 text-blue-800 border-b border-blue-200'}`}>
          <div className="flex items-center gap-2">
            {!isOnline ? <WifiOff className="w-4 h-4" /> : <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />}
            <span>
              {!isOnline
                ? "You're offline — entries you submit will be saved on this device."
                : `${pendingCount} offline ${pendingCount === 1 ? 'entry is' : 'entries are'} waiting to sync.`}
              {pendingCount > 0 && !isOnline && ` (${pendingCount} saved so far)`}
            </span>
          </div>
          {isOnline && pendingCount > 0 && (
            <button
              onClick={runSync}
              disabled={syncing}
              className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {syncing ? 'Syncing...' : 'Sync now'}
            </button>
          )}
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 text-blue-600">
              <ClipboardList className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wide">Field Entry</span>
            </div>
            <button
              onClick={() => navigate(DASHBOARD_PATH)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:text-blue-700 transition-colors"
            >
              <Home className="w-4 h-4" /> Dashboard
            </button>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">New Entry</h1>
          <p className="text-gray-500 text-sm mt-1">Select a project and a form type to start a field survey.</p>
        </div>

        {/* Step 1: pick project */}
        {step === 1 && (
          projects.length === 0 ? (
            <div className="text-center py-14 bg-white rounded-2xl border border-gray-100">
              <Folder className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">
                No active projects are assigned to you yet.<br />Ask your Super Admin or Admin to assign one.
              </p>
            </div>
          ) : (
            <div>
              {projects.length > 4 && (
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search your projects..."
                  className="w-full mb-4 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
              <div className="grid gap-3">
                {filteredProjects.map((p) => (
                  <button
                    key={p._id}
                    onClick={() => setSelectedProject(p._id)}
                    className="text-left p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all flex items-start gap-3"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                      <Folder className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{p.name}</p>
                      {p.location?.address && (
                        <div className="flex items-start gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 shrink-0 text-gray-500 mt-0.5" />
                          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                            {p.location.address}
                          </p>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )
        )}

        {/* Step 2: pick form type */}
        {step === 2 && (
          <div>
            <button
              onClick={() => { setSelectedProject(''); setShowNewForm(false); setNewFormType(''); }}
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4"
            >
              <ChevronLeft className="w-4 h-4" /> {activeProject?.name}
            </button>
            <p className="text-sm text-gray-500 mb-3">
              {enabledList.length
                ? 'Choose a form to fill in, or create a new one.'
                : 'No forms yet for this project — create one to get started.'}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {enabledList.map((ft) => (
                <button
                  key={ft}
                  onClick={() => setSelectedFormType(ft)}
                  className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all text-center"
                >
                  <ClipboardList className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                  <span className="text-sm font-semibold text-gray-800">{ft}</span>
                </button>
              ))}

              <button
                onClick={() => setShowNewForm((v) => !v)}
                className={`p-5 rounded-2xl border-2 border-dashed text-center transition-all ${
                  showNewForm ? 'border-blue-500 bg-blue-50' : 'border-blue-300 bg-blue-50/40 hover:bg-blue-50'
                }`}
              >
                <Plus className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <span className="text-sm font-semibold text-blue-700">New Form</span>
              </button>
            </div>

            {showNewForm && (
              <div className="mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <p className="text-sm font-semibold text-gray-800 mb-1">Create a new form</p>
                <p className="text-xs text-gray-500 mb-3">
                  Give the new form a name, for example "Hospital" or "School".
                </p>
                <input
                  value={newFormType}
                  onChange={(e) => setNewFormType(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateForm()}
                  maxLength={40}
                  placeholder="New form name"
                  className="w-full mb-4 px-4 py-2.5 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCreateForm}
                    disabled={!newFormType.trim() || creatingForm}
                    className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {creatingForm ? 'Creating...' : 'Create Form'}
                  </button>
                  <button
                    onClick={() => { setShowNewForm(false); setNewFormType(''); }}
                    className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: fill the dynamic survey */}
        {step === 3 && (
          <div>
            <button
              onClick={() => setSelectedFormType('')}
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4"
            >
              <ChevronLeft className="w-4 h-4" /> {activeProject?.name} · {selectedFormType}
            </button>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <SurveyForm
                projectId={selectedProject}
                formType={selectedFormType}
                onSuccess={() => toast.success('Entry submitted')}
                onOffline={handleOfflineSave}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}