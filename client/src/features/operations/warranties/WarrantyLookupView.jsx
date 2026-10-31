import React, { useState, useEffect } from 'react';
import { operationsApi } from '../services/operationsApi';
import {
  ShieldCheck,
  Search,
  AlertCircle,
  Clock,
  Wrench,
  CheckCircle,
  Plus,
  FileText
} from 'lucide-react';

export default function WarrantyLookupView({ initialSerial = 'INV-GROW-3K-26-00101' }) {
  const [serialInput, setSerialInput] = useState(initialSerial);
  const [warrantyData, setWarrantyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Claim modal
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimIssue, setClaimIssue] = useState('');
  const [claimType, setClaimType] = useState('REPAIR');
  const [submittingClaim, setSubmittingClaim] = useState(false);

  const fetchWarranty = async (sn) => {
    if (!sn) return;
    try {
      setLoading(true);
      setError(null);
      const res = await operationsApi.getWarranty(sn);
      setWarrantyData(res);
    } catch (err) {
      setError(err.message || 'Warranty record not found for serial number');
      setWarrantyData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialSerial) {
      fetchWarranty(initialSerial);
    }
  }, [initialSerial]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchWarranty(serialInput.trim());
  };

  const handleCreateClaim = async (e) => {
    e.preventDefault();
    try {
      setSubmittingClaim(true);
      await operationsApi.createClaim({
        serialNumber: warrantyData.serialNumber,
        issueDescription: claimIssue,
        claimType
      });
      alert('Warranty claim submitted successfully!');
      setShowClaimModal(false);
      setClaimIssue('');
      fetchWarranty(warrantyData.serialNumber);
    } catch (err) {
      alert(`Claim Submission Error: ${err.message}`);
    } finally {
      setSubmittingClaim(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-amber-500" />
            Authoritative Warranty Lookup & Claims
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Authoritative warranty verification API consumed by Support & Finance (Member 4). Normalized statuses and coverage terms.
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            placeholder="Search Serial Number..."
            value={serialInput}
            onChange={(e) => setSerialInput(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-amber-400 focus:outline-none focus:border-amber-500 w-64"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow"
          >
            Check Warranty
          </button>
        </form>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400">Verifying authoritative warranty registry...</div>
      ) : error ? (
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-center text-rose-400 text-sm">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          {error}
        </div>
      ) : !warrantyData ? null : (
        <div className="space-y-6">
          {/* Warranty Main Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-slate-500">
                  Authoritative Serial Number
                </span>
                <div className="font-mono text-xl font-bold text-amber-400 mt-0.5">
                  {warrantyData.serialNumber}
                </div>
                <div className="text-sm font-semibold text-white mt-1">
                  {warrantyData.product?.name} ({warrantyData.product?.sku})
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <span
                  className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    warrantyData.status === 'WITHIN_PERIOD'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : warrantyData.status === 'EXPIRED'
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {warrantyData.status}
                </span>
                <span className="text-xs text-slate-400">
                  {warrantyData.serviceBilling?.rateNotice}
                </span>
              </div>
            </div>

            {/* Terms & Billing Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-500 font-semibold uppercase">Coverage Terms</span>
                <div className="text-lg font-bold text-white mt-1">
                  {warrantyData.terms?.durationMonths || 24} Months
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  ~{warrantyData.terms?.manufacturerWarrantyYears || 2} Years Manufacturer Protection
                </div>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-500 font-semibold uppercase">Validity Window</span>
                <div className="text-sm font-bold text-white mt-1 font-mono">
                  {warrantyData.terms?.startDate || 'Not Started'} ➔ {warrantyData.terms?.endDate || 'Not Started'}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Activated via: {warrantyData.terms?.activatedOnEvent || 'DELIVERY'}
                </div>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-500 font-semibold uppercase">Parts & Labor Billing</span>
                <div
                  className={`text-sm font-bold mt-1 ${
                    warrantyData.serviceBilling?.isPartsCovered ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {warrantyData.serviceBilling?.isPartsCovered
                    ? 'Covered Under Warranty (₹0 Billable)'
                    : 'Customer Billable Service'}
                </div>
                <div className="mt-2">
                  <button
                    onClick={() => setShowClaimModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg shadow"
                  >
                    <Plus className="h-3 w-3" /> Log Warranty Claim
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Past Claims Associated with Serial */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Wrench className="h-4 w-4 text-amber-500" />
              Claims & RMA History for this Component
            </h4>

            {warrantyData.claimsHistory?.length === 0 ? (
              <div className="p-4 bg-slate-950 rounded-xl text-center text-slate-500 text-xs">
                Zero warranty claims logged. Unit operates without recorded defects.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/50 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="p-2.5">Claim ID</th>
                      <th className="p-2.5">Issue Description</th>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5 text-center">Status</th>
                      <th className="p-2.5">Logged Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {warrantyData.claimsHistory.map((cl) => (
                      <tr key={cl.id}>
                        <td className="p-2.5 font-mono text-amber-400 font-bold">{cl.id}</td>
                        <td className="p-2.5">{cl.issueDescription}</td>
                        <td className="p-2.5 font-semibold text-white">{cl.claimType}</td>
                        <td className="p-2.5 text-center">
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            {cl.status}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-400 font-mono">
                          {new Date(cl.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Claim Submission Modal */}
      {showClaimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Wrench className="h-5 w-5 text-amber-500" />
              File Warranty Claim / RMA
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Component: <span className="font-mono text-amber-400 font-bold">{warrantyData?.serialNumber}</span> ({warrantyData?.status})
            </p>

            <form onSubmit={handleCreateClaim} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Claim Type *</label>
                <select
                  value={claimType}
                  onChange={(e) => setClaimType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="REPAIR">Field Technician Repair</option>
                  <option value="REPLACEMENT">Hardware Replacement (RMA)</option>
                  <option value="INVESTIGATION">Performance Deficit Investigation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Issue Description / Error Code *</label>
                <textarea
                  rows="3"
                  required
                  placeholder="e.g. Inverter error code 204: Grid frequency out of range"
                  value={claimIssue}
                  onChange={(e) => setClaimIssue(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowClaimModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingClaim || !claimIssue.trim()}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow"
                >
                  {submittingClaim ? 'Submitting...' : 'File Claim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
