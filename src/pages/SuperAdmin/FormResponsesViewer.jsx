// ============================================================
// FILE: src/pages/admin/FormResponsesViewer.jsx
// Admin review: submissions with merged question labels + export
// FIXED: error handling (loading stuck bug), from/to date range +
// month shortcut, clearer submitted-by display
// ============================================================
import { useState, useEffect, Fragment } from "react";

const RAW_API = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const API = RAW_API.replace(/\/api\/?$/, "");
const getToken = () => localStorage.getItem("token");
const headers = () => ({ Authorization: `Bearer ${getToken()}` });

export default function FormResponsesViewer() {
  const FORM_TYPES = ["Residential", "Commercial", "Institutional", "Apartment", "Open Site"];

  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [formType, setFormType] = useState("Residential");
  const [responses, setResponses] = useState([]);
  const [questionMap, setQuestionMap] = useState({});
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);

  // --- date range instead of single date ---
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");          // NEW: surfaced errors
  const [projectsError, setProjectsError] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  // Load projects with proper error handling
  useEffect(() => {
    setProjectsError("");
    fetch(`${API}/api/projects`, { headers: headers() })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Projects request failed (${r.status})`);
        return r.json();
      })
      .then((r) => {
        if (r.success) setProjects(r.data);
        else setProjectsError(r.message || "Could not load projects.");
      })
      .catch((err) => {
        console.error("Projects load error:", err);
        setProjectsError(
          err.message.includes("401") || err.message.includes("403")
            ? "Session expired. Please log in again."
            : "Could not reach the server to load projects."
        );
      });
  }, []);

  // Helper: quick "this month" range
  const setThisMonth = () => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setFromDate(first.toISOString().slice(0, 10));
    setToDate(last.toISOString().slice(0, 10));
    setPage(1);
  };

  const clearDates = () => {
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  const buildParams = () => {
    const params = new URLSearchParams({ page, limit: 15 });
    // Send both a range (from/to) — backend should filter submittedAt
    // between these — and keep "date" for older single-day behavior.
    if (fromDate) params.append("from", fromDate);
    if (toDate) params.append("to", toDate);
    return params;
  };

  const loadResponses = () => {
    if (!projectId) return;
    setLoading(true);
    setError("");
    const params = buildParams();

    fetch(`${API}/api/forms/responses/${projectId}/${encodeURIComponent(formType)}?${params}`, {
      headers: headers(),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Request failed (${r.status})`);
        return r.json();
      })
      .then((r) => {
        if (r.success) {
          setResponses(r.data || []);
          setQuestionMap(r.questionMap || {});
          setTotal(r.total || 0);
          setPages(r.pages || 1);
        } else {
          setError(r.message || "Server returned an error loading responses.");
          setResponses([]);
        }
      })
      .catch((err) => {
        console.error("Responses load error:", err);
        setError(
          err.message.includes("401") || err.message.includes("403")
            ? "Session expired. Please log in again."
            : "Could not load responses. Check your connection or try again."
        );
        setResponses([]);
      })
      .finally(() => setLoading(false)); // ALWAYS clears loading, even on error
  };

  useEffect(() => { loadResponses(); }, [projectId, formType, page, fromDate, toDate]);

  const exportFile = (format) => {
    const params = new URLSearchParams();
    if (fromDate) params.append("from", fromDate);
    if (toDate) params.append("to", toDate);
    const url = `${API}/api/export/${format}/${projectId}/${encodeURIComponent(formType)}?${params}`;

    fetch(url, { headers: headers() })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Export failed (${r.status})`);
        return r.blob();
      })
      .then((blob) => {
        const ext = format === "geojson" ? "geojson" : format;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        const rangeLabel = fromDate || toDate ? `_${fromDate || "start"}_to_${toDate || "end"}` : "";
        a.download = `${formType}_survey${rangeLabel}.${ext}`;
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch((err) => {
        console.error("Export error:", err);
        alert("Export failed: " + err.message);
      });
  };

  const fieldNames = Object.keys(questionMap);

  // Guards against backend sending literal "undefined"/"null" text
  // (e.g. from `${user.firstName} ${user.lastName}` when those fields don't exist)
  const cleanText = (v) => {
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    if (!s) return null;
    if (/^(undefined|null)(\s+(undefined|null))*$/i.test(s)) return null;
    return s;
  };

  // Helper to render submitter info with fallbacks
  // NOTE: submittedBy uses firstName/lastName + email (same shape as Entries.jsx)
  const renderSubmitter = (sub) => {
    const s = sub.submittedBy;
    if (!s || typeof s !== "object") return <span style={{ color: "#999" }}>Unknown</span>;
    const first = cleanText(s.firstName);
    const last = cleanText(s.lastName);
    const name = first || last ? `${first || ""} ${last || ""}`.trim() : null;
    const contact = cleanText(s.email) || cleanText(s.phone);
    if (!name && !contact) return <span style={{ color: "#999" }}>Unknown</span>;
    return (
      <div>
        <div>{name || "—"}</div>
        {contact && <div style={{ fontSize: 11, color: "#777" }}>{contact}</div>}
      </div>
    );
  };

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ marginBottom: 4 }}>📋 Form Responses</h2>
      <p style={{ color: "#666", marginBottom: 16 }}>Submissions review cheyyi — question labels tho merged view</p>

      {projectsError && (
        <div style={{ background: "#fdecea", color: "#b71c1c", padding: "10px 16px", borderRadius: 6, marginBottom: 12, fontSize: 13 }}>
          ⚠ {projectsError}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
        <select value={projectId} onChange={(e) => { setProjectId(e.target.value); setPage(1); }} style={sel}>
          <option value="">-- Project --</option>
          {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
        </select>
        <select value={formType} onChange={(e) => { setFormType(e.target.value); setPage(1); }} style={sel}>
          {FORM_TYPES.map((ft) => <option key={ft}>{ft}</option>)}
        </select>

        {/* Date range instead of single date */}
        <div style={dateGroup}>
          <span style={dateGroupLabel}>From</span>
          <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} style={sel} />
        </div>
        <div style={dateGroup}>
          <span style={dateGroupLabel}>To</span>
          <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} style={sel} />
        </div>
        <button onClick={setThisMonth} style={quickBtn}>This month</button>
        {(fromDate || toDate) && <button onClick={clearDates} style={quickBtn}>Clear dates</button>}

        {/* Export buttons */}
        {projectId && (
          <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
            <ExportBtn label="📊 Excel" color="#1e7e34" onClick={() => exportFile("excel")} />
            <ExportBtn label="🗺 GeoJSON" color="#6f42c1" onClick={() => exportFile("geojson")} />
            <ExportBtn label="📄 CSV" color="#fd7e14" onClick={() => exportFile("csv")} />
            <ExportBtn label="📑 PDF" color="#dc3545" onClick={() => exportFile("pdf")} />
          </div>
        )}
      </div>

      {/* Stats bar */}
      {total > 0 && (
        <div style={{ background: "#f0f4ff", padding: "8px 16px", borderRadius: 6, marginBottom: 12, fontSize: 13 }}>
          Total <strong>{total}</strong> submissions found | Page {page} of {pages}
          {(fromDate || toDate) && (
            <> &nbsp;|&nbsp; Range: {fromDate || "…"} → {toDate || "…"}</>
          )}
        </div>
      )}

      {error && (
        <div style={{ background: "#fdecea", color: "#b71c1c", padding: "10px 16px", borderRadius: 6, marginBottom: 12, fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>⚠ {error}</span>
          <button onClick={loadResponses} style={{ ...quickBtn, background: "#fff" }}>Retry</button>
        </div>
      )}

      {loading && <div style={{ color: "#666", padding: 20 }}>Loading...</div>}

      {/* Table */}
      {!loading && !error && responses.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#1a73e8", color: "#fff" }}>
                <th style={th}>#</th>
                <th style={th}>Submitted By</th>
                <th style={th}>Date</th>
                <th style={th}>Location</th>
                {fieldNames.map((fn) => {
                  const q = questionMap[fn];
                  const label = typeof q === "string" ? q : q?.label || fn;
                  return <th key={fn} style={th}>{label}</th>;
                })}
                <th style={th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {responses.map((sub, idx) => (
                <Fragment key={sub._id}>
                  <tr
                    style={{ background: idx % 2 === 0 ? "#f9f9f9" : "#fff", cursor: "pointer" }}
                    onClick={() => setExpandedId(expandedId === sub._id ? null : sub._id)}
                  >
                    <td style={td}>{(page - 1) * 15 + idx + 1}</td>
                    <td style={td}>{renderSubmitter(sub)}</td>
                    <td style={td}>{new Date(sub.submittedAt).toLocaleString("en-IN")}</td>
                    <td style={td}>
                      {sub.location?.lat != null && sub.location?.lon != null
                        ? <span style={{ color: "#1a73e8" }}>📍 {sub.location.lat.toFixed(4)}, {sub.location.lon.toFixed(4)}</span>
                        : "—"}
                    </td>
                    {fieldNames.map((fn) => {
                      const cell = sub.data?.[fn];
                      const val = cell?.value;
                      return <td key={fn} style={td}>{Array.isArray(val) ? val.join(", ") : (val ?? "—")}</td>;
                    })}
                    <td style={td}>
                      <span style={{ color: "#1a73e8", cursor: "pointer" }}>
                        {expandedId === sub._id ? "▲ Hide" : "▼ Show"}
                      </span>
                    </td>
                  </tr>

                  {/* Expanded detail row */}
                  {expandedId === sub._id && (
                    <tr>
                      <td colSpan={4 + fieldNames.length + 1} style={{ padding: 0 }}>
                        <div style={{ background: "#e8f0fe", padding: "12px 20px", borderLeft: "4px solid #1a73e8" }}>
                          <strong>Submission Detail: {sub._id}</strong>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "6px 20px", marginTop: 10 }}>
                            {Object.entries(sub.data || {}).map(([fn, cell]) => (
                              <div key={fn}>
                                <span style={{ color: "#666", fontSize: 11 }}>{cell.label || fn}</span>
                                <div style={{ fontWeight: 600 }}>
                                  {cell.type === "image" && cell.value ? (
                                    <img src={cell.value} alt="photo" style={{ maxWidth: 100, maxHeight: 80, borderRadius: 4 }} />
                                  ) : Array.isArray(cell.value) ? cell.value.join(", ") : (cell.value ?? "—")}
                                </div>
                              </div>
                            ))}
                          </div>
                          {sub.location?.address && (
                            <div style={{ marginTop: 8, fontSize: 12, color: "#555" }}>
                              📍 Address: {sub.location.address}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && responses.length === 0 && projectId && (
        <div style={{ padding: 40, textAlign: "center", color: "#999" }}>
          No submissions found for selected filters.
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16 }}>
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} style={pgBtn}>← Prev</button>
          <span style={{ padding: "6px 12px" }}>{page} / {pages}</span>
          <button disabled={page === pages} onClick={() => setPage((p) => p + 1)} style={pgBtn}>Next →</button>
        </div>
      )}
    </div>
  );
}

const ExportBtn = ({ label, color, onClick }) => (
  <button
    onClick={onClick}
    style={{ padding: "6px 14px", background: color, color: "#fff", border: "none", borderRadius: 5, cursor: "pointer", fontWeight: 600, fontSize: 12 }}
  >
    {label}
  </button>
);

const sel = { padding: "7px 12px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13, height: 34, boxSizing: "border-box" };
const dateGroup = { display: "flex", alignItems: "center", gap: 6 };
const dateGroupLabel = { fontSize: 12, color: "#555" };
const quickBtn = { padding: "0 12px", height: 34, border: "1px solid #ddd", borderRadius: 5, cursor: "pointer", fontSize: 12, background: "#f4f4f4" };
const th = { padding: "9px 12px", textAlign: "left", whiteSpace: "nowrap", fontWeight: 600 };
const td = { padding: "8px 12px", borderBottom: "1px solid #eee" };
const pgBtn = { padding: "6px 16px", border: "1px solid #ddd", borderRadius: 5, cursor: "pointer" };