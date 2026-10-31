import React, { useState, useEffect } from 'react';
import { operationsApi } from '../services/operationsApi';
import {
  Package,
  Plus,
  Search,
  Filter,
  ShieldCheck,
  QrCode,
  AlertTriangle,
  RefreshCw,
  Check
} from 'lucide-react';

const CATEGORIES = [
  'ALL',
  'PANEL',
  'INVERTER',
  'BATTERY',
  'STRUCTURE',
  'ELECTRICAL',
  'SAFETY',
  'CONSUMABLE'
];

export default function ProductCatalogView() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);

  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category: 'PANEL',
    brand: '',
    model: '',
    unitCost: '',
    unitPrice: '',
    unit: 'PCS',
    isSerialized: true,
    minSafetyStock: '10',
    warrantyMonths: '24'
  });

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await operationsApi.getProducts(
        selectedCategory !== 'ALL' ? { category: selectedCategory } : {}
      );
      setProducts(res || []);
    } catch (err) {
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory]);

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      setFormSubmitting(true);
      await operationsApi.createProduct({
        ...formData,
        unitCost: Number(formData.unitCost),
        unitPrice: Number(formData.unitPrice),
        minSafetyStock: Number(formData.minSafetyStock),
        warrantyMonths: Number(formData.warrantyMonths)
      });
      setFormSuccess(true);
      setTimeout(() => {
        setFormSuccess(false);
        setShowAddModal(false);
        fetchProducts();
      }, 1200);
    } catch (err) {
      alert(`Error creating product: ${err.message}`);
    } finally {
      setFormSubmitting(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Package className="h-6 w-6 text-amber-500" />
            Master Product Catalog
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Authoritative hardware specifications, pricing, serialized controls, and warranty terms.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all"
        >
          <Plus className="h-4 w-4" /> Add Product
        </button>
      </div>

      {/* Category Pills & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-slate-950 font-bold shadow'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search SKU, brand, model..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Product Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 text-center text-slate-400 flex flex-col items-center gap-3">
            <RefreshCw className="h-8 w-8 text-amber-500 animate-spin" />
            <span>Loading product specifications...</span>
          </div>
        ) : error ? (
          <div className="py-12 text-center text-red-400 flex flex-col items-center gap-2">
            <AlertTriangle className="h-8 w-8" />
            <span>{error}</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            No products found matching the criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/50 text-slate-400 font-semibold uppercase tracking-wider text-xs border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">SKU / Code</th>
                  <th className="py-3.5 px-4">Product Name & Specifications</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Brand / Model</th>
                  <th className="py-3.5 px-4">Unit Cost</th>
                  <th className="py-3.5 px-4">Unit Price</th>
                  <th className="py-3.5 px-4">Serialization</th>
                  <th className="py-3.5 px-4">Warranty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                      {p.sku}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{p.name}</div>
                      <div className="text-xs text-slate-400">Unit: {p.unit} | Safety Min: {p.minSafetyStock}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        {p.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {p.brand} {p.model ? `(${p.model})` : ''}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      ₹{Number(p.unitCost || 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                      ₹{Number(p.unitPrice || 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      {p.isSerialized ? (
                        <span className="inline-flex items-center gap-1 text-xs text-purple-400 font-medium bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                          <QrCode className="h-3 w-3" /> Serialized
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">Non-Serialized</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-300">
                      <span className="inline-flex items-center gap-1 text-amber-400">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {Math.round(p.warrantyMonths / 12)} Yrs ({p.warrantyMonths}m)
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl relative">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Package className="h-5 w-5 text-amber-500" />
              Register New Master Product
            </h3>

            {formSuccess ? (
              <div className="py-12 text-center text-emerald-400 flex flex-col items-center gap-2">
                <Check className="h-10 w-10" />
                <span className="text-lg font-bold">Product Registered Successfully!</span>
              </div>
            ) : (
              <form onSubmit={handleCreateProduct} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">SKU / Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. PNL-MONO-600W"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Category *</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                    >
                      {CATEGORIES.filter((c) => c !== 'ALL').map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Product Description / Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 600W Bifacial TOPCon Monocrystalline Panel"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Brand</label>
                    <input
                      type="text"
                      placeholder="Waaree, Growatt, etc."
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Model</label>
                    <input
                      type="text"
                      placeholder="e.g. WS-600"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Unit Cost (₹) *</label>
                    <input
                      type="number"
                      required
                      placeholder="12000"
                      value={formData.unitCost}
                      onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Unit Price (₹) *</label>
                    <input
                      type="number"
                      required
                      placeholder="15000"
                      value={formData.unitPrice}
                      onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Unit</label>
                    <input
                      type="text"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Min Safety Stock</label>
                    <input
                      type="number"
                      value={formData.minSafetyStock}
                      onChange={(e) => setFormData({ ...formData, minSafetyStock: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Warranty (Months)</label>
                    <input
                      type="number"
                      value={formData.warrantyMonths}
                      onChange={(e) => setFormData({ ...formData, warrantyMonths: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={formData.isSerialized}
                      onChange={(e) => setFormData({ ...formData, isSerialized: e.target.checked })}
                      className="rounded border-slate-800 text-amber-500 focus:ring-amber-500"
                    />
                    <span>Component requires unique serial tracking (Panels, Inverters, Batteries)</span>
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold shadow"
                  >
                    {formSubmitting ? 'Registering...' : 'Save Product'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
