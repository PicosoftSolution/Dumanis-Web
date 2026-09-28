import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Power, Search, Users, Shield } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  phone: '',
  projectId: '' // one project per lead (backend rule)
};

// Admin creates Team Leads here (same design as the Team Members page).
// Each Lead then logs into the Team Lead portal and creates his/her own Team Members.
export default function TeamLeads() {
  const [showModal, setShowModal] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState([]);
  const [members, setMembers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const fetchData = async () => {
    setFetching(true);
    try {
      const [usersRes, projectsRes] = await Promise.all([
        api.get('/users'),
        api.get('/projects')
      ]);
      const allUsers = usersRes.data.data || [];
      setLeads(allUsers.filter(u => u.role === 'lead'));
      setMembers(allUsers.filter(u => u.role === 'team_member'));
      setProjects(projectsRes.data.data || []);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Number of team members created by a given lead
  const teamCount = (leadId) =>
    members.filter(m => (m.createdBy?._id || m.createdBy) === leadId).length;

  const filteredLeads = leads.filter(l =>
    `${l.firstName} ${l.lastName} ${l.email}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Lead's current project id (assignedProjects may be populated objects or ids)
  const getProjectId = (lead) => {
    const p = lead?.assignedProjects?.[0];
    return p?._id || p || '';
  };

  const handleOpenModal = (lead = null) => {
    if (lead) {
      setEditingLead(lead);
      setFormData({
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        password: '',
        phone: lead.phone || '',
        projectId: getProjectId(lead)
      });
    } else {
      setEditingLead(null);
      setFormData(EMPTY_FORM);
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast.error('Please fill all required fields');
      return;
    }
    if (!editingLead && !formData.password) {
      toast.error('Password is required for new team leads');
      return;
    }
    setLoading(true);
    try {
      let leadId = editingLead?._id;

      if (editingLead) {
        await api.put(`/users/${editingLead._id}`, {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone
        });
      } else {
        const res = await api.post('/users/create-team-member', {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          role: 'lead'
        });
        leadId = res.data.data._id;
      }

      // The backend ignores assignedProjects on create/update on purpose.
      // Projects are assigned through the dedicated assign endpoints.
      const oldProjectId = editingLead ? getProjectId(editingLead) : '';
      const newProjectId = formData.projectId;
      let projectError = null;

      if (newProjectId !== oldProjectId) {
        try {
          if (oldProjectId) {
            await api.delete(`/users/${leadId}/project/${oldProjectId}`);
          }
          if (newProjectId) {
            await api.post('/users/assign-to-project', {
              userIds: [leadId],
              projectId: newProjectId
            });
          }
        } catch (err) {
          projectError = err.response?.data?.message || 'Project assignment failed';
        }
      }

      if (projectError) {
        toast.error(`Lead saved, but project not assigned: ${projectError}`);
      } else {
        toast.success(editingLead ? 'Team lead updated successfully' : 'Team lead created successfully');
      }
      setShowModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save team lead');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (lead) => {
    const action = lead.isActive ? 'deactivate' : 'activate';
    if (!window.confirm(`Do you want to ${action} ${lead.firstName} ${lead.lastName}? Their team members will also be ${action}d.`)) return;
    try {
      await api.patch(`/users/${lead._id}/toggle-status`, { isActive: !lead.isActive });
      toast.success(`Team lead ${!lead.isActive ? 'activated' : 'deactivated'}`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-96 px-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-full overflow-x-hidden">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Team Leads</h1>
        <p className="text-gray-500 mt-1 text-sm sm:text-base">
          Manage team leads. Each lead manages their own team members ({leads.length} total)
        </p>
      </div>

      {/* Search / add bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4">
          <div className="flex flex-col xs:flex-row gap-3 flex-1">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search team leads..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <button onClick={() => handleOpenModal()}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg w-full sm:w-auto shrink-0">
            <Plus className="w-4 h-4" />
            <span>Add Team Lead</span>
          </button>
        </div>
      </div>

      {/* Leads list — stacked cards on mobile, table from sm up */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Mobile card list */}
        <div className="sm:hidden divide-y divide-gray-100">
          {filteredLeads.map((lead) => (
            <div key={lead._id} className="p-4 flex flex-col gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-blue-100">
                  < Users className="w-5 h-5 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{lead.firstName} {lead.lastName}</p>
                  <p className="text-sm text-gray-500 truncate">{lead.email}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-1 text-xs rounded-full font-medium bg-blue-100 text-blue-700">Lead</span>
                <span className={`px-2 py-1 text-xs rounded-full font-medium ${lead.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {lead.isActive ? 'Active' : 'Inactive'}
                </span>
                <span className="text-xs text-gray-500">{lead.assignedProjects?.length || 0} project(s)</span>
                <span className="text-xs text-gray-500">{teamCount(lead._id)} member(s)</span>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => handleOpenModal(lead)} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-lg">
                  <Edit2 className="w-4 h-4" /> Edit
                </button>
                <button onClick={() => toggleStatus(lead)} className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm rounded-lg border ${lead.isActive ? 'text-red-600 border-red-200 hover:bg-red-50' : 'text-green-600 border-green-200 hover:bg-green-50'}`}>
                  <Power className="w-4 h-4" /> {lead.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
          {filteredLeads.length === 0 && (
            <div className="px-4 py-12 text-center text-gray-500 text-sm">No team leads found</div>
          )}
        </div>

        {/* Table for sm and up */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Lead</th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Role</th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Projects</th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Team Members</th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Status</th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLeads.map((lead) => (
                <tr key={lead._id} className="hover:bg-gray-50">
                  <td className="px-4 md:px-6 py-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-blue-100">
                        < Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{lead.firstName} {lead.lastName}</p>
                        <p className="text-sm text-gray-500 truncate">{lead.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 md:px-6 py-4">
                    <span className="px-2 py-1 text-xs rounded-full font-medium whitespace-nowrap bg-blue-100 text-blue-700">Lead</span>
                  </td>
                  <td className="px-4 md:px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{lead.assignedProjects?.length || 0} project(s)</td>
                  <td className="px-4 md:px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{teamCount(lead._id)} member(s)</td>
                  <td className="px-4 md:px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium whitespace-nowrap ${lead.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {lead.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 md:px-6 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => handleOpenModal(lead)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg" title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => toggleStatus(lead)} title={lead.isActive ? 'Deactivate' : 'Activate'}
                        className={`p-2 rounded-lg ${lead.isActive ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}>
                        <Power className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    No team leads found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800">{editingLead ? 'Edit Team Lead' : 'Add Team Lead'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 shrink-0 ml-2">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                  <input type="text" required value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                  <input type="text" required value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select value="lead" disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600">
                    <option value="lead">Lead</option>
                  </select>
                </div>
              </div>
              {!editingLead && (
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                  <input type="password" required value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              )}
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Assign Project</label>
                <select value={formData.projectId} onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option value="">No project</option>
                  {projects.map(project => (
                    <option key={project._id} value={project._id}>{project.name}</option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-400 mt-1">A lead can be assigned to only one project.</p>
              </div>
              <div className="flex flex-col xs:flex-row gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {loading ? 'Saving...' : editingLead ? 'Update' : 'Add Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}