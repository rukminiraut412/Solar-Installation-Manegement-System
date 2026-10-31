import React, { useState, useEffect } from 'react';
import { operationsApi } from '../services/operationsApi';
import {
  History,
  Search,
  QrCode,
  ShieldCheck,
  Truck,
  Wrench,
  Clock,
  ArrowRight,
  Package,
  Calendar,
  AlertCircle
} from 'lucide-react';

export default function SerialTraceabilityDossier({ initialSerialNumber = 'INV-GROW-3K-26-00101' }) {
  const [serialQuery, setSerialQuery] = useState(initialSerialNumber);
  const [dossier, setDossier] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTraceability = async (sn) => {
    if (!sn) return;
    try {
      setLoading(true);
      setError(null);
      const res = await operationsApi.getSerialTraceability(sn);
      setDossier(res);
    } catch (err) {
      setError(err.message || 'Serial number not found');
      setDossier(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialSerialNumber) {
      setSerialQuery(initialSerialNumber);
      fetchTraceability(initialSerialNumber);
    }
  }, [initialSerialNumber]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchTraceability(serialQuery.trim());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <History className="h-6 w-6 text-amber-500" />
            360-Degree Serial Traceability Dossier
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Authoritative lifecycle from factory receipt &rarr; warehouse &rarr; dispatch manifest &rarr; rooftop installation &rarr; warranty.
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            placeholder="Enter Serial Number..."
            value={serialQuery}
            onChange={(e) => setSerialQuery(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-amber-400 focus:outline-none focus:border-amber-500 w-64"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow"
          >
            Trace
          </button>
        </form>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400">Tracing serial component lifecycle...</div>
      ) : error ? (
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-center text-rose-400 text-sm">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          {error}
        </div>
      ) : !dossier ? null : (
        <div className="space-y-6">
          {/* Top Component Identity Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-slate-500">
                  Serialized Component Unit
                </span>
                <h3 className="text-xl font-bold text-white mt-1">
                  {dossier.serialItem.productName}
                </h3>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                  <span>SKU: <strong className="font-mono text-amber-400">{dossier.serialItem.sku}</strong></span>
                  <span>Category: <strong>{dossier.serialItem.category}</strong></span>
                  <span>Unit Cost: <strong className="font-mono">₹{((dossier.serialItem.unitCostPaise || 0) / 100).toLocaleString()}</strong></span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <span className="font-mono text-base font-bold text-amber-400 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  {dossier.serialItem.serialNumber}
                </span>
                <span
                  className={`px-3 py-0.5 rounded-full text-xs font-bold ${
                    dossier.serialItem.status === 'INSTALLED'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : dossier.serialItem.status === 'DISPATCHED'
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}
                >
                  Status: {dossier.serialItem.status}
                </span>
              </div>
            </div>

            {/* 3 Milestone Blocks */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
              {/* Dispatch Manifest */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-blue-400 mb-2">
                  <Truck className="h-4 w-4" /> Transit & Dispatch
                </div>
                {dossier.dispatchManifest ? (
                  <div className="space-y-1 text-xs text-slate-300">
                    <div>Manifest: <strong className="font-mono text-amber-400">{dossier.dispatchManifest.manifestNumber}</strong></div>
                    <div>Status: <span className="font-semibold text-white">{dossier.dispatchManifest.status}</span></div>
                    <div>Dispatched: {dossier.dispatchManifest.dispatchedAt ? new Date(dossier.dispatchManifest.dispatchedAt).toLocaleDateString() : 'Pending'}</div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic">Not yet assigned to dispatch manifest.</div>
                )}
              </div>

              {/* Rooftop Installation */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-purple-400 mb-2">
                  <Wrench className="h-4 w-4" /> Rooftop Installation
                </div>
                {dossier.installation ? (
                  <div className="space-y-1 text-xs text-slate-300">
                    <div>Job ID: <strong className="font-mono text-purple-400">{dossier.installation.id}</strong></div>
                    <div>Status: <span className="font-semibold text-white">{dossier.installation.status}</span></div>
                    <div>Completed: {dossier.installation.completedAt ? new Date(dossier.installation.completedAt).toLocaleDateString() : 'In Progress'}</div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic">No installation job recorded.</div>
                )}
              </div>

              {/* Warranty Coverage */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-amber-400 mb-2">
                  <ShieldCheck className="h-4 w-4" /> Warranty Coverage
                </div>
                {dossier.warranty ? (
                  <div className="space-y-1 text-xs text-slate-300">
                    <div>Status: <span className="font-bold text-emerald-400">{dossier.warranty.status}</span></div>
                    <div>Valid Until: <strong className="font-mono text-white">{dossier.warranty.endDate}</strong></div>
                    <div>Terms: {dossier.warranty.termsMonths} Months Duration</div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic">Warranty not yet activated (activates on delivery).</div>
                )}
              </div>
            </div>
          </div>

          {/* Immutable Audit Trail Timeline */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Chronological Audit Trail & State Transitions
            </h4>

            {dossier.history?.length === 0 ? (
              <div className="text-xs text-slate-500">No state transition events recorded.</div>
            ) : (
              <div className="relative pl-6 border-l border-slate-800 space-y-6">
                {dossier.history.map((h, i) => (
                  <div key={h.id || i} className="relative">
                    <div className="absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full bg-amber-500 border-4 border-slate-950" />
                    <div className="text-xs font-mono text-slate-500">
                      {new Date(h.createdAt).toLocaleString()}
                    </div>
                    <div className="text-sm font-bold text-white mt-0.5">
                      {h.action}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {h.previousStatus ? `${h.previousStatus} ➔ ` : ''}
                      <span className="text-amber-400 font-semibold">{h.newStatus}</span>
                    </div>
                    {h.notes && (
                      <div className="text-xs text-slate-400 mt-1 italic bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                        {h.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
