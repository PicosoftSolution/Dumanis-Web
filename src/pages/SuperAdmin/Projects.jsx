import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Power, Search, Folder, MapPin, Calendar, CheckCircle, XCircle, X, Users, ClipboardList, Navigation } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import MapPicker from '../../components/MapPicker';

const FORM_TYPES = ['Residential', 'Commercial', 'Industrial', 'Institutional', 'Open Site', 'Apartment'];

export default function Projects() {
  const { user } = useAuth();
  // Both Super Admin and Admin can create/edit/activate-deactivate projects.
  // Admin only sees & manages the projects assigned to them (enforced server-side).
  const canManage = user?.role === 'super_admin' || user?.role === 'admin';
  // Only Super Admin can choose which Admin(s) a project is assigned to.
  const isSuperAdmin = user?.role === 'super_admin';
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    enabledForms: [],
    assignedAdminIds: [],
    location: { lat: '', lng: '', address: '' }
  });

  // Fetch projects from API
  const fetchProjects = async () => {
    setFetching(true);
    try {
      const response = await api.get('/projects');
      console.log('Projects API Response:', response.data);

      if (response.data.success) {
        setProjects(response.data.data || []);
      } else {
        toast.error('Failed to fetch projects');
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error(error.response?.data?.message || 'Failed to load projects');
    } finally {
      setFetching(false);
    }
  };

  // Fetch existing Admins so Super Admin can assign this project to one or more of them.
  const fetchAdmins = async () => {
    if (!isSuperAdmin) return;
    try {
      const response = await api.get('/users', { params: { role: 'admin' } });
      setAdmins(response.data.data || []);
    } catch (error) {
      console.error('Error fetching admins:', error);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchAdmins();
  }, []);

  const filteredProjects = projects.filter(project =>
    project.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (project = null) => {
    if (project) {
      setEditingProject(project);
      setFormData({
        name: project.name || '',
        description: project.description || '',
        startDate: project.startDate?.split('T')[0] || '',
        endDate: project.endDate?.split('T')[0] || '',
        enabledForms: project.enabledForms || [],
        assignedAdminIds: (project.assignedAdmins || []).map(a => a._id || a),
        location: project.location || { lat: '', lng: '', address: '' }
      });
    } else {
      setEditingProject(null);
      setFormData({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        enabledForms: [],
        assignedAdminIds: [],
        location: { lat: '', lng: '', address: '' }
      });
    }
    setShowModal(true);
  };

  const toggleAdmin = (adminId) => {
    setFormData(prev => ({
      ...prev,
      assignedAdminIds: prev.assignedAdminIds.includes(adminId)
        ? prev.assignedAdminIds.filter(id => id !== adminId)
        : [...prev.assignedAdminIds, adminId]
    }));
  };

  const toggleForm = (formName) => {
    setFormData(prev => ({
      ...prev,
      enabledForms: prev.enabledForms.includes(formName)
        ? prev.enabledForms.filter(f => f !== formName)
        : [...prev.enabledForms, formName]
    }));
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          // Try to get address from coordinates
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await response.json();
            setFormData(prev => ({
              ...prev,
              location: { lat, lng, address: data.display_name || '' }
            }));
            toast.success('Location captured successfully');
          } catch (error) {
            setFormData(prev => ({
              ...prev,
              location: { ...prev.location, lat, lng }
            }));
            toast.success('Location coordinates captured');
          }
        },
        (error) => {
          toast.error('Unable to get location. Please check permissions.');
        }
      );
    } else {
      toast.error('Geolocation is not supported by this browser.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Project name is required');
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      toast.error('Start date and end date are required');
      return;
    }
    setLoading(true);
    try {
      if (editingProject) {
        await api.put(`/projects/${editingProject._id}`, formData);
        toast.success('Project updated successfully');
      } else {
        await api.post('/projects', formData);
        toast.success('Project created successfully');
      }
      setShowModal(false);
      fetchProjects(); // Refresh the list
    } catch (error) {
      console.error('Error saving project:', error);
      toast.error(error.response?.data?.message || 'Failed to save project');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (project) => {
    try {
      await api.patch(`/projects/${project._id}/status`, { isActive: !project.isActive });
      toast.success(`Project ${!project.isActive ? 'activated' : 'deactivated'}`);
      fetchProjects();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
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
      <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isSuperAdmin ? 'Project Management' : canManage ? 'My Projects' : 'My Projects'}</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {isSuperAdmin
              ? `Create and manage all projects (${projects.length} total)`
              : canManage
                ? `Create and manage your projects (${projects.length} total)`
                : `Projects assigned to you (${projects.length} total)`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchProjects} className="text-sm text-gray-500 hover:text-blue-700 font-medium transition-colors">
            Refresh
          </button>
          {canManage && (
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white text-sm font-semibold rounded-xl shadow-sm shadow-blue-900/10 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>New Project</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <Folder className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            {canManage ? 'No projects found. Click "New Project" to create one.' : 'No projects assigned to you yet. Ask your Super Admin to assign a project.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <div key={project._id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Folder className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">{project.name}</h3>
                  </div>
                  {canManage && (
                    <div className="flex gap-1">
                      <button onClick={() => handleOpenModal(project)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => toggleStatus(project)} className={`p-1.5 rounded-lg ${project.isActive ? 'text-red-500 hover:bg-red-50' : 'text-green-500 hover:bg-green-50'}`}>
                        <Power className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {project.description && (
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{project.description}</p>
                )}

                {project.startDate && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(project.startDate).toLocaleDateString()} - {new Date(project.endDate).toLocaleDateString()}</span>
                  </div>
                )}

                {project.location?.address && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                    <MapPin className="w-3 h-3 text-red-500" />
                    <span className="truncate">{project.location.address}</span>
                  </div>
                )}

                {isSuperAdmin && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-2">Assigned Admin(s):</p>
                    <div className="flex flex-wrap gap-2">
                      {project.assignedAdmins?.length > 0 ? (
                        project.assignedAdmins.map(admin => (
                          <span key={admin._id} className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded-full">
                            {admin.firstName} {admin.lastName}
                          </span>
                        ))
                      ) : (
                        <span className="text-amber-600 text-sm">Not assigned to any Admin yet</span>
                      )}
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-2">Enabled Forms:</p>
                  <div className="flex flex-wrap gap-2">
                    {project.enabledForms?.length > 0 ? (
                      project.enabledForms.map(form => (
                        <span key={form} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                          {form}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-400 text-sm">No forms enabled</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${project.isActive ? 'text-green-600' : 'text-red-600'}`}>
                    {project.isActive ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {project.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-xs text-gray-400">ID: {project._id?.slice(-6)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Project Modal — redesigned: wider, sectioned, sticky header/footer, compact chip selectors */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[88vh] flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  {editingProject ? 'Edit Project' : 'Create New Project'}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {editingProject ? 'Update project details' : 'Fill in the details to set up a new project'}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="px-6 py-4 space-y-5 overflow-y-auto">

                {/* Basic info */}
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Project Name *</label>
                    <input
                      type="text" required value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-colors"
                      placeholder="e.g., Q4 Marketing Campaign"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows="2"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-colors resize-none"
                      placeholder="Brief description of the project..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Start Date *</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                        <input
                          type="date" required value={formData.startDate}
                          onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">End Date *</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                        <input
                          type="date" required value={formData.endDate}
                          onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="pt-1 border-t border-gray-100">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mt-4 mb-2">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    Location
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text" placeholder="Address"
                      value={formData.location.address}
                      onChange={(e) => setFormData({ ...formData, location: { ...formData.location, address: e.target.value } })}
                      className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-colors"
                    />
                    <button
                      type="button" onClick={getCurrentLocation}
                      title="Use current location"
                      className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors shrink-0"
                    >
                      <Navigation className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <input
                      type="text" placeholder="Latitude"
                      value={formData.location.lat}
                      onChange={(e) => setFormData({ ...formData, location: { ...formData.location, lat: e.target.value } })}
                      className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-colors"
                    />
                    <input
                      type="text" placeholder="Longitude"
                      value={formData.location.lng}
                      onChange={(e) => setFormData({ ...formData, location: { ...formData.location, lng: e.target.value } })}
                      className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-colors"
                    />
                  </div>
                  <div className="rounded-lg overflow-hidden border border-gray-200" style={{ height: '200px' }}>
                    <MapPicker
                      lat={formData.location.lat}
                      lng={formData.location.lng}
                      onChange={(la, ln) => setFormData({ ...formData, location: { ...formData.location, lat: la.toFixed(6), lng: ln.toFixed(6) } })}
                    />
                  </div>
                </div>

                {/* Assign Admins */}
                {isSuperAdmin && (
                  <div className="pt-1 border-t border-gray-100">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mt-4 mb-1">
                      <Users className="w-3.5 h-3.5 text-gray-400" />
                      Assign to Admin(s)
                    </label>
                    <p className="text-[11px] text-gray-400 mb-2">Only Super Admin can change this.</p>
                    {admins.length === 0 ? (
                      <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2.5">
                        No Admins found yet. Create one from Admin List first.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {admins.map(admin => {
                          const checked = formData.assignedAdminIds.includes(admin._id);
                          return (
                            <button
                              type="button"
                              key={admin._id}
                              onClick={() => toggleAdmin(admin._id)}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                                checked
                                  ? 'bg-purple-600 border-purple-600 text-white'
                                  : 'bg-white border-gray-200 text-gray-600 hover:border-purple-300'
                              }`}
                              title={admin.email}
                            >
                              {admin.firstName} {admin.lastName}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Enable Forms */}
                <div className="pt-1 border-t border-gray-100">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mt-4 mb-2">
                    <ClipboardList className="w-3.5 h-3.5 text-gray-400" />
                    Enable Forms
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {FORM_TYPES.map(form => {
                      const checked = formData.enabledForms.includes(form);
                      return (
                        <button
                          type="button"
                          key={form}
                          onClick={() => toggleForm(form)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                            checked
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300'
                          }`}
                        >
                          {form}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-2.5 px-6 py-4 border-t border-gray-100 shrink-0">
                <button
                  type="button" onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={loading}
                  className="flex-1 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : editingProject ? 'Update Project' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}