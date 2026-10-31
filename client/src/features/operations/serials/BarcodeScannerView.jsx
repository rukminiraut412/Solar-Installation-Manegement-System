import React, { useState, useEffect } from 'react';
import { operationsApi } from '../services/operationsApi';
import {
  QrCode,
  Scan,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  Truck,
  RotateCcw,
  Search,
  Filter
} from 'lucide-react';

export default function BarcodeScannerView({ onSelectSerial }) {
  const [serials, setSerials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanInput, setScanInput] = useState('');
  const [dispatchOrderId, setDispatchOrderId] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [quarantineModal, setQuarantineModal] = useState(null);
  const [quarantineReason, setQuarantineReason] = useState('');

  const fetchSerials = async () => {
    try {
      setLoading(true);
      const res = await operationsApi.listSerials();
      setSerials(res || []);
    } catch (err) {
      console.error('Error fetching serials:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSerials();
  }, []);

  const handleScanSubmit = async (e) => {
    e.preventDefault();
    if (!scanInput.trim()) return;

    try {
      setScanResult(null);
      if (dispatchOrderId) {
        // Verify against dispatch order manifest
        const res = await operationsApi.verifySerialForDispatch(dispatchOrderId, scanInput.trim());
        setScanResult({
          type: 'success',
          message: `Serial ${res.serialNumber} verified for dispatch manifest! (${res.scannedForProduct}/${res.requiredForProduct} scanned)`
        });
      } else {
        // Quick registry lookup
        const trace = await operationsApi.getSerialTraceability(scanInput.trim());
        setScanResult({
          type: 'info',
          message: `Found registered ${trace.serialItem.productName} (${trace.serialItem.status})`,
          item: trace.serialItem
        });
      }
      setScanInput('');
      fetchSerials();
    } catch (err) {
      setScanResult({
        type: 'error',
        message: err.message
      });
    }
  };

  const handleQuarantine = async () => {
    if (!quarantineModal) return;
    try {
      await operationsApi.quarantineSerial(quarantineModal.serialNumber, {
        reason: quarantineReason,
        newStatus: 'RETURNED_DEFECTIVE'
      });
      alert(`Serial ${quarantineModal.serialNumber} moved to quarantine.`);
      setQuarantineModal(null);
      setQuarantineReason('');
      fetchSerials();
    } catch (err) {
      alert(`Quarantine Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <QrCode className="h-6 w-6 text-amber-500" />
          Barcode & Serial Scanner Interface
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          100% component verification before dispatch, field quarantine, and barcode/QR registration.
        </p>
      </div>

      {/* Mobile-Friendly Barcode Scanner Box */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="max-w-xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Scan className="h-4 w-4" /> Optical Scanner Mode
            </span>
            <span className="text-xs text-slate-500 font-mono">Laser / Camera Active</span>
          </div>

          <form onSubmit={handleScanSubmit} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Dispatch Manifest ID (Optional for verification)
                </label>
                <input
                  type="text"
                  placeholder="e.g. disp-1730... or blank for lookup"
                  value={dispatchOrderId}
                  onChange={(e) => setDispatchOrderId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Scan / Enter Serial Number *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="INV-GROW-3K-26-00101"
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    className="w-full pl-3 pr-20 py-2 bg-slate-950 border border-amber-500/40 rounded-xl text-sm font-mono text-amber-400 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="submit"
                    className="absolute right-1.5 top-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg shadow"
                  >
                    Scan
                  </button>
                </div>
              </div>
            </div>
          </form>

          {/* Scan Results Banner */}
          {scanResult && (
            <div
              className={`p-4 rounded-xl text-xs font-medium border flex items-center justify-between ${
                scanResult.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : scanResult.type === 'info'
                  ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}
            >
              <span>{scanResult.message}</span>
              {scanResult.item && onSelectSerial && (
                <button
                  onClick={() => onSelectSerial(scanResult.item.serialNumber)}
                  className="px-2 py-1 bg-slate-800 text-white rounded text-xs hover:bg-slate-700"
                >
                  View 360° Dossier
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Registered Serials Registry Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Authoritative Serial Items Registry ({serials.length})
          </h3>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400">Loading serial registry...</div>
        ) : serials.length === 0 ? (
          <div className="py-12 text-center text-slate-500">No serial items registered yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/50 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Serial Number</th>
                  <th className="py-3 px-4">Component & SKU</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-center">Lifecycle Status</th>
                  <th className="py-3 px-4">Registered Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {serials.map((s) => (
                  <tr key={s.id || s.serialNumber} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-mono font-bold text-amber-400">
                      {s.serialNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{s.productName}</div>
                      <div className="text-slate-500 font-mono">{s.sku}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{s.category}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold ${
                          s.status === 'INSTALLED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : s.status === 'DISPATCHED'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : s.status === 'IN_WAREHOUSE'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      {onSelectSerial && (
                        <button
                          onClick={() => onSelectSerial(s.serialNumber)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-semibold border border-slate-700"
                        >
                          Trace
                        </button>
                      )}
                      <button
                        onClick={() => setQuarantineModal(s)}
                        className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded text-xs font-semibold border border-rose-500/20"
                      >
                        Quarantine
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quarantine Modal */}
      {quarantineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-500" />
              Quarantine Hardware Component
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Moving <span className="font-mono text-amber-400 font-bold">{quarantineModal.serialNumber}</span> to defective / quarantine status. This prevents dispatch or warranty claims.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Reason for Defect / Quarantine *</label>
                <textarea
                  rows="3"
                  required
                  placeholder="Explain damage, transit failure, or customer return..."
                  value={quarantineReason}
                  onChange={(e) => setQuarantineReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setQuarantineModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleQuarantine}
                  disabled={!quarantineReason.trim()}
                  className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold shadow"
                >
                  Confirm Quarantine
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
