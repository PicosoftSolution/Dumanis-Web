import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const ROLE_LABELS = {
  master_admin: 'Master Admin',
  project_manager: 'Project Manager',
  project_lead: 'Project Lead',
  team_lead: 'Team Lead',
  team_member: 'Team Member',
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const isAdminOrPM = user && ['master_admin', 'project_manager'].includes(user.role);
  const isAdmin = user && user.role === 'master_admin';
  const canFill = user && ['master_admin', 'project_manager', 'team_lead', 'team_member'].includes(user.role);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', label: 'Dashboard', show: true },
    { to: '/projects', label: 'Projects', show: true },
    { to: '/submissions', label: 'Submissions', show: true },
    { to: '/survey', label: 'Fill Survey', show: canFill },
    { to: '/questions', label: 'Question Bank', show: isAdminOrPM },
    { to: '/users', label: 'Users', show: isAdminOrPM },
  ];

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`fixed z-30 inset-y-0 left-0 w-64 bg-primary-900 text-white transform transition-transform duration-200
        ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:flex md:flex-col`}
      >
        <div className="p-5 border-b border-primary-800">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary-600 flex items-center justify-center font-bold">DG</div>
            <div>
              <p className="font-semibold leading-tight">DUNAMIS GeoSurvey</p>
              <p className="text-xs text-primary-300">AI-Powered GIS &amp; Field Intelligence</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems
            .filter((i) => i.show)
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `block px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                    isActive ? 'bg-primary-600 text-white' : 'text-primary-100 hover:bg-primary-800'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
        </nav>
        <div className="p-4 border-t border-primary-800">
          <p className="text-sm font-medium">{user?.name}</p>
          <p className="text-xs text-primary-300 mb-3">{ROLE_LABELS[user?.role] || user?.role}</p>
          <button
            onClick={handleLogout}
            className="w-full text-sm bg-primary-800 hover:bg-red-600 transition rounded-lg py-2"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {open && (
        <div className="fixed inset-0 bg-black/40 z-20 md:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white shadow-sm border-b px-4 py-3 flex items-center justify-between md:justify-end">
          <button className="md:hidden text-gray-600" onClick={() => setOpen(true)}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="text-sm text-gray-600">
            Welcome, <span className="font-semibold text-gray-800">{user?.name}</span>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
