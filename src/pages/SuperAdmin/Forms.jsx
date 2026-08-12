import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, FileText, Copy, Eye, CheckCircle, XCircle, ChevronRight, MapPin, Save, Grid, List } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import TemplateSelector from './TemplateSelector';
import QuestionBuilder from '../../components/QuestionBuilder';

const FORM_TYPES = [
  { value: 'residential', label: 'Residential Survey', icon: '🏠' },
  { value: 'commercial', label: 'Commercial Survey', icon: '🏢' },
  { value: 'industrial', label: 'Industrial Survey', icon: '🏭' },
  { value: 'institutional', label: 'Institutional Survey', icon: '🏫' },
  { value: 'opensite', label: 'Open Site Survey', icon: '🌳' },
  { value: 'apartment', label: 'Apartment Survey', icon: '🏘️' }
];

export default function Forms() {
  const [forms, setForms] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showQuestionsModal, setShowQuestionsModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [editingForm, setEditingForm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'commercial',
    projectId: ''
  });

  // Fetch all forms
  const fetchForms = async () => {
    setFetching(true);
    try {
      const response = await api.get('/forms');
      console.log('Forms API Response:', response.data);
      if (response.data.success) {
        setForms(response.data.data || []);
      } else {
        toast.error('Failed to fetch forms');
      }
    } catch (error) {
      console.error('Error fetching forms:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch forms');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchForms();
  }, []);

  // Filter forms by search term
  const filteredForms = forms.filter(form =>
    form.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Open create/edit modal
  const handleOpenModal = (form = null) => {
    if (form) {
      setEditingForm(form);
      setFormData({
        name: form.name,
        description: form.description || '',
        type: form.type,
        projectId: form.projectId?._id || form.projectId || ''
      });
    } else {
      setEditingForm(null);
      setFormData({
        name: '',
        description: '',
        type: 'commercial',
        projectId: ''
      });
    }
    setShowModal(true);
  };

  // Create or update form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.type) {
      toast.error('Form name and type are required');
      return;
    }
    
    setLoading(true);
    try {
      if (editingForm) {
        // UPDATE form
        const response = await api.put(`/forms/${editingForm._id}`, {
          name: formData.name,
          description: formData.description,
          type: formData.type
        });
        if (response.data.success) {
          toast.success('Form updated successfully');
        }
      } else {
        // CREATE form
        const response = await api.post('/forms', {
          name: formData.name,
          description: formData.description,
          type: formData.type,
          projectId: formData.projectId || null
        });
        if (response.data.success) {
          toast.success('Form created successfully');
        }
      }
      setShowModal(false);
      fetchForms(); // Refresh list
    } catch (error) {
      console.error('Error saving form:', error);
      toast.error(error.response?.data?.message || 'Failed to save form');
    } finally {
      setLoading(false);
    }
  };

  // Delete form (soft delete - set isActive false)
  const deleteForm = async (form) => {
    if (window.confirm(`Are you sure you want to delete "${form.name}"?`)) {
      try {
        const response = await api.delete(`/forms/${form._id}`);
        if (response.data.success) {
          toast.success('Form deleted successfully');
          fetchForms();
        }
      } catch (error) {
        console.error('Error deleting form:', error);
        toast.error(error.response?.data?.message || 'Failed to delete form');
      }
    }
  };

  // Publish/Unpublish form
  const togglePublish = async (form) => {
    try {
      const response = await api.put(`/forms/${form._id}/publish`, {
        isPublished: !form.isPublished
      });
      if (response.data.success) {
        toast.success(`Form ${!form.isPublished ? 'published' : 'unpublished'}`);
        fetchForms();
      }
    } catch (error) {
      console.error('Error publishing form:', error);
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  // Duplicate form
  const duplicateForm = async (form) => {
    try {
      const response = await api.post(`/forms/${form._id}/duplicate`, {
        name: `${form.name} (Copy)`
      });
      if (response.data.success) {
        toast.success('Form duplicated successfully');
        fetchForms();
      }
    } catch (error) {
      console.error('Error duplicating form:', error);
      toast.error(error.response?.data?.message || 'Failed to duplicate form');
    }
  };

  // Open questions manager
  const openQuestions = (form) => {
    setSelectedForm(form);
    setShowQuestionsModal(true);
  };

  // Open template selector
  const openTemplateSelector = () => {
    setShowTemplateModal(true);
  };

  // Handle template selection
  const handleTemplateSelect = async (template) => {
    setLoading(true);
    try {
      const response = await api.post('/forms', {
        name: template.name,
        description: template.description,
        type: template.category,
        projectId: null
      });
      if (response.data.success) {
        toast.success(`Form created from "${template.name}" template`);
        setShowTemplateModal(false);
        fetchForms();
      }
    } catch (error) {
      console.error('Error creating form from template:', error);
      toast.error(error.response?.data?.message || 'Failed to create form from template');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Form Management</h1>
          <p className="text-gray-500 mt-1">Create and manage survey forms ({forms.length} total)</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={openTemplateSelector} 
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            <Grid className="w-4 h-4" />
            <span>Use Template</span>
          </button>
          <button 
            onClick={() => handleOpenModal()} 
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Form</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search forms by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setViewMode('grid')} 
              className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setViewMode('list')} 
              className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Forms List */}
      {filteredForms.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No forms found. Click "Create Form" or "Use Template" to get started.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredForms.map((form) => {
            const formType = FORM_TYPES.find(t => t.value === form.type);
            return (
              <div key={form._id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{formType?.icon || '📋'}</span>
                      <h3 className="font-semibold text-gray-900">{form.name}</h3>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleOpenModal(form)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg" title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => duplicateForm(form)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg" title="Duplicate">
                        <Copy className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteForm(form)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {form.description && (
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{form.description}</p>
                  )}
                  
                  <div className="mb-4 flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">{formType?.label}</span>
                    <span 
                      onClick={() => togglePublish(form)}
                      className={`cursor-pointer px-2 py-1 text-xs rounded-full flex items-center gap-1 ${
                        form.isPublished ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {form.isPublished ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {form.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-500">
                      <FileText className="w-3 h-3 inline mr-1" />
                      {form.submissionCount || 0} submissions
                    </span>
                    <button 
                      onClick={() => openQuestions(form)}
                      className="text-blue-600 text-sm hover:underline flex items-center gap-1"
                    >
                      Manage Questions <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submissions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredForms.map((form) => {
                const formType = FORM_TYPES.find(t => t.value === form.type);
                return (
                  <tr key={form._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{formType?.icon || '📋'}</span>
                        <span className="font-medium text-gray-900">{form.name}</span>
                      </div>
                      {form.description && <p className="text-xs text-gray-500 mt-1">{form.description}</p>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formType?.label}</td>
                    <td className="px-6 py-4">
                      <button onClick={() => togglePublish(form)} className="flex items-center gap-1">
                        <span className={`px-2 py-1 text-xs rounded-full ${form.isPublished ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {form.isPublished ? 'Published' : 'Draft'}
                        </span>
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{form.submissionCount || 0}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button onClick={() => handleOpenModal(form)} className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
                        <button onClick={() => openQuestions(form)} className="text-green-600 hover:text-green-800 text-sm">Questions</button>
                        <button onClick={() => duplicateForm(form)} className="text-purple-600 hover:text-purple-800 text-sm">Duplicate</button>
                        <button onClick={() => deleteForm(form)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">{editingForm ? 'Edit Form' : 'Create New Form'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Form Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Customer Satisfaction Survey"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows="3"
                  placeholder="Brief description of this form..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Form Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {FORM_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.icon} {type.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Saving...' : editingForm ? 'Update Form' : 'Create Form'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Template Selector Modal */}
      {showTemplateModal && (
        <TemplateSelector 
          onSelect={handleTemplateSelect}
          onClose={() => setShowTemplateModal(false)}
        />
      )}

      {/* Questions Manager Modal */}
      {showQuestionsModal && selectedForm && (
        <QuestionBuilder 
          form={selectedForm}
          onClose={() => setShowQuestionsModal(false)}
          onRefresh={fetchForms}
        />
      )}
    </div>
  );
}