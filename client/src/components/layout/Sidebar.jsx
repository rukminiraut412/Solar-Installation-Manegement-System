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
  UserCog,
  Lock,
} from 'lucide-react';

export default function Sidebar({ activeTab, onSelectTab }) {
  const { user } = useAuth();
  const role = user?.role;

  const NAV_ITEMS = [
    {
      id: 'dashboard',
      label: 'Business Overview',
      icon: LayoutDashboard,
      roles: ['Admin/Owner', 'Sales', 'Warehouse', 'Technician', 'Support'],
    },
    {
      id: 'customers',
      label: 'Customer Directory',
      icon: Users,
      roles: ['Admin/Owner', 'Sales', 'Warehouse', 'Technician', 'Support'],
    },
    {
      id: 'leads',
      label: 'Leads & Enquiries',
      icon: Users,
      roles: ['Admin/Owner', 'Sales', 'Support'],
    },
    {
      id: 'quotes',
      label: 'Surveys & Quotes',
      icon: FileSpreadsheet,
      roles: ['Admin/Owner', 'Sales'],
    },
    {
      id: 'jobs',
      label: 'Rooftop Jobs',
      icon: Wrench,
      roles: ['Admin/Owner', 'Sales', 'Warehouse', 'Technician', 'Support'],
    },
    {
      id: 'inventory',
      label: 'Inventory & Stock',
      icon: Boxes,
      roles: ['Admin/Owner', 'Warehouse', 'Sales'],
    },
    {
      id: 'tickets',
      label: 'Customer Support',
      icon: LifeBuoy,
      roles: ['Admin/Owner', 'Support', 'Technician'],
    },
    {
      id: 'users',
      label: 'User Management',
      icon: UserCog,
      roles: ['Admin/Owner'],
    },
    {
      id: 'finance',
      label: 'Financial Margins',
      icon: BadgeIndianRupee,
      roles: ['Admin/Owner'],
      confidential: true,
    },
    {
      id: 'audit',
      label: 'Security & Audit Logs',
      icon: ShieldCheck,
      roles: ['Admin/Owner'],
    },
  ];

  return (
    <aside className="w-64 border-r border-slate-200 bg-white flex flex-col justify-between p-4 shrink-0 shadow-sm">
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
                title={`Restricted to: ${item.roles.join(', ')}`}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs text-slate-400 bg-slate-50/60 cursor-not-allowed select-none border border-transparent"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-4 w-4 text-slate-300" />
                  <span>{item.label}</span>
                </div>
                <Lock className="h-3.5 w-3.5 text-slate-300" />
              </div>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </div>
              {item.confidential && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                  isActive ? 'bg-emerald-800 text-white' : 'bg-purple-100 text-purple-700'
                }`}>
                  ADMIN
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-2xl text-[11px] text-slate-600">
        <div className="font-semibold text-emerald-800 mb-1 flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          Enterprise Verified
        </div>
        Role-based permissions and solar workflow steps enforced across modules.
      </div>
    </aside>
  );
}

