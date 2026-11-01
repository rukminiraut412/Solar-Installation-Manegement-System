import React, { useState, useEffect } from 'react';
import {
  FileText,
  BadgeIndianRupee,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Search,
  Eye,
  Check,
  RotateCcw,
  Boxes,
  User,
  Phone,
  Mail,
  Zap,
  Building,
} from 'lucide-react';
import axios from 'axios';

export default function AdminQuotationApprovals() {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Modal Review State
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [quoteDetails, setQuoteDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [reviewDecision, setReviewDecision] = useState('APPROVE');
  const [adminNotes, setAdminNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadQuotations();
  }, []);

  const loadQuotations = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get('/api/v1/operations/warehouse-quotations', {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      if (res.data?.data) {
        setQuotations(res.data.data);
      }
    } catch (err) {
      setError('Failed to load quotations for review');
    } finally {
      setLoading(false);
    }
  };

  const openReviewModal = async (quote) => {
    setSelectedQuote(quote);
    setReviewDecision('APPROVE');
    setAdminNotes('');
    setDetailsLoading(true);
    try {
      const res = await axios.get(`/api/v1/operations/warehouse-quotations/${quote.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      if (res.data?.data) {
        setQuoteDetails(res.data.data);
      }
    } catch (err) {
      setError('Failed to fetch quotation details');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedQuote) return;
    try {
      setSubmitting(true);
      setError(null);
      await axios.post(
        `/api/v1/operations/warehouse-quotations/${selectedQuote.id}/admin-review`,
        { decision: reviewDecision, adminNotes },
        { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } }
      );
      setSuccess(
        `Quotation ${selectedQuote.quotation_number} ${
          reviewDecision === 'APPROVE'
            ? 'approved and published to customer dashboard'
            : reviewDecision === 'REQUEST_CHANGES'
            ? 'returned to Warehouse with change request'
            : 'rejected'
        }!`
      );
      setSelectedQuote(null);
      setQuoteDetails(null);
      loadQuotations();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Review failed');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredQuotes = quotations.filter((q) => {
    if (statusFilter !== 'ALL' && q.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      const numMatch = q.quotation_number?.toLowerCase().includes(s);
      const custMatch = q.customer_name?.toLowerCase().includes(s);
      const prjMatch = q.project_code?.toLowerCase().includes(s);
      return numMatch || custMatch || prjMatch;
    }
    return true;
  });

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

      {/* Top Banner & Search */}
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <BadgeIndianRupee className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Admin Quotation Approvals</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Review itemized BOM quotations submitted by Warehouse. Approve to publish to customer dashboard or return for revisions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search quotation, customer, project..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 w-64"
            />
          </div>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            statusFilter === 'ALL' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Quotations ({quotations.length})
        </button>
        <button
          onClick={() => setStatusFilter('SUBMITTED_TO_ADMIN')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
            statusFilter === 'SUBMITTED_TO_ADMIN'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse"></span>
          Awaiting Admin Review ({quotations.filter((q) => q.status === 'SUBMITTED_TO_ADMIN').length})
        </button>
        <button
          onClick={() => setStatusFilter('ADMIN_APPROVED')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
            statusFilter === 'ADMIN_APPROVED'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-blue-400"></span>
          Admin Approved ({quotations.filter((q) => q.status === 'ADMIN_APPROVED').length})
        </button>
        <button
          onClick={() => setStatusFilter('CUSTOMER_ACCEPTED')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
            statusFilter === 'CUSTOMER_ACCEPTED'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
          Customer Accepted ({quotations.filter((q) => q.status === 'CUSTOMER_ACCEPTED').length})
        </button>
      </div>

      {/* Quotations Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-3.5 px-4">Quotation #</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Project & Order IDs</th>
                <th className="py-3.5 px-4">System Spec</th>
                <th className="py-3.5 px-4 text-right">Total Amount</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-slate-400">
                    Loading quotations...
                  </td>
                </tr>
              ) : filteredQuotes.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-slate-500">
                    No quotations found in this category.
                  </td>
                </tr>
              ) : (
                filteredQuotes.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 font-mono text-xs">{q.quotation_number}</span>
                      <span className="ml-1.5 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold">
                        v{q.version}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(q.updated_at).toLocaleDateString()}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{q.customer_name}</div>
                      <div className="text-[11px] text-slate-500">{q.customer_phone}</div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      {q.project_code && (
                        <div className="text-indigo-700 font-semibold">{q.project_code}</div>
                      )}
                      {q.order_number && (
                        <div className="text-purple-700 font-semibold">{q.order_number}</div>
                      )}
                      {!q.project_code && !q.order_number && (
                        <span className="text-slate-400">Unassigned</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{q.capacity_kw} kW System</div>
                      <div className="text-[11px] text-slate-500">{q.grid_type}</div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="font-bold text-slate-900 text-sm">
                        ₹{Number(q.total_amount).toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {q.item_count || 'BOM'} items &bull; {q.tax_percent}% GST
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          q.status === 'SUBMITTED_TO_ADMIN'
                            ? 'bg-amber-100 text-amber-800 animate-pulse'
                            : q.status === 'ADMIN_APPROVED'
                            ? 'bg-blue-100 text-blue-800'
                            : q.status === 'CUSTOMER_ACCEPTED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : q.status === 'CHANGES_REQUESTED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {q.status === 'SUBMITTED_TO_ADMIN' ? 'AWAITING APPROVAL' : q.status.replace(/_/g, ' ')}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => openReviewModal(q)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-xl text-xs transition"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {q.status === 'SUBMITTED_TO_ADMIN' ? 'Review & Approve' : 'View BOM'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review & BOM Modal */}
      {selectedQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                  <BadgeIndianRupee className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Review Quotation #{selectedQuote.quotation_number} (v{selectedQuote.version})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Customer: {selectedQuote.customer_name} &bull; Project: {selectedQuote.project_code || 'Pending'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedQuote(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {detailsLoading ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Loading quotation details and BOM...
              </div>
            ) : quoteDetails ? (
              <form onSubmit={handleReviewSubmit} className="space-y-4">
                {/* Financial Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase">Hardware Subtotal</span>
                    <span className="text-sm font-bold text-slate-900 block mt-0.5">
                      ₹{Number(quoteDetails.hardware_subtotal).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase">Installation & Labor</span>
                    <span className="text-sm font-bold text-slate-900 block mt-0.5">
                      ₹{Number(quoteDetails.installation_labor_cost).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase">
                      GST ({quoteDetails.tax_percent}%)
                    </span>
                    <span className="text-sm font-bold text-slate-900 block mt-0.5">
                      ₹{Number(quoteDetails.tax_amount).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="text-[10px] text-emerald-800 font-semibold uppercase">Grand Total</span>
                    <span className="text-base font-black text-emerald-900 block mt-0.5">
                      ₹{Number(quoteDetails.total_amount).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Itemized BOM Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      <Boxes className="h-4 w-4 text-purple-600" />
                      Itemized Bill of Materials (BOM)
                    </span>
                    <span className="text-[11px] text-slate-500">{quoteDetails.items?.length || 0} line items</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/50 text-slate-500 uppercase text-[9px] tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3">Item</th>
                          <th className="py-2 px-3">Category</th>
                          <th className="py-2 px-3">SKU</th>
                          <th className="py-2 px-3 text-center">Qty</th>
                          <th className="py-2 px-3 text-right">Price</th>
                          <th className="py-2 px-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {quoteDetails.items?.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 font-medium text-slate-900">
                              {item.name}
                              {item.is_serialized && (
                                <span className="ml-1 px-1 py-0.2 bg-purple-100 text-purple-700 text-[8px] rounded font-bold">
                                  Serialized
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-slate-500">{item.category}</td>
                            <td className="py-2 px-3 font-mono text-[10px] text-slate-500">{item.sku}</td>
                            <td className="py-2 px-3 text-center font-bold">
                              {item.quantity} {item.unit}
                            </td>
                            <td className="py-2 px-3 text-right">₹{Number(item.unit_price).toLocaleString('en-IN')}</td>
                            <td className="py-2 px-3 text-right font-bold text-slate-900">
                              ₹{Number(item.total_price).toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Admin Decision Selection */}
                <div className="space-y-3 pt-2">
                  <label className="text-xs font-bold text-slate-800 block">Admin Action Decision</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setReviewDecision('APPROVE')}
                      className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        reviewDecision === 'APPROVE'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Check className="h-4 w-4" />
                      Approve &amp; Publish
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewDecision('REQUEST_CHANGES')}
                      className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        reviewDecision === 'REQUEST_CHANGES'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Request Changes
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewDecision('REJECT')}
                      className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        reviewDecision === 'REJECT'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <X className="h-4 w-4" />
                      Reject
                    </button>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">
                      Admin Notes &bull; Instructions for Warehouse / Customer:
                    </label>
                    <textarea
                      rows={3}
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="e.g. Approved with standard 12% GST and certified bifacial panels..."
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedQuote(null)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 text-xs rounded-xl hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-sm transition disabled:opacity-50"
                  >
                    {submitting ? 'Processing Review...' : 'Confirm Decision'}
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
