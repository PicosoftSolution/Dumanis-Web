// ============================================================
// FILE: src/pages/admin/FormResponsesViewer.jsx
// Admin review: submissions with merged question labels + export
// Excel / CSV / PDF are generated client-side (all questions + answers)
// ============================================================
import { useState, useEffect, Fragment } from "react";

const RAW_API = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const API = RAW_API.replace(/\/api\/?$/, "");
const getToken = () => localStorage.getItem("token");
const headers = () => ({ Authorization: `Bearer ${getToken()}` });

export default function FormResponsesViewer() {
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  // No hard-coded default form types — filled from the selected project's own forms.
  const [formType, setFormType] = useState("");
  const [projectForms, setProjectForms] = useState([]); // forms created for the selected project
  const [responses, setResponses] = useState([]);
  const [questionMap, setQuestionMap] = useState({});
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);

  // --- date range instead of single date ---
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState("");
  const [error, setError] = useState("");
  const [projectsError, setProjectsError] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  // Only the form types that belong to the selected project:
  //  - enabledForms saved on the project
  //  - types of forms already created for it
  const currentProject = projects.find((p) => p._id === projectId);
  const formTypeOptions = Array.from(
    new Set([
      ...(currentProject?.enabledForms || []),
      ...projectForms.map((f) => f.formType),
    ].filter(Boolean))
  );
  const formTypeKey = formTypeOptions.join("|");

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

  // Load the forms that exist for the selected project
  useEffect(() => {
    if (!projectId) { setProjectForms([]); return; }
    fetch(`${API}/api/forms?projectId=${projectId}`, { headers: headers() })
      .then((r) => r.json())
      .then((r) => setProjectForms(r.success ? r.data : []))
      .catch(() => setProjectForms([]));
  }, [projectId]);

  // Keep formType valid for the current project:
  // if empty or not part of this project, pick its first form type.
  useEffect(() => {
    if (!projectId) return;
    if (!formType || !formTypeOptions.includes(formType)) {
      setFormType(formTypeOptions[0] || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, formTypeKey]);

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

  const buildParams = (pageNo = page, limit = 15) => {
    const params = new URLSearchParams({ page: pageNo, limit });
    if (fromDate) params.append("from", fromDate);
    if (toDate) params.append("to", toDate);
    return params;
  };

  const loadResponses = () => {
    if (!projectId || !formType) {
      setResponses([]);
      setQuestionMap({});
      setTotal(0);
      setPages(1);
      return;
    }
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
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadResponses(); }, [projectId, formType, page, fromDate, toDate]);

  // ───────────────────────── EXPORT HELPERS ─────────────────────────
  const cleanText = (v) => {
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    if (!s) return null;
    if (/^(undefined|null)(\s+(undefined|null))*$/i.test(s)) return null;
    return s;
  };

  const submitterText = (sub) => {
    const s = sub.submittedBy;
    if (!s || typeof s !== "object") return { name: "Unknown", contact: "" };
    const first = cleanText(s.firstName);
    const last = cleanText(s.lastName);
    const name = first || last ? `${first || ""} ${last || ""}`.trim() : "Unknown";
    const contact = cleanText(s.email) || cleanText(s.phone) || "";
    return { name, contact };
  };

  // Fetch EVERY page of responses for the current filters
  const fetchAllResponses = async () => {
    let all = [];
    let qMap = {};
    let pageNo = 1;
    let totalPages = 1;
    do {
      const params = buildParams(pageNo, 100);
      const r = await fetch(
        `${API}/api/forms/responses/${projectId}/${encodeURIComponent(formType)}?${params}`,
        { headers: headers() }
      );
      if (!r.ok) throw new Error(`Request failed (${r.status})`);
      const json = await r.json();
      if (!json.success) throw new Error(json.message || "Could not load responses");
      all = all.concat(json.data || []);
      if (json.questionMap && Object.keys(json.questionMap).length) qMap = { ...qMap, ...json.questionMap };
      totalPages = json.pages || 1;
      pageNo += 1;
    } while (pageNo <= totalPages);
    return { all, qMap };
  };

  const labelFor = (fn, qMap, subs) => {
    const q = qMap[fn];
    if (typeof q === "string" && q) return q;
    if (q?.label) return q.label;
    for (const s of subs) {
      const c = s.data?.[fn];
      if (c?.label) return c.label;
    }
    return fn;
  };

  const cellText = (cell) => {
    if (cell === null || cell === undefined) return "";
    const isWrapped = typeof cell === "object" && !Array.isArray(cell) && "value" in cell;
    const v = isWrapped ? cell.value : cell;
    if (v === null || v === undefined || v === "") return "";
    if (isWrapped && cell.type === "image") return typeof v === "string" && v.startsWith("http") ? v : "[Photo]";
    if (typeof v === "string" && v.startsWith("data:image")) return "[Photo]";
    if (Array.isArray(v)) return v.map((x) => (typeof x === "object" ? JSON.stringify(x) : String(x))).join(", ");
    if (typeof v === "boolean") return v ? "Yes" : "No";
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  };

  // Ordered list of question keys: questionMap first, then anything extra found in data
  const getFieldKeys = (subs, qMap) => {
    const keys = Object.keys(qMap);
    subs.forEach((s) => Object.keys(s.data || {}).forEach((k) => { if (!keys.includes(k)) keys.push(k); }));
    return keys;
  };

  const buildTable = (subs, qMap) => {
    const keys = getFieldKeys(subs, qMap);
    const head = ["#", "Submitted By", "Contact", "Date", "Latitude", "Longitude", "Address", ...keys.map((k) => labelFor(k, qMap, subs))];
    const rows = subs.map((sub, i) => {
      const { name, contact } = submitterText(sub);
      return [
        i + 1,
        name,
        contact,
        sub.submittedAt ? new Date(sub.submittedAt).toLocaleString("en-IN") : "",
        sub.location?.lat ?? "",
        sub.location?.lon ?? "",
        sub.location?.address ?? "",
        ...keys.map((k) => cellText(sub.data?.[k])),
      ];
    });
    return { head, rows, keys };
  };

  const fileName = (ext) => {
    const rangeLabel = fromDate || toDate ? `_${fromDate || "start"}_to_${toDate || "end"}` : "";
    return `${formType}_survey${rangeLabel}.${ext}`;
  };

  const saveBlob = (blob, name) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const exportCSV = (head, rows) => {
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [head, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
    // BOM so Excel reads Telugu/Unicode correctly
    saveBlob(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }), fileName("csv"));
  };

  const exportExcel = async (head, rows) => {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.aoa_to_sheet([head, ...rows]);
    ws["!cols"] = head.map((h, c) => {
      const max = Math.max(String(h).length, ...rows.map((r) => String(r[c] ?? "").length));
      return { wch: Math.min(Math.max(max + 2, 10), 50) };
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Responses");
    XLSX.writeFile(wb, fileName("xlsx"));
  };

  const exportPDF = async (subs, qMap, keys) => {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();

    doc.setFontSize(16);
    doc.text(`${formType} Survey Responses`, 40, 40);
    doc.setFontSize(10);
    const proj = projects.find((p) => p._id === projectId)?.name || "";
    doc.text(`Project: ${proj}   |   Total: ${subs.length}${fromDate || toDate ? `   |   ${fromDate || "…"} to ${toDate || "…"}` : ""}`, 40, 58);

    let y = 76;
    subs.forEach((sub, i) => {
      const { name, contact } = submitterText(sub);
      const body = [
        ["Submitted By", `${name}${contact ? ` (${contact})` : ""}`],
        ["Date", sub.submittedAt ? new Date(sub.submittedAt).toLocaleString("en-IN") : ""],
      ];
      if (sub.location?.lat != null && sub.location?.lon != null) {
        body.push(["Location", `${Number(sub.location.lat).toFixed(5)}, ${Number(sub.location.lon).toFixed(5)}`]);
      }
      if (sub.location?.address) body.push(["Address", sub.location.address]);
      keys.forEach((k) => body.push([labelFor(k, qMap, subs), cellText(sub.data?.[k]) || "—"]));

      autoTable(doc, {
        startY: y,
        head: [[{ content: `Submission #${i + 1}`, colSpan: 2 }]],
        body,
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 4, overflow: "linebreak" },
        headStyles: { fillColor: [26, 115, 232] },
        columnStyles: { 0: { cellWidth: 190, fontStyle: "bold" }, 1: { cellWidth: pageW - 80 - 190 } },
        margin: { left: 40, right: 40 },
      });
      y = doc.lastAutoTable.finalY + 18;
    });

    doc.save(fileName("pdf"));
  };

  const exportGeoJSON = async () => {
    const params = new URLSearchParams();
    if (fromDate) params.append("from", fromDate);
    if (toDate) params.append("to", toDate);
    const r = await fetch(`${API}/api/export/geojson/${projectId}/${encodeURIComponent(formType)}?${params}`, { headers: headers() });
    if (!r.ok) throw new Error(`Export failed (${r.status})`);
    saveBlob(await r.blob(), fileName("geojson"));
  };

  const exportFile = async (format) => {
    if (!projectId || !formType || exporting) return;
    setExporting(format);
    try {
      if (format === "geojson") {
        await exportGeoJSON();
      } else {
        const { all, qMap } = await fetchAllResponses();
        if (all.length === 0) {
          alert("No submissions to export for the selected filters.");
          return;
        }
        const { head, rows, keys } = buildTable(all, qMap);
        if (format === "csv") exportCSV(head, rows);
        else if (format === "excel") await exportExcel(head, rows);
        else if (format === "pdf") await exportPDF(all, qMap, keys);
      }
    } catch (err) {
      console.error("Export error:", err);
      alert("Export failed: " + err.message);
    } finally {
      setExporting("");
    }
  };

  const fieldNames = Object.keys(questionMap);

  // Helper to render submitter info with fallbacks
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
        <select
          value={projectId}
          onChange={(e) => {
            setProjectId(e.target.value);
            setFormType(""); // reset so the new project's own form type gets picked
            setProjectForms([]);
            setResponses([]);
            setPage(1);
          }}
          style={sel}
        >
          <option value="">-- Project --</option>
          {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
        </select>

        {/* Form type dropdown only appears once a project is selected,
            and only lists forms that belong to that project */}
        {projectId && (
          <select value={formType} onChange={(e) => { setFormType(e.target.value); setPage(1); }} style={sel}>
            {formTypeOptions.length === 0 && <option value="">-- No forms for this project --</option>}
            {formTypeOptions.map((ft) => <option key={ft} value={ft}>{ft}</option>)}
          </select>
        )}

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
        {projectId && formType && (
          <div style={{ display: "flex", gap: 8, marginLeft: "auto", alignItems: "center" }}>
            {exporting && <span style={{ fontSize: 12, color: "#666" }}>Preparing {exporting}...</span>}
            <ExportBtn label="📊 Excel" color="#1e7e34" disabled={!!exporting} onClick={() => exportFile("excel")} />
            <ExportBtn label="📄 CSV" color="#fd7e14" disabled={!!exporting} onClick={() => exportFile("csv")} />
            <ExportBtn label="📑 PDF" color="#dc3545" disabled={!!exporting} onClick={() => exportFile("pdf")} />
          </div>
        )}
      </div>

      {projectId && formTypeOptions.length === 0 && (
        <div style={{ padding: 40, textAlign: "center", color: "#999", fontStyle: "italic" }}>
          No forms have been created for this project yet.
        </div>
      )}

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

      {!loading && !error && responses.length === 0 && projectId && formType && (
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

const ExportBtn = ({ label, color, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{ padding: "6px 14px", background: color, color: "#fff", border: "none", borderRadius: 5, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1, fontWeight: 600, fontSize: 12 }}
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