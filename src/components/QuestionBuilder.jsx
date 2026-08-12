import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, GripVertical, MapPin, Crosshair, X, Move, Save } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const QUESTION_TYPES = [
  { value: 'text', label: 'Text Input', icon: '📝' },
  { value: 'number', label: 'Number', icon: '🔢' },
  { value: 'email', label: 'Email', icon: '📧' },
  { value: 'phone', label: 'Phone Number', icon: '📱' },
  { value: 'aadhaar', label: 'Aadhaar Number', icon: '🆔' },
  { value: 'date', label: 'Date Picker', icon: '📅' },
  { value: 'select', label: 'Dropdown Select', icon: '📋' },
  { value: 'radio', label: 'Radio Buttons', icon: '⚪' },
  { value: 'checkbox', label: 'Checkboxes', icon: '☑️' },
  { value: 'textarea', label: 'Text Area', icon: '📄' },
  { value: 'percentage', label: 'Percentage', icon: '📊' },
  { value: 'ratio', label: 'Ratio', icon: '⚖️' },
  { value: 'image', label: 'Image Upload', icon: '🖼️' },
  { value: 'location', label: 'Location Picker', icon: '📍' }
];

export default function QuestionBuilder({ form, onClose, onRefresh }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    label: '',
    name: '',
    type: 'text',
    required: false,
    placeholder: '',
    helpText: '',
    options: [],
    validation: { min: '', max: '', pattern: '' }
  });
  const [newOption, setNewOption] = useState('');

  // Fetch questions for this form
  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/questions?formId=${form._id}`);
      setQuestions(response.data.data || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [form._id]);

  const handleOpenQuestionModal = (question = null) => {
    if (question) {
      setEditingQuestion(question);
      setFormData({
        label: question.label,
        name: question.name,
        type: question.type,
        required: question.validation?.required || false,
        placeholder: question.placeholder || '',
        helpText: question.helpText || '',
        options: question.options || [],
        validation: question.validation || { min: '', max: '', pattern: '' }
      });
    } else {
      setEditingQuestion(null);
      setFormData({
        label: '',
        name: '',
        type: 'text',
        required: false,
        placeholder: '',
        helpText: '',
        options: [],
        validation: { min: '', max: '', pattern: '' }
      });
    }
    setShowQuestionModal(true);
  };

  const addOption = () => {
    if (newOption.trim()) {
      setFormData(prev => ({
        ...prev,
        options: [...prev.options, { label: newOption.trim(), value: newOption.trim().toLowerCase().replace(/\s/g, '_') }]
      }));
      setNewOption('');
    }
  };

  const removeOption = (index) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  const saveQuestion = async (e) => {
    e.preventDefault();
    if (!formData.label || !formData.name) {
      toast.error('Question label and name are required');
      return;
    }

    const questionData = {
      label: formData.label,
      name: formData.name,
      type: formData.type,
      formId: form._id,
      placeholder: formData.placeholder,
      helpText: formData.helpText,
      options: formData.options,
      validation: {
        required: formData.required,
        minLength: formData.validation.min,
        maxLength: formData.validation.max,
        pattern: formData.validation.pattern
      }
    };

    setSaving(true);
    try {
      if (editingQuestion) {
        await api.put(`/questions/${editingQuestion._id}`, questionData);
        toast.success('Question updated successfully');
      } else {
        await api.post('/questions', questionData);
        toast.success('Question added successfully');
      }
      setShowQuestionModal(false);
      fetchQuestions();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save question');
    } finally {
      setSaving(false);
    }
  };

  const deleteQuestion = async (question) => {
    if (window.confirm(`Delete "${question.label}"?`)) {
      try {
        await api.delete(`/questions/${question._id}`);
        toast.success('Question deleted');
        fetchQuestions();
      } catch (error) {
        toast.error('Failed to delete question');
      }
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            address: ''
          };
          toast.success('Location captured! Add to form as default value?');
          console.log('Location captured:', locationData);
        },
        (error) => toast.error('Unable to get location')
      );
    } else {
      toast.error('Geolocation not supported');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Manage Questions</h2>
            <p className="text-sm text-gray-500 mt-1">Form: {form.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <div className="flex gap-2">
            <button onClick={() => handleOpenQuestionModal()} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Add Question
            </button>
            <button onClick={getCurrentLocation} className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
              <MapPin className="w-4 h-4" /> Test Location
            </button>
          </div>
          <span className="text-sm text-gray-500">{questions.length} questions</span>
        </div>

        {/* Questions List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">Loading questions...</div>
          ) : questions.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <p className="text-gray-500">No questions yet. Click "Add Question" to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((q, index) => {
                const questionType = QUESTION_TYPES.find(t => t.value === q.type);
                return (
                  <div key={q._id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                          <span className="text-sm font-medium text-gray-500">Q{index + 1}</span>
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full flex items-center gap-1">
                            {questionType?.icon} {questionType?.label}
                          </span>
                          {q.validation?.required && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full">Required</span>
                          )}
                          {q.type === 'location' && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-600 text-xs rounded-full flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> Location
                            </span>
                          )}
                        </div>
                        <h4 className="font-medium text-gray-900">{q.label}</h4>
                        <p className="text-sm text-gray-500 mt-1">Field name: {q.name}</p>
                        {q.placeholder && <p className="text-xs text-gray-400 mt-1">Placeholder: {q.placeholder}</p>}
                        {q.options?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {q.options.map((opt, i) => (
                              <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{opt.label}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleOpenQuestionModal(q)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteQuestion(q)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
            Close
          </button>
        </div>
      </div>

      {/* Add/Edit Question Modal */}
      {showQuestionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-semibold text-gray-800">{editingQuestion ? 'Edit Question' : 'Add New Question'}</h2>
              <button onClick={() => setShowQuestionModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={saveQuestion} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question Label *</label>
                <input type="text" required value={formData.label} onChange={(e) => setFormData({...formData, label: e.target.value})}
                  placeholder="e.g., What is your name?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Field Name *</label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value.toLowerCase().replace(/\s/g, '_')})}
                  placeholder="e.g., full_name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question Type *</label>
                <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {QUESTION_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.icon} {type.label}</option>
                  ))}
                </select>
              </div>

              {/* Options for select/radio/checkbox */}
              {(formData.type === 'select' || formData.type === 'radio' || formData.type === 'checkbox') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Options</label>
                  <div className="space-y-2 mb-2">
                    {formData.options.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input type="text" value={opt.label} readOnly className="flex-1 px-3 py-1 border border-gray-300 rounded-lg bg-gray-50" />
                        <button type="button" onClick={() => removeOption(idx)} className="text-red-500 hover:text-red-700">✕</button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input type="text" value={newOption} onChange={(e) => setNewOption(e.target.value)} placeholder="New option"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg" />
                    <button type="button" onClick={addOption} className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">Add</button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Placeholder</label>
                <input type="text" value={formData.placeholder} onChange={(e) => setFormData({...formData, placeholder: e.target.value})}
                  placeholder="e.g., Enter your answer here"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Help Text</label>
                <input type="text" value={formData.helpText} onChange={(e) => setFormData({...formData, helpText: e.target.value})}
                  placeholder="Additional guidance for users"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" checked={formData.required} onChange={(e) => setFormData({...formData, required: e.target.checked})}
                  className="w-4 h-4 text-blue-600 rounded" />
                <label className="text-sm text-gray-700">Required field</label>
              </div>

              {/* Validation for text/number */}
              {(formData.type === 'text' || formData.type === 'number') && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Min Length/Value</label>
                    <input type="number" value={formData.validation.min} onChange={(e) => setFormData({...formData, validation: {...formData.validation, min: e.target.value}})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Max Length/Value</label>
                    <input type="number" value={formData.validation.max} onChange={(e) => setFormData({...formData, validation: {...formData.validation, max: e.target.value}})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                </div>
              )}

              {/* Location specific help */}
              {formData.type === 'location' && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-700 flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Location field will capture latitude, longitude, and address
                  </p>
                  <button type="button" onClick={getCurrentLocation} className="mt-2 text-sm text-blue-600 hover:underline flex items-center gap-1">
                    <Crosshair className="w-3 h-3" /> Test location capture
                  </button>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowQuestionModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Saving...' : editingQuestion ? 'Update Question' : 'Add Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}