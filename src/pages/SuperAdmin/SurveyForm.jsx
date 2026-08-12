// ============================================================
// FILE: src/pages/survey/SurveyForm.jsx
// Field agent fills the dynamic form (supports offline too)
// Usage: <SurveyForm projectId="..." formType="Residential" />
// ============================================================
import { useState, useEffect } from "react";
import api from "../../api/axios";
import { queueSubmission, cacheForm, getCachedForm } from "../../utils/offlineSync";
import MapPicker from "../../components/MapPicker";

// Options can arrive as plain strings, as {label, value, score} objects
// (Mongoose subdocuments from the Question bank), or — from older bad data —
// as a raw string that got mis-cast into a char-indexed object like
// {0:'Y',1:'e',2:'s',_id:...}. Normalize all three shapes safely so React
// never gets handed a raw object as a key or as children.
const reconstruct = (obj) => {
  const chars = Object.keys(obj).filter((k) => /^\d+$/.test(k)).sort((a, b) => a - b).map((k) => obj[k]);
  return chars.length ? chars.join('') : '';
};
export const optVal = (opt) => {
  if (typeof opt !== "object" || opt === null) return opt;
  if (opt.value !== undefined) return opt.value;
  if (opt.label !== undefined) return opt.label;
  return reconstruct(opt);
};
export const optLabel = (opt) => {
  if (typeof opt !== "object" || opt === null) return opt;
  if (opt.label !== undefined) return opt.label;
  if (opt.value !== undefined) return opt.value;
  return reconstruct(opt);
};

// ── Field renderer ────────────────────────────────────────────
// Exported so other screens (e.g. the "edit my entry" modal) can render the
// exact same question types without duplicating this logic.
export function FormField({ question, value, onChange, error }) {
  const { label, fieldName, type, options, isMandatory } = question;

  const inputBase = {
    width: "100%",
    padding: "9px 12px",
    border: `1px solid ${error ? "#e53935" : "#ddd"}`,
    borderRadius: 6,
    fontSize: 14,
    boxSizing: "border-box",
  };

  let field;
  switch (type) {
    case "text":
    case "number":
    case "mobile":
    case "aadhaar":
    case "date":
      field = (
        <input
          type={type === "date" ? "date" : type === "number" ? "number" : "text"}
          value={value || ""}
          onChange={(e) => onChange(fieldName, e.target.value)}
          placeholder={`Enter ${label}`}
          style={inputBase}
          inputMode={type === "mobile" || type === "aadhaar" ? "numeric" : undefined}
        />
      );
      break;
    case "percentage":
      field = (
        <input
          type="number"
          min={0}
          max={100}
          value={value || ""}
          onChange={(e) => onChange(fieldName, e.target.value)}
          placeholder="0-100"
          style={inputBase}
        />
      );
      break;
    case "ratio":
      field = (
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(fieldName, e.target.value)}
          placeholder="e.g. 1:2"
          style={inputBase}
        />
      );
      break;
    case "dropdown":
      field = (
        <select value={value || ""} onChange={(e) => onChange(fieldName, e.target.value)} style={inputBase}>
          <option value="">-- Select --</option>
          {(options || []).map((opt) => <option key={optVal(opt)} value={optVal(opt)}>{optLabel(opt)}</option>)}
        </select>
      );
      break;
    case "single_choice":
      field = (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
          {(options || []).map((opt) => {
            const ov = optVal(opt);
            const isSelected = value === ov;
            return (
              <button
                type="button"
                key={ov}
                onClick={() => onChange(fieldName, ov)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: 20,
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: isSelected ? "1.5px solid #1a73e8" : "1.5px solid #ddd",
                  background: isSelected ? "#e8f0fe" : "#fff",
                  color: isSelected ? "#1a73e8" : "#444",
                  transition: "all 0.15s ease",
                }}
              >
                <span
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    border: isSelected ? "4px solid #1a73e8" : "1.5px solid #bbb",
                    background: "#fff",
                    display: "inline-block",
                    flexShrink: 0,
                  }}
                />
                {optLabel(opt)}
              </button>
            );
          })}
        </div>
      );
      break;
    case "multi_choice":
      field = (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
          {(options || []).map((opt) => {
            const ov = optVal(opt);
            const checked = Array.isArray(value) && value.includes(ov);
            return (
              <button
                type="button"
                key={ov}
                onClick={() => {
                  const current = Array.isArray(value) ? value : [];
                  const updated = checked ? current.filter((v) => v !== ov) : [...current, ov];
                  onChange(fieldName, updated);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: 20,
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: checked ? "1.5px solid #2e7d32" : "1.5px solid #ddd",
                  background: checked ? "#e8f5e9" : "#fff",
                  color: checked ? "#2e7d32" : "#444",
                  transition: "all 0.15s ease",
                }}
              >
                <span
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 4,
                    border: checked ? "none" : "1.5px solid #bbb",
                    background: checked ? "#2e7d32" : "#fff",
                    color: "#fff",
                    fontSize: 11,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {checked ? "✓" : ""}
                </span>
                {optLabel(opt)}
              </button>
            );
          })}
        </div>
      );
      break;
    case "image":
      field = (
        <div>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              const file = e.target.files[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => onChange(fieldName, reader.result); // base64
              reader.readAsDataURL(file);
            }}
            style={{ fontSize: 13 }}
          />
          {value && (
            <img src={value} alt="preview" style={{ marginTop: 8, maxWidth: "100%", maxHeight: 120, borderRadius: 6 }} />
          )}
        </div>
      );
      break;
    default:
      field = <input type="text" value={value || ""} onChange={(e) => onChange(fieldName, e.target.value)} style={inputBase} />;
  }

  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, display: "block" }}>
        {label}
        {isMandatory && <span style={{ color: "#e53935", marginLeft: 4 }}>*</span>}
        <span style={{ fontWeight: 400, color: "#999", fontSize: 11, marginLeft: 8 }}>[{type}]</span>
      </label>
      {field}
      {error && <div style={{ color: "#e53935", fontSize: 12, marginTop: 3 }}>{error}</div>}
    </div>
  );
}

