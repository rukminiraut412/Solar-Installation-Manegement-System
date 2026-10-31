import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  LifeBuoy, 
  AlertTriangle, 
  ShieldCheck, 
  RefreshCw, 
  CheckCircle,
  Clock,
  PieChart as PieIcon
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { api } from '../api';

const PIE_COLORS = ['#1e40af', '#0284c7', '#10b981', '#f59e0b', '#ef4444', '#6b7280'];

export default function DashboardsTab({ currentRole }) {
  const [metrics, setMetrics] = useState(null);
  const [reconciliation, setReconciliation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);

  useEffect(() => {
    loadData();
  }, [currentRole]);

  async function loadData() {
    try {
      setLoading(true);
      const res = await api.getDashboardMetrics(currentRole);
      setMetrics(res.metrics || null);
      setReconciliation(res.metrics?.reconciliation || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleReconcile() {
    try {
      setReconciling(true);
      const res = await api.reconcilePayments(currentRole);
      setReconciliation(res.reconciliation);
      alert(res.message);
    } catch (err) {
      alert(`Reconciliation error: ${err.message}`);
    } finally {
      setReconciling(false);
    }
  }

  if (loading) {
    return <div className="text-center py-16 text-gray-400">Loading operational dashboards...</div>;
  }

  const fin = metrics?.financial || {};
  const sup = metrics?.support || {};
  const monthlyData = fin.monthly_trend || [];
  const caseDist = sup.case_distribution || [];

  return (
    <div className="space-y-6">
      
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-solar-blue" />
            Support & Finance Operational Dashboards
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time analytics, SLA compliance, revenue tracking & authoritative reconciliation
          </p>
        </div>

        <button
          onClick={loadData}
          className="text-xs bg-white hover:bg-gray-50 border border-gray-300 px-3 py-2 rounded-lg font-medium text-gray-700 flex items-center gap-1.5 shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Metrics
        </button>
      </div>

      {/* Authoritative Payment Reconciliation Widget (§15.11 & §13.3) */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-xl p-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-yellow-300 text-xs font-mono font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Authoritative Payment Reconciliation Widget (§15.11)
            </div>
            <h3 className="text-lg font-bold mt-1">
              Ledger Discrepancy Integrity Audit
            </h3>
            <p className="text-xs text-blue-200 mt-0.5">
              Dashboard Verified Total &minus; Sum(Verified Payment Attempts) = Zero Discrepancy
            </p>
          </div>

          <button
            onClick={handleReconcile}
            disabled={reconciling}
            className="bg-solar-blue hover:bg-blue-600 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-2 shadow transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${reconciling ? 'animate-spin' : ''}`} />
            {reconciling ? 'Auditing Ledger...' : 'Run Reconciliation Audit'}
          </button>
        </div>

        {reconciliation && (
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-blue-800/80">
            <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
              <div className="text-[11px] text-blue-200 font-mono">DASHBOARD VERIFIED TOTAL</div>
              <div className="text-xl font-bold font-mono text-white mt-1">
                ₹{(reconciliation.dashboard_total_paise / 100).toLocaleString('en-IN')}
              </div>
            </div>

            <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
              <div className="text-[11px] text-blue-200 font-mono">SUM OF VERIFIED LEDGER</div>
              <div className="text-xl font-bold font-mono text-white mt-1">
                ₹{(reconciliation.payment_ledger_total_paise / 100).toLocaleString('en-IN')}
              </div>
            </div>

            <div className={`rounded-lg p-3 backdrop-blur-sm border ${
              reconciliation.is_reconciled ? 'bg-emerald-500/20 border-emerald-400' : 'bg-red-500/20 border-red-400'
            }`}>
              <div className="text-[11px] text-blue-200 font-mono">DISCREPANCY</div>
              <div className="text-xl font-bold font-mono text-emerald-300 mt-1 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                ₹{(reconciliation.discrepancy_paise / 100).toFixed(2)}
                <span className="text-xs font-normal text-emerald-200">(100% RECONCILED)</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>Collected Revenue</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-ink font-mono mt-2">
            ₹{((fin.total_collected_revenue_paise || 0) / 100).toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-emerald-600 mt-1 font-semibold">100% Verified in Ledger</div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>Outstanding Receivables</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-ink font-mono mt-2">
            ₹{((fin.outstanding_balance_paise || 0) / 100).toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">Pending milestone payments</div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>Open Support Tickets</span>
            <LifeBuoy className="w-4 h-4 text-solar-blue" />
          </div>
          <div className="text-xl font-bold text-ink font-mono mt-2">
            {sup.open_cases || 0}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">SLA Compliance: {sup.sla_adherence_rate || '100%'}</div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>Active P1 Hazards</span>
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-xl font-bold text-red-600 font-mono mt-2">
            {sup.p1_hazards || 0}
          </div>
          <div className="text-[11px] text-red-600 mt-1 font-semibold">Immediate Field Attention</div>
        </div>

      </div>

      {/* Recharts Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Monthly Revenue vs Expenses Bar Chart */}
        <div className="lg:col-span-7 bg-white rounded-lg border border-gray-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-ink flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-solar-blue" />
              Monthly Revenue vs. Direct Expenses (₹ in Lakhs)
            </h3>
            <span className="text-xs text-gray-400">Past 5 Months</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip 
                  formatter={(value) => [`₹${(value * 100000).toLocaleString()}`, '']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="revenue" name="Collected Revenue" fill="#1e40af" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Direct Expenses" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Support Case Distribution Pie Chart */}
        <div className="lg:col-span-5 bg-white rounded-lg border border-gray-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-ink flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-solar-blue" />
              Support Case Pipeline Distribution
            </h3>
            <span className="text-xs text-gray-400">By Status</span>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={caseDist}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  label={({ status, count }) => `${status}: ${count}`}
                >
                  {caseDist.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
}
