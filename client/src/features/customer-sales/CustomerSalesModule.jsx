import React from 'react';
import { Users, Sun, Sparkles } from 'lucide-react';
import CustomerManagement from './components/CustomerManagement';

export default function CustomerSalesModule() {
  return (
    <div className="space-y-6">
      {/* Module Title Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1">
              <Sun className="h-4 w-4 text-emerald-600" /> Customer Management System
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Solar Customer Directory &amp; 360° Management
            </h1>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl">
              Independent customer management: profile registration, contact details, site address &amp; capacity requirement, timeline history, and operational team assignments.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Customer Module Active
            </span>
          </div>
        </div>
      </div>

      {/* Standalone Customer Management View */}
      <div>
        <CustomerManagement />
      </div>
    </div>
  );
}
