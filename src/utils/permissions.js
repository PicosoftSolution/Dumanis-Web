// ─────────────────────────────────────────────────────────────
// src/utils/permissions.js
// Central place for ALL role & permission logic in the frontend
// ─────────────────────────────────────────────────────────────

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  LEAD: 'lead',
  TEAM_MEMBER: 'team_member',
};

// Role display labels (for UI)
export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  lead: 'Lead',
  team_member: 'Team Member',
};

// Role badge colors (Tailwind classes)
export const ROLE_COLORS = {
  super_admin: 'bg-yellow-100 text-yellow-800',
  admin: 'bg-orange-100 text-orange-800',
  lead: 'bg-blue-100 text-blue-800',
  team_member: 'bg-green-100 text-green-800',
};

// ─────────────────────────────────────────────────────────────
// PERMISSIONS MAP — matches backend exactly
// ─────────────────────────────────────────────────────────────
export const PERMISSIONS = {
  // Only super_admin can create admin accounts
  CREATE_ADMIN: [ROLES.SUPER_ADMIN],

  // super_admin + admin can create/manage projects
  MANAGE_PROJECTS: [ROLES.SUPER_ADMIN, ROLES.ADMIN],

  // super_admin + admin can create/manage questionnaires
  MANAGE_QUESTIONNAIRES: [ROLES.SUPER_ADMIN, ROLES.ADMIN],

  // super_admin + admin + lead can add team members
  ADD_TEAM_MEMBERS: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LEAD],

  // super_admin + admin + lead can edit team records
  EDIT_TEAM_RECORDS: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LEAD],

  // All roles can do entry
  ENTRY: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LEAD, ROLES.TEAM_MEMBER],

  // super_admin + admin can view overall reports (Day/Week/Overall)
  VIEW_OVERALL_REPORTS: [ROLES.SUPER_ADMIN, ROLES.ADMIN],

  // super_admin + admin + lead can view team reports (Day/Week)
  VIEW_TEAM_REPORTS: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LEAD],

  // All roles can view their own records
  VIEW_OWN_RECORDS: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LEAD, ROLES.TEAM_MEMBER],

  // Only super_admin can delete/deactivate users
  DELETE_USER: [ROLES.SUPER_ADMIN],
};

// ─────────────────────────────────────────────────────────────
// Helper function: check if a role has a permission
// ─────────────────────────────────────────────────────────────
export const hasPermission = (userRole, permission) => {
  if (!userRole || !PERMISSIONS[permission]) return false;
  return PERMISSIONS[permission].includes(userRole);
};

// ─────────────────────────────────────────────────────────────
// Dashboard redirect — which dashboard to show after login
// ─────────────────────────────────────────────────────────────
export const getDashboardRoute = (role) => {
  switch (role) {
    case ROLES.SUPER_ADMIN:
      return '/pages/SuperAdmin/Dashboard';
    case ROLES.ADMIN:
      return '/dashboard/admin';
    case ROLES.LEAD:
      return '/dashboard/lead';
    case ROLES.TEAM_MEMBER:
    default:
      return '/dashboard/team-member';
  }
};