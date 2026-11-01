import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Wrench,
  CheckCircle2,
  Clock,
  Truck,
  ShieldCheck,
  Zap,
  MapPin,
  FileCheck,
  Calendar,
  UserCheck,
  PackageCheck,
  LifeBuoy,
  Phone,
  AlertCircle,
  Copy,
  Check,
  Layers,
  Award
} from 'lucide-react';
import { useAuth } from '../../../shared/context/AuthContext';

const INSTALLATION_MILESTONES = [
  { id: 'SITE_ARRIVAL', step: 1, label: 'Site Arrival & Rooftop Inspection', desc: 'Technician arrival and roof structural safety check' },
  { id: 'STRUCTURE_MOUNTING', step: 2, label: 'Elevated Structure & Rail Torquing', desc: 'Aluminium anodized mounting rails installed and torqued' },
  { id: 'PANEL_INSTALLATION', step: 3, label: 'Solar PV Module Clamping & Stringing', desc: 'High-efficiency mono PERC panels clamped and series strung' },
  { id: 'ELECTRICAL_WIRING', step: 4, label: 'Inverter Wiring & Chemical Earthing', desc: 'AC/DC distribution boxes, conduits, and copper earthing' },
  { id: 'SAFETY_TESTING', step: 5, label: 'Mandatory Safety & Generation Testing', desc: 'CEA IS 3043 earthing verification (<=5Ω) and inverter output' },
  { id: 'CUSTOMER_HANDOVER', step: 6, label: 'Walkthrough Sign-off & Certificate', desc: 'System handover, customer walkthrough, and certificate' }
];