// ── GPS location fetcher ──────────────────────────────────────
function useGPS() {
  const [location, setLocation] = useState(null);
  const [gpsStatus, setGpsStatus] = useState("idle"); // idle | loading | ok | error

  const fetchGPS = () => {
    if (!navigator.geolocation) return setGpsStatus("error");
    setGpsStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setGpsStatus("ok");
      },
      () => setGpsStatus("error"),
      { timeout: 10000 }
    );
  };

  return { location, gpsStatus, fetchGPS };
}

// ── Main SurveyForm ───────────────────────────────────────────
export default function SurveyForm({ projectId, formType, onSuccess, onOffline }) {
  const [form, setForm] = useState(null);   // rendered form from API
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [answers, setAnswers] = useState({});
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [savedOffline, setSavedOffline] = useState(false);
  const { location, gpsStatus, fetchGPS } = useGPS();

  useEffect(() => {
    setLoading(true);
    setLoadError(false);

    // If the browser reports offline, skip the network attempt entirely
    // and go straight to the cached copy of this exact form.
    if (!navigator.onLine) {
      const cached = getCachedForm(projectId, formType);
      if (cached) setForm(cached);
      else setLoadError(true);
      setLoading(false);
      fetchGPS();
      return;
    }

    api.get(`/forms/render/${projectId}/${encodeURIComponent(formType)}`)
      .then((res) => {
        if (res.data.success) {
          setForm(res.data.data);
          cacheForm(projectId, formType, res.data.data); // available offline next time
        } else {
          setLoadError(true);
        }
      })
      .catch((err) => {
        // No response -> offline. Use the last copy of this exact form we
        // cached while online, if we have one, instead of failing outright.
        if (!err.response) {
          const cached = getCachedForm(projectId, formType);
          if (cached) {
            setForm(cached);
          } else {
            setLoadError(true);
          }
        } else {
          setLoadError(true);
        }
      })
      .finally(() => {
        setLoading(false);
        fetchGPS(); // auto-request GPS on form load — works offline too (device GPS)
      });
  }, [projectId, formType]);

  const handleChange = (fieldName, value) => {
    setAnswers((prev) => ({ ...prev, [fieldName]: value }));
    setErrors((prev) => ({ ...prev, [fieldName]: null }));
  };

  const validate = () => {
    const errs = {};
    (form?.questions || []).forEach((q) => {
      if (q.isMandatory) {
        const val = answers[q.fieldName];
        const isEmpty = val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0);
        if (isEmpty) errs[q.fieldName] = `${q.label} is required`;
      }
    });
    return errs;
  };

  const submit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      // Scroll to first error
      const firstErr = document.querySelector('[data-error="true"]');
      firstErr?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSubmitting(true);
    const payload = {
      project: projectId,
      formType,
      data: answers,
      location: location || undefined,
    };

    // Check BEFORE attempting the request. This matters most when testing
    // against a local/LAN backend (localhost or same WiFi router): toggling
    // "internet" off does NOT disconnect you from that server, so the
    // request would still go through — and if the session happened to be
    // stale, it could come back as an unrelated 401 instead of a network
    // failure, which is confusing. If the browser reports itself offline,
    // don't even try the network — queue immediately.
    if (!navigator.onLine) {
      queueSubmission(payload);
      setSavedOffline(true);
      onOffline && onOffline();
      setSubmitting(false);
      return;
    }

    try {
      const res = await api.post('/submissions', payload);
      if (res.data.success) {
        setSubmitted(true);
        onSuccess && onSuccess(res.data.data);
      } else {
        setErrors({ _form: res.data.message || 'Submission failed. Please try again.' });
      }
    } catch (error) {
      // A response is only treated as a "real" error from OUR backend if it
      // actually looks like our API's JSON shape ({ success, message }).
      // Anything else — no response at all, a network error, a timeout, or
      // an unrelated page (e.g. a mobile carrier's "no internet" / captive
      // portal page, which still returns an HTTP response) — means the
      // request never really reached the server, so treat it as offline
      // and queue it instead of showing a scary error.
      const isRealApiError =
        error.response &&
        error.response.data &&
        typeof error.response.data === 'object' &&
        'success' in error.response.data;

      if (!navigator.onLine || !isRealApiError) {
        queueSubmission(payload);
        setSavedOffline(true);
        onOffline && onOffline();
      } else {
        setErrors({ _form: error.response.data.message || 'Submission failed. Please try again.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: 24, textAlign: "center", color: "#666" }}>Form loading...</div>;
  if (loadError || !form) {
    return (
      <div style={{ padding: 24, color: "#e53935" }}>
        {!navigator.onLine
          ? "You're offline and this form hasn't been opened on this device before, so there's no local copy to load. Open it once while online, and it'll be available offline after that."
          : "Couldn't load the form. Please try again."}
      </div>
    );
  }

  if (savedOffline) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 48 }}>📴</div>
        <h3 style={{ color: "#e65100", margin: "8px 0 4px" }}>Saved offline</h3>
        <p style={{ color: "#666", maxWidth: 380, margin: "0 auto" }}>
          No internet connection right now, so this entry was saved on this device.
          It will sync automatically the moment you're back online — you don't need to do anything.
        </p>
        <button
          onClick={() => { setSavedOffline(false); setAnswers({}); }}
          style={{ marginTop: 16, padding: "10px 24px", background: "#1a73e8", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
        >
          New Entry
        </button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 48 }}>✅</div>
        <h3 style={{ color: "#2e7d32" }}>Successfully submitted!</h3>
        <p style={{ color: "#666" }}>You can now start a new entry.</p>
        <button
          onClick={() => { setSubmitted(false); setAnswers({}); }}
          style={{ marginTop: 16, padding: "10px 24px", background: "#1a73e8", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
        >
          New Entry
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
      {/* Header */}
      <h3 style={{ marginBottom: 4 }}>{form.title}</h3>
      {form.description && <p style={{ color: "#666", marginBottom: 8 }}>{form.description}</p>}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <span style={badge("#e8f0fe", "#1a73e8")}>{form.formType}</span>
        <span style={badge("#e8f5e9", "#2e7d32")}>{form.totalQuestions} Questions</span>
        <span style={badge(gpsStatus === "ok" ? "#e8f5e9" : "#fff3e0", gpsStatus === "ok" ? "#2e7d32" : "#e65100")}>
          📍 {gpsStatus === "loading" ? "GPS fetching..." : gpsStatus === "ok" ? `${location.lat.toFixed(5)}, ${location.lon.toFixed(5)}` : "No GPS"}
        </span>
      </div>

      {gpsStatus === "ok" && (
        <div style={{ marginBottom: 20 }}>
          <MapPicker lat={location.lat} lng={location.lon} readOnly height={200} />
        </div>
      )}

      {errors._form && (
        <div style={{ background: "#fdecea", color: "#c62828", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13.5 }}>
          {errors._form}
        </div>
      )}

      {/* Fields */}
      {form.questions.length === 0 ? (
        <div style={{ background: "#fff3e0", color: "#e65100", padding: "16px", borderRadius: 8, fontSize: 13.5, lineHeight: 1.6 }}>
          No questions have been set up yet for the "{formType}" form on this project.
          Go to <strong>Survey Forms (Builder)</strong> in the Super Admin menu, pick this project and form
          type, and add the fields you want field agents to fill in — they'll appear here automatically.
        </div>
      ) : (
        <>
          {form.questions.map((q) => (
            <div key={q._id} data-error={!!errors[q.fieldName]}>
              <FormField
                question={q}
                value={answers[q.fieldName]}
                onChange={handleChange}
                error={errors[q.fieldName]}
              />
            </div>
          ))}

          {/* Submit */}
          <button
            onClick={submit}
            disabled={submitting}
            style={{
              width: "100%",
              padding: "13px",
              background: submitting ? "#90caf9" : "#1a73e8",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 16,
              cursor: submitting ? "default" : "pointer",
              marginTop: 8,
            }}
          >
            {submitting ? "Submitting..." : "Submit Survey"}
          </button>
        </>
      )}
    </div>
  );
}

const badge = (bg, color) => ({
  background: bg,
  color,
  padding: "2px 10px",
  borderRadius: 12,
  fontSize: 12,
  fontWeight: 600,
});