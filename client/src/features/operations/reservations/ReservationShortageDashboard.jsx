import React, { useState, useEffect } from 'react';
import { operationsApi } from '../services/operationsApi';
import {
  Layers,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Unlock,
  RefreshCw,
  Clock,
  ArrowRight
} from 'lucide-react';

export default function ReservationShortageDashboard() {
  const [shortages, setShortages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projectIdInput, setProjectIdInput] = useState('proj-solar-3kw-01');
  const [orderIdInput, setOrderIdInput] = useState('ord-solar-3kw-PAID');
  const [activeProjectBom, setActiveProjectBom] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const fetchShortages = async () => {
    try {
      setLoading(true);
      const res = await operationsApi.getShortages();
      setShortages(res || []);
    } catch (err) {
      console.error('Error fetching shortages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShortages();
    handleFetchBom();
  }, []);

  const handleFetchBom = async () => {
    try {
      const items = await operationsApi.getProjectBom(projectIdInput);
      setActiveProjectBom(items && items.length > 0 ? items : null);
    } catch (err) {
      setActiveProjectBom(null);
    }
  };

  const handleReserveStock = async () => {
    try {
      setActionLoading(true);
      setFeedback(null);
      const res = await operationsApi.reserveStock(projectIdInput, { orderId: orderIdInput });
      setFeedback({
        type: res.status === 'SHORTAGE_FLAGGED' ? 'warning' : 'success',
        message: res.message,
        shortages: res.shortages || []
      });
      fetchShortages();
      handleFetchBom();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReleaseStock = async () => {
    try {
      setActionLoading(true);
      const res = await operationsApi.releaseStock(projectIdInput);
      setFeedback({ type: 'success', message: res.message });
      fetchShortages();
      handleFetchBom();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Layers className="h-6 w-6 text-amber-500" />
          Stock Reservation & Shortage Dashboard
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Lock warehouse inventory against accepted commercial project orders. Flag component deficits with exact shortages.
        </p>
      </div>

      {/* Shortage Summary Cards */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Active Hardware Deficits & Supply Shortages
        </h3>

        {loading ? (
          <div className="py-8 text-center text-slate-400">Loading shortages...</div>
        ) : shortages.length === 0 ? (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-5 w-5" />
            Zero component shortages detected across all active projects. Full inventory availability.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shortages.map((s) => (
              <div
                key={s.sku}
                className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-sm font-bold text-rose-400">{s.sku}</span>
                    <span className="text-xs bg-rose-500/20 text-rose-300 font-bold px-2 py-0.5 rounded">
                      Deficit: -{s.totalDeficit}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-white">{s.name}</div>
                  <div className="text-xs text-slate-400 mt-2">
                    Available in WH: <span className="text-white font-mono">{s.available}</span> | Total Deficit: <span className="text-rose-400 font-mono font-bold">-{s.totalDeficit}</span>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-rose-500/20 text-xs text-slate-400">
                  Affected Projects: {s.affectedProjects?.map((p) => p.projectId).join(', ')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Project Reservation Action Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-bold text-white">Project Stock Reservation Gate</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Project Identifier</label>
            <input
              type="text"
              value={projectIdInput}
              onChange={(e) => setProjectIdInput(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Order Identifier</label>
            <input
              type="text"
              value={orderIdInput}
              onChange={(e) => setOrderIdInput(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-amber-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleReserveStock}
              disabled={actionLoading}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl shadow"
            >
              <Lock className="h-4 w-4" /> Reserve Stock
            </button>
            <button
              onClick={handleReleaseStock}
              disabled={actionLoading}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm rounded-xl border border-slate-700"
              title="Release reservation back to available pool"
            >
              <Unlock className="h-4 w-4" />
            </button>
          </div>
        </div>

        {feedback && (
          <div
            className={`p-4 rounded-xl text-sm font-medium border ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : feedback.type === 'warning'
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}
          >
            <div>{feedback.message}</div>
            {feedback.shortages && feedback.shortages.length > 0 && (
              <ul className="mt-2 text-xs space-y-1 list-disc list-inside">
                {feedback.shortages.map((sh, i) => (
                  <li key={i}>
                    {sh.sku} ({sh.name}): Needed {sh.required}, available {sh.currentlyAvailable}, deficit: -{sh.deficit}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Project BOM items preview */}
        {activeProjectBom && (
          <div className="mt-4 pt-4 border-t border-slate-800">
            <h4 className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
              Project BOM Line Items & Fulfilment State
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-slate-500 uppercase border-b border-slate-800">
                  <tr>
                    <th className="py-2 px-3">SKU</th>
                    <th className="py-2 px-3">Component</th>
                    <th className="py-2 px-3 text-center">Required</th>
                    <th className="py-2 px-3 text-center">Reserved</th>
                    <th className="py-2 px-3 text-center">Dispatched</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-slate-300">
                  {activeProjectBom.map((item) => (
                    <tr key={item.sku}>
                      <td className="py-2 px-3 font-mono font-bold text-amber-400">{item.sku}</td>
                      <td className="py-2 px-3">{item.name}</td>
                      <td className="py-2 px-3 text-center font-bold">{item.quantityRequired}</td>
                      <td className="py-2 px-3 text-center font-mono text-emerald-400 font-bold">
                        {item.quantityReserved}
                      </td>
                      <td className="py-2 px-3 text-center font-mono text-blue-400">
                        {item.quantityDispatched || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
