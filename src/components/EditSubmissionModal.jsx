import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { FormField } from '../pages/SuperAdmin/SurveyForm';

// Edit a submission's answers. Reuses the same question set (fetched from
// /forms/render/:projectId/:formType) and the same field renderer used when
// the entry was first filled in, so editing looks and behaves identically.
export default function EditSubmissionModal({ submission, onClose, onSaved }) {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [answers, setAnswers] = useState(submission?.data || {});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const projectId = submission?.project?._id || submission?.project;

  useEffect(() => {
    if (!projectId || !submission?.formType) return;
    setLoading(true);
    setLoadError(false);
    api.get(`/forms/render/${projectId}/${encodeURIComponent(submission.formType)}`)
      .then((res) => {
        if (res.data.success) setForm(res.data.data);
        else setLoadError(true);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [projectId, submission?.formType]);

  const handleChange = (fieldName, value) => {
    setAnswers((prev) => ({ ...prev, [fieldName]: value }));
    setErrors((prev) => ({ ...prev, [fieldName]: null }));
  };

  const validate = () => {
    const errs = {};
    (form?.questions || []).forEach((q) => {
      if (q.isMandatory) {
        const val = answers[q.fieldName];
        const isEmpty = val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0);
        if (isEmpty) errs[q.fieldName] = `${q.label} is required`;
      }
    });
    return errs;
  };

  const save = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSaving(true);
    try {
      await api.put(`/submissions/${submission._id}`, { data: answers });
      toast.success('Entry updated');
      onSaved && onSaved();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 14, width: '100%', maxWidth: 620,
        maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid #eee', position: 'sticky', top: 0, background: '#fff', zIndex: 1,
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Edit Entry</h3>
            <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#888' }}>
              {submission?.formType} {submission?.project?.name ? `· ${submission.project.name}` : ''}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6 }}>
            <X className="w-5 h-5" color="#666" />
          </button>
        </div>

        <div style={{ padding: 20 }}>
          {loading && <div style={{ padding: 24, textAlign: 'center', color: '#666' }}>Loading form...</div>}
          {!loading && loadError && (
            <div style={{ padding: 24, color: '#e53935' }}>
              Couldn't load the question list for this entry. Please try again.
            </div>
          )}
          {!loading && !loadError && form && (
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
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button
                  onClick={onClose}
                  style={{ flex: 1, padding: '11px', background: '#f2f2f2', color: '#444', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  style={{ flex: 2, padding: '11px', background: saving ? '#90caf9' : '#1a73e8', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: saving ? 'default' : 'pointer' }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
