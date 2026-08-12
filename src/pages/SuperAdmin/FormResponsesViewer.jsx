// ============================================================
// FILE: src/pages/admin/FormResponsesViewer.jsx
// Admin review: submissions with merged question labels + export
// ============================================================
import { useState, useEffect } from "react";

const RAW_API = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const API = RAW_API.replace(/\/api\/?$/, "");
const getToken = () => localStorage.getItem("token");
const headers = () => ({ Authorization: `Bearer ${getToken()}` });
const jsonHeaders = () => ({ ...headers(), "Content-Type": "application/json" });

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
  const [dateFilter, setDateFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/projects`, { headers: headers() })
      .then((r) => r.json())
      .then((r) => r.success && setProjects(r.data));
  }, []);

  const loadResponses = () => {
    if (!projectId) return;
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 15 });
    if (dateFilter) params.append("date", dateFilter);

    fetch(`${API}/api/forms/responses/${projectId}/${encodeURIComponent(formType)}?${params}`, { headers: headers() })
      .then((r) => r.json())
      .then((r) => {
        if (r.success) {
          setResponses(r.data);
          setQuestionMap(r.questionMap || {});
          setTotal(r.total);
          setPages(r.pages);
        }
        setLoading(false);
      });
  };

  useEffect(() => { loadResponses(); }, [projectId, formType, page, dateFilter]);

  const exportFile = (format) => {
    const params = new URLSearchParams();
    if (dateFilter) params.append("date", dateFilter);
    const url = `${API}/api/export/${format}/${projectId}/${encodeURIComponent(formType)}?${params}`;
    window.open(url + `&token=${getToken()}`, "_blank");
    // Note: For production, use Authorization header via a proxy or signed URL
    fetch(url, { headers: headers() })
      .then((r) => r.blob())
      .then((blob) => {
        const ext = format === "geojson" ? "geojson" : format;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${formType}_survey.${ext}`;
        a.click();
      });
  };

  // Build ordered column headers from questionMap
  const fieldNames = Object.keys(questionMap);

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ marginBottom: 4 }}>📋 Form Responses</h2>
      <p style={{ color: "#666", marginBottom: 16 }}>Submissions review cheyyi — question labels tho merged view</p>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <select value={projectId} onChange={(e) => { setProjectId(e.target.value); setPage(1); }} style={sel}>
          <option value="">-- Project --</option>
          {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
        </select>
        <select value={formType} onChange={(e) => { setFormType(e.target.value); setPage(1); }} style={sel}>
          {FORM_TYPES.map((ft) => <option key={ft}>{ft}</option>)}
        </select>
        <input type="date" value={dateFilter} onChange={(e) => { setDateFilter(e.target.value); setPage(1); }} style={sel} />

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
        </div>
      )}

      {loading && <div style={{ color: "#666", padding: 20 }}>Loading...</div>}

      {/* Table */}
      {!loading && responses.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#1a73e8", color: "#fff" }}>
                <th style={th}>#</th>
                <th style={th}>Submitted By</th>
                <th style={th}>Date</th>
                <th style={th}>Location</th>
                {fieldNames.map((fn) => <th key={fn} style={th}>{questionMap[fn]}</th>)}
                <th style={th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {responses.map((sub, idx) => (
                <>
                  <tr
                    key={sub._id}
                    style={{ background: idx % 2 === 0 ? "#f9f9f9" : "#fff", cursor: "pointer" }}
                    onClick={() => setExpandedId(expandedId === sub._id ? null : sub._id)}
                  >
                    <td style={td}>{(page - 1) * 15 + idx + 1}</td>
                    <td style={td}>{sub.submittedBy?.name || "—"}</td>
                    <td style={td}>{new Date(sub.submittedAt).toLocaleString("en-IN")}</td>
                    <td style={td}>
                      {sub.location?.lat
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
                    <tr key={`${sub._id}-detail`}>
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
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && responses.length === 0 && projectId && (
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

const sel = { padding: "7px 12px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13 };
const th = { padding: "9px 12px", textAlign: "left", whiteSpace: "nowrap", fontWeight: 600 };
const td = { padding: "8px 12px", borderBottom: "1px solid #eee" };
const pgBtn = { padding: "6px 16px", border: "1px solid #ddd", borderRadius: 5, cursor: "pointer" };