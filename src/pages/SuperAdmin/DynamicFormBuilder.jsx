// ============================================================
// FILE: src/pages/admin/DynamicFormBuilder.jsx
// Admin page: Create/Edit dynamic forms per project
// ============================================================
import { useState, useEffect } from "react";

// Normalize API base so it works whether VITE_API_URL already
// includes "/api" at the end or not — prevents "/api/api/..." 404s.
const RAW_API = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const API = RAW_API.replace(/\/api\/?$/, ""); // strip trailing /api if present

const getToken = () => localStorage.getItem("token");

const headers = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

// ── Reusable API helpers ──────────────────────────────────────
const api = {
  get: (path) => fetch(`${API}${path}`, { headers: headers() }).then((r) => r.json()),
  post: (path, body) =>
    fetch(`${API}${path}`, { method: "POST", headers: headers(), body: JSON.stringify(body) }).then((r) => r.json()),
  put: (path, body) =>
    fetch(`${API}${path}`, { method: "PUT", headers: headers(), body: JSON.stringify(body) }).then((r) => r.json()),
  patch: (path, body) =>
    fetch(`${API}${path}`, { method: "PATCH", headers: headers(), body: JSON.stringify(body) }).then((r) => r.json()),
  delete: (path) => fetch(`${API}${path}`, { method: "DELETE", headers: headers() }).then((r) => r.json()),
};

// ── DragHandle Icon ───────────────────────────────────────────
const DragHandle = () => (
  <span style={{ cursor: "grab", color: "#999", fontSize: 18, userSelect: "none" }}>⠿</span>
);

// ── QuestionRow: single draggable question in builder ─────────
function QuestionRow({ fq, index, onToggleVisible, onToggleMandatory, onMoveUp, onMoveDown, onRemove }) {
  const q = fq.question;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 12px",
        border: "1px solid #e0e0e0",
        borderRadius: 8,
        marginBottom: 6,
        background: fq.isVisible ? "#fff" : "#fafafa",
        opacity: fq.isVisible ? 1 : 0.5,
      }}
    >
      <DragHandle />
      <span style={{ flex: 1, fontWeight: 500 }}>{q.label}</span>
      <span style={{ fontSize: 11, color: "#888", background: "#f0f4ff", padding: "2px 6px", borderRadius: 4 }}>
        {q.type}
      </span>
      <span style={{ fontSize: 11, color: "#666" }}>{q.formType}</span>

      <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
        <input type="checkbox" checked={fq.isVisible} onChange={() => onToggleVisible(index)} />
        Show
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
        <input
          type="checkbox"
          checked={fq.isMandatory !== null ? fq.isMandatory : q.isMandatory}
          onChange={() => onToggleMandatory(index)}
        />
        Required
      </label>

      <button onClick={() => onMoveUp(index)} disabled={index === 0} style={btnSm}>▲</button>
      <button onClick={() => onMoveDown(index)} style={btnSm}>▼</button>
      <button onClick={() => onRemove(index)} style={{ ...btnSm, color: "#e53935" }}>✕</button>
    </div>
  );
}

const btnSm = { padding: "2px 8px", border: "1px solid #ddd", borderRadius: 4, cursor: "pointer", background: "#fff" };

