import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const getDashboardRoute = (role) => {
  switch (role) {
    case 'super_admin': return '/pages/SuperAdmin/Dashboard';
    case 'admin':       return '/dashboard/admin';
    case 'lead':        return '/dashboard/lead';
    default:            return '/dashboard/team-member';
  }
};

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();
  const token = localStorage.getItem('token');

  if (loading) return null;
  if (!token || !user) return <Navigate to="/login" replace />;
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to={getDashboardRoute(user.role)} replace />;
  }

  return children;
};

export default ProtectedRoute;