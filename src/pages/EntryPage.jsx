import { useState, useEffect, useCallback } from 'react';
import { Folder, MapPin, ChevronLeft, ClipboardList, WifiOff, RefreshCw } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import SurveyForm from './SuperAdmin/SurveyForm';
import { getPendingSubmissions, syncPendingSubmissions, cacheProjects, getCachedProjects } from '../utils/offlineSync';

const FORM_TYPES = ['Residential', 'Commercial', 'Industrial', 'Institutional', 'Open Site', 'Apartment'];

function StepDot({ active, done, label }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0
        ${done ? 'bg-blue-600 text-white' : active ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}
      >
        {done ? '✓' : ''}
      </div>
      <span className={`text-xs font-medium ${active || done ? 'text-gray-900' : 'text-gray-400'}`}>{label}</span>
    </div>
  );
}

// "Entry" — every role (Team Member, Lead, Admin, Super Admin) has this
// right per the permissions matrix. Pick one of your assigned projects,
// pick a form type, and fill in whatever dynamic survey was built for it.
export default function EntryPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedFormType, setSelectedFormType] = useState('');
  const [search, setSearch] = useState('');

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
    // request — go straight to whatever was cached last time. (A local/LAN
    // dev backend can stay reachable even with "internet" toggled off,
    // which could otherwise surface an unrelated error instead of the
    // offline fallback.)
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
      })
      .catch((err) => {
        // No response at all -> we're offline; fall back to whatever was
        // cached the last time this loaded successfully.
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

  const filteredProjects = projects.filter((p) => p.name?.toLowerCase().includes(search.toLowerCase()));
  const activeProject = projects.find((p) => p._id === selectedProject);
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
        {/* Header + steps */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <ClipboardList className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wide">Field Entry</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">New Entry</h1>
          <p className="text-gray-500 text-sm mt-1">Select a project and a form type to start a field survey.</p>

          <div className="flex items-center gap-4 mt-5 bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
            <StepDot label="Project" active={step === 1} done={step > 1} />
            <div className="flex-1 h-px bg-gray-200" />
            <StepDot label="Form Type" active={step === 2} done={step > 2} />
            <div className="flex-1 h-px bg-gray-200" />
            <StepDot label="Fill & Submit" active={step === 3} done={false} />
          </div>
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
                        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 shrink-0" /> {p.location.address}
                        </p>
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
              onClick={() => setSelectedProject('')}
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4"
            >
              <ChevronLeft className="w-4 h-4" /> {activeProject?.name}
            </button>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(activeProject?.enabledForms?.length ? activeProject.enabledForms : FORM_TYPES).map((ft) => (
                <button
                  key={ft}
                  onClick={() => setSelectedFormType(ft)}
                  className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all text-center"
                >
                  <ClipboardList className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                  <span className="text-sm font-semibold text-gray-800">{ft}</span>
                </button>
              ))}
            </div>
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
