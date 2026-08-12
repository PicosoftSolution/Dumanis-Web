import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Power, Search, Users, Shield, Mail, Phone } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

export default function TeamMembers() {
  const { user } = useAuth();
  // Super Admin can still add a Lead/Team Member directly if needed, but the
  // day-to-day edit/deactivate controls belong to the Admin or Lead who
  // actually owns that person's project — keeping them out of Super Admin's
  // view avoids two people quietly managing the same account.
  const isSuperAdmin = user?.role === 'super_admin';
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    role: 'team_member',
    assignedProjects: []
  });

  const fetchData = async () => {
    setFetching(true);
    try {
      const [usersRes, projectsRes] = await Promise.all([
        api.get('/users'),
        api.get('/projects')
      ]);
      const allUsers = usersRes.data.data || [];
      setMembers(allUsers.filter(u => ['lead', 'team_member'].includes(u.role)));
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

  const filteredMembers = members
    .filter(m => roleFilter === 'all' || m.role === roleFilter)
    .filter(m => `${m.firstName} ${m.lastName} ${m.email}`.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleOpenModal = (member = null) => {
    if (member) {
      setEditingMember(member);
      setFormData({
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        password: '',
        phone: member.phone || '',
        role: member.role,
        assignedProjects: (member.assignedProjects || []).map(p => p._id || p)
      });
    } else {
      setEditingMember(null);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        phone: '',
        role: 'team_member',
        assignedProjects: []
      });
    }
    setShowModal(true);
  };

  const toggleProject = (projectId) => {
    setFormData(prev => ({
      ...prev,
      assignedProjects: prev.assignedProjects.includes(projectId)
        ? prev.assignedProjects.filter(id => id !== projectId)
        : [...prev.assignedProjects, projectId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast.error('Please fill all required fields');
      return;
    }
    if (!editingMember && !formData.password) {
      toast.error('Password is required for new members');
      return;
    }
    setLoading(true);
    try {
      if (editingMember) {
        await api.put(`/users/${editingMember._id}`, {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          assignedProjects: formData.assignedProjects
        });
        toast.success('Team member updated successfully');
      } else {
        await api.post('/users/create-team-member', {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          roleName: formData.role,
          assignedProjects: formData.assignedProjects
        });
        toast.success('Team member created successfully');
      }
      setShowModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save member');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (member) => {
    try {
      await api.patch(`/users/${member._id}/toggle-status`, { isActive: !member.isActive });
      toast.success(`Member ${!member.isActive ? 'activated' : 'deactivated'}`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Team Management</h1>
        <p className="text-gray-500 mt-1">Manage leads and team members</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex gap-3 flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search team members..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="all">All Roles</option>
              <option value="lead">Leads Only</option>
              <option value="team_member">Team Members Only</option>
            </select>
          </div>
          <button onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
            <Plus className="w-4 h-4" />
            <span>Add Team Member</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Member</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Projects</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {filteredMembers.map((member) => (
                <tr key={member._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${member.role === 'lead' ? 'bg-blue-100' : 'bg-green-100'}`}>
                        {member.role === 'lead' ? <Shield className="w-5 h-5 text-blue-600" /> : <Users className="w-5 h-5 text-green-600" />}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{member.firstName} {member.lastName}</p>
                        <p className="text-sm text-gray-500">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${member.role === 'lead' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                      {member.role === 'lead' ? 'Lead' : 'Team Member'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{member.assignedProjects?.length || 0} project(s)</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${member.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {member.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {isSuperAdmin ? (
                      <span className="text-xs text-gray-400 italic">Managed by their Admin/Lead</span>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => handleOpenModal(member)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => toggleStatus(member)} className={`p-2 rounded-lg ${member.isActive ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}>
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal - Keep same as before */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">{editingMember ? 'Edit Team Member' : 'Add Team Member'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Form fields - same as before */}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                  <input type="text" required value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                  <input type="text" required value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="team_member">Team Member</option>
                    <option value="lead">Lead</option>
                  </select>
                </div>
              </div>
              {!editingMember && (
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                  <input type="password" required value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              )}
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Assign Projects</label>
                <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {projects.map(project => (
                    <label key={project._id} className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={formData.assignedProjects.includes(project._id)} onChange={() => toggleProject(project._id)}
                        className="w-4 h-4 text-blue-600 rounded" />
                      <span className="text-sm text-gray-700">{project.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  {loading ? 'Saving...' : editingMember ? 'Update' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}