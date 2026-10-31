import React from 'react';
import { Sun, ShieldCheck, Database, Layers, CheckCircle } from 'lucide-react';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/60 backdrop-blur px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sun className="h-6 w-6 animate-spin-slow" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white tracking-tight">SunPower Solutions</h1>
              <p className="text-xs text-slate-400 font-mono">Platform Foundation Monolith</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle className="h-3.5 w-3.5" /> Phase 1 Active
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-16 flex-1 flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-300 text-xs font-semibold uppercase tracking-wider mb-8">
          <Layers className="h-3.5 w-3.5 text-amber-400" />
          Modular Monolith Architecture
        </div>
        
        <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white max-w-3xl leading-tight">
          Solar Installation <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">Management System</span>
        </h2>
        
        <p className="mt-4 text-base sm:text-lg text-slate-400 max-w-2xl">
          Unified platform for managing commercial, residential, and industrial solar projects from lead intake to commissioning and support.
        </p>

        {/* Feature Cards Grid */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left max-w-4xl w-full">
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 backdrop-blur hover:border-slate-600 transition">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-white text-base">5 Role RBAC Engine</h3>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              Admin/Owner, Sales, Warehouse, Technician, and Support roles with strict scope boundary isolation.
            </p>
          </div>

          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 backdrop-blur hover:border-slate-600 transition">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
              <Database className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-white text-base">PostgreSQL Monolith</h3>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              Atomic transactional migrations with migration tracking, automated rollback safety and audit logging.
            </p>
          </div>

          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 backdrop-blur hover:border-slate-600 transition">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
              <Layers className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-white text-base">Independent Modules</h3>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              Isolated business boundaries for Member 1, 2, 3 and 4 with shared contract validation schemas.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/40 py-6 px-8 text-center text-xs text-slate-500">
        SunPower Solutions &copy; 2026. Platform Foundation Built for High Reliability &amp; Scale.
      </footer>
    </div>
  );
}
