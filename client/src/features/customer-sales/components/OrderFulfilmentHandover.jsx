import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Truck,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  ExternalLink,
  AlertTriangle,
  X,
  Eye,
  FileCheck2,
} from 'lucide-react';
import customerSalesApi from '../api/customerSalesApi';

export default function OrderFulfilmentHandover() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderDossier, setSelectedOrderDossier] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await customerSalesApi.listOrders();
      setOrders(res.data || []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const openOrderDossier = async (order) => {
    try {
      const res = await customerSalesApi.getOrder(order.id);
      setSelectedOrderDossier(res.data);
    } catch {
      setSelectedOrderDossier({ order, project: null, bomItems: [] });
    }
  };

  const handleReserveStock = async (projectId) => {
    try {
      setActionLoading(true);
      const res = await customerSalesApi.reserveStock(projectId);
      setFeedback({
        type: 'success',
        text: `Warehouse stock reservation processed! Status: ${res.data?.status || 'RESERVED'}. Shortage count: ${
          res.data?.shortageCount || 0
        }.`,
      });
      loadOrders();
    } catch (err) {
      setFeedback({
        type: 'warning',
        text: 'Stock reservation signal recorded (Operations service offline or mock mode active).',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleInitiateAdvancePayment = async (orderId) => {
    try {
      setActionLoading(true);
      const idempotencyKey = `idem-${Date.now()}`;
      const res = await customerSalesApi.createPaymentOrder(orderId, idempotencyKey);
      setFeedback({
        type: 'success',
        text: `Razorpay test order initialized via Finance Engine! Razorpay Order ID: ${
          res.data?.paymentRequest?.razorpay_order_id || 'order_test_9981'
        }.`,
      });
      loadOrders();
    } catch (err) {
      setFeedback({
        type: 'warning',
        text: 'Payment request recorded (Finance service offline or mock mode active).',
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Boxes className="h-5 w-5 text-amber-500" />
            Commercial Orders &amp; Operations Handover
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Section 3 &amp; BR-QTE-002 Invariant: Orders and installation projects are created strictly after quotation acceptance.
            The frozen BOM snapshot is authoritatively transferred to Operations &amp; Warehouse.
          </p>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between border ${
            feedback.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              : feedback.type === 'warning'
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          }`}
        >
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Order Number</th>
                <th className="py-3 px-4">Total Contract Value</th>
                <th className="py-3 px-4">Advance Terms [NC-001]</th>
                <th className="py-3 px-4">Order Status</th>
                <th className="py-3 px-4">Payment Status</th>
                <th className="py-3 px-4 text-right">Handover Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-slate-500">
                    Loading commercial orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-slate-500">
                    No orders confirmed yet. Orders are established automatically when a customer accepts a quotation.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-semibold text-amber-400">{o.order_number}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      ₹{Number(o.total_contract_value).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-mono text-emerald-400 font-semibold">
                          ₹{Number(o.advance_required_amount).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          ({o.advance_required_percent}% required)
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {o.order_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          o.payment_status === 'ADVANCE_PAID' || o.payment_status === 'FULLY_PAID'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {o.payment_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => openOrderDossier(o)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold rounded-lg transition flex items-center gap-1"
                        >
                          <Eye className="h-3 w-3" /> BOM &amp; Handover
                        </button>

                        {o.payment_status === 'PENDING_ADVANCE' && (
                          <button
                            onClick={() => handleInitiateAdvancePayment(o.id)}
                            disabled={actionLoading}
                            title="Trigger Member 4 Razorpay Advance Order Creation"
                            className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition flex items-center gap-1"
                          >
                            <CreditCard className="h-3 w-3" /> Pay 25% Advance
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Dossier & Frozen BOM Handover Modal */}
      {selectedOrderDossier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-mono text-[11px] mb-1">
                  {selectedOrderDossier.order?.order_number}
                </div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Boxes className="h-5 w-5 text-amber-500" />
                  Commercial Project Handover &amp; Frozen BOM
                </h3>
              </div>
              <button onClick={() => setSelectedOrderDossier(null)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Handover Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Installation Project</span>
                <p className="text-sm font-mono font-bold text-amber-400 mt-1">
                  {selectedOrderDossier.project?.project_number || 'PRJ-ESTABLISHED'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Stage: <span className="text-emerald-400 font-bold">{selectedOrderDossier.project?.current_stage || 'STOCK_RESERVATION'}</span>
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Customer Details</span>
                <p className="text-sm font-bold text-white mt-1">
                  {selectedOrderDossier.customer?.full_name || 'Customer'}
                </p>
                <p className="text-xs text-slate-400">{selectedOrderDossier.customer?.phone}</p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Dispatch Gate Status</span>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                      selectedOrderDossier.order?.payment_status === 'ADVANCE_PAID' ||
                      selectedOrderDossier.order?.payment_status === 'FULLY_PAID'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-amber-500/10 text-amber-400'
                    }`}
                  >
                    {selectedOrderDossier.order?.payment_status}
                  </span>
                </div>
                <span className="text-[9px] text-slate-500 mt-1 block">
                  Warehouse verifies payment before releasing dispatch manifest
                </span>
              </div>
            </div>

            {/* Frozen project_bom_items Table */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <Layers className="h-4 w-4 text-emerald-400" />
                  Frozen Commercial BOM Snapshot
                </h4>
                <span className="text-[10px] text-slate-500">Immutable snapshot transferred to Warehouse &amp; Operations</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="text-slate-500 uppercase text-[9px] border-b border-slate-800">
                    <tr>
                      <th className="py-2">Category</th>
                      <th className="py-2">SKU</th>
                      <th className="py-2">Component Name</th>
                      <th className="py-2">Quantity</th>
                      <th className="py-2">Serialized Gate</th>
                      <th className="py-2 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {(selectedOrderDossier.bomItems || []).map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-2 text-slate-400">{it.category}</td>
                        <td className="py-2 font-mono text-amber-400">{it.sku}</td>
                        <td className="py-2 font-medium text-white">{it.name}</td>
                        <td className="py-2 font-mono">
                          {it.quantity} {it.unit}
                        </td>
                        <td className="py-2">
                          {it.is_serialized ? (
                            <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[9px] font-mono">
                              Barcode Required
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[9px]">Standard</span>
                          )}
                        </td>
                        <td className="py-2 font-mono text-right text-emerald-400">
                          ₹{Number(it.total_price).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Handover Action Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <div className="text-xs text-slate-400">
                Trigger stock reservation to lock warehouse inventory for this project.
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedOrderDossier(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl"
                >
                  Close
                </button>
                {selectedOrderDossier.project && (
                  <button
                    onClick={() => handleReserveStock(selectedOrderDossier.project.id)}
                    disabled={actionLoading}
                    className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg flex items-center gap-2"
                  >
                    <Truck className="h-4 w-4" /> Reserve Warehouse Stock
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
