import React from 'react';
import { useAuth } from '../../shared/context/AuthContext';
import { Sun, LogOut, User } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();

  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'Admin/Owner':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Sales':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Warehouse':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Technician':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Support':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-40 px-6 py-3.5 shadow-sm">
      <div className="flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm">
            <Sun className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold text-slate-900 tracking-tight text-base">SunPower Solutions</span>
            <span className="text-[11px] text-slate-500 font-medium block">Commercial Solar Installation Management</span>
          </div>
        </div>

        {/* User Badge & Logout */}
        {user && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-full py-1.5 px-3.5 shadow-sm">
              <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <User className="h-3.5 w-3.5" />
              </div>
              <div className="text-left">
                <span className="text-xs font-semibold text-slate-800 block leading-none">{user.fullName || user.email}</span>
                <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${getRoleBadgeStyle(user.role)}`}>
                  {user.role}
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="h-9 w-9 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition shadow-sm"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

