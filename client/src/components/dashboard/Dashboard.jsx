import React from 'react';
import { useAuth } from '../../shared/context/AuthContext';
import {
  ShieldCheck,
  Database,
  Key,
  Layers,
  CheckCircle2,
  Lock,
  Eye,
  Activity,
  Users,
} from 'lucide-react';

export default function Dashboard({ activeTab }) {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-slate-800 p-8 shadow-xl">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-4">
            <ShieldCheck className="h-3.5 w-3.5" /> Authenticated Role: {user?.role}
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Welcome back, <span className="text-amber-400">{user?.fullName || user?.email}</span>
          </h1>
          <p className="mt-2 text-sm text-slate-400 leading-relaxed">
            Connected to SunPower Solutions Modular Monolith. All operations and API requests are protected by
            role-based access control and row-level scope enforcement.
          </p>
        </div>
      </div>

      {/* Role Scopes & Security Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4">
            <Key className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-white text-base">JWT Lifecycle &amp; Rotation</h3>
          <p className="mt-2 text-xs text-slate-400 leading-relaxed">
            15-minute access token automatically refreshed via 7-day cryptographically rotated refresh tokens with reuse protection.
          </p>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
            <CheckCircle2 className="h-4 w-4" /> Active &amp; Verified
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
            <Layers className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-white text-base">Row-Level Scope Filtering</h3>
          <p className="mt-2 text-xs text-slate-400 leading-relaxed">
            Backend queries automatically scoped to your role. Cross-tenant or unauthorized record access is blocked at PostgreSQL level.
          </p>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-blue-400 font-semibold">
            <ShieldCheck className="h-4 w-4" /> {user?.role === 'Admin/Owner' ? 'Unrestricted (Admin)' : 'Scoped to User ID'}
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
            <Database className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-white text-base">PostgreSQL Audit Engine</h3>
          <p className="mt-2 text-xs text-slate-400 leading-relaxed">
            All logins, token refreshes, and administrative mutations are immutably logged to the <code className="text-amber-400 font-mono">audit_logs</code> table.
          </p>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
            <Activity className="h-4 w-4" /> Real-time Logging Active
          </div>
        </div>
      </div>

      {/* Role Visibility Demonstration Table */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-base font-bold text-white mb-1">Role Permission &amp; Confidential Data Demo</h3>
        <p className="text-xs text-slate-400 mb-4">
          Shows how Platform Foundation protects confidential data (profit margins, technician payroll rates) based on the current session.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Project / Job</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Quoted Total</th>
                <th className="py-3 px-4">Assigned Tech</th>
                <th className="py-3 px-4">Profit Margin (Admin Only)</th>
                <th className="py-3 px-4">Access Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              <tr>
                <td className="py-3.5 px-4 font-mono text-amber-400 font-semibold">JOB-2026-001</td>
                <td className="py-3.5 px-4">Ramesh Patel (3 kW On-Grid)</td>
                <td className="py-3.5 px-4 font-semibold text-white">₹1,50,000</td>
                <td className="py-3.5 px-4">Vikram Singh</td>
                <td className="py-3.5 px-4">
                  {user?.role === 'Admin/Owner' ? (
                    <span className="text-emerald-400 font-bold font-mono">₹38,500 (25.6%)</span>
                  ) : (
                    <span className="text-slate-500 italic flex items-center gap-1">
                      <Lock className="h-3 w-3" /> Confidential
                    </span>
                  )}
                </td>
                <td className="py-3.5 px-4">
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Authorized
                  </span>
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-mono text-amber-400 font-semibold">JOB-2026-002</td>
                <td className="py-3.5 px-4">Meera Joshi (5 kW Off-Grid)</td>
                <td className="py-3.5 px-4 font-semibold text-white">₹2,80,000</td>
                <td className="py-3.5 px-4">Crew Team A</td>
                <td className="py-3.5 px-4">
                  {user?.role === 'Admin/Owner' ? (
                    <span className="text-emerald-400 font-bold font-mono">₹62,000 (22.1%)</span>
                  ) : (
                    <span className="text-slate-500 italic flex items-center gap-1">
                      <Lock className="h-3 w-3" /> Confidential
                    </span>
                  )}
                </td>
                <td className="py-3.5 px-4">
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Authorized
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
