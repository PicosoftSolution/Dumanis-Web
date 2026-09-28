
import { useState, useEffect } from "react";
import api from "../../api/axios";
import { queueSubmission, cacheForm, getCachedForm } from "../../utils/offlineSync";
import MapPicker from "../../components/MapPicker";

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

const TYPE_ALIASES = {
  select: "dropdown",
  dropdown: "dropdown",
  radio: "single_choice",
  single_choice: "single_choice",
  checkbox: "multi_choice",
  multi_choice: "multi_choice",
  date: "date",
  time: "time",
  datetime: "datetime",
  "datetime-local": "datetime",
  switch: "switch",
  toggle: "switch",
  boolean: "switch",
  location: "location",
  map: "location",
};


const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^(?:\+?91[\s-]?)?0?([6-9]\d{9})$/;

export const validateFieldFormat = (resolvedType, rawValue) => {
  if (rawValue === undefined || rawValue === null || rawValue === "") return null;
  if (resolvedType === "email") {
    return EMAIL_RE.test(String(rawValue).trim()) ? null : "Enter a valid email address";
  }
  if (resolvedType === "phone" || resolvedType === "mobile") {
    return PHONE_RE.test(String(rawValue).trim()) ? null : "Enter a valid 10-digit phone number";
  }
  return null;
};