// ── Main DynamicFormBuilder ───────────────────────────────────
export default function DynamicFormBuilder() {
  const FORM_TYPES = ["Residential", "Commercial", "Institutional", "Apartment", "Open Site"];

  const [projects, setProjects] = useState([]);
  const [allQuestions, setAllQuestions] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedFormType, setSelectedFormType] = useState("Residential");
  const [existingForm, setExistingForm] = useState(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formQuestions, setFormQuestions] = useState([]); // [{question:{...}, order, isMandatory, isVisible}]
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const QUESTION_TYPES = ["text", "number", "email", "phone", "date", "select", "radio", "checkbox", "textarea", "percentage", "ratio", "image"];
  const [newQ, setNewQ] = useState({ label: "", name: "", type: "text", optionsText: "", isMandatory: false });
  const [addingQ, setAddingQ] = useState(false);

  useEffect(() => {
    api.get("/api/projects").then((r) => r.success && setProjects(r.data));
  }, []);

  // Re-fetch the question bank whenever the form type changes, so only
  // relevant questions (+ 'Common' ones) show up automatically.
  useEffect(() => {
    api.get(`/api/questions?formType=${encodeURIComponent(selectedFormType)}`).then(
      (r) => r.success && setAllQuestions(r.data)
    );
  }, [selectedFormType]);

  // Load form when project+formType changes
  useEffect(() => {
    if (!selectedProject) return;
    setExistingForm(null);
    setFormQuestions([]);
    api.get(`/api/forms?projectId=${selectedProject}`).then((r) => {
      if (r.success) {
        const found = r.data.find((f) => f.formType === selectedFormType);
        if (found) {
          setExistingForm(found);
          setFormTitle(found.title || "");
          setFormDesc(found.description || "");
          // Restore questions with populated data
          setFormQuestions(
            found.questions.map((fq) => ({
              question: fq.question,
              order: fq.order,
              isMandatory: fq.isMandatory,
              isVisible: fq.isVisible,
            }))
          );
        }
      }
    });
  }, [selectedProject, selectedFormType]);

  // Available questions to add (not yet in form)
  const availableQuestions = allQuestions.filter(
    (q) =>
      (q.formType === selectedFormType || q.formType === "Common") &&
      !formQuestions.find((fq) => fq.question._id === q._id)
  );

  const addQuestion = (q) => {
    setFormQuestions((prev) => [
      ...prev,
      { question: q, order: prev.length, isMandatory: null, isVisible: true },
    ]);
  };

  const removeQuestion = (i) => setFormQuestions((prev) => prev.filter((_, idx) => idx !== i));

  const toggleVisible = (i) =>
    setFormQuestions((prev) => prev.map((fq, idx) => (idx === i ? { ...fq, isVisible: !fq.isVisible } : fq)));

  const toggleMandatory = (i) =>
    setFormQuestions((prev) =>
      prev.map((fq, idx) => {
        if (idx !== i) return fq;
        const current = fq.isMandatory !== null ? fq.isMandatory : fq.question.isMandatory;
        return { ...fq, isMandatory: !current };
      })
    );

  const moveUp = (i) => {
    if (i === 0) return;
    setFormQuestions((prev) => {
      const arr = [...prev];
      [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
      return arr.map((fq, idx) => ({ ...fq, order: idx }));
    });
  };

  const moveDown = (i) => {
    setFormQuestions((prev) => {
      if (i >= prev.length - 1) return prev;
      const arr = [...prev];
      [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
      return arr.map((fq, idx) => ({ ...fq, order: idx }));
    });
  };

  const createQuestion = async () => {
    if (!newQ.label.trim()) return setMsg({ type: "error", text: "Question label is required" });
    const baseName = (newQ.name || newQ.label).trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    // Guard against two questions silently sharing the same field name (e.g. "Full name" and
    // "Full Name" both slugify to "full_name"). If it's taken, auto-suffix it — otherwise
    // typing in one field would overwrite the other's saved value.
    let name = baseName;
    let suffix = 2;
    while (allQuestions.some((q) => q.name === name)) {
      name = `${baseName}_${suffix}`;
      suffix++;
    }
    const needsOptions = ["select", "radio", "checkbox"].includes(newQ.type);
    const options = needsOptions
      ? newQ.optionsText.split(",").map((s) => s.trim()).filter(Boolean).map((v) => ({ label: v, value: v }))
      : [];
    if (needsOptions && options.length === 0) {
      return setMsg({ type: "error", text: "Add at least one option (comma separated)" });
    }

    setAddingQ(true);
    const res = await api.post("/api/questions", {
      label: newQ.label,
      name,
      type: newQ.type,
      formType: selectedFormType,
      isMandatory: newQ.isMandatory,
      options,
    });
    setAddingQ(false);

    if (res.success) {
      setAllQuestions((prev) => [...prev, res.data]);
      addQuestion(res.data); // drop it straight into the current form
      setNewQ({ label: "", name: "", type: "text", optionsText: "", isMandatory: false });
      setShowAddQuestion(false);
      setMsg({ type: "success", text: "Question created and added to the form" });
    } else {
      setMsg({ type: "error", text: res.message || "Failed to create question" });
    }
  };

  const saveForm = async () => {
    if (!selectedProject) return setMsg({ type: "error", text: "Please select a project first" });
    setSaving(true);
    setMsg(null);
    const payload = {
      project: selectedProject,
      formType: selectedFormType,
      title: formTitle,
      description: formDesc,
      questions: formQuestions.map((fq, i) => ({
        question: fq.question._id,
        order: i,
        isMandatory: fq.isMandatory,
        isVisible: fq.isVisible,
      })),
    };

    let res;
    if (existingForm) {
      res = await api.put(`/api/forms/${existingForm._id}`, payload);
    } else {
      res = await api.post("/api/forms", payload);
    }

    setSaving(false);
    if (res.success) {
      setMsg({ type: "success", text: existingForm ? "Form updated!" : "Form created!" });
      setExistingForm(res.data);
    } else {
      setMsg({ type: "error", text: res.message || "Error saving form" });
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h2 style={{ marginBottom: 4 }}>🛠 Dynamic Form Builder</h2>
      <p style={{ color: "#666", marginBottom: 20 }}>
        Configure a form specific to this project — control question order, mandatory fields, and visibility.
      </p>

      {/* Project + FormType selector */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          style={inputStyle}
        >
          <option value="">-- Project Select --</option>
          {projects.map((p) => (
            <option key={p._id} value={p._id}>{p.name}</option>
          ))}
        </select>
        <select
          value={selectedFormType}
          onChange={(e) => setSelectedFormType(e.target.value)}
          style={inputStyle}
        >
          {FORM_TYPES.map((ft) => <option key={ft}>{ft}</option>)}
        </select>
      </div>

      {selectedProject && (
        <>
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <input
              placeholder="Form Title (optional)"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              style={{ ...inputStyle, flex: 2 }}
            />
            <input
              placeholder="Description (optional)"
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              style={{ ...inputStyle, flex: 3 }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* Form question list */}
            <div>
              <h4 style={{ marginBottom: 10 }}>
                Form Questions ({formQuestions.length})
                {existingForm && <span style={{ color: "#1a73e8", fontSize: 12, marginLeft: 8 }}>✓ Existing form loaded</span>}
              </h4>
              {formQuestions.length === 0 && (
                <p style={{ color: "#999", fontStyle: "italic" }}>No questions added yet. Add them from the panel on the right.</p>
              )}
              {formQuestions.map((fq, i) => (
                <QuestionRow
                  key={fq.question._id}
                  fq={fq}
                  index={i}
                  onToggleVisible={toggleVisible}
                  onToggleMandatory={toggleMandatory}
                  onMoveUp={moveUp}
                  onMoveDown={moveDown}
                  onRemove={removeQuestion}
                />
              ))}
            </div>

            {/* Available questions to add */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <h4 style={{ margin: 0 }}>Available Questions ({availableQuestions.length})</h4>
                <button
                  onClick={() => setShowAddQuestion((v) => !v)}
                  style={{ padding: "4px 10px", background: showAddQuestion ? "#eee" : "#1a73e8", color: showAddQuestion ? "#333" : "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: 600 }}
                >
                  {showAddQuestion ? "Cancel" : "+ New Question"}
                </button>
              </div>

              {showAddQuestion && (
                <div style={{ border: "1px solid #d8e3fc", background: "#f5f8ff", borderRadius: 8, padding: 12, marginBottom: 14 }}>
                  <input
                    placeholder="Question label (e.g. Owner's Name)"
                    value={newQ.label}
                    onChange={(e) => setNewQ((s) => ({ ...s, label: e.target.value }))}
                    style={{ ...inputStyle, width: "100%", marginBottom: 8, boxSizing: "border-box" }}
                  />
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <select
                      value={newQ.type}
                      onChange={(e) => setNewQ((s) => ({ ...s, type: e.target.value }))}
                      style={{ ...inputStyle, minWidth: 130 }}
                    >
                      {QUESTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
                      <input
                        type="checkbox"
                        checked={newQ.isMandatory}
                        onChange={(e) => setNewQ((s) => ({ ...s, isMandatory: e.target.checked }))}
                      />
                      Required
                    </label>
                  </div>
                  {["select", "radio", "checkbox"].includes(newQ.type) && (
                    <input
                      placeholder="Options, comma separated (e.g. Yes, No, Maybe)"
                      value={newQ.optionsText}
                      onChange={(e) => setNewQ((s) => ({ ...s, optionsText: e.target.value }))}
                      style={{ ...inputStyle, width: "100%", marginBottom: 8, boxSizing: "border-box" }}
                    />
                  )}
                  <button
                    onClick={createQuestion}
                    disabled={addingQ}
                    style={{ padding: "6px 16px", background: "#1a73e8", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: 600 }}
                  >
                    {addingQ ? "Adding…" : "Add to Question Bank + Form"}
                  </button>
                  <p style={{ fontSize: 11, color: "#888", marginTop: 6, marginBottom: 0 }}>
                    This question will be saved to the "{selectedFormType}" question bank and added to this form immediately.
                  </p>
                </div>
              )}

              {availableQuestions.map((q) => (
                <div
                  key={q._id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "7px 12px",
                    border: "1px solid #e0e0e0",
                    borderRadius: 6,
                    marginBottom: 5,
                    background: "#f9f9f9",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 500 }}>{q.label}</div>
                    <div style={{ fontSize: 11, color: "#888" }}>{q.type} • {q.formType}</div>
                  </div>
                  <button
                    onClick={() => addQuestion(q)}
                    style={{ padding: "3px 10px", background: "#1a73e8", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}
                  >
                    + Add
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 20, display: "flex", gap: 12, alignItems: "center" }}>
            <button
              onClick={saveForm}
              disabled={saving}
              style={{
                padding: "10px 28px",
                background: "#1a73e8",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontWeight: 600,
                cursor: "pointer",
                fontSize: 15,
              }}
            >
              {saving ? "Saving..." : existingForm ? "Update Form" : "Create Form"}
            </button>
            {msg && (
              <span style={{ color: msg.type === "success" ? "#2e7d32" : "#c62828", fontWeight: 500 }}>
                {msg.type === "success" ? "✓" : "✗"} {msg.text}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const inputStyle = {
  padding: "8px 12px",
  border: "1px solid #ddd",
  borderRadius: 6,
  fontSize: 14,
  minWidth: 160,
};