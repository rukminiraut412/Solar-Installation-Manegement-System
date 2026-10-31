import React, { useState, useEffect } from 'react';
import { operationsApi } from '../services/operationsApi';
import {
  Boxes,
  Truck,
  Sliders,
  History,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Plus,
  ArrowDownRight,
  ShieldAlert,
  Search
} from 'lucide-react';

export default function WarehouseInventoryDashboard() {
  const [inventory, setInventory] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('stocks'); // 'stocks' | 'ledger'
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showGrnModal, setShowGrnModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // GRN Form
  const [grnForm, setGrnForm] = useState({
    supplierName: '',
    invoiceNumber: '',
    poNumber: '',
    warehouseLocation: 'Main Central Warehouse',
    sku: 'PNL-MONO-540W',
    quantity: '10',
    unitCost: '11500',
    serialsText: ''
  });

  // Adjustment Form
  const [adjustForm, setAdjustForm] = useState({
    sku: '',
    countedQty: '',
    reasonCode: 'AUDIT_CORRECTION',
    notes: '',
    isApprovedByAdmin: false
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invRes, ledRes] = await Promise.all([
        operationsApi.getInventory(),
        operationsApi.getLedgerHistory()
      ]);
      setInventory(invRes || []);
      setLedger(ledRes || []);
    } catch (err) {
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGrnSubmit = async (e) => {
    e.preventDefault();
    try {
      const serialNumbers = grnForm.serialsText
        ? grnForm.serialsText.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean)
        : [];

      await operationsApi.receiveGoods({
        supplierName: grnForm.supplierName,
        invoiceNumber: grnForm.invoiceNumber,
        poNumber: grnForm.poNumber,
        warehouseLocation: grnForm.warehouseLocation,
        items: [
          {
            sku: grnForm.sku,
            quantity: Number(grnForm.quantity),
            unitCost: Number(grnForm.unitCost),
            serialNumbers
          }
        ]
      });

      alert('Goods Received Note (GRN) created successfully!');
      setShowGrnModal(false);
      fetchData();
    } catch (err) {
      alert(`GRN Error: ${err.message}`);
    }
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    try {
      await operationsApi.adjustStock({
        sku: adjustForm.sku,
        countedQty: Number(adjustForm.countedQty),
        reasonCode: adjustForm.reasonCode,
        notes: adjustForm.notes,
        isApprovedByAdmin: adjustForm.isApprovedByAdmin
      });

      alert('Stock adjustment recorded successfully!');
      setShowAdjustModal(false);
      fetchData();
    } catch (err) {
      alert(`Adjustment Error: ${err.message}`);
    }
  };

  const filteredInventory = inventory.filter(
    (item) =>
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Boxes className="h-6 w-6 text-amber-500" />
            Warehouse Inventory & Stock Ledger
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Real-time physical stocks, allocated project reserves, and immutable double-entry movement ledger.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowGrnModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20"
          >
            <Truck className="h-4 w-4" /> Receive GRN Stock
          </button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('stocks')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeSubTab === 'stocks'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Stock Balances & Invariants
          </button>
          <button
            onClick={() => setActiveSubTab('ledger')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
              activeSubTab === 'ledger'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="h-4 w-4" /> Immutable Movement Ledger ({ledger.length})
          </button>
        </div>

        {activeSubTab === 'stocks' && (
          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search warehouse..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400 flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 text-amber-500 animate-spin" />
          <span>Syncing warehouse balances...</span>
        </div>
      ) : activeSubTab === 'stocks' ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/50 text-slate-400 font-semibold uppercase tracking-wider text-xs border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">SKU / Component</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4 text-center">On-Hand Qty</th>
                  <th className="py-3.5 px-4 text-center">Reserved Qty</th>
                  <th className="py-3.5 px-4 text-center">Available Qty</th>
                  <th className="py-3.5 px-4 text-center">Invariant Check</th>
                  <th className="py-3.5 px-4">Location / Bin</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredInventory.map((item) => {
                  const onHand = Number(item.onHandQuantity || 0);
                  const reserved = Number(item.reservedQuantity || 0);
                  const available = Number(item.availableQuantity || 0);
                  const isInvariantValid = available === onHand - reserved && available >= 0;

                  return (
                    <tr key={item.productId || item.sku} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-amber-400">{item.sku}</div>
                        <div className="text-xs text-slate-300">{item.name}</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-slate-400">
                        {item.category}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-white text-base">
                        {onHand}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-amber-400 font-semibold">
                        {reserved}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`font-mono font-bold text-base px-2 py-0.5 rounded ${
                            available <= (item.minSafetyStock || 5)
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {available}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {isInvariantValid ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
                            <CheckCircle className="h-3.5 w-3.5" /> Balanced
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-red-400 font-bold">
                            <AlertCircle className="h-3.5 w-3.5" /> Drift Detected
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-400">
                        <div>{item.warehouseLocation || 'Central WH'}</div>
                        <div className="font-mono text-slate-500">{item.storageBin || 'BIN-A1'}</div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedProduct(item);
                            setAdjustForm({
                              sku: item.sku,
                              countedQty: String(item.onHandQuantity),
                              reasonCode: 'AUDIT_CORRECTION',
                              notes: '',
                              isApprovedByAdmin: false
                            });
                            setShowAdjustModal(true);
                          }}
                          className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium border border-slate-700 transition-colors"
                        >
                          Adjust
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Immutable Movement Ledger */
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          {ledger.length === 0 ? (
            <div className="py-16 text-center text-slate-500">No stock movements recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-800/50 text-slate-400 font-semibold uppercase tracking-wider text-xs border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Timestamp</th>
                    <th className="py-3.5 px-4">Movement Type</th>
                    <th className="py-3.5 px-4">Component / SKU</th>
                    <th className="py-3.5 px-4 text-center">Quantity Delta</th>
                    <th className="py-3.5 px-4">Reference Doc</th>
                    <th className="py-3.5 px-4">Audit Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {ledger.map((l, idx) => (
                    <tr key={l.id || idx} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4 text-xs font-mono text-slate-400">
                        {new Date(l.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-bold ${
                            l.transactionType === 'PURCHASE_RECEIPT'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : l.movementType === 'DISPATCH' || l.quantity < 0
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}
                        >
                          {l.transactionType || l.movementType}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-amber-400">{l.sku}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold">
                        <span className={Number(l.quantityChange || l.quantity) >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {Number(l.quantityChange || l.quantity) > 0 ? '+' : ''}
                          {l.quantityChange || l.quantity}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-slate-300">
                        {l.referenceType}: {l.referenceId}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-400">{l.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* GRN Modal */}
      {showGrnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Truck className="h-5 w-5 text-amber-500" />
              Goods Received Note (GRN) Inbound
            </h3>
            <form onSubmit={handleGrnSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Supplier / Vendor Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Waaree Solar Tech Ltd"
                  value={grnForm.supplierName}
                  onChange={(e) => setGrnForm({ ...grnForm, supplierName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Invoice Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="INV-2026-908"
                    value={grnForm.invoiceNumber}
                    onChange={(e) => setGrnForm({ ...grnForm, invoiceNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Purchase Order (PO)</label>
                  <input
                    type="text"
                    placeholder="PO-SUN-1002"
                    value={grnForm.poNumber}
                    onChange={(e) => setGrnForm({ ...grnForm, poNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Component SKU *</label>
                  <select
                    value={grnForm.sku}
                    onChange={(e) => setGrnForm({ ...grnForm, sku: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    {inventory.map((item) => (
                      <option key={item.sku} value={item.sku}>
                        {item.sku} ({item.name})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Received Quantity *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={grnForm.quantity}
                    onChange={(e) => setGrnForm({ ...grnForm, quantity: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Serial Numbers (Optional - One per line)
                </label>
                <textarea
                  rows="3"
                  placeholder="INV-GROW-3K-26-9001&#10;INV-GROW-3K-26-9002"
                  value={grnForm.serialsText}
                  onChange={(e) => setGrnForm({ ...grnForm, serialsText: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowGrnModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold shadow"
                >
                  Confirm Inbound GRN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Sliders className="h-5 w-5 text-amber-500" />
              Physical Count Adjustment
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Updating physical stock for <span className="font-mono text-amber-400 font-bold">{adjustForm.sku}</span>.
              Variances &gt; ₹2,000 require Admin digital approval.
            </p>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">New Physical Count *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={adjustForm.countedQty}
                  onChange={(e) => setAdjustForm({ ...adjustForm, countedQty: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500 font-mono text-lg font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Adjustment Reason *</label>
                <select
                  value={adjustForm.reasonCode}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reasonCode: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="AUDIT_CORRECTION">Periodic Audit Cycle Count</option>
                  <option value="DAMAGED_IN_WAREHOUSE">Damaged in Warehouse Storage</option>
                  <option value="RETURNED_EXCESS">Returned Excess from Project Site</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Audit Notes</label>
                <input
                  type="text"
                  placeholder="Explain variance reason..."
                  value={adjustForm.notes}
                  onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-amber-300 font-medium">
                  <input
                    type="checkbox"
                    checked={adjustForm.isApprovedByAdmin}
                    onChange={(e) => setAdjustForm({ ...adjustForm, isApprovedByAdmin: e.target.checked })}
                    className="rounded border-slate-800 text-amber-500 focus:ring-amber-500"
                  />
                  <span>Digitally approved by Admin / Inventory Controller [NC-23]</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold shadow"
                >
                  Apply Stock Correction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
