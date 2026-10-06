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
function QuestionRow({ fq, index, onToggleVisible, onToggleMandatory, onMoveUp, onMoveDown, onRemove, onEdit }) {
  const q = fq.question;
  return (
    <div
      className="dfb-qrow"
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
      <button onClick={() => onEdit(q)} style={{ ...btnSm, color: "#1a73e8" }} title="Edit this question">✎</button>
      <button onClick={() => onRemove(index)} style={{ ...btnSm, color: "#e53935" }} title="Remove from this form">✕</button>
    </div>
  );
}

const btnSm = { padding: "2px 8px", border: "1px solid #ddd", borderRadius: 4, cursor: "pointer", background: "#fff" };

// These must stay in sync with the TYPE_ALIASES map in SurveyForm.jsx —
// whatever "type" gets saved here is exactly what decides which input the
// field agent sees. Missing an entry here (e.g. "select"/"date"/"time"/
// "switch"/"phone" were missing before) meant that type silently fell back
// to a plain text box on the survey form.
const QUESTION_TYPES = [
  "text",       // free text
  "email",      // validated email address
  "phone",      // validated 10-digit phone number
  "date",       // date picker
  "time",       // time picker
  "select",     // dropdown (needs options)
  "radio",      // single choice pills (needs options)
  "checkbox",   // multi choice pills (needs options)
  "switch",     // yes/no toggle
  "textarea",   // multi-line text
  "location",
  "number",
];

const needsOptionsFor = (type) => ["select", "radio", "checkbox"].includes(type);

// Turn a question's saved options ([{label, value}]) back into the
// comma-separated text the editor input expects.
const optionsToText = (options) => (options || []).map((o) => o.label ?? o.value ?? "").join(", ");

// Turn the comma-separated editor text back into [{label, value}] options.
const textToOptions = (text) =>
  text.split(",").map((s) => s.trim()).filter(Boolean).map((v) => ({ label: v, value: v }));

// ── Mobile-only styles (desktop layout is untouched) ──────────
const DFB_CSS = `
@media (max-width: 700px) {
  .dfb-root { padding: 12px !important; width: 100%; max-width: 100vw !important; box-sizing: border-box; overflow-x: hidden; }
  .dfb-root h2 { font-size: 20px; }
  .dfb-root input, .dfb-root select, .dfb-root textarea {
    font-size: 16px !important;
    min-width: 0 !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
  }
  .dfb-row { flex-direction: column !important; gap: 10px !important; }
  .dfb-row > * { flex: none !important; width: 100% !important; }
  .dfb-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
  .dfb-qrow { flex-wrap: wrap !important; gap: 8px !important; }
  .dfb-qrow > span:first-child { display: none !important; }
  .dfb-qrow > span:nth-child(2) { flex: 1 1 100% !important; overflow-wrap: anywhere; }
  .dfb-arow { flex-wrap: wrap !important; gap: 8px !important; }
  .dfb-arow > div:first-child { flex: 1 1 100% !important; min-width: 0; overflow-wrap: anywhere; }
  .dfb-ahead, .dfb-actions { flex-wrap: wrap !important; gap: 8px !important; }
  .dfb-root button { min-height: 36px; }
}
`;

