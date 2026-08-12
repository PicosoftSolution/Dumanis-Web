import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Auth pages
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import EntryPage from './pages/EntryPage';

// Dashboards
import SuperAdminDashboard from './pages/SuperAdmin/SuperAdminPortal';
import AdminDashboard from './pages/Admin/AdminPortal';
import LeadDashboard from './pages/Leaddashboard';
import TeamMemberDashboard from './pages/TeamMember/TeamMemberPortal';

// Super Admin pages
import SuperAdminAdmins from './pages/SuperAdmin/AdminList';
import SuperAdminProjects from './pages/SuperAdmin/Projects';
import SuperAdminTemplates from './pages/SuperAdmin/Templates';
import SuperAdminTeam from './pages/SuperAdmin/TeamMembers';
import SuperAdminEntries from './pages/SuperAdmin/Entries';
import SuperAdminReports from './pages/SuperAdmin/Reports';
import SuperAdminDynamicFormBuilder from './pages/SuperAdmin/DynamicFormBuilder';
import SuperAdminFormResponsesViewer from './pages/SuperAdmin/FormResponsesViewer';

// Dashboard routes
const getDashboardRoute = (role) => {
  switch (role) {
    case 'super_admin':
      return '/dashboard/super-admin';

    case 'admin':
      return '/dashboard/admin';

    case 'lead':
      return '/dashboard/lead';

    case 'team_member':
      return '/dashboard/team-member';

    default:
      return '/login';
  }
};

// Root redirect
const RootRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getDashboardRoute(user.role)} replace />;
};

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
      <Routes>

        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />

        {/* Super Admin Dashboard */}
        <Route
          path="/dashboard/super-admin/*"
          element={
            <ProtectedRoute allowedRoles={['super_admin']}>
              <SuperAdminDashboard />
            </ProtectedRoute>
          }
        >
          <Route index element={<SuperAdminAdmins />} />

          <Route path="admins" element={<SuperAdminAdmins />} />

          <Route path="projects" element={<SuperAdminProjects />} />
          <Route path="templates" element={<SuperAdminTemplates />} />

          <Route path="team" element={<SuperAdminTeam />} />

          <Route path="entries" element={<SuperAdminEntries />} />

          <Route path="reports" element={<SuperAdminReports />} />
          <Route path="dynamic-forms" element={<SuperAdminDynamicFormBuilder />} />
          <Route path="form-responses" element={<SuperAdminFormResponsesViewer />} />
        </Route>

        {/* Entry — every role can fill a survey for their assigned project(s) */}
        <Route
          path="/entry"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin', 'lead', 'team_member']}>
              <EntryPage />
            </ProtectedRoute>
          }
        />

        {/* Admin Dashboard */}
        <Route
          path="/dashboard/admin"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Lead Dashboard */}
        <Route
          path="/dashboard/lead"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin', 'lead']}>
              <LeadDashboard />
            </ProtectedRoute>
          }
        />

        {/* Team Member Dashboard */}
        <Route
          path="/dashboard/team-member"
          element={
            <ProtectedRoute
              allowedRoles={[
                'super_admin',
                'admin',
                'lead',
                'team_member',
              ]}
            >
              <TeamMemberDashboard />
            </ProtectedRoute>
          }
        />

        {/* Root */}
        <Route path="/" element={<RootRedirect />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App; 