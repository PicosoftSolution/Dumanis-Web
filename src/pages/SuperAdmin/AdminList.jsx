import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Power, Search, Phone, User as UserIcon, RefreshCw, X, Mail, Lock, FolderKanban, Check } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function AdminList() {
  const [showModal, setShowModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [admins, setAdmins] = useState([]);
  const [projects, setProjects] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    assignedProjects: []
  });

  // Fetch admins + projects from API
  const fetchAdmins = async () => {
    setFetching(true);
    try {
      const [adminsRes, projectsRes] = await Promise.all([
        api.get('/users?role=admin'),
        api.get('/projects')
      ]);

      if (adminsRes.data.success) {
        setAdmins(adminsRes.data.data || []);
      } else {
        toast.error(adminsRes.data.message || 'Failed to fetch admins');
      }
      setProjects(projectsRes.data.data || []);
    } catch (error) {
      console.error('Error fetching admins:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch admins');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const toggleProject = (projectId) => {
    setFormData((prev) => ({
      ...prev,
      assignedProjects: prev.assignedProjects.includes(projectId)
        ? prev.assignedProjects.filter((id) => id !== projectId)
        : [...prev.assignedProjects, projectId]
    }));
  };

  const selectAllProjects = () => {
    setFormData((prev) => ({
      ...prev,
      assignedProjects: prev.assignedProjects.length === projects.length
        ? []
        : projects.map((p) => p._id)
    }));
  };

  const filteredAdmins = admins.filter(admin =>
    `${admin.firstName} ${admin.lastName} ${admin.email}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (admin = null) => {
    if (admin) {
      setEditingAdmin(admin);
      setFormData({
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        password: '',
        phone: admin.phone || '',
        assignedProjects: (admin.assignedProjects || []).map((p) => (typeof p === 'string' ? p : p._id))
      });
    } else {
      setEditingAdmin(null);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        phone: '',
        assignedProjects: []
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingAdmin) {
        await api.put(`/users/${editingAdmin._id}`, {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          assignedProjects: formData.assignedProjects,
          role: 'admin'
        });
        toast.success('Admin updated successfully');
      } else {
        await api.post('/users/create-admin', {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          assignedProjects: formData.assignedProjects
        });
        toast.success('Admin created successfully');
      }
      setShowModal(false);
      fetchAdmins(); // Refresh the list
    } catch (error) {
      console.error('Error saving admin:', error);
      toast.error(error.response?.data?.message || 'Failed to save admin');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (admin) => {
    try {
      await api.patch(`/users/${admin._id}/toggle-status`, {
        isActive: !admin.isActive
      });
      toast.success(`Admin ${!admin.isActive ? 'activated' : 'deactivated'} successfully`);
      fetchAdmins(); // Refresh the list
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admins...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Admin Management</h1>
          <p className="text-gray-500 mt-1">Manage all platform administrators</p>
        </div>
        <button
          onClick={fetchAdmins}
          className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="text-sm">Refresh</span>
        </button>
      </div>

      {/* Actions Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search admins by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Admin</span>
          </button>
        </div>
      </div>

      {/* Stats Card */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 mb-6 border border-purple-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-purple-600 font-medium">Total Admins</p>
            <p className="text-3xl font-bold text-gray-800">{admins.length}</p>
          </div>
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
            <UserIcon className="w-6 h-6 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Admins Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admin</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned Projects</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      {searchTerm ? 'No matching admins found' : 'No admins found. Click "Add New Admin" to create one.'}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((admin) => (
                  <tr key={admin._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <UserIcon className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {admin.firstName} {admin.lastName}
                          </p>
                          <p className="text-sm text-gray-500">{admin.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {admin.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="w-3 h-3" />
                            <span>{admin.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {admin.assignedProjects?.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {admin.assignedProjects.slice(0, 3).map((p) => (
                            <span key={p._id || p} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded-full">
                              {p.name || 'Project'}
                            </span>
                          ))}
                          {admin.assignedProjects.length > 3 && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
                              +{admin.assignedProjects.length - 3} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">No projects assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full font-medium
                        ${admin.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                      >
                        {admin.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenModal(admin)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Edit Admin"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleStatus(admin)}
                          className={`p-2 rounded-lg transition-colors
                            ${admin.isActive ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                          title={admin.isActive ? 'Deactivate' : 'Activate'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal — redesigned: compact, clean, single scroll */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  {editingAdmin ? 'Edit Admin' : 'New Admin'}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {editingAdmin ? 'Update admin details' : 'Create a new administrator account'}
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
              <div className="px-5 py-4 space-y-3.5 overflow-y-auto">
                {/* Name */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">First Name</label>
                    <input
                      type="text"
                      required
                      placeholder="John"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Last Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-colors"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="email"
                      required
                      placeholder="john@company.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-colors"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone <span className="text-gray-400 font-normal">(optional)</span></label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-colors"
                    />
                  </div>
                </div>

                {/* Password */}
                {!editingAdmin && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input
                        type="password"
                        required={!editingAdmin}
                        placeholder="Minimum 8 characters"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-colors"
                      />
                    </div>
                  </div>
                )}

                {/* Projects */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
                      <FolderKanban className="w-3.5 h-3.5 text-gray-400" />
                      Assign Projects
                    </label>
                    {projects.length > 0 && (
                      <button
                        type="button"
                        onClick={selectAllProjects}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700"
                      >
                        {formData.assignedProjects.length === projects.length ? 'Clear all' : 'Select all'}
                      </button>
                    )}
                  </div>

                  {projects.length === 0 ? (
                    <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2.5">
                      No projects yet. Create one first, then assign it here.
                    </p>
                  ) : (
                    <div className="space-y-0.5 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-1.5">
                      {projects.map((project) => {
                        const checked = formData.assignedProjects.includes(project._id);
                        return (
                          <label
                            key={project._id}
                            className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                              checked ? 'bg-blue-50' : 'hover:bg-gray-50'
                            }`}
                          >
                            <span
                              className={`w-4 h-4 shrink-0 flex items-center justify-center rounded border transition-colors ${
                                checked ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'
                              }`}
                            >
                              {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                            </span>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleProject(project._id)}
                              className="hidden"
                            />
                            <span className="text-sm text-gray-700 truncate">{project.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                  <p className="text-[11px] text-gray-400 mt-1">Select one, several, or all projects.</p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-2.5 px-5 py-4 border-t border-gray-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : editingAdmin ? 'Update Admin' : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}