// ── Location (map) field ──────────────────────────────────────
function LocationField({ fieldName, value, onChange, gps, gpsStatus, onRetryGPS }) {
  // Auto-fill from device GPS once (user can still correct it manually)
  useEffect(() => {
    if (!value && gps) {
      onChange(fieldName, `${gps.lat.toFixed(6)}, ${gps.lon.toFixed(6)}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gps]);

  const [lat, lon] = String(value || "").split(",").map((s) => parseFloat(s));
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lon);

  const useMyGPS = () => {
    if (gps) onChange(fieldName, `${gps.lat.toFixed(6)}, ${gps.lon.toFixed(6)}`);
    else onRetryGPS && onRetryGPS();
  };

  return (
    <div>
      <MapPicker
        lat={hasCoords ? lat : ""}
        lng={hasCoords ? lon : ""}
        height={260}
        onChange={(la, ln) => onChange(fieldName, `${la.toFixed(6)}, ${ln.toFixed(6)}`)}
      />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: hasCoords ? "#2e7d32" : "#e65100" }}>
          {hasCoords
            ? `📍 ${lat.toFixed(5)}, ${lon.toFixed(5)}`
            : gpsStatus === "loading" ? "Fetching your location..." : "Location not set — tap the map to place the pin"}
        </span>
        <button
          type="button"
          onClick={useMyGPS}
          style={{ padding: "4px 10px", fontSize: 12, border: "1px solid #1a73e8", background: "#fff", color: "#1a73e8", borderRadius: 4, cursor: "pointer" }}
        >
          Use my current GPS
        </button>
      </div>
    </div>
  );
}

// ── Field renderer ────────────────────────────────────────────
export function FormField({ question, value, onChange, error, onBlur, gps, gpsStatus, onRetryGPS }) {
  const { label, fieldName, type, options, isMandatory } = question;
  const resolvedType = TYPE_ALIASES[type] || type;

  const inputBase = {
    width: "100%",
    padding: "9px 12px",
    border: `1px solid ${error ? "#e53935" : "#ddd"}`,
    borderRadius: 6,
    fontSize: 14,
    boxSizing: "border-box",
  };

  let field;
  switch (resolvedType) {
    case "text":
    case "number":
    case "email":
    case "phone":
    case "mobile":
    case "aadhaar":
    case "date":
    case "time":
    case "datetime":
      field = (
        <input
          type={
            resolvedType === "date" ? "date"
            : resolvedType === "time" ? "time"
            : resolvedType === "datetime" ? "datetime-local"
            : resolvedType === "number" ? "number"
            : resolvedType === "email" ? "email"
            : resolvedType === "phone" || resolvedType === "mobile" ? "tel"
            : "text"
          }
          value={value || ""}
          onChange={(e) => {
            let v = e.target.value;
            // Block the wrong kind of character as the user types, instead
            if (resolvedType === "phone" || resolvedType === "mobile") {
              // Phone: digits only, max 10 — letters/symbols never make it in.
              v = v.replace(/\D/g, "").slice(0, 10);
            } else if (resolvedType === "aadhaar") {
              v = v.replace(/\D/g, "").slice(0, 12);
            } else if (resolvedType === "email") {
              // Email: no spaces — letters/numbers/symbols like @ . _ - are fine.
              v = v.replace(/\s/g, "");
            }
            onChange(fieldName, v);
          }}
          onBlur={() => onBlur && onBlur(fieldName, value)}
          placeholder={
            resolvedType === "email" ? "name@example.com"
            : resolvedType === "phone" || resolvedType === "mobile" ? "10-digit mobile number"
            : `Enter ${label}`
          }
          style={inputBase}
          inputMode={["phone", "mobile", "aadhaar"].includes(resolvedType) ? "numeric" : undefined}
        />
      );
      break;
    case "textarea":
      field = (
        <textarea
          value={value || ""}
          onChange={(e) => onChange(fieldName, e.target.value)}
          onBlur={() => onBlur && onBlur(fieldName, value)}
          placeholder={`Enter ${label}`}
          rows={4}
          style={{ ...inputBase, resize: "vertical", fontFamily: "inherit" }}
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
    case "location":
      field = (
        <LocationField
          fieldName={fieldName}
          value={value}
          onChange={onChange}
          gps={gps}
          gpsStatus={gpsStatus}
          onRetryGPS={onRetryGPS}
        />
      );
      break;
    case "switch":
      field = (
        <label style={{ display: "inline-flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <span
            role="switch"
            aria-checked={!!value}
            onClick={() => onChange(fieldName, !value)}
            style={{
              width: 42,
              height: 24,
              borderRadius: 12,
              background: value ? "#1a73e8" : "#ccc",
              position: "relative",
              transition: "background 0.2s ease",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                position: "absolute",
                top: 2,
                left: value ? 20 : 2,
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: "#fff",
                transition: "left 0.2s ease",
                boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
              }}
            />
          </span>
          <span style={{ fontSize: 13.5, color: "#444" }}>{value ? "Yes" : "No"}</span>
        </label>
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

// Turn a queueSubmission() failure into a message the user can actually act on.
function offlineSaveErrorMessage(err) {
  return err?.message === 'STORAGE_FULL'
    ? "Couldn't save offline — this device's storage is full. Free up space (e.g. clear old synced entries) and try again."
    : "Couldn't save this entry offline. Please try again.";
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

  const handleChange = (fieldName, value, question) => {
    setAnswers((prev) => ({ ...prev, [fieldName]: value }));

    // Re-check format (email/phone) on every keystroke, so a wrong Gmail or
    const resolvedType = TYPE_ALIASES[question?.type] || question?.type;
    const isEmpty = value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
    const formatError = isEmpty ? null : validateFieldFormat(resolvedType, value);
    setErrors((prev) => ({ ...prev, [fieldName]: formatError }));
  };

  // Fires when the user leaves a field. Catches the "required" case, which
  // handleChange deliberately skips while they're still typing.
  const handleBlur = (fieldName, value, question) => {
    if (!question?.isMandatory) return;
    const isEmpty = value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
    if (isEmpty) {
      setErrors((prev) => ({ ...prev, [fieldName]: `${question.label} is required` }));
    }
  };

  const validate = () => {
    const errs = {};
    (form?.questions || []).forEach((q) => {
      const resolvedType = TYPE_ALIASES[q.type] || q.type;
      const val = answers[q.fieldName];
      const isEmpty = val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0);

      if (q.isMandatory && isEmpty) {
        errs[q.fieldName] = `${q.label} is required`;
        return;
      }
      // Format checks (email/phone) run whenever something was typed,
      // even for optional fields — an invalid email is invalid either way.
      if (!isEmpty) {
        const formatError = validateFieldFormat(resolvedType, val);
        if (formatError) errs[q.fieldName] = formatError;
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

    // If the form has a location question, save the (possibly manually
    // corrected) pin as the entry's location instead of the raw device GPS.
    const locQ = (form?.questions || []).find((q) => (TYPE_ALIASES[q.type] || q.type) === "location");
    const picked = locQ ? String(answers[locQ.fieldName] || "").split(",").map((s) => parseFloat(s)) : [];
    const finalLocation =
      Number.isFinite(picked[0]) && Number.isFinite(picked[1])
        ? { lat: picked[0], lon: picked[1] }
        : location;

    setSubmitting(true);
    const payload = {
      project: projectId,
      formType,
      data: answers,
      location: finalLocation || undefined,
    };

    if (!navigator.onLine) {
      try {
        queueSubmission(payload);
        setSavedOffline(true);
        onOffline && onOffline();
      } catch (err) {
        // queueSubmission throws if it couldn't actually persist the entry
        setErrors({ _form: offlineSaveErrorMessage(err) });
      } finally {
        setSubmitting(false);
      }
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
      const isRealApiError =
        error.response &&
        error.response.data &&
        typeof error.response.data === 'object' &&
        'success' in error.response.data;

      if (!navigator.onLine || !isRealApiError) {
        try {
          queueSubmission(payload);
          setSavedOffline(true);
          onOffline && onOffline();
        } catch (queueErr) {
          setErrors({ _form: offlineSaveErrorMessage(queueErr) });
        }
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
          ? "You're offline and this form hasn't been cached on this device yet. Open the app once while online, and it'll be available offline after that."
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

      {/* Map is not added by default — it only appears through a "location" question */}

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
                onChange={(fieldName, value) => handleChange(fieldName, value, q)}
                onBlur={(fieldName, value) => handleBlur(fieldName, value, q)}
                error={errors[q.fieldName]}
                gps={location}
                gpsStatus={gpsStatus}
                onRetryGPS={fetchGPS}
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