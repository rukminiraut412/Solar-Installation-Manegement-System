import React, { useState, useEffect } from 'react';
import { operationsApi } from '../services/operationsApi';
import {
  Truck,
  Plus,
  QrCode,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  Printer,
  ShieldAlert,
  ChevronRight,
  MapPin,
  User,
  Phone
} from 'lucide-react';

export default function DispatchManagementView() {
  const [dispatchOrders, setDispatchOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedChallan, setSelectedChallan] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [form, setForm] = useState({
    projectId: 'proj-disp-test-01',
    orderId: 'ord-paid-7788',
    destinationAddress: 'Flat 402, Sunshine Heights, Aundh, Pune',
    transporterName: 'SunPower Logistics Fleet',
    vehicleNumber: 'MH-12-SP-2026',
    driverName: 'Suresh Patil',
    driverPhone: '+91 98765 43210',
    overrideAdvancePayment: false,
    overrideReason: ''
  });

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await operationsApi.listDispatchOrders();
      setDispatchOrders(res || []);
    } catch (err) {
      console.error('Error fetching dispatch orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleCreateDispatch = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await operationsApi.createDispatch({
        ...form,
        overrideAdvancePayment: form.overrideAdvancePayment,
        overrideReason: form.overrideReason
      });
      alert('Dispatch Order Manifest created in PACKING status!');
      setShowCreateModal(false);
      fetchOrders();
    } catch (err) {
      alert(`Dispatch Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDispatch = async (id) => {
    try {
      setActionLoading(true);
      const res = await operationsApi.confirmDispatch(id);
      alert('Dispatch confirmed! Inventory decremented and goods are en route.');
      if (res.deliveryChallan) {
        setSelectedChallan(res.deliveryChallan);
      }
      fetchOrders();
    } catch (err) {
      alert(`Cannot Confirm Dispatch: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDelivery = async (id) => {
    const recipient = prompt('Enter name of site engineer or customer receiving the goods:', 'Site Engineer');
    if (!recipient) return;

    try {
      setActionLoading(true);
      await operationsApi.confirmDelivery(id, { recipientName: recipient });
      alert('Delivery confirmed! Product warranties have been automatically activated.');
      fetchOrders();
    } catch (err) {
      alert(`Delivery Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewChallan = async (id) => {
    try {
      const challan = await operationsApi.getDeliveryChallan(id);
      setSelectedChallan(challan);
    } catch (err) {
      alert(`Error fetching challan: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Truck className="h-6 w-6 text-amber-500" />
            Dispatch Queue & Delivery Manifests
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Gated packaging verification, advance payment check, delivery challan generation, and transit tracking.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20"
        >
          <Plus className="h-4 w-4" /> New Dispatch Manifest
        </button>
      </div>

      {/* Orders List */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-16 text-center text-slate-400">Loading dispatch manifests...</div>
        ) : dispatchOrders.length === 0 ? (
          <div className="py-16 text-center text-slate-500">No active dispatch orders found.</div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {dispatchOrders.map((order) => (
              <div key={order.id} className="p-6 hover:bg-slate-800/20 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-lg font-bold text-amber-400">
                        {order.manifestNumber}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          order.status === 'DELIVERED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : order.status === 'DISPATCHED'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-slate-500" />
                        <span>Project: {order.projectId}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-slate-500" />
                        <span>Driver: {order.driverName} ({order.vehicleNumber})</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5 text-slate-500" />
                        <span>{order.driverPhone}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleViewChallan(order.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold border border-slate-700"
                    >
                      <FileText className="h-3.5 w-3.5" /> Delivery Challan
                    </button>

                    {order.status === 'PACKING' && (
                      <button
                        onClick={() => handleConfirmDispatch(order.id)}
                        disabled={actionLoading}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold shadow"
                      >
                        <CheckCircle className="h-3.5 w-3.5" /> Confirm Dispatch
                      </button>
                    )}

                    {order.status === 'DISPATCHED' && (
                      <button
                        onClick={() => handleConfirmDelivery(order.id)}
                        disabled={actionLoading}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg text-xs font-bold shadow"
                      >
                        <CheckCircle className="h-3.5 w-3.5" /> Confirm Delivered
                      </button>
                    )}
                  </div>
                </div>

                {/* Manifest Materials & Serial Scans */}
                <div className="mt-4 pt-3 border-t border-slate-800/60 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium">Manifest Line Items:</span>
                    <ul className="mt-1 space-y-1">
                      {order.items?.map((it, i) => (
                        <li key={i} className="text-slate-300">
                          <span className="font-mono text-amber-400 font-semibold">{it.sku}</span> - {it.name} ({it.quantity} {it.unit})
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <span className="text-slate-400 font-medium">Verified Serial Barcodes:</span>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {order.scannedSerials?.length > 0 ? (
                        order.scannedSerials.map((sn) => (
                          <span
                            key={sn}
                            className="font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-xs"
                          >
                            {sn}
                          </span>
                        ))
                      ) : (
                        <span className="text-amber-400 italic">No serials scanned yet (Scan required before dispatch)</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Manifest Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Truck className="h-5 w-5 text-amber-500" />
              Generate Dispatch Order Manifest
            </h3>

            <form onSubmit={handleCreateDispatch} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Project ID *</label>
                  <input
                    type="text"
                    required
                    value={form.projectId}
                    onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Order ID *</label>
                  <input
                    type="text"
                    required
                    value={form.orderId}
                    onChange={(e) => setForm({ ...form, orderId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Site Destination Address *</label>
                <input
                  type="text"
                  required
                  value={form.destinationAddress}
                  onChange={(e) => setForm({ ...form, destinationAddress: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Transporter / Fleet</label>
                  <input
                    type="text"
                    value={form.transporterName}
                    onChange={(e) => setForm({ ...form, transporterName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Vehicle Plate No.</label>
                  <input
                    type="text"
                    value={form.vehicleNumber}
                    onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Driver Name</label>
                  <input
                    type="text"
                    value={form.driverName}
                    onChange={(e) => setForm({ ...form, driverName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Driver Phone</label>
                  <input
                    type="text"
                    value={form.driverPhone}
                    onChange={(e) => setForm({ ...form, driverPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Advance Payment Gate & Admin Override */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-amber-300 font-semibold">
                  <input
                    type="checkbox"
                    checked={form.overrideAdvancePayment}
                    onChange={(e) => setForm({ ...form, overrideAdvancePayment: e.target.checked })}
                    className="rounded border-slate-800 text-amber-500 focus:ring-amber-500"
                  />
                  <span>Admin Advance Payment Override [NC-05]</span>
                </label>
                {form.overrideAdvancePayment && (
                  <input
                    type="text"
                    required
                    placeholder="Enter mandatory audit override justification..."
                    value={form.overrideReason}
                    onChange={(e) => setForm({ ...form, overrideReason: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-amber-500/40 rounded-xl text-xs text-white focus:outline-none"
                  />
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold shadow"
                >
                  {actionLoading ? 'Creating...' : 'Create Manifest'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delivery Challan Viewer Modal */}
      {selectedChallan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-slate-800 pb-4 mb-6">
              <div>
                <h3 className="text-xl font-bold text-white font-mono">{selectedChallan.challanNumber}</h3>
                <p className="text-xs text-slate-400 mt-1">Delivery Challan & Transportation Pass</p>
              </div>
              <button
                onClick={() => setSelectedChallan(null)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6 text-sm">
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-950 rounded-2xl border border-slate-800">
                <div>
                  <span className="text-xs text-slate-500 font-semibold uppercase">Consignor (Issuer)</span>
                  <div className="font-bold text-white mt-1">{selectedChallan.company?.name}</div>
                  <div className="text-xs text-slate-400 mt-1">{selectedChallan.company?.address}</div>
                  <div className="text-xs text-amber-400 font-mono mt-1">GSTIN: {selectedChallan.company?.gstin}</div>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-semibold uppercase">Consignee (Destination)</span>
                  <div className="font-bold text-white mt-1">Project ID: {selectedChallan.consignee?.projectId}</div>
                  <div className="text-xs text-slate-400 mt-1">{selectedChallan.consignee?.destinationAddress}</div>
                  <div className="text-xs text-slate-500 font-mono mt-1">Order: {selectedChallan.consignee?.orderId}</div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Dispatched Materials</h4>
                <table className="w-full text-left text-xs border border-slate-800 rounded-xl overflow-hidden">
                  <thead className="bg-slate-800 text-slate-400">
                    <tr>
                      <th className="p-2.5">SKU</th>
                      <th className="p-2.5">Description</th>
                      <th className="p-2.5 text-center">Qty</th>
                      <th className="p-2.5">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {selectedChallan.materials?.map((m, i) => (
                      <tr key={i}>
                        <td className="p-2.5 font-mono text-amber-400">{m.sku}</td>
                        <td className="p-2.5">{m.description}</td>
                        <td className="p-2.5 text-center font-bold">{m.quantity} {m.unit}</td>
                        <td className="p-2.5">{m.isSerialized ? 'Serialized' : 'Bulk'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedChallan.verifiedSerials?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Verified Component Serial Numbers
                  </h4>
                  <div className="flex flex-wrap gap-2 p-3 bg-slate-950 rounded-xl border border-slate-800">
                    {selectedChallan.verifiedSerials.map((sn) => (
                      <span key={sn} className="font-mono text-xs px-2 py-0.5 bg-slate-800 rounded text-slate-300">
                        {sn}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300">
                Declaration: {selectedChallan.declarations}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
                >
                  <Printer className="h-4 w-4" /> Print Challan
                </button>
                <button
                  onClick={() => setSelectedChallan(null)}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
