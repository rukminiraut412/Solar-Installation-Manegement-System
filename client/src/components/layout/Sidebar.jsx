import React from 'react';
import { useAuth } from '../../shared/context/AuthContext';
import {
  LayoutDashboard,
  Users,
  FileSpreadsheet,
  Wrench,
  Boxes,
  LifeBuoy,
  BadgeIndianRupee,
  ShieldCheck,
  Lock,
} from 'lucide-react';

export default function Sidebar({ activeTab, onSelectTab }) {
  const { user } = useAuth();
  const role = user?.role;

  const NAV_ITEMS = [
    {
      id: 'dashboard',
      label: 'Platform Overview',
      icon: LayoutDashboard,
      roles: ['Admin/Owner', 'Sales', 'Warehouse', 'Technician', 'Support'],
    },
    {
      id: 'leads',
      label: 'Leads & Enquiries',
      icon: Users,
      roles: ['Admin/Owner', 'Sales', 'Support'],
      owner: 'M2',
    },
    {
      id: 'quotes',
      label: 'Surveys & Quotes',
      icon: FileSpreadsheet,
      roles: ['Admin/Owner', 'Sales'],
      owner: 'M2',
    },
    {
      id: 'jobs',
      label: 'Rooftop Jobs',
      icon: Wrench,
      roles: ['Admin/Owner', 'Sales', 'Warehouse', 'Technician', 'Support'],
      owner: 'M3',
    },
    {
      id: 'inventory',
      label: 'Inventory & Serials',
      icon: Boxes,
      roles: ['Admin/Owner', 'Warehouse', 'Sales'],
      owner: 'M3',
    },
    {
      id: 'tickets',
      label: 'Support Tickets',
      icon: LifeBuoy,
      roles: ['Admin/Owner', 'Support', 'Technician'],
      owner: 'M4',
    },
    {
      id: 'finance',
      label: 'Financial Margins',
      icon: BadgeIndianRupee,
      roles: ['Admin/Owner'], // CONFIDENTIAL
      owner: 'M4',
      confidential: true,
    },
    {
      id: 'audit',
      label: 'Security & Audit Logs',
      icon: ShieldCheck,
      roles: ['Admin/Owner'],
      owner: 'M1',
    },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-950 flex flex-col justify-between p-4 shrink-0">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Navigation &bull; {role}
        </div>

        {NAV_ITEMS.map((item) => {
          const isAllowed = item.roles.includes(role);
          const isActive = activeTab === item.id;

          if (!isAllowed) {
            return (
              <div
                key={item.id}
                title={`Restricted: Requires ${item.roles.join(', ')} role`}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs text-slate-600 opacity-50 cursor-not-allowed select-none"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </div>
                <Lock className="h-3 w-3 text-slate-700" />
              </div>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className={`h-4 w-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.confidential && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                  isActive ? 'bg-slate-950 text-amber-400' : 'bg-purple-500/20 text-purple-300'
                }`}>
                  ADMIN
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-2xl text-[11px] text-slate-400">
        <div className="font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          RBAC Active
        </div>
        Row-level security &amp; scope filtering enforced by Platform Foundation.
      </div>
    </aside>
  );
}
