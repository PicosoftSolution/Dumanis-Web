// Shared helper for queueing survey submissions made while offline, and
// syncing them back to the server as soon as the network is available.
// Used by SurveyForm.jsx (queues on failure) and EntryPage.jsx (shows a
// pending-sync banner, drives sync attempts, and preloads forms for offline use).

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
// field agent can open it offline later — the pieces used to fill it in
// (labels, field types, options, mandatory flags) don't change often, so a
// locally-saved copy is enough between syncs.
export function cacheForm(projectId, formType, formData) {
  try {
    localStorage.setItem(`${FORM_CACHE_PREFIX}${projectId}:${formType}`, JSON.stringify(formData));
  } catch {
    // ignore — cache is best-effort, and preloadAllForms already skips
    // failures for individual forms so one full storage doesn't block others
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

// ── Preload ALL forms for ALL projects ────────────────────────────
// Call this once, right after the projects list loads successfully while
// online (see EntryPage.jsx). It walks every project + every one of its
// enabled form types and caches each form definition — so later, when the
// device goes offline, ANY project/form combination the user picks is
// already available locally, not just ones they happened to open before.
//
// Runs quietly in the background (no loading state, no thrown errors) and
// skips any individual combination that fails to fetch — those will simply
// be retried the next time this runs (e.g. next successful page load online).
export async function preloadAllForms(api, projects, defaultFormTypes = []) {
  for (const project of projects) {
    const formTypes = project.enabledForms?.length ? project.enabledForms : defaultFormTypes;
    for (const formType of formTypes) {
      try {
        const res = await api.get(`/forms/render/${project._id}/${encodeURIComponent(formType)}`);
        if (res.data.success) {
          cacheForm(project._id, formType, res.data.data);
        }
      } catch {
        // this combination failed (offline mid-way, server error, etc.) —
        // skip it silently, it'll be retried on the next online load
      }
    }
  }
}

// ── Pending (offline) submissions queue ───────────────────────────
export function getPendingSubmissions() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

// Returns true on success, false if the write failed (e.g. storage quota
// exceeded — common once a few submissions include photo data).
function savePendingSubmissions(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return true;
  } catch (err) {
    console.error('Failed to save offline submission — device storage may be full:', err);
    return false;
  }
}

// Queue a submission that failed to reach the server (or that we never
// attempted to send because we're offline). Throws Error('STORAGE_FULL') if
// it couldn't actually be persisted, so the caller can show a real error to
// the user instead of silently losing the entry and getting stuck.
export function queueSubmission(payload) {
  const list = getPendingSubmissions();
  const item = {
    id: `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ...payload,
    savedAt: new Date().toISOString(),
  };
  list.push(item);
  const saved = savePendingSubmissions(list);
  if (!saved) {
    throw new Error('STORAGE_FULL');
  }
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