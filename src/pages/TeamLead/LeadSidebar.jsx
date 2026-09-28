import React from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  ClipboardList,
  BarChart3,
  LogOut,
  ChevronRight,
  PenSquare
} from 'lucide-react';
import logo from '../../assets/logo.jpg';

// Team Lead rights: Add Team Members, Edit Team Records, Entry,
// Review his / Team Records per Day / Week, Reports
const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'projects', label: 'My Projects', icon: FolderKanban },
  { key: 'team', label: 'My Team', icon: Users },
  { key: 'entries', label: 'Entries & Review', icon: ClipboardList },
  { key: 'reports', label: 'Reports', icon: BarChart3 },
];

export default function LeadSidebar({ active, onChange, user, onLogout }) {
  return (
    <div className="w-64 bg-gradient-to-b from-blue-900 to-blue-800 min-h-screen sticky top-0 flex flex-col shadow-xl">
      <div className="p-6 border-b border-blue-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg p-1.5">
            <img src={logo} alt="DUNAMIS logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg tracking-tight">DUNAMIS</h1>
            <p className="text-blue-200 text-xs">GeoSurvey Platform · Team Lead</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4">
        <Link
          to="/entry"
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all duration-200 border border-white/20"
        >
          <PenSquare className="w-5 h-5" />
          <span className="text-sm font-semibold">New Entry</span>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1 mt-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onChange(item.key)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
                ${isActive
                  ? 'bg-white text-blue-900 shadow-lg shadow-black/20'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'
                }
              `}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-blue-900' : 'text-blue-200 group-hover:text-white'}`} />
              <span className="text-sm font-medium">{item.label}</span>
              {isActive && <ChevronRight className="w-4 h-4 ml-auto text-blue-900" />}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10 mt-auto">
        <div className="flex items-center gap-3 mb-4 p-2 rounded-xl bg-white/5">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md">
            <span className="text-blue-900 font-semibold text-sm">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-blue-200 text-xs">Team Lead</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all duration-200 border border-white/20"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );
}