// ── Main DynamicFormBuilder ───────────────────────────────────
export default function DynamicFormBuilder() {
  const [projects, setProjects] = useState([]);
  const [allQuestions, setAllQuestions] = useState([]);

  // When opened from the New Entry page ("New Form"), the project and form
  // type arrive in the URL (?projectId=...&formType=...) and are preselected.
  const urlParams = new URLSearchParams(window.location.search);
  const urlProjectId = urlParams.get("projectId") || "";
  const urlFormType = urlParams.get("formType") || "";

  const [selectedProject, setSelectedProject] = useState(urlProjectId);
  // No hard-coded default form types any more — starts empty and is
  // auto-filled from the selected project's own forms.
  const [selectedFormType, setSelectedFormType] = useState(urlFormType);
  const [projectForms, setProjectForms] = useState([]); // forms already created for the selected project
  const [existingForm, setExistingForm] = useState(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formQuestions, setFormQuestions] = useState([]); // [{question:{...}, order, isMandatory, isVisible}]
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [newQ, setNewQ] = useState({ label: "", name: "", type: "text", optionsText: "", isMandatory: false });
  const [addingQ, setAddingQ] = useState(false);

  // ── Edit-in-place state for an existing question in the bank ──
  const [editingQId, setEditingQId] = useState(null);
  const [editQ, setEditQ] = useState({ label: "", type: "text", optionsText: "", isMandatory: false });
  const [savingEdit, setSavingEdit] = useState(false);

  // Only the form types that belong to the selected project:
  //  - enabledForms saved on the project
  //  - types of forms already created for it
  //  - the form type passed via URL (only for the project from the URL)
  const currentProject = projects.find((p) => p._id === selectedProject);
  const formTypeOptions = Array.from(
    new Set([
      ...(currentProject?.enabledForms || []),
      ...projectForms.map((f) => f.formType),
      ...(urlFormType && selectedProject === urlProjectId ? [urlFormType] : []),
    ].filter(Boolean))
  );
  const formTypeKey = formTypeOptions.join("|");

  useEffect(() => {
    api.get("/api/projects").then((r) => r.success && setProjects(r.data));
  }, []);

  // Load all forms already created for the selected project
  useEffect(() => {
    if (!selectedProject) { setProjectForms([]); return; }
    api.get(`/api/forms?projectId=${selectedProject}`).then((r) => {
      setProjectForms(r.success ? r.data : []);
    });
  }, [selectedProject]);

  // Keep selectedFormType valid for the current project:
  // if it's empty or doesn't belong to this project, pick the first one.
  useEffect(() => {
    if (!selectedProject) return;
    if (!selectedFormType || !formTypeOptions.includes(selectedFormType)) {
      setSelectedFormType(formTypeOptions[0] || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject, formTypeKey]);

  // Re-fetch the question bank whenever the form type changes, so only
  // relevant questions (+ 'Common' ones) show up automatically.
  useEffect(() => {
    if (!selectedFormType) { setAllQuestions([]); return; }
    api.get(`/api/questions?formType=${encodeURIComponent(selectedFormType)}`).then(
      (r) => r.success && setAllQuestions(r.data)
    );
  }, [selectedFormType]);

  // Load form when project+formType changes
  useEffect(() => {
    if (!selectedProject || !selectedFormType) return;
    setExistingForm(null);
    setFormQuestions([]);
    setFormTitle("");
    setFormDesc("");
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
    const needsOptions = needsOptionsFor(newQ.type);
    const options = needsOptions ? textToOptions(newQ.optionsText) : [];
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

  // ── Edit an existing question in the bank ──────────────────
  const startEdit = (q) => {
    setShowAddQuestion(false);
    setEditingQId(q._id);
    setEditQ({
      label: q.label,
      type: q.type,
      optionsText: optionsToText(q.options),
      isMandatory: !!q.isMandatory,
    });
  };

  const cancelEdit = () => setEditingQId(null);

  const saveEdit = async () => {
    if (!editQ.label.trim()) return setMsg({ type: "error", text: "Question label is required" });
    const needsOptions = needsOptionsFor(editQ.type);
    const options = needsOptions ? textToOptions(editQ.optionsText) : [];
    if (needsOptions && options.length === 0) {
      return setMsg({ type: "error", text: "Add at least one option (comma separated)" });
    }

    setSavingEdit(true);
    const res = await api.patch(`/api/questions/${editingQId}`, {
      label: editQ.label,
      type: editQ.type,
      isMandatory: editQ.isMandatory,
      options,
    });
    setSavingEdit(false);

    if (res.success) {
      // Keep the question bank AND any form that already uses this
      // question in sync, so the type/options change shows up everywhere
      // immediately without needing a page refresh.
      setAllQuestions((prev) => prev.map((q) => (q._id === editingQId ? res.data : q)));
      setFormQuestions((prev) =>
        prev.map((fq) => (fq.question._id === editingQId ? { ...fq, question: res.data } : fq))
      );
      setEditingQId(null);
      setMsg({ type: "success", text: "Question updated" });
    } else {
      setMsg({ type: "error", text: res.message || "Failed to update question" });
    }
  };

  // ── Delete a question from the bank entirely ───────────────
  const deleteQuestion = async (q) => {
    const ok = window.confirm(`Delete "${q.label}" from the question bank? This removes it from every form using it.`);
    if (!ok) return;
    const res = await api.delete(`/api/questions/${q._id}`);
    if (res.success) {
      setAllQuestions((prev) => prev.filter((x) => x._id !== q._id));
      setFormQuestions((prev) => prev.filter((fq) => fq.question._id !== q._id));
      if (editingQId === q._id) setEditingQId(null);
      setMsg({ type: "success", text: "Question deleted" });
    } else {
      setMsg({ type: "error", text: res.message || "Failed to delete question" });
    }
  };

  const saveForm = async () => {
    if (!selectedProject) return setMsg({ type: "error", text: "Please select a project first" });
    if (!selectedFormType) return setMsg({ type: "error", text: "No form type available for this project" });
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
      // keep the project's form list in sync so the dropdown stays correct
      setProjectForms((prev) =>
        prev.some((f) => f._id === res.data._id)
          ? prev.map((f) => (f._id === res.data._id ? res.data : f))
          : [...prev, res.data]
      );
    } else {
      setMsg({ type: "error", text: res.message || "Error saving form" });
    }
  };

  return (
    <div className="dfb-root" style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <style>{DFB_CSS}</style>
      <h2 style={{ marginBottom: 4 }}>🛠 Dynamic Form Builder</h2>
      <p style={{ color: "#666", marginBottom: 20 }}>
        Configure a form specific to this project — control question order, mandatory fields, and visibility.
      </p>

      {/* Project + FormType selector */}
      <div className="dfb-row" style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <select
          value={selectedProject}
          onChange={(e) => {
            setSelectedProject(e.target.value);
            setSelectedFormType(""); // reset so the new project's own form type gets picked
            setProjectForms([]);
          }}
          style={inputStyle}
        >
          <option value="">-- Project Select --</option>
          {projects.map((p) => (
            <option key={p._id} value={p._id}>{p.name}</option>
          ))}
        </select>
        {/* Form type dropdown only appears once a project is selected,
            and only lists forms that belong to that project */}
        {selectedProject && (
          <select
            value={selectedFormType}
            onChange={(e) => setSelectedFormType(e.target.value)}
            style={inputStyle}
          >
            {formTypeOptions.length === 0 && <option value="">-- No forms for this project --</option>}
            {formTypeOptions.map((ft) => <option key={ft} value={ft}>{ft}</option>)}
          </select>
        )}
      </div>

      {selectedProject && formTypeOptions.length === 0 && (
        <p style={{ color: "#999", fontStyle: "italic" }}>
          No forms have been created for this project yet. Create a new form from the New Entry page first.
        </p>
      )}

      {selectedProject && selectedFormType && (
        <>
          <div className="dfb-row" style={{ display: "flex", gap: 12, marginBottom: 16 }}>
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

          <div className="dfb-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* Form question list */}
            <div>
              <h4 style={{ marginBottom: 10 }}>
                Form Questions ({formQuestions.length})
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
                  onEdit={startEdit}
                />
              ))}
            </div>

            {/* Available questions to add */}
            <div>
              <div className="dfb-ahead" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <h4 style={{ margin: 0 }}>Available Questions ({availableQuestions.length})</h4>
                <button
                  onClick={() => { setShowAddQuestion((v) => !v); setEditingQId(null); }}
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
                  {needsOptionsFor(newQ.type) && (
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

              {/* Edit-in-place panel for an existing question */}
              {editingQId && (
                <div style={{ border: "1px solid #ffe0b2", background: "#fff8ec", borderRadius: 8, padding: 12, marginBottom: 14 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#a15c00", marginTop: 0, marginBottom: 8 }}>
                    Editing question
                  </p>
                  <input
                    placeholder="Question label"
                    value={editQ.label}
                    onChange={(e) => setEditQ((s) => ({ ...s, label: e.target.value }))}
                    style={{ ...inputStyle, width: "100%", marginBottom: 8, boxSizing: "border-box" }}
                  />
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <select
                      value={editQ.type}
                      onChange={(e) => setEditQ((s) => ({ ...s, type: e.target.value }))}
                      style={{ ...inputStyle, minWidth: 130 }}
                    >
                      {QUESTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
                      <input
                        type="checkbox"
                        checked={editQ.isMandatory}
                        onChange={(e) => setEditQ((s) => ({ ...s, isMandatory: e.target.checked }))}
                      />
                      Required
                    </label>
                  </div>
                  {needsOptionsFor(editQ.type) && (
                    <input
                      placeholder="Options, comma separated (e.g. Yes, No, Maybe)"
                      value={editQ.optionsText}
                      onChange={(e) => setEditQ((s) => ({ ...s, optionsText: e.target.value }))}
                      style={{ ...inputStyle, width: "100%", marginBottom: 8, boxSizing: "border-box" }}
                    />
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={saveEdit}
                      disabled={savingEdit}
                      style={{ padding: "6px 16px", background: "#1a73e8", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: 600 }}
                    >
                      {savingEdit ? "Saving…" : "Save Changes"}
                    </button>
                    <button
                      onClick={cancelEdit}
                      style={{ padding: "6px 16px", background: "#fff", color: "#333", border: "1px solid #ddd", borderRadius: 4, cursor: "pointer" }}
                    >
                      Cancel
                    </button>
                  </div>
                  <p style={{ fontSize: 11, color: "#a15c00", marginTop: 6, marginBottom: 0 }}>
                    Changing the type/options updates this question everywhere it's used, including in this form if already added.
                  </p>
                </div>
              )}

              {availableQuestions.map((q) => (
                <div
                  key={q._id}
                  className="dfb-arow"
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
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => addQuestion(q)}
                      style={{ padding: "3px 10px", background: "#1a73e8", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}
                    >
                      + Add
                    </button>
                    <button
                      onClick={() => startEdit(q)}
                      style={{ padding: "3px 10px", background: "#fff", color: "#1a73e8", border: "1px solid #1a73e8", borderRadius: 4, cursor: "pointer" }}
                      title="Edit this question"
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => deleteQuestion(q)}
                      style={{ padding: "3px 10px", background: "#fff", color: "#e53935", border: "1px solid #e53935", borderRadius: 4, cursor: "pointer" }}
                      title="Delete from question bank"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="dfb-actions" style={{ marginTop: 20, display: "flex", gap: 12, alignItems: "center" }}>
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