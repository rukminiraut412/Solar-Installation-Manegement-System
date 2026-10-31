import React from 'react';
import { useAuth } from '../../shared/context/AuthContext';
import { Sun, LogOut, User, ShieldCheck } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();

  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'Admin/Owner':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'Sales':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'Warehouse':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'Technician':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'Support':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-40 px-6 py-3.5">
      <div className="flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Sun className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold text-white tracking-tight text-base">SunPower Solutions</span>
            <span className="text-[11px] text-slate-400 font-mono block">Platform Foundation Monolith</span>
          </div>
        </div>

        {/* User Badge & Logout */}
        {user && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5 bg-slate-900 border border-slate-800 rounded-full py-1.5 px-3.5">
              <div className="h-6 w-6 rounded-full bg-slate-800 text-amber-400 flex items-center justify-center">
                <User className="h-3.5 w-3.5" />
              </div>
              <div className="text-left">
                <span className="text-xs font-semibold text-white block leading-none">{user.fullName || user.email}</span>
                <span className={`inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-mono border ${getRoleBadgeStyle(user.role)}`}>
                  {user.role}
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="h-9 w-9 flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-500/10 transition"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
