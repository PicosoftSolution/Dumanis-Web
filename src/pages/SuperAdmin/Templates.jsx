import React, { useState, useEffect } from 'react';
import { Search, Layers, Eye, Pencil, X, Plus, Trash2, Save, Copy } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const TYPE_COLORS = {
  Survey: 'bg-blue-600',
  Application: 'bg-purple-600',
  Poll: 'bg-amber-600',
  Quiz: 'bg-rose-600',
};

const QUESTION_TYPES = ['text', 'textarea', 'number', 'date', 'email', 'single_choice', 'multi_choice', 'rating'];

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [editTemplate, setEditTemplate] = useState(null);

  const fetchTemplates = async (search = '') => {
    setLoading(true);
    try {
      const res = await api.get('/templates', { params: search ? { search } : {} });
      setTemplates(res.data.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchTemplates(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleDuplicate = async (id) => {
    try {
      await api.post(`/templates/${id}/duplicate`);
      toast.success('Template duplicated — edit your copy below');
      fetchTemplates(search);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to duplicate template');
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-blue-700 font-semibold text-sm mb-1">
          <Layers className="w-4 h-4" />
          SmartForms Templates to Design
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Here You Can View And Search Your Templates</h1>
      </div>

      <div className="relative max-w-md mb-8">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search templates by name, category, or description..."
          className="w-full h-11 pl-10 pr-4 border border-gray-200 rounded-xl text-sm bg-white
                     focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <Layers className="w-10 h-10 mx-auto mb-3 opacity-40" />
          No templates match your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {templates.map((t) => (
            <div key={t._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
              <h3 className="text-lg font-bold text-gray-900 mb-2">{t.title}</h3>
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className={`px-2.5 py-1 rounded-full text-white text-xs font-semibold ${TYPE_COLORS[t.type] || 'bg-gray-600'}`}>
                  {t.type}
                </span>
                <span className="text-gray-300">|</span>
                <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-xs font-semibold">
                  {t.category}
                </span>
              </div>
              <p className="text-sm text-gray-600 flex-1">{t.description}</p>
              <div className="text-xs text-gray-500 mt-4 space-y-0.5">
                <p><span className="font-semibold text-gray-700">Version:</span> {t.version}</p>
                <p><span className="font-semibold text-gray-700">Author:</span> {t.author}</p>
              </div>
              <div className="flex items-center gap-2 mt-5">
                <button
                  onClick={() => setPreviewTemplate(t)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 text-sm font-semibold rounded-full transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Preview
                </button>
                <button
                  onClick={() => setEditTemplate(t)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 text-sm font-semibold rounded-full transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => handleDuplicate(t._id)}
                  title="Duplicate this template"
                  className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {previewTemplate && (
        <PreviewModal template={previewTemplate} onClose={() => setPreviewTemplate(null)} />
      )}

      {editTemplate && (
        <EditModal
          template={editTemplate}
          onClose={() => setEditTemplate(null)}
          onSaved={(updated) => {
            setTemplates((prev) => prev.map((t) => (t._id === updated._id ? updated : t)));
            setEditTemplate(null);
          }}
        />
      )}
    </div>
  );
}

function PreviewModal({ template, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{template.title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600">{template.description}</p>
          <div className="space-y-3">
            {template.questions.map((q, i) => (
              <div key={i} className="border border-gray-100 rounded-xl p-3">
                <p className="text-sm font-medium text-gray-900">
                  {i + 1}. {q.label} {q.isMandatory && <span className="text-red-500">*</span>}
                </p>
                <p className="text-xs text-gray-400 mt-1 capitalize">{q.type.replace('_', ' ')}</p>
                {q.options?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {q.options.map((opt, j) => (
                      <span key={j} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{opt}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function EditModal({ template, onClose, onSaved }) {
  const [title, setTitle] = useState(template.title);
  const [description, setDescription] = useState(template.description);
  const [questions, setQuestions] = useState(
    template.questions.map((q) => ({ ...q, options: [...(q.options || [])] }))
  );
  const [saving, setSaving] = useState(false);

  const updateQuestion = (idx, patch) => {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  };

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      { label: '', name: `question_${prev.length + 1}`, type: 'text', options: [], isMandatory: false, order: prev.length + 1 },
    ]);
  };

  const removeQuestion = (idx) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateOptions = (idx, raw) => {
    const options = raw.split(',').map((s) => s.trim()).filter(Boolean);
    updateQuestion(idx, { options });
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (questions.some((q) => !q.label.trim())) {
      toast.error('Every question needs a label');
      return;
    }
    setSaving(true);
    try {
      const res = await api.put(`/templates/${template._id}`, {
        title,
        description,
        questions: questions.map((q, i) => ({ ...q, order: i + 1 })),
      });
      toast.success('Template saved');
      onSaved(res.data.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-gray-900">Edit Template</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-800">Questions</label>
              <button
                onClick={addQuestion}
                className="flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900"
              >
                <Plus className="w-3.5 h-3.5" /> Add question
              </button>
            </div>

            <div className="space-y-3">
              {questions.map((q, idx) => (
                <div key={idx} className="border border-gray-100 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      value={q.label}
                      onChange={(e) => updateQuestion(idx, { label: e.target.value })}
                      placeholder="Question label"
                      className="flex-1 h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    <select
                      value={q.type}
                      onChange={(e) => updateQuestion(idx, { type: e.target.value })}
                      className="h-9 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      {QUESTION_TYPES.map((t) => (
                        <option key={t} value={t}>{t.replace('_', ' ')}</option>
                      ))}
                    </select>
                    <button onClick={() => removeQuestion(idx)} className="p-2 text-gray-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {(q.type === 'single_choice' || q.type === 'multi_choice' || q.type === 'rating') && (
                    <input
                      value={(q.options || []).join(', ')}
                      onChange={(e) => updateOptions(idx, e.target.value)}
                      placeholder="Options, comma separated"
                      className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  )}

                  <label className="flex items-center gap-2 text-xs text-gray-600">
                    <input
                      type="checkbox"
                      checked={q.isMandatory}
                      onChange={(e) => updateQuestion(idx, { isMandatory: e.target.checked })}
                    />
                    Required
                  </label>
                </div>
              ))}
              {questions.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No questions yet — add one above.</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-800 hover:bg-blue-900 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving…' : 'Save Template'}
          </button>
        </div>
      </div>
    </div>
  );
}
