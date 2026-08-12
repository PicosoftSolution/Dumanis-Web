import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';

const usePermission = () => {
  const { user } = useAuth();
  const role = user?.role;

  return {
    can: (permission) => hasPermission(role, permission),

    canCreateAdmin:          hasPermission(role, 'CREATE_ADMIN'),
    canManageProjects:       hasPermission(role, 'MANAGE_PROJECTS'),
    canManageQuestionnaires: hasPermission(role, 'MANAGE_QUESTIONNAIRES'),
    canAddTeamMembers:       hasPermission(role, 'ADD_TEAM_MEMBERS'),
    canEditTeamRecords:      hasPermission(role, 'EDIT_TEAM_RECORDS'),
    canEntry:                hasPermission(role, 'ENTRY'),
    canViewOverallReports:   hasPermission(role, 'VIEW_OVERALL_REPORTS'),
    canViewTeamReports:      hasPermission(role, 'VIEW_TEAM_REPORTS'),
    canViewOwnRecords:       hasPermission(role, 'VIEW_OWN_RECORDS'),
    canDeleteUser:           hasPermission(role, 'DELETE_USER'),

    isSuperAdmin: role === 'super_admin',
    isAdmin:      role === 'admin',
    isLead:       role === 'lead',
    isTeamMember: role === 'team_member',

    role,
    user,
  };
};

export default usePermission;