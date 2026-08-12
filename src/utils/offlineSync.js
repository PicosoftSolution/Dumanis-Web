// Shared helper for queueing survey submissions made while offline, and
// syncing them back to the server as soon as the network is available.
// Used by SurveyForm.jsx (queues on failure) and EntryPage.jsx (shows a
// pending-sync banner and drives the actual sync attempts).

const STORAGE_KEY = 'offlineSubmissions';
const PROJECTS_CACHE_KEY = 'cachedProjects';
const FORM_CACHE_PREFIX = 'cachedForm:'; // + `${projectId}:${formType}`

// ── Projects cache ──────────────────────────────────────────────
// Called every time the projects list loads successfully online, so the
// list is still there (read-only) the next time the device has no network.
export function cacheProjects(projects) {
  try {
    localStorage.setItem(PROJECTS_CACHE_KEY, JSON.stringify(projects || []));
  } catch {
    // storage full / unavailable — safe to ignore, it's just a cache
  }
}

export function getCachedProjects() {
  try {
    return JSON.parse(localStorage.getItem(PROJECTS_CACHE_KEY) || '[]');
  } catch {
    return [];
  }
}

// ── Form-definition cache ───────────────────────────────────────
// Each project + formType combination is cached under its own key so a
// field agent who opened a form once while online (even just to preview it)
// can reopen the exact same questions offline later — the pieces used to
// fill it in (labels, field types, options, mandatory flags) don't change
// often, so a locally-saved copy is enough between syncs.
export function cacheForm(projectId, formType, formData) {
  try {
    localStorage.setItem(`${FORM_CACHE_PREFIX}${projectId}:${formType}`, JSON.stringify(formData));
  } catch {
    // ignore — cache is best-effort
  }
}

export function getCachedForm(projectId, formType) {
  try {
    const raw = localStorage.getItem(`${FORM_CACHE_PREFIX}${projectId}:${formType}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getPendingSubmissions() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function savePendingSubmissions(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// Queue a submission that failed to reach the server. Returns the queued item.
export function queueSubmission(payload) {
  const list = getPendingSubmissions();
  const item = {
    id: `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ...payload,
    savedAt: new Date().toISOString(),
  };
  list.push(item);
  savePendingSubmissions(list);
  return item;
}

export function removePendingSubmission(id) {
  savePendingSubmissions(getPendingSubmissions().filter((s) => s.id !== id));
}

// Attempt to push every queued submission to the server using the given
// axios instance. Safe to call repeatedly (e.g. on 'online' event, on a
// timer, or on page load) — items that fail stay in the queue for next time.
export async function syncPendingSubmissions(api) {
  const pending = getPendingSubmissions();
  if (pending.length === 0) {
    return { synced: 0, failed: 0, remaining: 0 };
  }

  let synced = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      const { id, savedAt, ...payload } = item;
      await api.post('/submissions', payload);
      removePendingSubmission(id);
      synced += 1;
    } catch {
      failed += 1;
      // leave it queued and try again next time
    }
  }

  return { synced, failed, remaining: getPendingSubmissions().length };
}