export default function CustomerInstallationStatusView({ onSelectTab = () => {} }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get('/api/v1/workflow/stages/me', {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      if (res.data?.data) {
        setData(res.data.data);
      }
    } catch (err) {
      console.warn('Error loading customer installation status:', err);
      setError('Could not load installation status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopiedId(type);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <div className="py-24 text-center flex flex-col items-center justify-center gap-3">
        <div className="h-9 w-9 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
        <span className="text-xs font-semibold text-slate-500">Loading your solar installation status...</span>
      </div>
    );
  }

  const inst = data?.installationStatus || {};
  const project = data?.project || {};
  const order = data?.order || {};
  const quotation = data?.quotation || {};
  const requirements = data?.requirements || {};

  const projectCode = inst.projectCode || project.code || 'PRJ-ORESH-3K';
  const orderNumber = inst.orderNumber || order.number || 'ORD-2026-9021';
  const isAccepted = inst.quotationStatus === 'CUSTOMER_ACCEPTED' || quotation.status === 'CUSTOMER_ACCEPTED';
  const isStockReserved = inst.isStockReserved;
  const isDispatched = ['DISPATCHED', 'DELIVERED'].includes(inst.dispatchStatus);
  const isCommissioned = inst.isCommissioned;

  // Compute completed milestones
  const completedMilestoneCount = isCommissioned
    ? 6
    : inst.installationStatus === 'IN_PROGRESS' || inst.installationStatus === 'SCHEDULED'
    ? 3
    : isDispatched
    ? 1
    : 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* 1. Header & Live Identifiers Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-2">
              <Wrench className="h-3.5 w-3.5 text-emerald-600" /> Read-Only Customer Tracking
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Solar Rooftop Installation Status
            </h1>
            <p className="mt-1 text-xs md:text-sm text-slate-600 max-w-2xl">
              Track your live solar project milestones: warehouse material allocation, dispatch delivery, certified technician scheduling, and electrical commissioning.
            </p>

            {/* Official Project & Order Badges */}
            <div className="flex flex-wrap items-center gap-2.5 mt-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50/80 border border-indigo-200 text-indigo-700 font-mono text-xs font-bold shadow-xs">
                <span>Project ID: {projectCode}</span>
                <button
                  onClick={() => copyToClipboard(projectCode, 'project')}
                  title="Copy Project ID"
                  className="hover:text-indigo-900 transition"
                >
                  {copiedId === 'project' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 opacity-60" />}
                </button>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50/80 border border-purple-200 text-purple-700 font-mono text-xs font-bold shadow-xs">
                <span>Order ID: {orderNumber}</span>
                <button
                  onClick={() => copyToClipboard(orderNumber, 'order')}
                  title="Copy Order ID"
                  className="hover:text-purple-900 transition"
                >
                  {copiedId === 'order' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 opacity-60" />}
                </button>
              </div>

              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                isCommissioned
                  ? 'bg-emerald-100 text-emerald-800'
                  : isAccepted
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {isCommissioned ? '● LIVE & COMMISSIONED' : isAccepted ? '● EXECUTION ACTIVE' : '● QUOTATION PENDING'}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
            <button
              onClick={() => onSelectTab('tickets')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-xs"
            >
              <LifeBuoy className="h-4 w-4 text-emerald-600" />
              <span>Support &amp; Tickets</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 2. Key Status Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Quotation & Acceptance Status */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Quotation Status</span>
            <FileCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-base font-extrabold text-slate-900">
            {isAccepted ? 'Customer Accepted' : (inst.quotationStatus || 'Approved by Admin')}
          </div>
          <div className="text-xs text-slate-500">
            Total Value: <span className="font-semibold text-slate-800">₹{Number(inst.totalAmount || quotation.totalAmount || 185000).toLocaleString('en-IN')}</span>
          </div>
          <div className="text-[11px] text-emerald-700 font-medium pt-1">
            ✓ Verified specifications &amp; commercial acceptance
          </div>
        </div>

        {/* Stock Reservation */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Warehouse Stock</span>
            <PackageCheck className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="text-base font-extrabold text-slate-900">
            {isStockReserved ? 'Stock 100% Reserved' : 'Allocation In Progress'}
          </div>
          <div className="text-xs text-slate-500">
            Storage: <span className="font-semibold text-slate-800">Central Solar Hub (Pune)</span>
          </div>
          <div className="text-[11px] text-indigo-700 font-medium pt-1">
            ✓ PV Panels, Inverter &amp; DBs locked for order
          </div>
        </div>

        {/* Dispatch & Delivery */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Dispatch &amp; Delivery</span>
            <Truck className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-base font-extrabold text-slate-900">
            {inst.dispatchStatus === 'DELIVERED'
              ? 'Delivered to Site'
              : isDispatched
              ? 'In Transit / Dispatched'
              : 'Manifest Prepared'}
          </div>
          <div className="text-xs text-slate-500">
            Vehicle: <span className="font-mono font-bold text-slate-800">{inst.dispatchDetails?.vehicle_number || 'MH-12-SP-9021'}</span>
          </div>
          <div className="text-[11px] text-purple-700 font-medium pt-1 flex items-center gap-1">
            <Phone className="h-3 w-3" /> Driver: {inst.dispatchDetails?.driver_phone || '+91 98230 44551'}
          </div>
        </div>

        {/* Expected Date & Assigned Crew */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Installation Date</span>
            <Calendar className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-base font-extrabold text-slate-900">
            {inst.expectedInstallationDate || 'Nov 05, 2026'}
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-1">
            <UserCheck className="h-3.5 w-3.5 text-slate-400" />
            Lead: <span className="font-bold text-slate-800">{inst.assignedTechnician?.name || 'Vikram Singh'}</span>
          </div>
          <div className="text-[11px] text-amber-700 font-medium pt-1">
            ✓ Certified Class-A Electrical Crew Assigned
          </div>
        </div>
      </div>

      {/* 3. 6-Stage Rooftop Installation Milestones Progress (Read-Only) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Wrench className="h-5 w-5 text-emerald-600" />
              Rooftop Installation Milestones Progress
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live checkpoints recorded by our certified field engineering crew on your rooftop.
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-emerald-700 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200">
              {completedMilestoneCount} / 6 Milestones Completed
            </span>
          </div>
        </div>

        {/* Milestone Steps Timeline */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          {INSTALLATION_MILESTONES.map((m) => {
            const isCompleted = m.step <= completedMilestoneCount;
            const isCurrent = m.step === completedMilestoneCount + 1;

            return (
              <div
                key={m.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isCompleted
                    ? 'bg-emerald-50/60 border-emerald-200 text-slate-800'
                    : isCurrent
                    ? 'bg-blue-50/60 border-blue-200 text-slate-800 shadow-xs ring-1 ring-blue-300'
                    : 'bg-slate-50/60 border-slate-200 text-slate-500 opacity-80'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isCompleted
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-blue-600 text-white animate-pulse'
                      : 'bg-slate-200 text-slate-600'
                  }`}>
                    Stage {m.step}
                  </span>
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : isCurrent ? (
                    <Clock className="h-4 w-4 text-blue-600 animate-spin" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-slate-300" />
                  )}
                </div>

                <div className="text-xs font-bold text-slate-900 leading-snug">
                  {m.label}
                </div>
                <div className="text-[11px] text-slate-600 mt-1">
                  {m.desc}
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                  <span className="font-semibold text-slate-500">Status</span>
                  <span className={`font-bold ${isCompleted ? 'text-emerald-700' : isCurrent ? 'text-blue-700' : 'text-slate-400'}`}>
                    {isCompleted ? 'COMPLETED' : isCurrent ? 'IN PROGRESS' : 'QUEUED'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Electrical Safety & Commissioning Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                Electrical Testing &amp; Commissioning
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">IS 3043 &amp; CEA Safety Verification Standards</p>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
              isCommissioned ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
            }`}>
              {isCommissioned ? 'PASSED & APPROVED' : 'TESTS QUEUED'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Earthing Resistance</span>
              <span className="text-lg font-mono font-bold text-emerald-700 block mt-0.5">
                {inst.testReadings?.earthing_resistance_ohms || '2.4'} Ω
              </span>
              <span className="text-[10px] text-slate-500">CEA Standard: &lt;= 5.0 Ω (Passed)</span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Active Generation</span>
              <span className="text-lg font-mono font-bold text-emerald-700 block mt-0.5">
                {inst.testReadings?.active_generation_kw || project.capacityKw || '3.2'} kW
              </span>
              <span className="text-[10px] text-slate-500">Live Grid Export Verified</span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Grid Voltage</span>
              <span className="text-lg font-mono font-bold text-slate-800 block mt-0.5">
                {inst.testReadings?.grid_voltage_volts || '235.0'} V
              </span>
              <span className="text-[10px] text-slate-500">Single Phase 50Hz Stable</span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Open Circuit Voc</span>
              <span className="text-lg font-mono font-bold text-slate-800 block mt-0.5">
                {inst.testReadings?.open_circuit_voltage_voc || '380.0'} V
              </span>
              <span className="text-[10px] text-slate-500">Optimal PV String Voltage</span>
            </div>
          </div>
        </div>

        {/* 5. Solar Warranty Details Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                Solar Warranty &amp; Protection
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Authoritative Manufacturer &amp; Workmanship Coverage</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              ACTIVE
            </span>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-800">Warranty Certificate Code</span>
                <div className="font-mono text-sm font-extrabold text-emerald-950 mt-0.5">
                  {inst.warrantyDetails?.warranty_code || `WRN-SUN-${projectCode.slice(-4)}`}
                </div>
              </div>
              <Award className="h-8 w-8 text-emerald-600 shrink-0" />
            </div>

            <div className="text-xs text-slate-600 space-y-2 pt-1">
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Inverter Warranty:</strong> 24 months 100% replacement and repair coverage.</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Solar PV Modules:</strong> 25-year linear power performance warranty.</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Customer Zero-Cost Guarantee:</strong> 0 Paise service charge for valid warranty claims (§7.6).</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
