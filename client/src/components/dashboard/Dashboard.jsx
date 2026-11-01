import React, { useState, useEffect } from 'react';
import { useAuth } from '../../shared/context/AuthContext';
import CustomerSalesModule from '../../features/customer-sales/CustomerSalesModule';
import OperationsModule from '../../features/operations/OperationsModule';
import SupportFinanceApp from '../../features/support-finance/SupportFinanceApp';
import UserManagementView from '../users/UserManagementView';
import CustomerDashboardView from '../../features/customer-sales/components/CustomerDashboardView';
import CustomerInstallationRequirements from '../../features/customer-sales/components/CustomerInstallationRequirements';
import CustomerInstallationStatusView from '../../features/customer-sales/components/CustomerInstallationStatusView';
import TechnicianJobCardPortal from '../../features/operations/technicians/TechnicianJobCardPortal';
import customerSalesApi from '../../features/customer-sales/api/customerSalesApi';
import {
  Sun,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Users,
  FileSpreadsheet,
  Boxes,
  Wrench,
  LifeBuoy,
  BadgeIndianRupee,
  ChevronRight,
  TrendingUp,
  PackageCheck,
  Truck,
  CheckCheck,
  AlertTriangle,
  Activity,
  Layers,
  UserCheck,
  UserPlus,
} from 'lucide-react';

/* =========================================================================
   6-STEP SEQUENTIAL BUSINESS WORKFLOW DEFINITIONS
   ========================================================================= */
const WORKFLOW_STEPS = [
  {
    step: 1,
    id: 'customers',
    title: 'Customer Onboarding & Requirements',
    role: 'Admin/Owner',
    description: 'Register customer, capture solar capacity requirement, and review technical installation specs.',
    status: 'Completed',
    actionText: 'Manage Customers',
    targetTab: 'customers',
    subDetails: 'Customer created -> Specs submitted -> Engineering verification.',
  },
  {
    step: 2,
    id: 'inventory',
    title: 'Material Reservation & Dispatch',
    role: 'Warehouse',
    description: 'Verify BOM stock balances, allocate panels/inverters, scan 100% serial barcodes, and issue dispatch manifest.',
    status: 'In Progress',
    actionText: 'Check Stock & Issue',
    targetTab: 'inventory',
    subDetails: 'Inventory balance check -> Material reservation -> Barcode verification -> Dispatch challan.',
  },
  {
    step: 3,
    id: 'jobs',
    title: 'Rooftop Installation & Testing',
    role: 'Technician',
    description: 'Field execution by certified crew: structure mounting, inverter wiring, earthing resistance <= 5.0 Ohm, and generation test.',
    status: 'Waiting for Material',
    actionText: 'Rooftop Job Cards',
    targetTab: 'jobs',
    subDetails: 'Assigned crew -> Physical mounting -> Electrical safety testing -> Customer sign-off.',
  },
  {
    step: 4,
    id: 'tickets',
    title: 'Customer Support & Warranty',
    role: 'Support',
    description: 'Active post-commissioning service: component warranty lookup, customer queries, and field repair resolution.',
    status: 'Pending',
    actionText: 'Support Helpdesk',
    targetTab: 'tickets',
    subDetails: 'Warranty certificate active -> SLA ticketing -> Field service coordination -> Case closure.',
  },
  {
    step: 5,
    id: 'finance',
    title: 'Lifecycle Oversight & Margin Review',
    role: 'Admin/Owner',
    description: 'Platform-level governance: project profitability margins, inventory ledger health, and complete audit trail.',
    status: 'Pending',
    actionText: 'Financial Overview',
    targetTab: 'finance',
    subDetails: 'Realized revenue vs project cost -> Technician payroll audit -> Milestone completion.',
  },
];

/* =========================================================================
   CLEAN COMMERCIAL AUDIT LOGS VIEW (REMOVING UNNECESSARY DEV CARDS)
   ========================================================================= */
