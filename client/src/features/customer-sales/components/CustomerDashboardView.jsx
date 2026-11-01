import React, { useState, useEffect } from 'react';
import {
  Sun,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet,
  BadgeIndianRupee,
  Wrench,
  LifeBuoy,
  ChevronRight,
  AlertCircle,
  FileCheck,
  Boxes,
  Zap,
  Check,
  X,
  Truck,
  QrCode,
  Layers,
  CalendarCheck,
  Lock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../../shared/context/AuthContext';
import customerSalesApi from '../api/customerSalesApi';

export default function CustomerDashboardView({ onSelectTab }) {
  const { user } = useAuth();
  const [requirements, setRequirements] = useState(null);
  const [quotation, setQuotation] = useState(null);
  const [workflowStages, setWorkflowStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showBomDetails, setShowBomDetails] = useState(true);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    loadCustomerData();
  }, []);

  const loadCustomerData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Load customer requirements
      try {
        const reqRes = await customerSalesApi.getMyRequirements();
        if (reqRes?.data) {
          setRequirements(reqRes.data);
        }
      } catch (err) {
        console.warn('Requirements load error:', err);
      }

      // 2. Load active quotation
      try {
        const quoteRes = await axios.get('/api/v1/operations/warehouse-quotations/customer/me', {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
        });
        if (quoteRes.data?.data) {
          setQuotation(quoteRes.data.data);
        }
      } catch (err) {
        console.warn('Quotation load error:', err);
      }

      // 3. Load workflow stages
      try {
        const wfRes = await axios.get('/api/v1/workflow/stages/me', {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
        });
        if (wfRes.data?.data?.stages) {
          setWorkflowStages(wfRes.data.data.stages);
        }
      } catch (err) {
        console.warn('Workflow stages load error:', err);
      }
    } catch (err) {
      console.warn('Customer dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerAction = async (action, notes = null) => {
    if (!quotation) return;
    try {
      setActionLoading(true);
      setError(null);
      await axios.post(
        `/api/v1/operations/warehouse-quotations/${quotation.id}/customer-action`,
        { action, customerNotes: notes },
        { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } }
      );

      setSuccess(
        action === 'ACCEPT'
          ? 'Quotation accepted! Materials have been reserved and Dispatch is unlocked.'
          : `Quotation ${action.replace('_', ' ')} processed.`
      );
      setShowRevisionModal(false);
      loadCustomerData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const isRequirementsApproved = requirements?.status === 'APPROVED';

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Welcome Card & Project Identifiers */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-2">
            <Sun className="h-3.5 w-3.5 text-emerald-600" />
            Customer Self-Service Portal
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Welcome, {user?.fullName || user?.email}
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Live solar project lifecycle: from specifications and warehouse quotation to material reservation, serial verification, and rooftop commissioning.
          </p>

          {/* Project & Order ID Badges */}
          {(quotation?.project_code || requirements?.project_code) && (
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100">
              <span className="text-[11px] font-semibold text-slate-500">Official Identifiers:</span>
              <span className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono text-xs font-bold shadow-sm">
                Project ID: {quotation?.project_code || requirements?.project_code}
              </span>
              {(quotation?.order_number || requirements?.order_number) && (
                <span className="px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 font-mono text-xs font-bold shadow-sm">
                  Order ID: {quotation?.order_number || requirements?.order_number}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onSelectTab('requirements')}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>{requirements ? 'View My Specifications' : 'Submit Solar Specs'}</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          OFFICIAL WAREHOUSE QUOTATION & ACCEPTANCE SECTION
          ========================================================================= */}
      {quotation && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <BadgeIndianRupee className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    Official Quotation #{quotation.quotation_number}
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                    v{quotation.version}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      quotation.status === 'CUSTOMER_ACCEPTED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : quotation.status === 'ADMIN_APPROVED'
                        ? 'bg-blue-100 text-blue-800 animate-pulse'
                        : quotation.status === 'CUSTOMER_REVISION_REQUESTED'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {quotation.status === 'ADMIN_APPROVED'
                      ? 'AWAITING YOUR ACCEPTANCE'
                      : quotation.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Prepared by Warehouse Engineering &bull; System Capacity: {quotation.capacity_kw} kW &bull; Grid: {quotation.grid_type}
                </p>
              </div>
            </div>

            {/* Total Amount Badge */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-right">
              <span className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider block">
                Total All-Inclusive Amount
              </span>
              <span className="text-xl font-black text-emerald-900">
                ₹{Number(quotation.total_amount).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Pricing Summary Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-semibold text-slate-500 uppercase">Hardware Materials</span>
              <span className="text-sm font-bold text-slate-800 block mt-0.5">
                ₹{Number(quotation.hardware_subtotal).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-semibold text-slate-500 uppercase">Installation & Labor</span>
              <span className="text-sm font-bold text-slate-800 block mt-0.5">
                ₹{Number(quotation.installation_labor_cost).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-semibold text-slate-500 uppercase">
                GST / Applicable Taxes ({quotation.tax_percent}%)
              </span>
              <span className="text-sm font-bold text-slate-800 block mt-0.5">
                ₹{Number(quotation.tax_amount).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200">
              <span className="text-[10px] font-semibold text-emerald-800 uppercase">Customer Status</span>
              <span className="text-sm font-bold text-emerald-900 block mt-0.5">
                {quotation.status === 'CUSTOMER_ACCEPTED' ? 'Accepted & Reserved' : 'Published'}
              </span>
            </div>
          </div>

          {/* Itemized BOM Collapse Toggle */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowBomDetails(!showBomDetails)}
              className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-bold text-slate-700 transition"
            >
              <div className="flex items-center gap-2">
                <Boxes className="h-4 w-4 text-slate-500" />
                <span>Itemized Bill of Materials (BOM) & Equipment Specifications</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px]">
                  {quotation.items?.length || 0} items
                </span>
              </div>
              {showBomDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showBomDetails && quotation.items && quotation.items.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Component & Description</th>
                      <th className="py-2.5 px-4">Category</th>
                      <th className="py-2.5 px-4">SKU</th>
                      <th className="py-2.5 px-4 text-center">Quantity</th>
                      <th className="py-2.5 px-4 text-right">Unit Price</th>
                      <th className="py-2.5 px-4 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {quotation.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-4 font-semibold text-slate-900">
                          {item.name}
                          {item.is_serialized && (
                            <span className="ml-1.5 px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 text-[9px] font-bold">
                              Serialized
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-slate-500">{item.category}</td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500">{item.sku}</td>
                        <td className="py-2.5 px-4 text-center font-bold">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="py-2.5 px-4 text-right text-slate-600">
                          ₹{Number(item.unit_price).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                          ₹{Number(item.total_price).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Customer Acceptance Actions */}
          {quotation.status === 'ADMIN_APPROVED' && (
            <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-emerald-950 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Your Quotation is Approved & Ready for Your Confirmation
                </h4>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Accepting will automatically reserve inventory against your project and unlock the Dispatch & Challan stage.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  disabled={actionLoading}
                  onClick={() => handleCustomerAction('ACCEPT')}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  Accept Quotation & Unlock Dispatch
                </button>

                <button
                  disabled={actionLoading}
                  onClick={() => setShowRevisionModal(true)}
                  className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl shadow-sm transition"
                >
                  Request Revision
                </button>

                <button
                  disabled={actionLoading}
                  onClick={() => handleCustomerAction('DECLINE', 'Customer declined quotation')}
                  className="px-3 py-2.5 text-rose-600 hover:bg-rose-50 font-semibold text-xs rounded-xl transition"
                >
                  Decline
                </button>
              </div>
            </div>
          )}

          {quotation.status === 'CUSTOMER_ACCEPTED' && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <div className="text-xs font-bold text-emerald-900">
                  Quotation Accepted on {new Date(quotation.accepted_at || quotation.updated_at).toLocaleDateString()}
                </div>
                <div className="text-xs text-emerald-700 mt-0.5">
                  BOM has been frozen, physical warehouse stock has been reserved, and Dispatch & Challan is actively unlocked.
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Revision Request Modal */}
      {showRevisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Request Quotation Revision</h3>
            <p className="text-xs text-slate-500">
              Please enter notes or changes you would like Warehouse & Admin to make to your quotation:
            </p>
            <textarea
              rows={4}
              value={revisionNotes}
              onChange={(e) => setRevisionNotes(e.target.value)}
              placeholder="e.g. Please consider 450W bifacial panels instead or adjust structure layout..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowRevisionModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs rounded-xl hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCustomerAction('REQUEST_REVISION', revisionNotes)}
                disabled={actionLoading || !revisionNotes.trim()}
                className="px-4 py-2 bg-emerald-600 text-white font-semibold text-xs rounded-xl hover:bg-emerald-700 disabled:opacity-50"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          12-STAGE SEQUENTIAL WORKFLOW JOURNEY TRACKER
          ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Complete Solar Installation Workflow</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live sequential stages governed by strict backend verification.
            </p>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">12 Sequential Stages</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {workflowStages.length > 0 ? (
            workflowStages.map((st) => {
              const isCompleted = st.status === 'COMPLETED';
              const isInProgress = st.status === 'IN_PROGRESS';
              const isLocked = st.status === 'LOCKED';

              return (
                <div
                  key={st.step}
                  className={`p-3.5 rounded-xl border transition ${
                    isCompleted
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                      : isInProgress
                      ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-100 text-blue-950 shadow-sm'
                      : 'bg-slate-50/50 border-slate-200 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isCompleted
                          ? 'bg-emerald-200 text-emerald-900'
                          : isInProgress
                          ? 'bg-blue-200 text-blue-900'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      Stage {st.step}
                    </span>
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : isInProgress ? (
                      <Clock className="h-4 w-4 text-blue-600 animate-pulse" />
                    ) : (
                      <Lock className="h-3.5 w-3.5 text-slate-400" />
                    )}
                  </div>
                  <h4 className="text-xs font-bold mb-1 truncate">{st.name}</h4>
                  <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">
                    {st.details}
                  </p>
                  {isLocked && st.prerequisite && (
                    <div className="text-[9px] text-amber-700 mt-1 font-medium italic">
                      Requires: {st.prerequisite}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-6 text-center text-slate-400 text-xs">
              Loading workflow status...
            </div>
          )}
        </div>
      </div>

      {/* Quick Action Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Requirements */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 hover:border-slate-300 transition">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl w-fit">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Installation Specs</h3>
            <p className="text-xs text-slate-500 mt-1">
              {requirements
                ? `Submitted: ${requirements.required_capacity_kw || 3} kW (${requirements.property_type || 'Residential'})`
                : 'Enter roof area, DISCOM details & capacity needs'}
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                requirements?.status === 'APPROVED'
                  ? 'bg-emerald-100 text-emerald-800'
                  : requirements?.status === 'CHANGES_REQUESTED'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-blue-100 text-blue-800'
              }`}
            >
              {requirements?.status || 'PENDING SUBMISSION'}
            </span>
            <button
              onClick={() => onSelectTab('requirements')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              Manage <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Card 2: Dispatch & Challan */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 hover:border-slate-300 transition">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl w-fit">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Dispatch & Delivery</h3>
            <p className="text-xs text-slate-500 mt-1">
              Transporter manifest, vehicle tracking and delivery challan.
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {quotation?.status === 'CUSTOMER_ACCEPTED' ? 'UNLOCKED' : 'LOCKED'}
            </span>
            <button
              onClick={() => onSelectTab('jobs')}
              className="text-xs font-semibold text-blue-700 hover:text-blue-800 flex items-center gap-1"
            >
              View Dispatch <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Card 3: Rooftop Installation */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 hover:border-slate-300 transition">
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl w-fit">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Rooftop Installation</h3>
            <p className="text-xs text-slate-500 mt-1">
              Certified technician crew assignment, schedule & commissioning sign-off.
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {isRequirementsApproved ? 'ACTIVE' : 'AWAITING APPROVAL'}
            </span>
            <button
              onClick={() => onSelectTab('jobs')}
              className="text-xs font-semibold text-purple-700 hover:text-purple-800 flex items-center gap-1"
            >
              Job Details <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Card 4: Support & Warranty */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 hover:border-slate-300 transition">
          <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl w-fit">
            <LifeBuoy className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Warranty & Helpdesk</h3>
            <p className="text-xs text-slate-500 mt-1">
              Component serial lookup, 25-year panel warranty, and SLA customer tickets.
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              ACTIVE COVERAGE
            </span>
            <button
              onClick={() => onSelectTab('tickets')}
              className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1"
            >
              Get Support <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
