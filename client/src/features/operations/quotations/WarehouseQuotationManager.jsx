import React, { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import {
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Trash2,
  Send,
  Save,
  RefreshCw,
  Eye,
  ShieldCheck,
  User,
  Zap,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  ChevronRight,
  Info,
  MapPin,
  Phone,
  Mail,
  Home,
  FileText
} from 'lucide-react';

export default function WarehouseQuotationManager({ onQuotationAccepted }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);

  // Editor State
  const [capacityKw, setCapacityKw] = useState(3.0);
  const [gridType, setGridType] = useState('On-Grid');
  const [items, setItems] = useState([]);
  const [laborCost, setLaborCost] = useState(13500);
  const [taxPercent, setTaxPercent] = useState(12.0);
  const [customerNotes, setCustomerNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeQuotation, setActiveQuotation] = useState(null);

  // Product Catalog for adding custom items
  const [catalog, setCatalog] = useState([]);

  useEffect(() => {
    fetchPendingProjects();
    fetchCatalog();
  }, []);

  const fetchPendingProjects = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/operations/warehouse-quotations/projects-needing-quotes');
      const list = res.data.data || [];
      setProjects(list);
      if (list.length > 0 && !selectedProject) {
        handleSelectProject(list[0]);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load projects needing quotations');
    } finally {
      setLoading(false);
    }
  };

  const fetchCatalog = async () => {
    try {
      const res = await api.get('/operations/products');
      setCatalog(res.data.data || []);
    } catch (err) {
      console.warn('Catalog fetch error:', err);
    }
  };

  const handleSelectProject = async (p) => {
    setSelectedProject(p);
    setError('');
    setSuccessMsg('');

    // If quotation already exists, load it
    if (p.quotation_id) {
      try {
        const qRes = await api.get(`/operations/warehouse-quotations/${p.quotation_id}`);
        const q = qRes.data.data;
        setActiveQuotation(q);
        setCapacityKw(q.capacity_kw || p.capacity_kw || 3.0);
        setGridType(q.grid_type || p.grid_type || 'On-Grid');
        setLaborCost(Number(q.installation_labor_cost) || 0);
        setTaxPercent(Number(q.tax_percent) || 12.0);
        setCustomerNotes(q.customer_notes || '');
        setItems(q.items?.map(i => ({
          productId: i.product_id,
          category: i.category,
          sku: i.sku,
          name: i.name,
          quantity: Number(i.quantity),
          unit: i.unit,
          unitCost: Number(i.unit_cost),
          unitPrice: Number(i.unit_price),
          totalPrice: Number(i.total_price),
          isSerialized: i.is_serialized
        })) || []);
        return;
      } catch (err) {
        console.warn('Failed to load existing quote:', err);
      }
    }

    // Otherwise, generate auto-suggested BOM based on customer requirements
    setActiveQuotation(null);
    const kw = Number(p.capacity_kw) || 3.0;
    const grid = p.grid_type || p.preferred_system_type || 'On-Grid';
    setCapacityKw(kw);
    setGridType(grid);
    await loadSuggestedBom(kw, grid);
  };

  const loadSuggestedBom = async (kw, grid) => {
    try {
      const res = await api.get(`/operations/warehouse-quotations/suggested-bom?capacityKw=${kw}&gridType=${grid}`);
      const bom = res.data.data;
      setItems(bom.items || []);
      setLaborCost(bom.installationLaborCost || 0);
      setTaxPercent(bom.taxPercent || 12.0);
    } catch (err) {
      console.warn('Suggested BOM fetch error:', err);
    }
  };

  const handleQuantityChange = (index, newQty) => {
    const updated = [...items];
    const qty = Math.max(1, Number(newQty) || 1);
    updated[index].quantity = qty;
    updated[index].totalPrice = qty * updated[index].unitPrice;
    setItems(updated);
  };

  const handlePriceChange = (index, newPrice) => {
    const updated = [...items];
    const price = Math.max(0, Number(newPrice) || 0);
    updated[index].unitPrice = price;
    updated[index].totalPrice = updated[index].quantity * price;
    setItems(updated);
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleAddItemFromCatalog = (e) => {
    const sku = e.target.value;
    if (!sku) return;
    const prod = catalog.find(p => p.sku === sku);
    if (!prod) return;

    const newItem = {
      productId: prod.id,
      category: prod.category,
      sku: prod.sku,
      name: prod.name,
      quantity: 1,
      unit: prod.unit || 'PCS',
      unitCost: prod.unitCost || 0,
      unitPrice: prod.unitPrice || 0,
      totalPrice: prod.unitPrice || 0,
      isSerialized: prod.isSerialized
    };

    setItems([...items, newItem]);
    e.target.value = '';
  };

  // Calculations
  const hardwareSubtotal = items.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0);
  const labor = Number(laborCost) || 0;
  const preTax = hardwareSubtotal + labor;
  const taxAmount = Math.round(preTax * (Number(taxPercent) / 100));
  const totalAmount = preTax + taxAmount;

  // Save Draft
  const handleSaveDraft = async () => {
    if (!selectedProject) return;
    setIsSubmitting(true);
    setError('');
    setSuccessMsg('');

    try {
      const payload = {
        projectId: selectedProject.project_id,
        customerId: selectedProject.customer_id,
        requirementsId: selectedProject.requirements_id,
        orderId: selectedProject.order_id,
        capacityKw,
        gridType,
        items,
        installationLaborCost: labor,
        taxPercent,
        customerNotes
      };

      const res = await api.post('/operations/warehouse-quotations/draft', payload);
      const saved = res.data.data;
      setActiveQuotation(saved);
      setSuccessMsg(`Draft Quotation ${saved.quotation_number} (v${saved.version}) saved successfully!`);
      fetchPendingProjects();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save draft quotation');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit to Admin
  const handleSubmitToAdmin = async () => {
    if (!activeQuotation && !selectedProject) return;
    setIsSubmitting(true);
    setError('');
    setSuccessMsg('');

    try {
      // If quotation is not yet saved, save it first
      let quoteId = activeQuotation?.id;
      if (!quoteId) {
        const payload = {
          projectId: selectedProject.project_id,
          customerId: selectedProject.customer_id,
          requirementsId: selectedProject.requirements_id,
          orderId: selectedProject.order_id,
          capacityKw,
          gridType,
          items,
          installationLaborCost: labor,
          taxPercent,
          customerNotes
        };
        const draftRes = await api.post('/operations/warehouse-quotations/draft', payload);
        quoteId = draftRes.data.data.id;
      }

      const res = await api.post(`/operations/warehouse-quotations/${quoteId}/submit-admin`);
      setActiveQuotation(res.data.data);
      setSuccessMsg(`Quotation ${res.data.data.quotation_number} submitted to Admin for formal approval!`);
      fetchPendingProjects();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit quotation to Admin');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold uppercase tracking-wider mb-2">
              <FileSpreadsheet className="h-3.5 w-3.5 text-blue-600" />
              Warehouse Quotation &amp; BOM Engine
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Warehouse Quotation Preparation &amp; Bill of Materials
            </h1>
            <p className="mt-1 text-xs text-slate-600 max-w-2xl">
              Warehouse prepares itemized engineering BOM quotations based on customer specs, Project ID &amp; Order ID. Submit drafts to Admin for sign-off prior to publishing to customer.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchPendingProjects}
              className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition shadow-sm"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-sm text-rose-800 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-900 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <span className="font-bold">{successMsg}</span>
        </div>
      )}

      {/* Main Split Layout: Project Selector & BOM Quotation Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Projects Queue (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-600" />
                Approved Projects ({projects.length})
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                Action Required
              </span>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading projects...</div>
            ) : projects.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No approved projects awaiting quotation. When Admin approves requirements, projects appear here.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                {projects.map((p) => {
                  const isSelected = selectedProject?.project_id === p.project_id;
                  const hasQuote = Boolean(p.quotation_id);

                  return (
                    <div
                      key={p.project_id}
                      onClick={() => handleSelectProject(p)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-100'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-[11px] font-bold text-emerald-800">
                          {p.project_code || 'PRJ-NEW'}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          p.quotation_status === 'ADMIN_APPROVED' || p.quotation_status === 'CUSTOMER_ACCEPTED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.quotation_status === 'SUBMITTED_TO_ADMIN'
                            ? 'bg-blue-100 text-blue-800'
                            : p.quotation_status === 'CHANGES_REQUESTED'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {p.quotation_status || 'NEEDS BOM'}
                        </span>
                      </div>

                      <div className="font-bold text-xs text-slate-900 truncate">
                        {p.customer_name}
                      </div>

                      <div className="text-[11px] text-slate-500 flex items-center justify-between mt-1">
                        <span>{p.capacity_kw || 3.0} kW ({p.grid_type || 'On-Grid'})</span>
                        <span className="font-mono text-[10px]">{p.order_number || 'ORD-PENDING'}</span>
                      </div>

                      {p.quotation_total && (
                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                          <span className="text-slate-500">Quoted:</span>
                          <span className="text-emerald-700 font-bold">
                            ₹{Number(p.quotation_total).toLocaleString('en-IN')}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Itemized BOM Quotation Editor (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          {selectedProject ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              {/* Submitted Customer & Site Requirements Dossier */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-md">
                        Project: {selectedProject.project_code || 'PRJ-NEW'}
                      </span>
                      <span className="font-mono text-xs font-bold text-blue-800 bg-blue-100 px-2.5 py-0.5 rounded-md">
                        Order: {selectedProject.order_number || 'ORD-NEW'}
                      </span>
                      <span className="font-mono text-xs font-bold text-purple-800 bg-purple-100 px-2.5 py-0.5 rounded-md">
                        Customer ID: {selectedProject.customer_code || selectedProject.customer_id?.slice(0, 8)}
                      </span>
                      <span className="text-xs font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                        {capacityKw} kW &bull; {gridType}
                      </span>
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <User className="h-4 w-4 text-emerald-600" />
                      {selectedProject.customer_name}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200 font-medium">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      {selectedProject.customer_phone || '—'}
                    </span>
                    <span className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200 font-medium">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      {selectedProject.customer_email || '—'}
                    </span>
                  </div>
                </div>

                {/* 4-Column Detailed Dossier Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  {/* Col 1: Site Location */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                    <div className="font-bold text-slate-500 uppercase text-[10px] tracking-wider flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-emerald-600" />
                      Installation Site
                    </div>
                    <div className="font-semibold text-slate-900 leading-tight">
                      {selectedProject.full_installation_address || selectedProject.address_street || selectedProject.address_city || 'On-site Rooftop'}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {[selectedProject.address_city, selectedProject.address_state, selectedProject.address_pincode].filter(Boolean).join(', ')}
                    </div>
                    <div className="text-[11px] font-medium text-slate-600">
                      {selectedProject.property_type || 'Residential'} &bull; {selectedProject.ownership_status || 'Owned'}
                    </div>
                  </div>

                  {/* Col 2: Roof & Site Specifications */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                    <div className="font-bold text-slate-500 uppercase text-[10px] tracking-wider flex items-center gap-1">
                      <Home className="h-3 w-3 text-blue-600" />
                      Roof &amp; Structure
                    </div>
                    <div className="font-bold text-slate-900">
                      {selectedProject.roof_type || 'RCC Flat'} ({selectedProject.roof_area_sqft || '—'} sqft)
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Floors: {selectedProject.floors_count || 1} &bull; Access: {selectedProject.roof_accessibility || 'Stairs'}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Obstacles: {selectedProject.nearby_obstacles || selectedProject.roof_restrictions || 'None reported'}
                    </div>
                  </div>

                  {/* Col 3: Electricity & Meter */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                    <div className="font-bold text-slate-500 uppercase text-[10px] tracking-wider flex items-center gap-1">
                      <Zap className="h-3 w-3 text-amber-500" />
                      DISCOM &amp; Consumption
                    </div>
                    <div className="font-mono font-bold text-slate-900">
                      Consumer #{selectedProject.electricity_consumer_number || '—'}
                    </div>
                    <div className="text-[11px] text-slate-600">
                      {selectedProject.discom_name || 'Torrent Power'} ({selectedProject.connection_type || 'Single Phase'})
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Bill: ₹{Number(selectedProject.avg_monthly_bill || 0).toLocaleString('en-IN')} &bull; {selectedProject.monthly_units || '—'} kWh
                    </div>
                  </div>

                  {/* Col 4: Timeline & Docs */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                    <div className="font-bold text-slate-500 uppercase text-[10px] tracking-wider flex items-center gap-1">
                      <FileText className="h-3 w-3 text-purple-600" />
                      Timeline &amp; Documents
                    </div>
                    <div className="font-semibold text-slate-900">
                      {selectedProject.preferred_timeline || 'Immediate'}
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Battery: {selectedProject.battery_required || 'No'}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedProject.documents_json && Object.keys(selectedProject.documents_json).length > 0 ? (
                        Object.keys(selectedProject.documents_json).map(docKey => (
                          <span key={docKey} className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 text-[9px] font-bold">
                            {docKey}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Standard submission</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Status or Technical Review Alert */}
              {activeQuotation?.admin_notes && (
                <div className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                  activeQuotation.admin_notes.includes('FLAGGED FOR WAREHOUSE REVIEW')
                    ? 'bg-amber-50 border border-amber-300 text-amber-900'
                    : 'bg-blue-50 border border-blue-200 text-blue-900'
                }`}>
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">
                      {activeQuotation.admin_notes.includes('FLAGGED FOR WAREHOUSE REVIEW')
                        ? 'Warehouse Review Required'
                        : 'Admin Feedback / Review Notes'}
                    </span>
                    <span>{activeQuotation.admin_notes}</span>
                  </div>
                </div>
              )}

              {/* Add Component from Catalog Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Itemized Bill of Materials (BOM)</h4>
                  <p className="text-xs text-slate-500">
                    Calculated components matching customer requirement. Custom adjustments allowed.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    onChange={handleAddItemFromCatalog}
                    defaultValue=""
                    className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="" disabled>+ Add Extra Component...</option>
                    {catalog.map(c => (
                      <option key={c.sku} value={c.sku}>
                        {c.name} ({c.sku}) — ₹{c.unitPrice}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* BOM Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Item Description &amp; SKU</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Rate (₹)</th>
                      <th className="py-2.5 px-3 text-right">Total (₹)</th>
                      <th className="py-2.5 px-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {items.map((item, idx) => (
                      <tr key={item.sku + idx} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-3 font-semibold text-slate-500">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.category === 'PANEL' ? 'bg-blue-100 text-blue-800' :
                            item.category === 'INVERTER' ? 'bg-purple-100 text-purple-800' :
                            item.category === 'STRUCTURE' ? 'bg-amber-100 text-amber-800' :
                            item.category === 'SAFETY' ? 'bg-emerald-100 text-emerald-800' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900">
                          <div>{item.name}</div>
                          <div className="font-mono text-[10px] text-slate-400">{item.sku} &bull; {item.unit}</div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(idx, e.target.value)}
                            className="w-16 text-center py-1 px-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="py-3 px-3 text-right">
                          <input
                            type="number"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) => handlePriceChange(idx, e.target.value)}
                            className="w-20 text-right py-1 px-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900">
                          ₹{Number(item.totalPrice).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                            title="Remove Line Item"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pricing Breakdown Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Hardware &amp; Equipment Subtotal:</span>
                  <span className="font-bold text-slate-900">₹{hardwareSubtotal.toLocaleString('en-IN')}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Installation, Earthing &amp; Commissioning Labor:</span>
                  <div className="flex items-center gap-2">
                    <span>₹</span>
                    <input
                      type="number"
                      value={laborCost}
                      onChange={(e) => setLaborCost(Number(e.target.value) || 0)}
                      className="w-24 text-right py-1 px-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs border-t border-slate-200 pt-2">
                  <span className="text-slate-600">GST Tax ({taxPercent}%):</span>
                  <span className="font-bold text-slate-900">₹{taxAmount.toLocaleString('en-IN')}</span>
                </div>

                <div className="flex items-center justify-between text-base font-extrabold text-slate-900 border-t border-slate-200 pt-3">
                  <span>Total Commercial Contract Value:</span>
                  <span className="text-emerald-700 text-lg">₹{totalAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Customer Notes / Special Terms */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Customer Notes &amp; Scope Terms
                </label>
                <textarea
                  rows="2"
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  placeholder="Includes 25-year panel linear performance warranty, dual MPPT grid inverter, earthing pit..."
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Version {activeQuotation?.version || 1} &bull; Status: {activeQuotation?.status || 'DRAFT'}</span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleSaveDraft}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition shadow-sm"
                  >
                    <Save className="h-4 w-4 text-slate-500" />
                    <span>Save Draft</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSubmitting || activeQuotation?.status === 'SUBMITTED_TO_ADMIN' || activeQuotation?.status === 'ADMIN_APPROVED'}
                    onClick={handleSubmitToAdmin}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition shadow-sm"
                  >
                    <Send className="h-4 w-4" />
                    <span>
                      {activeQuotation?.status === 'SUBMITTED_TO_ADMIN'
                        ? 'Submitted to Admin (Pending)'
                        : activeQuotation?.status === 'ADMIN_APPROVED'
                        ? 'Approved by Admin'
                        : 'Submit for Admin Approval'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
              <FileSpreadsheet className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">Select a Project to Prepare Quotation</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Choose an approved customer project from the left queue to configure the itemized BOM and submit for Admin sign-off.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
