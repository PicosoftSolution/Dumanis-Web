import React from 'react';
import {
  LayoutDashboard,
  FileText,
  LogOut,
  ShieldCheck,
  ChevronRight,
  PenSquare,
} from 'lucide-react';
import logo from '../../assets/logo.jpg';

// Intentionally minimal — a Team Member only has "Entry" and "review his own
// records per day/week" per the permissions matrix. No projects, no team
// management, no templates, no overall reports.
const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'entries', label: 'My Entries', icon: FileText },
];

export default function Sidebar({ active, onChange, user, onLogout }) {
  return (
    <div className="w-64 bg-gradient-to-b from-indigo-900 to-indigo-800 min-h-screen sticky top-0 flex flex-col shadow-xl">
      {/* Logo Section — same styling as the Admin & Super Admin portals */}
      <div className="p-6 border-b border-indigo-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg p-1.5">
            <img src={logo} alt="DUNAMIS logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg tracking-tight">DUNAMIS</h1>
            <p className="text-indigo-200 text-xs">GeoSurvey Platform · Team Member</p>
          </div>
        </div>
      </div>

      {/* Entry — quick access to fill a survey */}
      <div className="px-4 pt-4">
        <a
          href="/entry"
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all duration-200 border border-white/20"
        >
          <PenSquare className="w-5 h-5" />
          <span className="text-sm font-semibold">New Entry</span>
        </a>
      </div>

      {/* Navigation */}
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
                  ? 'bg-white text-indigo-900 shadow-lg shadow-black/20'
                  : 'text-indigo-100 hover:bg-white/10 hover:text-white'
                }
              `}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-900' : 'text-indigo-200 group-hover:text-white'}`} />
              <span className="text-sm font-medium">{item.label}</span>
              {isActive && (
                <ChevronRight className="w-4 h-4 ml-auto text-indigo-900" />
              )}
            </button>
          );
        })}
      </nav>

      {/* User Profile Section */}
      <div className="p-4 border-t border-white/10 mt-auto">
        <div className="flex items-center gap-3 mb-4 p-2 rounded-xl bg-white/5">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md">
            <span className="text-indigo-900 font-semibold text-sm">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-indigo-200 text-xs">Team Member</p>
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