function CleanAuditLogsView({ user }) {
  const AUDIT_EVENTS = [
    {
      id: 'AUD-901',
      action: 'USER_LOGIN',
      description: 'User successfully signed in with secure multi-role session',
      actor: user?.fullName || 'Rajesh Sharma (Director)',
      role: user?.role || 'Admin/Owner',
      timestamp: '2026-10-31 16:45:12',
      status: 'VERIFIED',
    },
    {
      id: 'AUD-902',
      action: 'DISPATCH_ISSUED',
      description: 'Dispatch challan DSP-2026-001 issued for 3kW rooftop project',
      actor: 'Amit Patel',
      role: 'Warehouse',
      timestamp: '2026-10-31 15:30:00',
      status: 'VERIFIED',
    },
    {
      id: 'AUD-903',
      action: 'SERIAL_REGISTERED',
      description: 'Inverter barcode INV-GROW-3K-26-00101 locked to installation manifest',
      actor: 'Amit Patel',
      role: 'Warehouse',
      timestamp: '2026-10-31 14:15:22',
      status: 'VERIFIED',
    },
    {
      id: 'AUD-904',
      action: 'SAFETY_TEST_PASSED',
      description: 'Earthing resistance measured at 1.8 Ohm (Standard <= 5.0 Ohm) on JOB-2026-001',
      actor: 'Vikram Singh',
      role: 'Technician',
      timestamp: '2026-10-31 13:00:10',
      status: 'PASSED',
    },
    {
      id: 'AUD-905',
      action: 'PROFIT_MARGIN_AUDIT',
      description: 'Admin audited project margin realization for PROJ-2026-001',
      actor: user?.fullName || 'Rajesh Sharma',
      role: user?.role || 'Admin/Owner',
      timestamp: '2026-10-31 12:45:00',
      status: 'AUTHORIZED',
    },
    {
      id: 'AUD-906',
      action: 'CUSTOMER_SUPPORT_VERIFIED',
      description: 'Support verified customer technical requirements dossier',
      actor: 'Priya Verma',
      role: 'Support',
      timestamp: '2026-10-31 11:10:44',
      status: 'VERIFIED',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-2">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            Operational Governance
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            System Activity &amp; Audit Trail
          </h1>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            Immutable business record of customer quotations, stock dispatch, safety testing, and administrative approvals.
          </p>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Business Operations</h3>
            <p className="text-xs text-slate-500">Live operational ledger recorded across all platform modules</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
            Audit Records: {AUDIT_EVENTS.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-6">Event ID</th>
                <th className="py-3 px-6">Operation</th>
                <th className="py-3 px-6">Business Details</th>
                <th className="py-3 px-6">Authorized By</th>
                <th className="py-3 px-6">Timestamp</th>
                <th className="py-3 px-6">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {AUDIT_EVENTS.map((ev) => (
                <tr key={ev.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3.5 px-6 font-mono text-emerald-700 font-semibold">{ev.id}</td>
                  <td className="py-3.5 px-6 font-semibold text-slate-900">{ev.action}</td>
                  <td className="py-3.5 px-6 text-slate-600">{ev.description}</td>
                  <td className="py-3.5 px-6">
                    <span className="font-semibold text-slate-800">{ev.actor}</span>
                    <span className="text-[10px] text-slate-500 ml-1.5">({ev.role})</span>
                  </td>
                  <td className="py-3.5 px-6 font-mono text-slate-500">{ev.timestamp}</td>
                  <td className="py-3.5 px-6">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <CheckCircle2 className="h-3 w-3" /> {ev.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   ROLE-SPECIFIC KPI METRICS CARDS (LIGHT THEME, CRISP CONTRAST)
   ========================================================================= */
function RoleMetricsCards({ role }) {
  if (role === 'Warehouse') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Stock Units</span>
            <Boxes className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">2,450 Units</div>
          <div className="text-xs text-slate-600 mt-1">Monocrystalline panels &amp; inverters</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Reserved for Jobs</span>
            <PackageCheck className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">380 Units</div>
          <div className="text-xs text-blue-700 font-semibold mt-1">Locked for 5 installation sites</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Ready for Dispatch</span>
            <Truck className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">3 Challans</div>
          <div className="text-xs text-amber-700 font-semibold mt-1">100% serial barcodes scanned</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Stock Health</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">0 Shortages</div>
          <div className="text-xs text-emerald-700 font-semibold mt-1">All safety threshold levels met</div>
        </div>
      </div>
    );
  }

  if (role === 'Technician') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Assigned Installations</span>
            <Wrench className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">4 Rooftop Sites</div>
          <div className="text-xs text-emerald-700 font-semibold mt-1">Crew lead assigned</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>In Progress Today</span>
            <Activity className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">2 Sites Active</div>
          <div className="text-xs text-blue-700 font-semibold mt-1">Structure &amp; string cabling</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Safety Test Passed</span>
            <CheckCircle2 className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">100% Compliant</div>
          <div className="text-xs text-purple-700 font-semibold mt-1">Earthing &lt;= 5.0 Ohm verified</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Pending Handover</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">1 Customer</div>
          <div className="text-xs text-amber-700 font-semibold mt-1">Ready for commissioning sign-off</div>
        </div>
      </div>
    );
  }

  if (role === 'Support') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Active Tickets</span>
            <LifeBuoy className="h-4 w-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">3 Open</div>
          <div className="text-xs text-rose-700 font-semibold mt-1">1 priority inverter query</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Warranties Verified</span>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">100% Valid</div>
          <div className="text-xs text-emerald-700 font-semibold mt-1">Serial registry cross-checked</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Avg Resolution Time</span>
            <Clock className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">2.4 Hours</div>
          <div className="text-xs text-blue-700 font-semibold mt-1">Within commercial SLA target</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Customer Satisfaction</span>
            <CheckCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">98.5%</div>
          <div className="text-xs text-emerald-700 font-semibold mt-1">Confirmed project completions</div>
        </div>
      </div>
    );
  }

  // Default: Admin/Owner
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
          <span>Active Solar Projects</span>
          <TrendingUp className="h-4 w-4 text-emerald-600" />
        </div>
        <div className="text-2xl font-bold text-slate-900 mt-2">14 Installations</div>
        <div className="text-xs text-emerald-700 font-semibold mt-1">₹42.5 Lakhs project value</div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
          <span>Warehouse Readiness</span>
          <Boxes className="h-4 w-4 text-blue-600" />
        </div>
        <div className="text-2xl font-bold text-slate-900 mt-2">96.8% Stocked</div>
        <div className="text-xs text-blue-700 font-semibold mt-1">All standard BOM kits available</div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
          <span>Field Installations</span>
          <Wrench className="h-4 w-4 text-amber-500" />
        </div>
        <div className="text-2xl font-bold text-slate-900 mt-2">5 In Progress</div>
        <div className="text-xs text-amber-700 font-semibold mt-1">Certified electrical lead on site</div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
          <span>Customer Support SLA</span>
          <LifeBuoy className="h-4 w-4 text-purple-600" />
        </div>
        <div className="text-2xl font-bold text-slate-900 mt-2">99.2% Met</div>
        <div className="text-xs text-purple-700 font-semibold mt-1">3 open tickets being resolved</div>
      </div>
    </div>
  );
}

/* =========================================================================
   INTERACTIVE 6-STEP BUSINESS WORKFLOW STEPPER COMPONENT
   ========================================================================= */
function SequentialWorkflowStepper({ onSelectTab, currentRole }) {
  const [selectedStep, setSelectedStep] = useState(3); // Default to Step 3 (Material Prep) to demonstrate next-step flow

  const activeStepData = WORKFLOW_STEPS.find((s) => s.step === selectedStep) || WORKFLOW_STEPS[2];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completed':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'In Progress':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Waiting for Material':
      case 'Waiting for Approval':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Connected Business Lifecycle
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            6-Step Solar Project Fulfilment Workflow
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            When one role completes its task, the next stage automatically activates for the responsible department.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Completed</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> In Progress</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-300" /> Pending</span>
        </div>
      </div>

      {/* Visual Stepper: Desktop Horizontal & Mobile Vertical */}
      <div className="hidden lg:grid grid-cols-6 gap-2 relative">
        {WORKFLOW_STEPS.map((st) => {
          const isSelected = selectedStep === st.step;
          const isCompleted = st.status === 'Completed';
          const isInProgress = st.status === 'In Progress';

          return (
            <button
              key={st.step}
              type="button"
              onClick={() => setSelectedStep(st.step)}
              className={`p-3.5 rounded-xl border text-left transition relative flex flex-col justify-between ${
                isSelected
                  ? 'border-emerald-600 bg-emerald-50/50 shadow-sm ring-2 ring-emerald-500/20'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    isCompleted
                      ? 'bg-emerald-600 text-white'
                      : isInProgress
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}>
                    {st.step}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${getStatusBadge(st.status)}`}>
                    {st.status}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-900 leading-tight line-clamp-2">
                  {st.title}
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-medium">{st.role}</span>
                <ChevronRight className={`h-3.5 w-3.5 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Mobile Vertical Stepper Accordion / Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:hidden gap-2">
        {WORKFLOW_STEPS.map((st) => (
          <button
            key={st.step}
            type="button"
            onClick={() => setSelectedStep(st.step)}
            className={`p-2.5 rounded-xl border text-left text-xs transition ${
              selectedStep === st.step
                ? 'border-emerald-600 bg-emerald-50 font-bold text-slate-900'
                : 'border-slate-200 bg-white text-slate-700'
            }`}
          >
            <div className="text-[10px] text-slate-500 uppercase">Step {st.step} &bull; {st.role}</div>
            <div className="truncate font-semibold mt-0.5">{st.title}</div>
          </button>
        ))}
      </div>

      {/* Active Step Interactive Action Dossier */}
      <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-xs font-bold">
              STEP {activeStepData.step} OF 6
            </span>
            <span className="text-xs font-bold text-slate-700">
              Responsible Role: <span className="text-emerald-700">{activeStepData.role}</span>
            </span>
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {activeStepData.title}
          </h3>
          <p className="text-xs text-slate-600 max-w-2xl">
            {activeStepData.description}
          </p>
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <span>Workflow Handover: {activeStepData.subDetails}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onSelectTab(activeStepData.targetTab)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
          >
            <span>{activeStepData.actionText}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   RECENT COMMERCIAL PROJECT PIPELINE TABLE (HIGH READABILITY)
   ========================================================================= */
function RecentProjectsTable({ onSelectTab }) {
  const PROJECTS = [
    {
      code: 'PRJ-2026-001',
      customer: 'Ramesh Patel (3 kW On-Grid)',
      location: 'Pune, Maharashtra',
      capacity: '3.3 kWp',
      stage: 'Step 3: Material Preparation',
      role: 'Warehouse',
      status: 'Stock Allocated',
      statusBadge: 'bg-amber-50 text-amber-800 border-amber-200',
      tab: 'inventory',
    },
    {
      code: 'PRJ-2026-002',
      customer: 'Meera Joshi (5 kW Hybrid)',
      location: 'Nashik, Maharashtra',
      capacity: '5.0 kWp',
      stage: 'Step 4: Installation Scheduled',
      role: 'Technician',
      status: 'Crew Assigned',
      statusBadge: 'bg-blue-50 text-blue-800 border-blue-200',
      tab: 'jobs',
    },
    {
      code: 'PRJ-2026-003',
      customer: 'Kalyani Industries (10 kW Commercial)',
      location: 'Aurangabad, Maharashtra',
      capacity: '10.5 kWp',
      stage: 'Step 2: Quotation Review',
      role: 'Admin/Owner',
      status: 'Pending Approval',
      statusBadge: 'bg-purple-50 text-purple-800 border-purple-200',
      tab: 'quotes',
    },
    {
      code: 'PRJ-2026-004',
      customer: 'Sunil Deshmukh (4 kW On-Grid)',
      location: 'Nagpur, Maharashtra',
      capacity: '4.2 kWp',
      stage: 'Step 5: Commissioned & Active',
      role: 'Support',
      status: 'Warranty Issued',
      statusBadge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      tab: 'tickets',
    },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Active Solar Installation Pipeline</h3>
          <p className="text-xs text-slate-500">Live project progression tracked across connected workflow steps</p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
          4 Ongoing Projects
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3 px-6">Project ID</th>
              <th className="py-3 px-6">Customer &amp; Site</th>
              <th className="py-3 px-6">Capacity</th>
              <th className="py-3 px-6">Current Workflow Stage</th>
              <th className="py-3 px-6">Responsible Department</th>
              <th className="py-3 px-6">Status</th>
              <th className="py-3 px-6 text-right">Direct Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {PROJECTS.map((p) => (
              <tr key={p.code} className="hover:bg-slate-50/70 transition">
                <td className="py-3.5 px-6 font-mono text-emerald-700 font-semibold">{p.code}</td>
                <td className="py-3.5 px-6 font-semibold text-slate-900">
                  <div>{p.customer}</div>
                  <div className="text-[11px] font-normal text-slate-500">{p.location}</div>
                </td>
                <td className="py-3.5 px-6 font-mono font-medium text-slate-800">{p.capacity}</td>
                <td className="py-3.5 px-6 font-medium text-slate-800">{p.stage}</td>
                <td className="py-3.5 px-6">
                  <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                    {p.role}
                  </span>
                </td>
                <td className="py-3.5 px-6">
                  <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${p.statusBadge}`}>
                    {p.status}
                  </span>
                </td>
                <td className="py-3.5 px-6 text-right">
                  <button
                    onClick={() => onSelectTab(p.tab)}
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition"
                  >
                    Open <ArrowRight className="h-3 w-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* =========================================================================
   ROLE-WISE AUTOMATIC CUSTOMER ASSIGNMENT & TASK DISTRIBUTION WIDGET
   ========================================================================= */
function RoleCustomerAssignmentWidget({ user, onSelectTab }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAssignedCustomers() {
      try {
        setLoading(true);
        const res = await customerSalesApi.listCustomers();
        setCustomers(res.data || []);
      } catch (err) {
        console.error('Failed to load role customers:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAssignedCustomers();
  }, []);

  const role = user?.role;
  const pendingCustomers = customers.filter((c) => c.assignment_status === 'PENDING_ASSIGNMENT');

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-center text-xs text-slate-500">
        Loading operational assignments &amp; customer tasks...
      </div>
    );
  }

  // A. ADMIN / OWNER VIEW: Pending Customer Assignments Queue
  if (role === 'Admin/Owner') {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Pending Customer Assignments Queue
                {pendingCustomers.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold animate-pulse">
                    {pendingCustomers.length} Awaiting Assignment
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                New customers registered by sales partners awaiting operational team distribution.
              </p>
            </div>
          </div>
          <button
            onClick={() => onSelectTab('customers')}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <span>Customer Directory ({customers.length})</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {pendingCustomers.length === 0 ? (
          <div className="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
            <h4 className="text-xs font-bold text-slate-800">All Registered Customers Are Assigned</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              No pending customer registrations requiring team allocation at this moment.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Customer</th>
                  <th className="py-2.5 px-4">Site Location</th>
                  <th className="py-2.5 px-4">Required System</th>
                  <th className="py-2.5 px-4">Registered By</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Assignment Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {pendingCustomers.slice(0, 5).map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div>{c.full_name}</div>
                      <div className="font-mono text-[10px] text-emerald-700">{c.customer_code}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div>{c.address_city}, {c.address_state}</div>
                      <div className="text-[11px] text-slate-500">{c.installation_location || 'Rooftop'}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {c.required_capacity_kw || 3.0} kW ({c.solar_requirement || 'On-Grid'})
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {c.creator_name || 'Sales Partner'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        Pending Assignment
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onSelectTab('customers')}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition shadow-sm"
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        Assign Team
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // C. WAREHOUSE MANAGER VIEW: Assigned Material Requisitions
  if (role === 'Warehouse') {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                My Assigned Customer Material Requisitions &amp; Dispatch ({customers.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Warehouse Scope: Material reservation, serial barcode traceability, and dispatch manifests. Confidential sales pricing hidden.
              </p>
            </div>
          </div>
          <button
            onClick={() => onSelectTab('inventory')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <Truck className="h-3.5 w-3.5" />
            <span>Manage Inventory &amp; Dispatch</span>
          </button>
        </div>

        {customers.length === 0 ? (
          <div className="p-6 bg-slate-50 rounded-xl text-center border border-dashed border-slate-200">
            <p className="text-xs text-slate-500">No installation material requisitions currently assigned to your station.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Customer &amp; Code</th>
                  <th className="py-2.5 px-4">Installation Location</th>
                  <th className="py-2.5 px-4">System BOM Capacity</th>
                  <th className="py-2.5 px-4">Fulfilment Status</th>
                  <th className="py-2.5 px-4 text-right">Dispatch Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {customers.slice(0, 5).map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div>{c.full_name}</div>
                      <div className="font-mono text-[10px] text-purple-700">{c.customer_code}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div>{c.installation_location || c.address_street}</div>
                      <div className="text-[11px] text-slate-400">{c.address_city}, {c.address_state}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {c.required_capacity_kw || 3.0} kW Solar Kit
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                        Ready for Reservation
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onSelectTab('inventory')}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-lg transition"
                      >
                        <PackageCheck className="h-3.5 w-3.5" />
                        Reserve &amp; Issue
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // D. TECHNICIAN VIEW: Assigned Rooftop Installation Sites
  if (role === 'Technician') {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                My Assigned Rooftop Sites &amp; Field Execution ({customers.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Field Technician Scope: Site addresses, technical specifications, job cards, and earthing safety tests.
              </p>
            </div>
          </div>
          <button
            onClick={() => onSelectTab('jobs')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <Activity className="h-3.5 w-3.5" />
            <span>Open Job Cards</span>
          </button>
        </div>

        {customers.length === 0 ? (
          <div className="p-6 bg-slate-50 rounded-xl text-center border border-dashed border-slate-200">
            <p className="text-xs text-slate-500">No rooftop installation projects currently assigned to you.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Customer &amp; Site</th>
                  <th className="py-2.5 px-4">Installation Address</th>
                  <th className="py-2.5 px-4">Solar Capacity</th>
                  <th className="py-2.5 px-4">Installation Stage</th>
                  <th className="py-2.5 px-4 text-right">Job Execution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {customers.slice(0, 5).map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div>{c.full_name}</div>
                      <div className="text-[11px] font-normal text-slate-500">Ph: {c.phone}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div>{c.installation_location || c.address_street}</div>
                      <div className="text-[11px] text-slate-400">{c.address_city}, {c.address_state}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-emerald-700">
                      {c.required_capacity_kw || 3.0} kWp ({c.solar_requirement || 'On-Grid'})
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                        Crew Dispatched
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onSelectTab('jobs')}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition"
                      >
                        <Wrench className="h-3.5 w-3.5" />
                        Execute Job
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // E. SUPPORT VIEW: Assigned Customer Cases & Tickets
  if (role === 'Support') {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                My Assigned Customer Accounts &amp; Helpdesk Cases ({customers.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Support Scope: Customer relationship management, warranty lookup, and SLA ticket resolution.
              </p>
            </div>
          </div>
          <button
            onClick={() => onSelectTab('tickets')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <LifeBuoy className="h-3.5 w-3.5" />
            <span>Open Helpdesk</span>
          </button>
        </div>

        {customers.length === 0 ? (
          <div className="p-6 bg-slate-50 rounded-xl text-center border border-dashed border-slate-200">
            <p className="text-xs text-slate-500">No active customer cases assigned to your support queue.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Customer</th>
                  <th className="py-2.5 px-4">Contact</th>
                  <th className="py-2.5 px-4">System Spec</th>
                  <th className="py-2.5 px-4">Support Status</th>
                  <th className="py-2.5 px-4 text-right">Case Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {customers.slice(0, 5).map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div>{c.full_name}</div>
                      <div className="font-mono text-[10px] text-teal-700">{c.customer_code}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div>{c.phone}</div>
                      <div className="text-[11px] text-slate-400">{c.email || 'No email'}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {c.required_capacity_kw || 3.0} kW System
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800">
                        Active Coverage
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onSelectTab('tickets')}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-lg transition"
                      >
                        Helpdesk <ChevronRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return null;
}

/* =========================================================================
   MAIN BUSINESS OVERVIEW COMPONENT
   ========================================================================= */
function BusinessOverview({ user, onSelectTab }) {
  return (
    <div className="space-y-6">
      {/* Welcome Banner in Clean Commercial Light Theme */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-2">
            <Sun className="h-3.5 w-3.5 text-emerald-600" />
            Active Role: {user?.role}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Welcome back, {user?.fullName || user?.email}
          </h1>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
            SunPower Solutions Solar Installation Management Portal. Manage leads, review quotations, reserve warehouse inventory, conduct field installations, and support customers through a unified workflow.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {user?.role === 'Admin/Owner' && (
            <button
              onClick={() => onSelectTab('users')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-sm"
            >
              <Users className="h-4 w-4 text-slate-500" />
              Manage Users
            </button>
          )}
        </div>
      </div>

      {/* Role-Specific Metrics */}
      <RoleMetricsCards role={user?.role} />

      {/* Role-Wise Automatic Customer Assignment & Task Distribution */}
      <RoleCustomerAssignmentWidget user={user} onSelectTab={onSelectTab} />

      {/* Sequential 6-Step Visual Workflow Stepper */}
      <SequentialWorkflowStepper onSelectTab={onSelectTab} currentRole={user?.role} />

      {/* Live Pipeline Status Table */}
      <RecentProjectsTable onSelectTab={onSelectTab} />
    </div>
  );
}

/* =========================================================================
   DASHBOARD ROUTER
   ========================================================================= */
export default function Dashboard({ activeTab = 'dashboard', onSelectTab = () => {} }) {
  const { user } = useAuth();
  const normalizedRole = user?.role === 'Admin/Owner' ? 'Admin' : (user?.role || 'Admin');

  // 1. Customer Portal Dedicated Routing (Strictly customer-facing views)
  if (user?.role === 'Customer') {
    if (activeTab === 'requirements') {
      return <CustomerInstallationRequirements onSelectTab={onSelectTab} />;
    }
    if (activeTab === 'status' || activeTab === 'jobs') {
      return <CustomerInstallationStatusView onSelectTab={onSelectTab} />;
    }
    if (activeTab === 'tickets') {
      return <SupportFinanceApp key="customer-tickets" activeTab="support" currentRole="Customer" />;
    }
    // Block internal operations, inventory, quotes, customers, users, finance, audit for Customer
    return <CustomerDashboardView onSelectTab={onSelectTab} />;
  }

  // 2. Technician Portal Dedicated Routing
  if (user?.role === 'Technician') {
    if (activeTab === 'jobs') {
      return <TechnicianJobCardPortal onSelectTab={onSelectTab} />;
    }
    if (activeTab === 'customers') {
      return <CustomerSalesModule key="customers" initialTab="customers" />;
    }
    if (activeTab === 'tickets') {
      return <SupportFinanceApp key="technician-tickets" activeTab="support" currentRole="Technician" />;
    }
    // Block inventory, users, finance, audit for Technician
    return <BusinessOverview user={user} onSelectTab={onSelectTab} />;
  }

  // 3. Warehouse Portal Dedicated Routing
  if (user?.role === 'Warehouse') {
    if (activeTab === 'inventory') {
      return <OperationsModule key="warehouse-operations" currentRole="Warehouse" initialTab="inventory" />;
    }
    if (activeTab === 'customers') {
      return <CustomerSalesModule key="customers" initialTab="customers" />;
    }
    // Block jobs (rooftop execution), users, finance, audit for Warehouse
    return <BusinessOverview user={user} onSelectTab={onSelectTab} />;
  }

  // 4. Admin / Management Portal Routing
  // 4.1 User Management (Admin/Owner restricted)
  if (activeTab === 'users' && user?.role === 'Admin/Owner') {
    return <UserManagementView />;
  }

  // 4.2 Customer & Quotation Management (Requirements Review, Quote Approvals, Settings)
  if (activeTab === 'customers') {
    return <CustomerSalesModule key="customers" initialTab="customers" />;
  }

  // 4.3 Operations & Fulfilment Hub (Admin oversight)
  if (activeTab === 'inventory') {
    return <OperationsModule key="inventory" currentRole={user?.role} initialTab="inventory" />;
  }

  // 4.4 Rooftop Jobs (Admin field execution monitoring)
  if (activeTab === 'jobs') {
    return <OperationsModule key="jobs" currentRole={user?.role} initialTab="jobcard" />;
  }

  // 4.5 Support & Helpdesk
  if (activeTab === 'tickets') {
    return <SupportFinanceApp key="tickets" activeTab="support" currentRole={normalizedRole} />;
  }

  // 4.6 Financial Margins (Admin/Owner restricted)
  if (activeTab === 'finance' && user?.role === 'Admin/Owner') {
    return <SupportFinanceApp key="finance" activeTab="finance" currentRole={normalizedRole} />;
  }

  // 4.7 Security & Audit Logs (Admin/Owner restricted)
  if (activeTab === 'audit' && user?.role === 'Admin/Owner') {
    return <CleanAuditLogsView user={user} />;
  }

  // 5. Default: Business Overview with Sequential Stepper
  return <BusinessOverview user={user} onSelectTab={onSelectTab} />;
}
